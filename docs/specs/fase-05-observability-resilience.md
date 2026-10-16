# Especificação Funcional — Fase 5: Confiabilidade, Observabilidade e Diagnóstico

**Objetivo:** Estabelecer telemetria estruturada de ponta a ponta, rastreamento de contexto assíncrono distribuído, métricas RED em memória e tolerância a falhas transitórias com backoff exponencial e jitter, permitindo recuperação autônoma de infraestrutura e isolamento cirúrgico de incidentes em produção.

---

## 1. Topologia de Diretórios Atualizada

As responsabilidades de observabilidade e confiabilidade pertencem às camadas de Infraestrutura e Apresentação, preservando o Domínio (`src/domain/`) 100% puro:

```text
src/
├── domain/                      # Entidades e regras de negócio puras (intactas)
├── application/                 # Use Cases (intactos)
├── infra/                       # INFRAESTRUTURA
│   ├── db/                      # Pool e conexões
│   ├── repositories/            # Repositórios SQL e InMemory
│   ├── observability/           # NOVO: Telemetria e Contexto Assíncrono
│   │   ├── context.js           # Gerenciamento de AsyncLocalStorage nativo
│   │   ├── logger.js            # Logger JSON estruturado (linha única)
│   │   └── metrics.js           # Coletor de métricas RED em memória
│   └── resilience/              # NOVO: Confiabilidade de Rede/Infra
│       └── retryWithJitter.js   # Higher-Order Function de retentativa inteligente
└── presentation/                # CAMADA DE BORDA / HTTP
    └── middlewares/
        ├── tenantContext.js     # Isolamento e validação de tenant
        ├── errorHandler.js      # Formatação defensiva + log interno de erro 500
        └── observabilityMiddleware.js # NOVO: Extração de correlationId e medição RED
```

---

## 2. Contratos e Invariantes dos Módulos Técnicos

### 2.1 Contexto Assíncrono (`src/infra/observability/context.js`)
- Utiliza `AsyncLocalStorage` nativo do Node.js (`node:async_hooks`).
- Métodos exportados:
  - `runWithContext(store, callback)`: Executa `callback` dentro do escopo assíncrono isolado contendo `{ correlationId, tenantId }`.
  - `getContext()`: Retorna o objeto de contexto atual ou `{}` caso seja chamado fora de um contexto assíncrono ativo.
  - `setTenantId(tenantId)`: Permite enriquecer o contexto da requisição com o `tenantId` após a validação do middleware de autenticação/borda.
- **Invariante:** Requisições concorrentes paralelas nunca cruzam seus `correlationId` ou `tenantId`, mesmo após pausas assíncronas de banco de dados (`await`).

### 2.2 Logger Estruturado JSON (`src/infra/observability/logger.js`)
- Formato de saída: **JSON puro em linha única** emitido via streams padrão (`process.stdout` para `INFO`/`WARN`, `process.stderr` para `ERROR`).
- Métodos exportados: `info(message, metadata)`, `warn(message, metadata)`, `error(message, error, metadata)`.
- Estrutura obrigatória do payload JSON:
  ```json
  {
    "timestamp": "2026-10-14T19:00:00.000Z",
    "level": "INFO|WARN|ERROR",
    "message": "Descrição da operação",
    "correlationId": "uuid-v4-capturado-automaticamente",
    "tenantId": "tenant-id-ou-null",
    "metadata": {},
    "error": { "name": "...", "message": "...", "stack": "..." } // Presente apenas em nível ERROR
  }
  ```
- **Invariante de Segurança & Sanitização:** Segredos, senhas e tokens presentes em `metadata` devem ser mascarados/omitidos.
- **Integração com `errorHandler.js`:** Erros com status 500 devem obrigatoriamente invocar `logger.error()` gravando a stack trace real e correlation ID internamente, antes de enviar a resposta sanitizada ao cliente.

