import { describe, it, expect, beforeEach } from 'vitest';
import { tenantContext } from '../../src/presentation/middlewares/tenantContext.js';
import { PaymentController } from '../../src/presentation/controllers/PaymentController.js';
import { InMemoryWalletRepository } from '../../src/infra/repositories/InMemoryWalletRepository.js';
import { ProcessPaymentUseCase } from '../../src/application/ProcessPaymentUseCase.js';
import { Wallet } from '../../src/domain/Wallet.js';
import { Money } from '../../src/domain/Money.js';
import { PostgresWalletRepository } from '../../src/infra/repositories/PostgresWalletRepository.js';
import { pool } from '../../src/infra/db/pool.js';
import { IdempotencyStore } from '../../src/domain/idempotencyStore.js';
import { errorHandler } from '../../src/presentation/middlewares/errorHandler.js';

describe('BOLA / IDOR Protection (Broken Object Level Authorization)', () => {
  // Sua tarefa será simular a invasão cruzada entre tenants aqui

  it('deve impedir do cliente beta acessar e modificar os dados do alpha', async () => {
    const wallet = new Wallet(
      'wallet-alpha-1',
      'tenant-alpha',
      new Money(5000)
    )
    const repo = new PostgresWalletRepository(pool)
    const useCase = new ProcessPaymentUseCase(repo, new IdempotencyStore())
    const controller = new PaymentController(useCase)

    await repo.save(wallet)

    const req = {
      headers: {
        'x-tenant-id': 'tenant-beta'
      },
      body: {
        walletId: 'wallet-alpha-1',
        amountInCents: 1000,
        idempotencyKey: 'idemp-chave-segura-12345',
        type: 'DEBIT'
      }
    }

    const res = {
      statusCode: null,
      data: null,
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        this.data = payload
        return this
      }
    }

    await tenantContext(req, res, async () => {
      await controller.handle(req, res, (err) => errorHandler(err, req, res))
    })
    // await controller.handle(req, res)

    expect(res.statusCode).toBe(404)

    const victim = await repo.findById('wallet-alpha-1', 'tenant-alpha')
    expect(victim.balance.amountInCents).toBe(5000)
  })

  it('deve impedir do cliente sem cabecalho acessar e modificar os dados do alpha', async () => {
    const wallet = new Wallet(
      'wallet-alpha-1',
      'tenant-alpha',
      new Money(5000)
    )
    const repo = new PostgresWalletRepository(pool)
    const useCase = new ProcessPaymentUseCase(repo, new IdempotencyStore())
    const controller = new PaymentController(useCase)

    await repo.save(wallet)

    const req = {
      headers: {},
      body: {
        walletId: 'wallet-alpha-1',
        amountInCents: 1000,
        idempotencyKey: 'idemp-chave-segura-12345',
        type: 'DEBIT'
      }
    }

    const res = {
      statusCode: null,
      data: null,
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        this.data = payload
        return this
      }
    }

    tenantContext(req, res, async () => {
      // o controller so deve ser chamado apos passar pelo context
      await controller.handle(req, res, (err) => errorHandler(err, req, res))
    })

    expect(res.statusCode).toBe(401)

    const victim = await repo.findById('wallet-alpha-1', 'tenant-alpha')
    expect(victim.balance.amountInCents).toBe(5000)
  })

  it('deve impedir do cliente com cabecalho vazio acessar e modificar os dados do alpha', async () => {
    const wallet = new Wallet(
      'wallet-alpha-1',
      'tenant-alpha',
      new Money(5000)
    )
    const repo = new PostgresWalletRepository(pool)
    const useCase = new ProcessPaymentUseCase(repo, new IdempotencyStore())
    const controller = new PaymentController(useCase)

    await repo.save(wallet)

    const req = {
      headers: {
        'x-tenant-id': ''
      },
      body: {
        walletId: 'wallet-alpha-1',
        amountInCents: 1000,
        idempotencyKey: 'idemp-chave-segura-12345',
        type: 'DEBIT'
      }
    }

    const res = {
      statusCode: null,
      data: null,
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        this.data = payload
        return this
      }
    }

    await tenantContext(req, res, async () => {
      // o controller so deve ser chamado apos passar pelo context
      await controller.handle(req, res, (err) => errorHandler(err, req, res))
    })

    expect(res.statusCode).toBe(401)

    const victim = await repo.findById('wallet-alpha-1', 'tenant-alpha')
    expect(victim.balance.amountInCents).toBe(5000)
  })

  it('deve retornar 400 Bad Request e travar a execucao do useCase se o payload violar o esquema do zod', async () => {
    const wallet = new Wallet(
      'wallet-alpha-1',
      'tenant-alpha',
      new Money(5000)
    )
    const repo = new PostgresWalletRepository(pool)
    const useCase = new ProcessPaymentUseCase(repo, new IdempotencyStore())
    const controller = new PaymentController(useCase)

    await repo.save(wallet)

    const req = {
      headers: {
        'x-tenant-id': 'tenant-alpha'
      },
      body: {
        walletId: 'wallet-alpha-1',
        amountInCents: -500,
        idempotencyKey: 'curta',
        type: 'INVALID_TYPE'
      }
    }

    const res = {
      statusCode: null,
      data: null,
      status(code) {
        this.statusCode = code
        return this
      },
      json(payload) {
        this.data = payload
        return this
      }
    }

    await tenantContext(req, res, async () => {
      await controller.handle(req, res, (err) => errorHandler(err, req, res))
    })
    // await controller.handle(req, res)

    expect(res.statusCode).toBe(400)

    const victim = await repo.findById('wallet-alpha-1', 'tenant-alpha')
    expect(victim.balance.amountInCents).toBe(5000)
  })

});

