# Especificação Funcional — Fase 6: System Design, Integração Distribuída e Governança de IA

**Objetivo:** Eliminar o Problema da Escrita Dupla (Dual-Write Problem) em operações financeiras distribuídas do LedgerFlow através do padrão **Transactional Outbox**, polling seguro com bloqueio transacional (`FOR UPDATE SKIP LOCKED`), despacho resiliente com propagação de telemetria e garantia de entrega *At-Least-Once* neutralizada por um **Consumidor Idempotente**.

---

## 1. Análise Crítica: O Problema da Escrita Dupla (Dual-Write)

Em arquiteturas distribuídas e de microsserviços, a tentativa de gravar localmente no banco de dados e notificar um serviço externo (HTTP Webhook, RabbitMQ, Kafka) de forma sequencial ingênua introduz falhas críticas de consistência:

```text
[Cliente] ---> [Use Case] ---> (1) PostgreSQL: COMMIT (Débito efetuado)
                                 │
                                 └───> [CRASH / Falha de Rede]
                                         │
                                         X (2) Webhook NÃO disparado! (Inconsistência)
```

1. **Cenário A (Perda de Evento):** O débito sofre `COMMIT`, mas o processo Node.js reinicia ou a rede cai antes da chamada HTTP/Fila. O dinheiro foi subtraído, mas o sistema externo nunca soube.
2. **Cenário B (Evento Fantasma):** O Webhook é enviado antes do `COMMIT`. Uma falha de disco ou restrição de integridade provoca `ROLLBACK` no banco. O sistema externo foi notificado de uma transação que legalmente nunca existiu.

### A Solução: Transactional Outbox + Consumidor Idempotente
Ao invés de tentar transações distribuídas (2PC/XA — lentas e propensas a bloqueios), adotamos **Consistência Eventual** com 3 estágios desacoplados:
1. **Escrita Atômica:** O evento de negócio é inserido na tabela `outbox_events` na mesma transação SQL (`BEGIN ... COMMIT`) do débito/crédito da carteira.
2. **Worker Assíncrono com Polling:** Processo em segundo plano que lê eventos com status `PENDING` utilizando `FOR UPDATE SKIP LOCKED` e despacha via Webhook usando o motor `retryWithJitter`.
3. **Consumidor Idempotente:** O receptor no destino dedupica requisições através do cabeçalho `x-event-id`, garantindo semântica *Exactly-Once* no nível de aplicação mesmo sob entrega *At-Least-Once*.

---

## 2. Topologia de Diretórios da Fase 6

```text
src/
├── domain/                         # Entidades e regras de negócio puras (intactas)
├── application/                    # Casos de Uso
│   └── ProcessPaymentUseCase.js    # Orquestração com gravação atômica no Outbox
├── infra/
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_create_wallets_and_ledger.sql
│   │   │   └── 002_create_outbox_events.sql       # NOVO: Esquema SQL do Outbox
│   │   └── pool.js
│   ├── repositories/
│   │   ├── PostgresWalletRepository.js
│   │   └── PostgresOutboxRepository.js            # NOVO: Operações de persistência do Outbox
│   ├── observability/                             # Fase 5 (Logger, Metrics, Context)
│   ├── resilience/                                # Fase 5 (retryWithJitter)
│   └── workers/                                   # NOVO: Camada de Mensageria & Background Jobs
│       ├── OutboxWorker.js                        # Motor de polling contínuo e batch
│       ├── WebhookDispatcher.js                   # Cliente HTTP resiliente com headers
│       └── IdempotentWebhookConsumer.js           # Receptor idempotente de webhooks
tests/
└── integration/
    ├── TransactionalOutbox.spec.js                # NOVO: Prova de atomicidade ACID (Rollback/Commit)
    └── OutboxWorkerAndIdempotency.spec.js         # NOVO: Polling, Retry e Deduplicação no Consumidor
docs/
├── adr/
│   └── adr-001-transactional-outbox-and-modular-monolith.md # NOVO: Decisão Monólito Modular vs Fila
└── specs/
    └── fase-06-system-design-governance.md        # Esta especificação
```

---

## 3. Contratos de Dados e Esquema de Banco de Dados

### 3.1 Migração SQL: `002_create_outbox_events.sql`
```sql
CREATE TABLE IF NOT EXISTS outbox_events (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    correlation_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created 
ON outbox_events (status, created_at ASC);
```

### 3.2 Contrato do Repositório: `PostgresOutboxRepository`
* `save(event, client)`: Insere o evento na tabela `outbox_events` utilizando o `client` dedicado da transação ativa.
* `fetchPending(batchSize, client)`:
  ```sql
  SELECT id, tenant_id, event_type, payload, attempts, correlation_id
  FROM outbox_events
  WHERE status = 'PENDING'
  ORDER BY created_at ASC
  LIMIT $1
  FOR UPDATE SKIP LOCKED;
  ```
