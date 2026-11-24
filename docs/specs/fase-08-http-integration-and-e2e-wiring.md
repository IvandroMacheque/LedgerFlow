# Especificação Técnica — Fase 8: Composition Root, HTTP Wiring & Integração E2E (`server/` ↔ `web/`)

## 1. Contexto e Objetivo Estratégico

Conectar a camada de aplicação/domínio do backend (`server/`) e os módulos já testados do frontend (`web/`) através de uma fronteira HTTP real, segura e observável. O objetivo é fechar o ciclo completo do monorepo sem quebrar a **Clean Architecture**, o **SOLID** nem as garantias já validadas (ACID, bloqueio pessimista, idempotência, anti-BOLA/IDOR, telemetria com `AsyncLocalStorage`, métricas RED e *Transactional Outbox*).

## 2. Princípios Arquiteturais e Guardrails para o Agente de IA

* **Composition Root Isolado:** Apenas o ponto de entrada da aplicação (`app.js` / `server.js`) instancia dependências concretas (`pg.Pool`, repositórios, casos de uso, workers, middlewares). Regras de negócio em `domain/` e `application/` continuam sem dependência de HTTP ou frameworks.
* **Ordem Determinística de Middlewares:** CORS + JSON parser → Contexto de Observabilidade (`AsyncLocalStorage` + métricas RED) → Rotas de diagnóstico/sandbox → Validação de Tenant (`x-tenant-id`) nas rotas protegidas → Controllers/Rotas de domínio → `errorHandler` centralizado por último.
* **Visibilidade de Headers no Browser (CORS):** O backend deve expor explicitamente `x-correlation-id` (`exposedHeaders`) e permitir `x-tenant-id` e `x-correlation-id` (`allowedHeaders`) para que o `apiClient` do `web/` leia o identificador de rastreio nas respostas.
* **TDD & Verificação Contínua:** Cada nova rota, middleware de borda ou ponto de integração deve ter testes cobrindo caminho feliz, falhas (`400`, `404`, `409`, `422`, `500`) e propagação de `x-correlation-id`, mantendo a suíte do `server/` e do `web/` verde.

---

## 3. Contratos HTTP e Endpoints Exigidos no `server/`

### A. Middleware de Observabilidade e Contexto

* Deve gerar ou aceitar `x-correlation-id` de entrada, abrir o contexto do `AsyncLocalStorage` para toda a cadeia assíncrona da requisição e anexar `x-correlation-id` no cabeçalho da resposta HTTP (`res.setHeader`).
* Deve registrar métricas **RED** (*Rate*, *Errors*, *Duration*) por rota/status.

### B. Rotas de Domínio (Protegidas por `x-tenant-id`)

* **`POST /payments`**: Valida payload com Zod, extrai o tenant autenticado (`x-tenant-id`), executa o caso de uso de pagamento (com idempotência, bloqueio ACID e registro atômico no *Transactional Outbox*) e repassa qualquer exceção para o `errorHandler` via `next(error)`.
* **`GET /wallets/:id`**: Consulta a carteira exigindo o vínculo estrito com o `tenantId` do contexto (`(id, tenant_id)`). Se não pertencer ao tenant ou não existir, deve retornar `404` sem vazar existência do recurso (anti-BOLA/IDOR).

### C. Rotas de Suporte ao Chaos Playground e Diagnóstico

* **`GET /outbox`**: Retorna os eventos recentes de `outbox_events` (`id`, `type`, `status`, `attempts`, `created_at`, `processed_at`) para o monitor do frontend acompanhar transições `PENDING` → `PROCESSED`.
* **`GET /metrics`**: Retorna o snapshot atual das métricas RED e estado resumido de observabilidade.
* **`GET /health`**: Verifica conectividade básica do serviço/banco para *healthcheck*.
* **`POST /sandbox/reset`**: Restaura o estado inicial das carteiras/dados de demonstração e limpa eventos de teste, permitindo repetir simulações de BOLA, concorrência e idempotência no navegador de forma limpa.

