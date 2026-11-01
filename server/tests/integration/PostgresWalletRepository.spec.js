import { describe, it, expect } from "vitest";
import { Wallet } from "../../src/domain/Wallet";
import { Money } from "../../src/domain/Money";
import { PostgresWalletRepository } from "../../src/infra/repositories/PostgresWalletRepository";
import { pool } from "../../src/infra/db/pool.js";

describe("Integração: PostgresWalletRepository - Persistência real no banco de dados", () => {
  it.todo("deve persistir e recuperar carteira no banco de dados");

  it('deve salvar a carteira e buscar no banco real', async () => {
    const repo = new PostgresWalletRepository(pool)
    const wallet = new Wallet('w-real-1', 'tenant-real-1', new Money(5000))

    await repo.save(wallet)

    const encontrada = await repo.findById('w-real-1', 'tenant-real-1')

    expect(encontrada.id).toBe('w-real-1')
    expect(encontrada.balance.amountInCents).toBe(5000)
  })
});

