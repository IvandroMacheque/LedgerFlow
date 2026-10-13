import { describe, it, expect } from "vitest";
import { PostgresWalletRepository } from "../../src/infra/repositories/PostgresWalletRepository";
import { pool } from "../../src/infra/db/pool";
import { Wallet } from "../../src/domain/Wallet";
import { Money } from "../../src/domain/Money";

describe("Integração: ConcurrencyStress - Prevenção de Race Condition via Pessimistic Locking", () => {
  it.todo("deve prevenir race condition com débitos simultâneos sob pessimistic locking");

  it('deve esperar a primeira requisicao retornar como concluida para iniciar outra', async () => {
    const repo = new PostgresWalletRepository(pool)
    const wallet = new Wallet('wallet-real-4', 'tenant-real-4', new Money(1000))

    await repo.save(wallet)

    async function debitarComLock() {
      return repo.runInTransaction(async (client) => {
        const carteiraComLock = await repo.findByIdWithLock('wallet-real-4', 'tenant-real-4', client)

        carteiraComLock.debit(new Money(200), new Money(0))

        await repo.save(carteiraComLock, client)

        return 'DEBITADO_COM_SUCESSO'
      })
    }

    const req = Array.from({ length: 10 }, () => debitarComLock()) // rodar a funcao de debitar 10 vezes
    const resultados = await Promise.allSettled(req) // permite que o codigo nao quebre quando outras falharem

    const sucessos = resultados.filter(r => r.status === 'fulfilled')
    expect(sucessos.length).toBe(5)

    const falhas = resultados.filter(r => r.status === 'rejected')
    expect(falhas.length).toBe(5)

    const carteiraFinal = await repo.findById('wallet-real-4', 'tenant-real-4')
    expect(carteiraFinal.balance.amountInCents).toBe(0)
  })
});

