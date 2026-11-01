import { describe, it, expect } from "vitest";
import { InMemoryWalletRepository } from "../src/infra/repositories/InMemoryWalletRepository";
import { IdempotencyStore } from "../src/domain/idempotencyStore";
import { ProcessPaymentUseCase } from "../src/application/ProcessPaymentUseCase";
import { Wallet } from "../src/domain/Wallet";
import { Money } from "../src/domain/Money";

describe("Caso de Uso: ProcessPaymentUseCase - Orquestração de transações com taxas, persistência e idempotência", () => {
  // Testes do caso de uso serão implementados aqui

  it('deve realizar o pagamento e retornar o novo saldo e persistir a carteira no repositorio', async () => {
    const command = {
      tenantId: 'tenant-1',
      walletId: 'w-1',
      type: 'DEBIT',
      amountInCents: 5000,
      idempotencyKey: 'req-1'
    }

    const wallet = new Wallet('w-1', 'tenant-1', new Money(10000))

    const repo = new InMemoryWalletRepository()
    const idempotencyStore = new IdempotencyStore()
    const useCase = new ProcessPaymentUseCase(repo, idempotencyStore)

    await repo.save(wallet)

    const result = await useCase.execute(command)

    const walletNoRepo = await repo.findById('w-1', 'tenant-1')

    expect(result.balanceInCents).toBe(4875)
    expect(result.feeInCents).toBe(125)
    expect(walletNoRepo.balance.amountInCents).toBe(4875)
  })

  it('deve lancar erro de carteira nao encontrada caso a carteira nao for achada', async () => {
    const command = {
      tenantId: 'tenant-2',
      walletId: 'w-1',
      type: 'DEBIT',
      amountInCents: 5000,
      idempotencyKey: 'req-1'
    }

    const wallet = new Wallet('w-1', 'tenant-1', new Money(10000))

    const repo = new InMemoryWalletRepository()
    const idempotencyStore = new IdempotencyStore()
    const useCase = new ProcessPaymentUseCase(repo, idempotencyStore)

    await repo.save(wallet)

    await expect(useCase.execute(command)).rejects.toThrow('Wallet not found')
  })

  it('deve creditar e retornar o novo saldo e persistir a carteira no repositorio', async () => {
    const command = {
      tenantId: 'tenant-1',
      walletId: 'w-1',
      type: 'CREDIT',
      amountInCents: 5000,
      idempotencyKey: 'req-1'
    }

    const wallet = new Wallet('w-1', 'tenant-1', new Money(1000))

    const repo = new InMemoryWalletRepository()
    const idempotencyStore = new IdempotencyStore()
    const useCase = new ProcessPaymentUseCase(repo, idempotencyStore)

    await repo.save(wallet)

    const result = await useCase.execute(command)

    const walletNoRepo = await repo.findById('w-1', 'tenant-1')

    expect(result.balanceInCents).toBe(5875)
    expect(result.feeInCents).toBe(125)
    expect(walletNoRepo.balance.amountInCents).toBe(5875)
  })

  it('deve retornar o mesmo resultado anterior caso a mesma idempotecykey for enviada novamente', async () => {
    const command = {
      tenantId: 'tenant-1',
      walletId: 'w-1',
      type: 'DEBIT',
      amountInCents: 5000,
      idempotencyKey: 'req-1'
    }

    const wallet = new Wallet('w-1', 'tenant-1', new Money(10000))

    const repo = new InMemoryWalletRepository()
    const idempotencyStore = new IdempotencyStore()
    const useCase = new ProcessPaymentUseCase(repo, idempotencyStore)

    await repo.save(wallet)

    const result1 = await useCase.execute(command)
    const result2 = await useCase.execute(command)

    expect(result2).toEqual(result1)
  })
});
