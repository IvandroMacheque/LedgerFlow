import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { InMemoryWalletRepository } from '../../src/infra/repositories/InMemoryWalletRepository.js';
import { ProcessPaymentUseCase } from '../../src/application/ProcessPaymentUseCase.js';
import { IdempotencyStore } from '../../src/domain/idempotencyStore.js';
import { Wallet } from '../../src/domain/Wallet.js';
import { Money } from '../../src/domain/Money.js';

describe('Rotas de Domínio e Blindagem BOLA (/payments & /wallets)', () => {
  let app;
  let walletRepo;
  let idempotencyStore;
  let processPaymentUseCase;

  beforeEach(() => {
    walletRepo = new InMemoryWalletRepository();
    idempotencyStore = new IdempotencyStore();
    processPaymentUseCase = new ProcessPaymentUseCase(walletRepo, idempotencyStore);

    // Instancia o app injetando as dependências de domínio
    app = createApp({
      walletRepository: walletRepo,
      processPaymentUseCase: processPaymentUseCase,
    });
  });

  it('deve processar pagamento com sucesso via POST /payments quando dados forem validos', async () => {
    // Cenário: cliente com saldo envia pagamento válido e recebe 200 OK com resultado

    const wallet = new Wallet('wallet-alpha-1', 'tenant-alpha', new Money(10000))
    await walletRepo.save(wallet)

    const response = await request(app)
      .post('/payments')
      .set('x-tenant-id', 'tenant-alpha')
      .send({
        walletId: 'wallet-alpha-1',
        amountInCents: 2000,
        type: 'DEBIT',
        idempotencyKey: 'idem_key_teste_0001',
      })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.walletId).toEqual('wallet-alpha-1')
  })

  it('deve rejeitar POST /payments com status 400 quando payload violar schema do Zod', async () => {
    // Cenário: payload com valor negativo ou campos ausentes retorna 400
    const wallet = new Wallet('wallet-alpha-1', 'tenant-alpha', new Money(10000))
    await walletRepo.save(wallet)

    const response = await request(app)
      .post('/payments')
      .set('x-tenant-id', 'tenant-alpha')
      .send({
        walletId: 'wallet-alpha-1',
        amountInCents: -500,
        type: 'INVALIDO',
        idempotencyKey: 'curta',
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
  })

  it('deve rejeitar requisicao com status 401 quando x-tenant-id for omitido nas rotas protegidas', async () => {
    // Cenário: chamada sem header x-tenant-id é barrada pelo tenantContext
    const wallet = new Wallet('wallet-alpha-1', 'tenant-alpha', new Money(10000))
    await walletRepo.save(wallet)

    const response = await request(app)
      .post('/payments')
      .send({
        walletId: 'wallet-alpha-1',
        amountInCents: 2000,
        type: 'DEBIT',
        idempotencyKey: 'idem_key_teste_0001',
      })

      expect(response.status).toBe(401)
      expect(response.body).toEqual({ error: 'Tenant context ausente' })
  })

  it('deve retornar saldo da carteira via GET /wallets/:id para o tenant autenticado', async () => {
    // Cenário: tenant consulta sua própria carteira e recebe 200 com os dados
    const wallet = new Wallet('wallet-alpha-1', 'tenant-alpha', new Money(5000))
    await walletRepo.save(wallet)

    const response = await request(app)
      .get('/wallets/wallet-alpha-1')
      .set('x-tenant-id', 'tenant-alpha')

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'wallet-alpha-1',
      tenantId: 'tenant-alpha',
      balanceInCents: 5000,
    })
  })

  it('deve retornar 404 Not Found quando tenant-beta tentar consultar carteira pertencente ao tenant-alpha (Anti-BOLA/IDOR)', async () => {
    // Cenário: tentativa de acesso cruzado é barrada sem vazar existência da carteira
    const wallet = new Wallet('wallet-alpha-1', 'tenant-alpha', new Money(5000))
    await walletRepo.save(wallet)

    const response = await request(app)
      .get('/wallets/wallet-alpha-1')
      .set('x-tenant-id', 'tenant-beta')

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Wallet not found' })
  })
})
