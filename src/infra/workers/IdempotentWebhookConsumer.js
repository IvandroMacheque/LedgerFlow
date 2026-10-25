export class IdempotentWebhookConsumer {
  constructor(handler = null) {
    this.handler = handler;
    this.processedEvents = new Set();
  }

  async consume(request) {
    // Stub inicial: deduplicação via cabeçalho x-event-id
    const eventId = request?.headers?.['x-event-id']

    if (this.processedEvents.has(eventId)) return {
      status: 200,
      duplicated: true,
      message: 'Evento já processado anteriormente'
    }

    if (this.handler) await this.handler(request)
    if (eventId) this.processedEvents.add(eventId)

    return {
      status: 200,
      duplicated: false
    }
  }
}

