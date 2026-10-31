/**
 * @param {{path: string, method?: string, tenantId: string, body?: object, signal?: AbortSignal}} options
 * @returns {Promise<{data: object|null, status: number, correlationId: string, error: object|null}>}
 */
export async function apiRequest(options) {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Usar VITE_API_BASE_URL, injetar x-tenant-id,
  // serializar JSON e capturar x-correlation-id da resposta. Aceitar AbortSignal.
  // Normalizar sucesso/erro em { data, status, correlationId, error };
  // error: { status, message, fields? }. Definir tratamento de rede/abort.
  // Não expor credenciais, stack traces ou detalhes internos de erros 500.
  // Mock explícito: nenhuma chamada de rede nem interpretação de options.
  const {
    path,
    method = 'GET',
    tenantId,
    body,
    headers = {},
    signal,
    correlationId,
  } = options

  const baseUrl = import.meta.env?.VITE_API_BASE_URL || ''
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`

  const requestHeaders = {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
    ...headers
  }
  
  const startTime = performance.now()

  try {

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal
    })

    const durationMs = Math.round(performance.now() - startTime)
    const timestamp = new Date().toISOString()

    const data = await response.json().catch(() => null)
    const responseCorrelationId = response.headers?.get('x-correlation-id') || correlationId || null

    return { 
      ok: response.ok,
      status: response.status,
      data: response.ok ? data : null,
      correlationId: responseCorrelationId,
      error: response.ok ? null : data,
      timestamp,
      durationMs
    }
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime)
    const timestamp = new Date().toISOString()

    return {
      ok: false,
      status: 0,
      data: null,
      correlationId: correlationId || null,
      error: { status: 0, message: err?.message || 'Falha de conexão com a rede' },
      timestamp,
      durationMs,
    }
  }
}
