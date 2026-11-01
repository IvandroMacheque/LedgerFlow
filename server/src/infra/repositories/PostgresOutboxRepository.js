import { exec } from "node:child_process";

export class PostgresOutboxRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async save(event, client = null) {
    // Stub inicial: inserir evento na tabela outbox_events
    const executor = client || this.pool
    const query = `
        INSERT INTO outbox_events (id, tenant_id, event_type, payload, status, attempts, correlation_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
    await executor.query(query, [
      event.id,
      event.tenantId,
      event.eventType,
      JSON.stringify(event.payload),
      event.status || 'PENDING',
      event.attempts ?? 0,
      event.correlationId || null
    ])
  }

  async fetchPending(batchSize = 10, client = null) {
    // Stub inicial: buscar eventos com status PENDING usando FOR UPDATE SKIP LOCKED
    const executor = client || this.pool
    const query = `SELECT id, tenant_id, event_type, payload, attempts, correlation_id
    FROM outbox_events
    WHERE status = 'PENDING'
    ORDER BY created_at ASC
    LIMIT $1
    FOR UPDATE SKIP LOCKED;
    `

    const res = await executor.query(query, [batchSize])
    return res.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      eventType: row.event_type,
      payload: row.payload,
      attempts: row.attempts,
      correlationId: row.correlation_id,
    }))

  }

  async markAsProcessed(eventId, client = null) {
    // Stub inicial: atualizar status para PROCESSED
    const executor = client || this.pool
    const query = `UPDATE outbox_events
    SET status = 'PROCESSED', updated_at = NOW()
    WHERE id = $1;
    `
    await executor.query(query, [eventId])
  }

  async markAsFailed(eventId, error, maxAttempts = 3, client = null) {
    // Stub inicial: incrementar attempts e atualizar status/last_error
  }
}

