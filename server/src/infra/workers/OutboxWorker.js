export class OutboxWorker {
  constructor(outboxRepository, webhookDispatcher, pool) {
    this.outboxRepository = outboxRepository;
    this.webhookDispatcher = webhookDispatcher;
    this.pool = pool;
    this.timer = null;
  }

  async processBatch(batchSize = 10) {
    // Stub inicial: busca em lote com SKIP LOCKED e orquestra despacho
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      const events = await this.outboxRepository.fetchPending(batchSize, client)
      for (const ev of events) {
        await this.webhookDispatcher.dispatch(ev)
        await this.outboxRepository.markAsProcessed(ev.id, client)
      }

      await client.query('COMMIT')
    } catch {
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
  }

  start(intervalMs = 1000) {
    // Stub inicial: polling contínuo sem sobreposição
  }

  stop() {
    // Stub inicial: cancelamento seguro do timer
  }
}

