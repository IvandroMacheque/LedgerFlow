import { logger } from "../observability/logger"

export async function retryWithJitter(fn, options = {}) {
  // Stub inicial mínimo para compilação
  const {
    maxRetries = 3,
    baseDelayMs = 100,
    isRetryable = () => true,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  } = options

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn() // se tiver sucesso retorna imediatamente e encerra
    } catch (error) {
      if (!isRetryable(error) || attempt === maxRetries) throw error

      const maxDelay = baseDelayMs * Math.pow(2, attempt - 1)
      const delay = Math.random() * maxDelay

      logger.warn(`Tentativa ${attempt} falhou. Retentando em ${Math.round(delay)}ms...`, {
        attempt,
        delayMs: Math.round(delay),
        error: error.message
      })

      await sleep(delay)
    }
  }
}
