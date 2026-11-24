import { createApp } from './app.js';
import { pool as defaultPool } from './infra/db/pool.js';
import { PostgresOutboxRepository } from './infra/repositories/PostgresOutboxRepository.js';
import { PostgresWalletRepository } from './infra/repositories/PostgresWalletRepository.js';
import { WebhookDispatcher } from './infra/workers/WebhookDispatcher.js';
import { OutboxWorker } from './infra/workers/OutboxWorker.js';
import { ProcessPaymentUseCase } from './application/ProcessPaymentUseCase.js';
import { IdempotencyStore } from './domain/idempotencyStore.js';

/**
 * Inicializa a aplicação e seus serviços de suporte em background.
 * @param {object} options
 */
export async function startServer(options = {}) {
  // TODO: [IMPLEMENTAÇÃO MANUAL]
  const port = options.port || process.env.PORT || 3000
  const pool = options.pool || defaultPool

  // 1. Instanciar dependências (ou usar injetadas)
  const walletRepository = options.walletRepository || new PostgresWalletRepository(pool)
  const outboxRepository = options.outboxRepository || new PostgresOutboxRepository(pool)
  const idempotencyStore = options.idempotencyStore || new IdempotencyStore()
  const processPaymentUseCase = options.processPaymentUseCase || new ProcessPaymentUseCase(walletRepository, idempotencyStore)
  const webhookDispatcher = options.webhookDispatcher || new WebhookDispatcher()

  const app = options.app || createApp({
    walletRepository,
    outboxRepository,
    processPaymentUseCase,
    idempotencyStore,
  })

  const worker = options.worker || new OutboxWorker(outboxRepository, webhookDispatcher, pool)

  // 2. Iniciar HTTP listener (app.listen)
  const server = app.listen(port, () => {})

  // 3. Iniciar OutboxWorker (worker.start)
  worker.start()

  // 4. Definir o método de Graceful Shutdown
  const close = async () => {
    worker.stop()
    await new Promise((resolve) => server.close(resolve));
    if (pool && pool.end) {
      await pool.end()
    }
  }

  // 5. Retornar { server, worker, pool, close }
  return { app, server, worker, pool, close }

}
