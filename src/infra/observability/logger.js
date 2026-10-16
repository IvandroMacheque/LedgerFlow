import { getContext } from "./context";

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'apiKey']

function sanitize(data) {
  if (!data || data === null || typeof data !== 'object') return data
  const sanitized = { ... data }

  for ( const key of Object.keys(sanitized)) {
    for (const item of SENSITIVE_KEYS) {
      if (key.toLowerCase().includes(item.toLowerCase())) sanitized[key] = '[REDACTED]'
    }
  }
  return sanitized
}

function emit(level, message, error, stream, metadata) {
  const context = getContext()
  const payload = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      correlationId: context.correlationId ?? null,
      tenantId: context.tenantId ?? null
    }

    if (metadata) payload.metadata = sanitize(metadata)
    if (error) {
      payload.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }

    stream.write(JSON.stringify(payload) + '\n')
}

export const logger = {
  
  info(message, metadata) {
    emit('INFO', message, null, process.stdout, metadata)
  },

  warn(message, metadata) {
    emit('WARN', message, null, process.stdout, metadata)
  },
  error(message, error, metadata) {
    emit('ERROR', message, error, process.stderr, metadata)
  }
};

