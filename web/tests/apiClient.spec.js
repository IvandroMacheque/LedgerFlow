import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../src/services/apiClient.js';

describe('Cliente HTTP de Telemetria (apiClient.js)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve injetar automaticamente os cabeçalhos Content-Type e x-tenant-id', async () => {
    // Cenário: requisição deve conter Content-Type: application/json e x-tenant-id fornecido
    vi.spyOn(globalThis, 
      'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'x-correlation-id': 'corr-teste-1'
        }),
        json: async () => ({ balance: 1000 })
      })

    await apiRequest({ path: '/api/v1/wallets', tenantId: 'tenant-alpha'})

    expect(globalThis.fetch).toHaveBeenCalledOnce()
    
    const [url, requestOptions] = vi.mocked(globalThis.fetch).mock.calls[0]

    expect(url).toContain('/api/v1/wallets')
    expect(requestOptions.headers['Content-Type']).toBe('application/json')
    expect(requestOptions.headers['x-tenant-id']).toBe('tenant-alpha')
  });

  it('deve propagar e extrair o x-correlation-id da resposta HTTP', async () => {
    // Cenário: enviar correlationId se existente e ler da resposta
    vi.spyOn(globalThis, 
      'fetch').mockResolvedValueOnce({
        headers: new Headers({
          'x-correlation-id': 'corr-servidor-999'
        }),
        json: async () => ({ ok: true })
      })

    const result = await apiRequest({ 
      path: '/api/v1/wallets', 
      tenantId: 'tenant-alpha', 
      correlationId: 'corr-cliente-111' 
    })

    const [url, requestOptions] = vi.mocked(globalThis.fetch).mock.calls[0]

    expect(requestOptions.headers['x-correlation-id']).toBe('corr-cliente-111')
    expect(result.correlationId).toBe('corr-servidor-999')

  })

  it('deve retornar envelope padronizado de telemetria sem explodir exceções em erros 4xx ou 5xx', async () => {
    // Cenário: erro 400/404/500 retorna { ok: false, status, data, correlationId, durationMs, timestamp }
    vi.spyOn(globalThis, 
      'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({
          'x-correlation-id': 'corr-err-404'
        }),
        json: async () => ({ error: 'Wallet not found' })
      })

    const result = await apiRequest({
      path: 'api/v1/wallets/inexistente',
      tenantId: 'tenant-alpha'
    })

    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
    expect(result.correlationId).toBe('corr-err-404')
    expect(result.error).toStrictEqual({ error: 'Wallet not found' })
    expect(result.data).toBe(null)
    expect(typeof result.durationMs).toBe('number')
    expect(typeof result.timestamp).toBe('string')
  })

  it('deve capturar falhas de rede de forma segura sem vazar dados sensíveis ou quebrar o fluxo', async () => {
    // Cenário: fetch rejeitado por erro de conexão
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const result = await apiRequest({
      path: '/api/v1/wallets',
      tenantId: 'tenant-alpha',
      correlationId: 'corr-rede-001',
    })

    expect(result.ok).toBe(false)
    expect(result.status).toBe(0)
    expect(result.data).toBe(null)
    expect(result.correlationId).toBe('corr-rede-001')
    expect(result.error.status).toBe(0)
    expect(typeof result.durationMs).toBe('number')
    expect(typeof result.timestamp).toBe('string')
  })
})

