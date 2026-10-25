import { retryWithJitter } from '../resilience/retryWithJitter.js';

export class WebhookDispatcher {
  constructor(httpClient = null) {
    this.httpClient = httpClient;
  }

  async dispatch(event, targetUrl) {
    // Stub inicial: envio HTTP com retryWithJitter e headers de telemetria
    const options = {
      headers: {
        'x-event-id': event.id,
        'x-correlation-id': event.correlationId,
        'x-tenant-id': event.tenantId,
      },
    }

    return await retryWithJitter(async () => {
      return await this.httpClient.post(targetUrl, event.payload, options);
    })
  }
}