### 2.3 Coletor de Métricas RED (`src/infra/observability/metrics.js`)
- Indicadores em memória baseados no padrão RED (Rate, Errors, Duration):
  - **Rate (Taxa):** Contagem total de requisições por rota e método (`incrementRate(route, method)`).
  - **Errors (Erros):** Contagem total de requisições que falharam por rota, método e status code (`incrementErrors(route, method, statusCode)`).
  - **Duration (Duração):** Registro da latência em milissegundos (`recordDuration(route, method, durationMs)`), permitindo cálculo de latência média e percentis.
- Métodos de inspeção: `getMetrics()`, `resetMetrics()`.
- **Invariante:** A medição de duração e término deve ser executada obrigatoriamente dentro de blocos de finalização garantida (`finally` ou evento `finish` da resposta HTTP).

### 2.4 Executor de Resiliência (`src/infra/resilience/retryWithJitter.js`)
- Assinatura: `retryWithJitter(fn, options)`
  - `options.maxRetries`: Número máximo de tentativas (padrão: 3).
  - `options.baseDelayMs`: Tempo base de espera em ms (padrão: 100ms).
  - `options.isRetryable(error)`: Função predicado que avalia se a falha é transitória.
- **Fórmula de Backoff com Full Jitter:**
  $$\text{delay} = \text{random}(0, \text{baseDelayMs} \times 2^{\text{attempt}})$$
- **Regras de Negócio:**
  - Erros de Domínio e Validação (`InsufficientFundsError`, `WalletNotFoundError`, erros Zod): `isRetryable(err) === false` $\rightarrow$ aborta na 1ª tentativa imediatamente sem repetição.
  - Erros de Infraestrutura/Rede (`ECONNREFUSED`, `ETIMEDOUT`, deadlock temporário): `isRetryable(err) === true` $\rightarrow$ aguarda o tempo calculado com jitter, emite log `WARN` contendo a tentativa e repete até `maxRetries`.

---

## 3. Matriz de Testes e Critérios de Aceitação (Definition of Done)

| Suíte de Teste | Arquivo | Cenário a Comprovar | Critério de Aceitação |
| :--- | :--- | :--- | :--- |
| **1. Isolamento de Telemetria** | `tests/observability/CorrelationAndLogger.spec.js` | Concorrência assíncrona entre Tenant A e Tenant B disparados em paralelo com `Promise.all`. | Cada log gerado dentro do fluxo assíncrono sai carimbado com o `correlationId` exato da respectiva requisição, sem poluição cruzada. Formato emitido é JSON válido em linha única. |
| **2. Resiliência e Confiabilidade** | `tests/resilience/RetryWithJitter.spec.js` | 1) Operação que falha 2 vezes por falha de conexão e tem sucesso na 3ª.<br>2) Operação que estoura erro de negócio (`InsufficientFundsError`). | 1) Recuperação automática comprovada com 3 chamadas e emissão de logs `WARN`.<br>2) Aborto imediato na 1ª chamada sem qualquer repetição. |
| **3. Diagnóstico de Incidente & RED** | `tests/observability/IncidentDiagnostics.spec.js` | Simulação de lentidão e erro intermitente de banco de dados. | 1) Métricas RED registram acréscimo de taxa, erros e duração.<br>2) Log `ERROR` captura o `correlationId` da requisição causadora da falha. |

---

## 4. Entregável de Diagnóstico (Post-Mortem & ADR)

Ao concluir a validação das suítes de teste, será gerado o documento `docs/post-mortems/incidente-01-post-mortem.md`:
- **Sintoma Observado:** Anomalia nas métricas RED (pico de erros 500 e aumento de latência).
- **Rastreamento:** Identificação do evento através do `correlationId` correlacionando as requisições afetadas.
- **Causa-Raiz:** Falha transitória simulada na camada de banco de dados.
- **Ação Corretiva & ADR:** Justificativa da adoção do `retryWithJitter` e da propagação de contexto via `AsyncLocalStorage`.