---

## 4. Integração no Frontend (`web/`)

* **Configuração de Ambiente:** Definir a URL base da API do `server/` em `web/.env` (ex.: `VITE_API_URL=http://localhost:3000`).
* **Ligação do `apiClient` e Hooks:** Substituir *mocks*/simulações locais onde houver integração real com o `server/`, preservando:
1. Reutilização da mesma `idempotencyKey` em falhas de rede ou `500`, e rotação apenas após sucesso (`200`) ou alteração explícita da intenção.
2. Conversão decimal → centavos (`Math.round`) antes do envio.
3. Propagação e leitura de `x-correlation-id` em todas as chamadas exibidas no terminal de telemetria.
4. Zero *Optimistic UI* indevida no saldo antes da confirmação do servidor.

---

## 5. Lifecycle do Processo e Graceful Shutdown (`server.js`)

* Iniciar o servidor HTTP na porta configurada (`PORT`, padrão `3000`) e iniciar o `OutboxWorker` (`SKIP LOCKED`) no ciclo de vida da aplicação.
* Capturar sinais `SIGINT` e `SIGTERM` para interromper o loop do worker com segurança, encerrar conexões HTTP pendentes e fechar o `Pool` do PostgreSQL sem deixar transações abertas.

---

## 6. Roteiro Passo a Passo para o Agente de IA Guiar a Implementação

1. **Passo 1 — Camada HTTP & CORS:** Criar/ajustar o `app.js` com CORS (`allowedHeaders` e `exposedHeaders` incluindo `x-correlation-id`), parser JSON, middleware de `AsyncLocalStorage` + métricas RED e `errorHandler` final.
2. **Passo 2 — Rotas de Carteira e Pagamento:** Conectar `POST /payments` e `GET /wallets/:id` ao middleware de `tenantContext` e aos casos de uso/repositórios existentes, validando anti-BOLA e erros `400`/`404`/`409`/`422`/`500`.
3. **Passo 3 — Rotas do Playground (`/outbox`, `/metrics`, `/health`, `/sandbox/reset`):** Expor os endpoints de leitura e reset de ambiente de teste.
4. **Passo 4 — Entrypoint & Graceful Shutdown:** Criar/concluir o `server.js` subindo HTTP + `OutboxWorker` e tratando `SIGINT`/`SIGTERM`.
5. **Passo 5 — Integração `web/` ↔ `server/`:** Configurar `VITE_API_URL`, conectar `apiClient`, hooks de pagamento, caos e polling do Outbox ao servidor real, e rodar testes integrados + validação manual no navegador.

---

## 7. Critérios de Aceitação Final e Matriz DoD

| Módulo / Etapa | Arquivo / Teste | Objetivo | Status |
| :--- | :--- | :--- | :--- |
| **Passo 1 — HTTP Core & CORS** | `server/tests/http/app.spec.js` | CORS (`exposedHeaders`), JSON parser, AsyncLocalStorage, RED metrics, errorHandler | **Concluído (GREEN)** |
| **Passo 2 — Rotas de Domínio** | `server/tests/http/domainRoutes.spec.js` | `POST /payments` (Zod + Idempotência + Outbox) e `GET /wallets/:id` (anti-BOLA 404) | **Concluído (GREEN)** |
| **Passo 3 — Rotas do Playground** | `server/tests/http/playgroundRoutes.spec.js` | `/outbox`, `/metrics`, `/health`, `/sandbox/reset` | **Concluído (GREEN)** |
| **Passo 4 — Server & Shutdown** | `server/tests/http/serverLifecycle.spec.js` | Inicialização limpa e encerramento com `SIGINT`/`SIGTERM` fechando Pool e Worker | **Concluído (GREEN)** |
| **Passo 5 — Integração E2E** | `web/src/hooks/` & E2E Wiring | Conectar `apiClient` e hooks ao `server/` real, mantendo invariantes do cliente | **Concluído (GREEN)** |
