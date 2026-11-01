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

