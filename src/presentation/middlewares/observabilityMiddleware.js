import crypto from 'node:crypto'
import { runWithContext } from '../../infra/observability/context';
import { metrics } from '../../infra/observability/metrics';

export function observabilityMiddleware(req, res, next) {
  // Stub inicial do middleware de observabilidade
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID()

  metrics.incrementRate(req.url, req.method)
  const startTime = Date.now()

  res.setHeader('x-correlation-id', correlationId)

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    metrics.recordDuration(req.url, req.method, durationMs)

    if (res.statusCode >= 400) {
      metrics.incrementErrors(req.url, req.method, res.statusCode)
    }
  })

  return runWithContext({
    correlationId,
    tenantId: null
  }, () => next())

}

