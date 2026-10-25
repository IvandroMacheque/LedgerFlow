import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pool } from '../../src/infra/db/pool.js';
import { PostgresOutboxRepository } from '../../src/infra/repositories/PostgresOutboxRepository.js';
import { OutboxWorker } from '../../src/infra/workers/OutboxWorker.js';
import { WebhookDispatcher } from '../../src/infra/workers/WebhookDispatcher.js';
import { IdempotentWebhookConsumer } from '../../src/infra/workers/IdempotentWebhookConsumer.js';

describe('OutboxWorker & Idempotent Consumer - Concorrência, Polling e Resiliência (Fase 6)', () => {
  // Entregável 2 e 3: Concorrência com FOR UPDATE SKIP LOCKED e Consumidor Idempotente

  beforeEach(async () => {
    await pool.query('DELETE FROM outbox_events;');
  });

  it('deve processar eventos pendentes de forma concorrente sem duplicacao de processamento usando FOR UPDATE SKIP LOCKED', async () => {
    // Entregável 2: Prova de Concorrência Segura entre múltiplos workers paralelos
    const outboxRepo = new PostgresOutboxRepository(pool)
    const processedByWorkers = [];
    const dispatcherMock = {
      dispatch: async (event) => {
        processedByWorkers.push(event.id);
        return { success: true };
      },
    }

    const event = {
        id: 'event-outbox-1',
        tenantId: 'tenant-1',
        eventType: 'PAYMENT_DEBITED',
        payload: { amountInCents: 1000 },
        status: 'PENDING',
        attempts: 0,
        correlationId: 'corr-123',
      }
    const event2 = {
      ...event,
      id: 'event-outbox-2'
    }
    const event3 = {
      ...event,
      id: 'event-outbox-3'
    }
    const event4 = {
      ...event,
      id: 'event-outbox-4'
    }
    const event5 = {
      ...event,
      id: 'event-outbox-5'
    }

    for (const ev of [event, event2, event3, event4, event5]) { await outboxRepo.save(ev) }

    const worker1 = new OutboxWorker(outboxRepo, dispatcherMock, pool)
    const worker2 = new OutboxWorker(outboxRepo, dispatcherMock, pool)

    // Dispara os dois workers no mesmo instante pedindo um lote de 2 eventos para cada:
    await Promise.all([
      worker1.processBatch(2),
      worker2.processBatch(2),
    ])

    const uniqueProcessed = new Set(processedByWorkers)
    expect(processedByWorkers.length).toBe(uniqueProcessed.size)
    expect(processedByWorkers.length).toBe(4) // 2 pegos pelo worker1 + 2 pegos pelo worker2
  })

  it('deve despachar webhook com retryWithJitter recuperando falhas transientes e propagando headers de telemetria', async () => {
    // Entregável 3.1: Resiliência no WebhookDispatcher com retry e headers obrigatórios
    let attempts = 0;
    let capturedRequest = null;

    const httpClientMock = {
      post: async (url, body, options) => {
        attempts++;
        capturedRequest = { url, body, options };
        if (attempts < 3) {
          throw new Error('Falha transiente de rede: 503 Service Unavailable');
        }
        return { status: 200, data: { received: true } };
      },
    };

    const dispatcher = new WebhookDispatcher(httpClientMock);
    const event = {
      id: 'evt-resilient-1',
      tenantId: 'tenant-alpha',
      correlationId: 'corr-telemetry-999',
      eventType: 'PAYMENT_PROCESSED',
      payload: { amountInCents: 5000 },
    };

    const response = await dispatcher.dispatch(
      event,
      'https://api.parceiro.com/webhooks'
    );

    expect(attempts).toBe(3)
    expect(response.status).toBe(200)
    expect(capturedRequest.options.headers['x-event-id']).toBe('evt-resilient-1')
    expect(capturedRequest.options.headers['x-correlation-id']).toBe('corr-telemetry-999')
    expect(capturedRequest.options.headers['x-tenant-id']).toBe('tenant-alpha')
  })

  it('deve garantir que o consumidor idempotente ignore entregas duplicadas do mesmo evento com status 200', async () => {
    // Entregável 3.2: Consumidor Idempotente dedupicando via x-event-id
    let sideEffectsExecuted = 0
    const businessHandlerMock = async (req) => {
      sideEffectsExecuted++
      return { success: true }
    }

    const consumer = new IdempotentWebhookConsumer(businessHandlerMock)
    const webhookRequest = {
      headers: {
        'x-event-id': 'evt-unique-abc-123',
        'x-tenant-id': 'tenant-1',
      },
      body: { amountInCents: 5000 },
    }

    const firstResponse = await consumer.consume(webhookRequest)
    expect(firstResponse.status).toBe(200)
    expect(firstResponse.duplicated).toBe(false)
    expect(sideEffectsExecuted).toBe(1)

    const secondResponse = await consumer.consume(webhookRequest)
    expect(secondResponse.status).toBe(200)
    expect(secondResponse.duplicated).toBe(true)
    expect(secondResponse.message).toBe('Evento já processado anteriormente')
    expect(sideEffectsExecuted).toBe(1) // Não rodou de novo!
  })
  
})

