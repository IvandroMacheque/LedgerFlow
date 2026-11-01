import { describe, it, expect } from "vitest";
import { Wallet } from "../src/domain/Wallet";
import { Money } from "../src/domain/Money";
import { InMemoryWalletRepository } from "../src/infra/repositories/InMemoryWalletRepository";

describe("Adaptador de Infraestrutura: InMemoryWalletRepository - Persistência em memória com isolamento multi-tenant", () => {
  // Testes do repositório em memória serão implementados aqui

  it('deve salvar a carteira no repositorio e buscar pelo seu id e tenantId', async () => {
    const repo = new InMemoryWalletRepository()
    const wallet = new Wallet('w-1', 'tenant-1', new Money(1000))

    await repo.save(wallet)

    const encontrada = await repo.findById('w-1', 'tenant-1')

    expect(encontrada).not.toBeNull()
    expect(encontrada.id).toBe('w-1')
    expect(encontrada.balance.amountInCents).toBe(1000)
  })

  it('deve retornar null ao buscar uma carteira inexistente', async () => {
    const repo = new InMemoryWalletRepository()

    // se nao coloca o await o resultado se torna um promisse
    const resultado = await repo.findById('inexistente', 'tenant-1')

    expect(resultado).toBeNull()
  })

  it('deve retornar null caso a carteira com o mesmo id for buscada mas com tenantId diferente', async () => {
    const repo = new InMemoryWalletRepository()
    const wallet = new Wallet('w-1', 'tenant-A', new Money(1000))

    await repo.save(wallet)

    const resultado = await repo.findById('w-1', 'tenant-B')

    expect(resultado).toBeNull()
  })

  it('deve refletir novo saldo se a carteira for debitada e salvar novamente com .save', async () => {
    const repo = new InMemoryWalletRepository()
    const wallet = new Wallet('w-1', 'tenant-1', new Money(1000))

    wallet.debit(new Money(200), new Money(50))

    await repo.save(wallet)

    // buscar a carteira atualizada
    const atualizada = await repo.findById('w-1', 'tenant-1')

    expect(atualizada.balance.amountInCents).toBe(750)
  })
});
