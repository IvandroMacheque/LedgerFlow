# Especificação Técnica — Fase 7: Frontend Architecture & Chaos Playground (web/)

## 1. Contexto e Objetivo Estratégico

Construir a camada de cliente (`web/`) num formato Monorepo, atuando como um Control Plane e Simulador de Engenharia para o motor LedgerFlow. O objetivo não é criar uma tela bancária convencional, mas tornar visíveis e auditáveis as garantias arquiteturais construídas nas Fases 1 a 6:
- Isolamento Multi-Tenant (proteção BOLA/IDOR)
- Validação estrita de contrato (Zod)
- Idempotência sob concorrência
- Telemetria assíncrona (`correlationId` e métricas RED)
- Consistência eventual via Transactional Outbox.

---

## 2. Decisões Arquiteturais e Contrapontos (SOLID no Cliente)

1. **Separação Estrita entre Lógica e UI (SRP & DIP):**
   - Componentes React (`src/components/`) são estritamente passivos (recebem dados e disparam callbacks via props).
   - É proibido instanciar `fetch`, manipular headers, gerar chaves UUID ou fazer arredondamentos matemáticos dentro de componentes visuais.
2. **Testabilidade em Primeiro Lugar (Headless Logic):**
   - Os módulos de conversão monetária (`utils/currency.js`), transporte HTTP (`services/apiClient.js`), ciclo de vida de idempotência (`state/idempotencyManager.js`) e orquestração de caos/concorrência (`services/chaosRunner.js`) devem ser testáveis via Vitest no ciclo Red-Green-Refactor antes de serem plugados na interface visual.
3. **Zero Optimistic UI para Saldo:**
   - Em sistemas financeiros, a interface nunca deve somar ou subtrair o saldo visualmente antes da confirmação transacional (`200 OK`) do servidor.

---

## 3. Estrutura do Monorepo e Diretórios

```text
ledgerflow/
├── docs/specs/
│   └── fase-07-web-engineering-playground.md
├── src/                             # Backend (Fases 1 a 6)
├── tests/                           # Testes de integração e unidade do backend
└── web/                             # Aplicação cliente (Control Plane & Chaos Playground)
    ├── package.json
    ├── vite.config.js
    ├── src/
    │   ├── utils/
    │   │   └── currency.js          # Conversão segura Float/String <-> Inteiros em Centavos
    │   ├── services/
    │   │   ├── apiClient.js         # Cliente HTTP padronizado com envelope de telemetria
    │   │   └── chaosRunner.js       # Orquestrador de disparos concorrentes e vetores BOLA/Zod
    │   ├── state/
    │   │   └── idempotencyManager.js# Gerenciador do ciclo de vida da idempotencyKey
    │   └── components/              # Camada visual passiva
    └── tests/
        ├── currency.spec.js         # TDD Módulo 1
        ├── idempotencyManager.spec.js # TDD Módulo 2
        ├── apiClient.spec.js        # TDD Módulo 3
        └── chaosRunner.spec.js      # TDD Módulo 4
```

---

## 4. Contratos e Invariantes dos Módulos Lógicos

### Módulo 1: Blindagem Monetária de Borda (`web/src/utils/currency.js`)
- **Problema:** Em JavaScript (IEEE 754), `19.99 * 100` resulta em `1998.9999999999998`. Enviar números com casas decimais para o backend causará rejeição imediata no schema do Zod (`.int()`).
- **Invariantes:**
  1. `toCents(decimalValue)`: Aceita números ou strings numéricas (com ponto ou vírgula, ex.: `"19,99"` ou `19.99`). Rejeita entradas inválidas (`NaN`, `null`, strings vazias, infinitos) lançando erro explícito. Retorna um inteiro exato em centavos (`Math.round`).
  2. `formatCurrency(amountInCents)` / `fromCents`: Recebe um inteiro em centavos e devolve a representação monetária formatada em BRL (`pt-BR`) sem perda de precisão.

### Módulo 2: Gerenciador de Ciclo de Vida de Idempotência (`web/src/state/idempotencyManager.js`)
- **Problema:** Se o frontend gerar um novo UUID a cada clique no botão "Pagar", um clique duplo ou retentativa enviará duas chaves diferentes, burlando a proteção de idempotência do backend.
- **Invariantes:**
  1. Gera chave inicial válida com tamanho mínimo de 16 caracteres compatível com o Zod.
  2. **Imutabilidade durante Falha Transitória:** Se a API retornar erro de rede (timeout/offline) ou erro interno (`500`), a chave atual é preservada para que a retentativa use exatamente a mesma identificação.
  3. **Rotação Pós-Conclusão:** A chave só é rotacionada após sucesso definitivo (`200 OK`), alteração voluntária dos parâmetros do formulário (valor ou tipo) ou regeneração manual explícita.

### Módulo 3: Cliente HTTP de Telemetria (`web/src/services/apiClient.js`)
- **Problema:** Chamadas `fetch` soltas espalham headers inconsistentes, perdem o `x-correlation-id` e tratam falhas de rede de forma imprevisível.
- **Invariantes:**
  1. Injeta `Content-Type: application/json` e `x-tenant-id` ativo.
  2. Propaga e extrai obrigatoriamente `x-correlation-id` da resposta.
  3. **Envelope Padronizado de Telemetria:** Retorna `{ ok, status, data, correlationId, durationMs, timestamp }` em vez de explodir exceções descontroladas em códigos 4xx/5xx.

### Módulo 4: Orquestrador de Caos e Concorrência (`web/src/services/chaosRunner.js`)
- **Problema:** Comprovar empiricamente na interface que o backend resiste a condições de corrida e ataques de autorização.
- **Invariantes:**
  1. **Ataque de Concorrência (Race Condition Burst):** Dispara N requisições simultâneas em paralelo (`Promise.all`) com mesmo payload e mesma `idempotencyKey`, retornando resumo consolidado (quantas responderam 200 vs 409).
  2. **Ataque BOLA Cruzado:** Executa chamada forçando cabeçalho de um tenant (`tenant-beta`) contra recurso de outro (`wallet-alpha-1`) e valida bloqueio 404.

---

## 5. Critérios de Aceitação e Matriz DoD

| Módulo | Arquivo de Teste | Objetivo | Status |
| :--- | :--- | :--- | :--- |
| **1. Blindagem Monetária** | `web/tests/currency.spec.js` | Conversão e formatação exata de centavos sem imprecisão IEEE 754 | **Concluído (GREEN)** |
| **2. Gerenciador de Idempotência** | `web/tests/idempotencyManager.spec.js` | Retenção sob falha e rotação sob sucesso de chaves >= 16 chars | **Concluído (GREEN)** |
| **3. Cliente HTTP Telemetria** | `web/tests/apiClient.spec.js` | Injeção de tenant, captura de correlationId e envelope estruturado | **Concluído (GREEN)** |
| **4. Orquestrador de Caos** | `web/tests/chaosRunner.spec.js` | Disparos paralelos (burst) e teste de invasão cruzada BOLA | **Concluído (GREEN)** |

