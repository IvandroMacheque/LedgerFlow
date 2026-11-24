import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { InMemoryWalletRepository } from '../../src/infra/repositories/InMemoryWalletRepository.js';
import { IdempotencyStore } from '../../src/domain/idempotencyStore.js';
import { metrics } from '../../src/infra/observability/metrics.js';
import { response } from 'express';

describe('Rotas do Playground e Diagnostico (/health, /metrics, /outbox, /sandbox/reset)', () => {
  let app;
  let walletRepo;
  let idempotencyStore;
  let outboxRepoMock;

  beforeEach(() => {
    walletRepo = new InMemoryWalletRepository();
    idempotencyStore = new IdempotencyStore();
    outboxRepoMock = {
      listRecent: vi.fn().mockResolvedValue([
        { id: 'evt_1', eventType: 'PaymentCreated', status: 'PENDING', attempts: 0 },
        { id: 'evt_2', eventType: 'PaymentCreated', status: 'PROCESSED', attempts: 1 },
      ]),
    };

    app = createApp({
      walletRepository: walletRepo,
      idempotencyStore: idempotencyStore,
      outboxRepository: outboxRepoMock,
    });
  });

  it('deve responder status 200 com status "ok" e timestamp em GET /health', async () => {
    // Cenário: healthcheck de conectividade e sanidade da API
    const res = await request(app)
    .get('/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toEqual('ok')
    expect(typeof res.body.timestamp).toBe('string')
  })

  it('deve retornar o snapshot de metricas RED em GET /metrics', async () => {
    // Cenário: consulta de rates, errors e durations
    const res = await request(app).get('/metrics')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('rates')
    expect(res.body).toHaveProperty('errors')
    expect(res.body).toHaveProperty('durations')
  })

  it('deve listar os eventos recentes da fila em GET /outbox', async () => {
    // Cenário: frontend consulta eventos para o OutboxMonitor
    const res = await request(app).get('/outbox')

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(outboxRepoMock.listRecent).toHaveBeenCalledOnce();
  })

  it('deve restaurar carteiras padrao e limpar estado de teste em POST /sandbox/reset', async () => {
    // Cenário: botão Reset Sandbox do frontend restaura as carteiras demo
    const res = await request(app).post('/sandbox/reset')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const walletAlpha = await walletRepo.findById('wallet-alpha-1', 'tenant-alpha');
    expect(walletAlpha.balance.amountInCents).toBe(1250000); // R$ 12.500,00

    const walletBeta = await walletRepo.findById('wallet-beta-1', 'tenant-beta');
    expect(walletBeta.balance.amountInCents).toBe(420000); // R$ 4.200,00
  })
})
