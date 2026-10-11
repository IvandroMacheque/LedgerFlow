# Especificação Funcional — Fase 3: Persistência, Concorrência e Transações

**Objetivo:** Substituir o repositório em memória por um repositório real conectado ao PostgreSQL via driver nativo `pg`, gerenciar transações ACID manuais, blindar o sistema contra concorrência severa usando Pessimistic Locking (`SELECT ... FOR UPDATE`) e comprovar a mitigação de race conditions com testes de estresse assíncronos.

---

## 1. Topologia de Infraestrutura

Adicionamos a persistência relacional sem alterar nenhuma linha do `domain/`:

```text
src/
├── domain/                      # Intacto (Zero alterações)
├── application/                 # Intacto
└── infra/
    ├── db/
    │   ├── pool.js              # Gerenciador de conexão PostgreSQL (pg.Pool)
    │   └── migrations/
    │       └── 001_create_wallets_and_ledger.sql
    └── repositories/
        ├── InMemoryWalletRepository.js
        └── PostgresWalletRepository.js  # Implementação do contrato do domínio
```

---

## 2. Modelagem Relacional & DDL SQL

Arquivo: `src/infra/db/migrations/001_create_wallets_and_ledger.sql`

```sql
-- Tabela de Carteiras
CREATE TABLE IF NOT EXISTS wallets (
    id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    balance_cents BIGINT NOT NULL CHECK (balance_cents >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id) -- Chave composta garante isolamento de tenant
);

-- Tabela de Ledger (Livro-Razão Imutável / Extrato)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    wallet_id VARCHAR(64) NOT NULL,
    type VARCHAR(16) NOT NULL CHECK (type IN ('DEBIT', 'CREDIT', 'REFUND')),
    amount_cents BIGINT NOT NULL,
    fee_cents BIGINT NOT NULL,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id, wallet_id) REFERENCES wallets (tenant_id, id)
);

-- Índice para consultas frequentes de extrato
CREATE INDEX IF NOT EXISTS idx_ledger_wallet_tenant 
ON ledger_entries (tenant_id, wallet_id, created_at DESC);
```

> **Atenção de Engenharia:** Note o `CHECK (balance_cents >= 0)` direto no banco de dados. O banco é o último guardião da integridade se a aplicação falhar.

---

## 3. O Problema da Concorrência e o Bloqueio Pessimista

### O Cenário de Falha (Race Condition)
1. Saldo atual: `1000` (10,00).
2. Requisição A quer debitar `800`. Lê o saldo: `1000` $\rightarrow$ Válido.
3. No mesmo instante, Requisição B quer debitar `800`. Lê o saldo: `1000` $\rightarrow$ Válido.
4. Requisição A calcula $1000 - 800 = 200$ e grava `200`.
5. Requisição B calcula $1000 - 800 = 200$ e grava `200`.
6. **Resultado desastroso:** Saíram 1.600 de uma conta que só tinha 1.000, e o saldo final ficou em 200!

### A Solução: `SELECT ... FOR UPDATE`
Ao executar um débito, a leitura da linha no banco deve travar o registro a nível de linha (*Row-level lock*) dentro de uma transação até o `COMMIT`:

```sql
BEGIN;

-- Qualquer outra transação concorrente tentando ler esta linha com FOR UPDATE
-- ficará bloqueada na fila até que esta transação faça COMMIT ou ROLLBACK:
SELECT id, tenant_id, balance_cents 
FROM wallets 
WHERE id = $1 AND tenant_id = $2 
FOR UPDATE;

-- Aplica o débito na memória...

UPDATE wallets 
SET balance_cents = $3, updated_at = NOW() 
WHERE id = $1 AND tenant_id = $2;

COMMIT;
```

---

## 4. Especificação: `PostgresWalletRepository`

Deve implementar a interface conceitual de repositório, mas suportando contexto transacional:

### Métodos Obrigatórios:
- `findById(id, tenantId, client = null)`: Se `client` (conexão dedicada) for passado, executa dentro dele.
- `findByIdWithLock(id, tenantId, client)`: Executa obrigatoriamente `SELECT ... FOR UPDATE`. Requer uma conexão ativa de transação.
- `save(wallet, client = null)`: Executa o `UPDATE` de saldo ou inserção inicial.
- `runInTransaction(callback)`: Adquire um cliente do Pool, executa `BEGIN`, passa o cliente para o callback e executa `COMMIT` em caso de sucesso ou `ROLLBACK` em caso de erro, devolvendo o cliente ao Pool no bloco `finally`.

---

## 5. Critérios de Aceitação e Testes Automatizados

| Arquivo de Teste | Objetivo do Teste | O que deve ser comprovado |
| :--- | :--- | :--- |
| `tests/integration/PostgresWalletRepository.spec.js` | Persistência Real | Salvar e recuperar carteira do banco PostgreSQL real. |
| `tests/integration/TransactionRollback.spec.js` | Atomicidade ACID | Forçar um erro no meio do processo e provar que o saldo não foi alterado no banco (`ROLLBACK` funcionou). |
| `tests/integration/ConcurrencyStress.spec.js` | O Teste de Fogo (Race Condition) | Disparar 10 débitos simultâneos de 200 via `Promise.allSettled()` contra uma carteira com saldo exato de 1.000. |

### O Teste de Concorrência Explicado:
- **Entrada:** Carteira com 1.000 centavos.
- **Ação:** Disparar 10 promessas paralelas tentando debitar 200 cada (total solicitado: 2.000).
- **Resultado Invariante Esperado:**
  - Exatamente 5 promessas devem ter sucesso (`fulfilled`).
  - Exatamente 5 promessas devem ser rejeitadas com `InsufficientFundsError`.
  - O saldo final persistido no banco de dados deve ser exatamente 0 (nunca negativo).