* `markAsProcessed(eventId, client = null)`: Atualiza `status = 'PROCESSED'` e `updated_at = NOW()`.
* `markAsFailed(eventId, error, client = null)`: Incrementa `attempts`, registra `last_error = error.message`, e se `attempts >= maxAttempts`, altera `status = 'FAILED'`.

---

## 4. Contratos dos Módulos Técnicos

### 4.1 Worker Assíncrono (`src/infra/workers/OutboxWorker.js`)
* **Responsabilidade:** Buscar lotes de eventos pendentes sem bloquear workers paralelos (`FOR UPDATE SKIP LOCKED`) e orquestrar o envio via `WebhookDispatcher`.
* **Métodos Obrigatórios:**
  * `processBatch(batchSize = 10)`: Executa um ciclo determinístico de polling e processamento (ideal para testes unitários e de integração).
  * `start(intervalMs = 1000)`: Inicia loop periódico via `setInterval` seguro (evitando sobreposição se o lote demorar mais que o intervalo).
  * `stop()`: Interrompe o loop de polling de forma graciosa.

### 4.2 Despachante Resiliente (`src/infra/workers/WebhookDispatcher.js`)
* **Responsabilidade:** Disparar a chamada de rede HTTP para a URL configurada do Webhook.
* **Resiliência:** Envolve a chamada de rede com `retryWithJitter` da Fase 5.
* **Cabeçalhos Obrigatórios:**
  * `x-event-id`: Identificador único do evento (UUID).
  * `x-correlation-id`: Correlation ID original herdado da requisição que gerou o pagamento.
  * `x-tenant-id`: Tenant dono da operação.

### 4.3 Consumidor Idempotente (`src/infra/workers/IdempotentWebhookConsumer.js`)
* **Responsabilidade:** Simular/implementar o receptor de webhooks com proteção contra duplicidade.
* **Comportamento:**
  * Mantém tabela/registro de `processed_event_ids`.
  * Se o evento já existir: ignora a execução do efeito colateral e retorna `{ status: 200, duplicated: true, message: 'Evento já processado anteriormente' }`.
  * Se o evento for inédito: executa o efeito colateral, salva o ID e retorna `{ status: 200, duplicated: false }`.

---

## 5. Matriz de Testes e Critérios de Aceitação (Definition of Done)

| Entregável | Arquivo de Teste | Cenário a Comprovar | Critério de Aceitação | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Atomicidade Transacional do Outbox** | `tests/integration/TransactionalOutbox.spec.js` | 1) Transação de pagamento bem-sucedida.<br>2) Erro proposital disparado após atualizar carteira mas antes do commit. | 1) Carteira debitada e evento gravado na tabela `outbox_events` com status `PENDING`.<br>2) `ROLLBACK` atômico completo: saldo permanece intacto e **nenhum** evento é criado na tabela `outbox_events`. | **Concluído (GREEN)** |
| **2. Concorrência Segura do Worker** | `tests/integration/OutboxWorkerAndIdempotency.spec.js` | Duas instâncias do `OutboxWorker` executando `processBatch()` simultaneamente sobre 5 eventos pendentes. | Nenhuma linha é processada duas vezes simultaneamente graças ao `FOR UPDATE SKIP LOCKED`. | **Concluído (GREEN)** |
| **3. Resiliência e Consumidor Idempotente** | `tests/integration/OutboxWorkerAndIdempotency.spec.js` | 1) Webhook falha 2 vezes por rede e sucede na 3ª.<br>2) Simulação de rede onde o webhook chega no destino mas cai no retorno, gerando 2ª entrega. | 1) `retryWithJitter` recupera o envio e o evento muda para `PROCESSED`.<br>2) Consumidor idempotente ignora a 2ª chamada sem reprocessar regras de negócio. | **Concluído (GREEN)** |

---

## 6. Governança de Arquitetura e Decisões (ADR-001)

Como quarto entregável formal, será criado o arquivo `docs/adr/adr-001-transactional-outbox-and-modular-monolith.md` formalizando:
1. **Trade-offs CAP:** Por que consistência eventual via Outbox no PostgreSQL é superior a transações 2PC e microsserviços prematuros no estágio atual do LedgerFlow.
2. **Custo Operacional e de Infraestrutura:** Uso do PostgreSQL nativo com `SKIP LOCKED` como fila transacional confiável antes de justificar a complexidade de Kafka/RabbitMQ.
3. **Padrões de Governança para Agentes de IA:** Diretrizes de contratos estritos, schemas de validação Zod e metas de mutation testing como esteira inegociável de qualidade.

