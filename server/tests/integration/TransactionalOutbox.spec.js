import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pool } from '../../src/infra/db/pool.js';
import { PostgresWalletRepository } from '../../src/infra/repositories/PostgresWalletRepository.js';
import { PostgresOutboxRepository } from '../../src/infra/repositories/PostgresOutboxRepository.js';
import { ProcessPaymentUseCase } from '../../src/application/ProcessPaymentUseCase.js';
import { IdempotencyStore } from '../../src/domain/idempotencyStore.js';
import { Wallet } from '../../src/domain/Wallet.js';
import { Money } from '../../src/domain/Money.js';

describe('Transactional Outbox - Garantia de Atomicidade ACID (Fase 6)', () => {
  // Entregável 1: Provar que débito e evento no outbox ocorrem na mesma transação (Commit ou Rollback conjunto)
  beforeEach(async () => {
    await pool.query('DELETE FROM outbox_events;');
    await pool.query('DELETE FROM ledger_entries;');
    await pool.query('DELETE FROM wallets;');
  })

  it('deve persistir a alteracao de saldo da carteira e o evento de outbox atomicamente no mesmo commit', async () => {
    // 1. Caminho Feliz: Setup da carteira, transação com débito + outboxRepo.save, e asserções após o COMMIT
    const walletRepo = new PostgresWalletRepository(pool)
    const outboxRepo = new PostgresOutboxRepository(pool)

    const wallet = new Wallet('wallet-outbox-1', 'tennant-1', new Money(5000))
    await walletRepo.save(wallet)

    await walletRepo.runInTransaction(async (client) => {
      const money = new Money(1000)
      wallet.debit(money, new Money(0))

      await walletRepo.save(wallet, client)

      const event = {
        id: 'event-outbox-1',
        tenantId: 'tenant-1',
        eventType: 'PAYMENT_DEBITED',
        payload: { amountInCents: 1000 },
        status: 'PENDING',
        attempts: 0,
        correlationId: 'corr-123',
      }
      await outboxRepo.save(event, client)
    })

    const updatedWallet = await walletRepo.findById('wallet-outbox-1', 'tennant-1')
    expect(updatedWallet.balance.amountInCents).toBe(4000)

    const query = await pool.query('SELECT * FROM outbox_events WHERE id = $1', ['event-outbox-1'])
    expect(query.rows.length).toBe(1)
    expect(query.rows[0].status).toBe('PENDING')

  })

  it('deve realizar rollback conjunto desfazendo a alteracao da carteira e impedindo gravacao no outbox caso ocorra erro', async () => {
    // 2. Prova de Atomicidade: Falha forçada antes do commit garantindo zero alteração de saldo e zero eventos fantasmas
    const wallet = new Wallet('wallet-outbox-2', 'tenant-1', new Money(5000))
    const walletRepo = new PostgresWalletRepository(pool)
    const outboxRepo = new PostgresOutboxRepository(pool)

    await walletRepo.save(wallet)

    await expect(walletRepo.runInTransaction(async (client) => {
      const money = new Money(1000)
      wallet.debit(money, new Money(0))

      await walletRepo.save(wallet, client)

      const event = {
        id: 'event-outbox-2',
        tenantId: 'tenant-1',
        eventType: 'PAYMENT_DEBITED',
        payload: { amountInCents: 1000 },
        status: 'PENDING',
        attempts: 0,
        correlationId: 'corr-123',
      }
      await outboxRepo.save(event, client)

      throw new Error('Erro proposital antes de COMMIT')
    })).rejects.toThrow('Erro proposital antes de COMMIT')

    const savedWallet = await walletRepo.findById('wallet-outbox-2', 'tenant-1')
    expect(savedWallet.balance.amountInCents).toBe(5000)
    
    const query = await pool.query(
      'SELECT * FROM outbox_events WHERE id = $1',
      ['event-outbox-2']
    )
    expect(query.rows.length).toBe(0)
  })
})

