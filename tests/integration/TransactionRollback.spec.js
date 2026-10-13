import { describe, it, expect } from "vitest";
import { PostgresWalletRepository } from "../../src/infra/repositories/PostgresWalletRepository";
import { pool } from "../../src/infra/db/pool";
import { Wallet } from "../../src/domain/Wallet";
import { Money } from "../../src/domain/Money";

describe("Integração: TransactionRollback - Garantia de atomicidade ACID", () => {
  it.todo("deve executar rollback em caso de falha transacional");

  it('deve manter o saldo quando houver um erro antes de salvar o valor', async () => {
    const repo = new PostgresWalletRepository(pool)
    const wallet = new Wallet(
      'wallet-real-3', 
      'tenant-real-3', 
      new Money(5000)
    )

    await repo.save(wallet)

    await expect(
      repo.runInTransaction(async (client) => {
        wallet.debit(new Money(2000), new Money(50))
        await repo.save(wallet, client)

        throw new Error('Erro forcado no meio da transacao')
      })
    ).rejects.toThrow('Erro forcado no meio da transacao')

    const carteiraNoBanco = await repo.findById('wallet-real-3', 'tenant-real-3')
    expect(carteiraNoBanco.balance.amountInCents).toBe(5000)
  })
});

