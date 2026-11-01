import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getContext } from '../../src/infra/observability/context';
import { observabilityMiddleware } from '../../src/presentation/middlewares/observabilityMiddleware';
import { metrics } from '../../src/infra/observability/metrics';
import { logger } from '../../src/infra/observability/logger';
import { errorHandler } from '../../src/presentation/middlewares/errorHandler';
import { retryWithJitter } from '../../src/infra/resilience/retryWithJitter';

describe('Diagnóstico de Incidentes e Observabilidade de Borda', () => {
  // Passo 1: Testar que o observabilityMiddleware extrai ou gera o correlationId, injeta no header de resposta e abre o AsyncLocalStorage
  beforeEach(() => { metrics.resetMetrics() })
  it('deve gerar correlationId, devolver no cabeçalho e abrir o contexto assíncrono para o next()', () => {
    const req = {
      method: 'POST', 
      url: '/payments',
      headers: {} // sem correlation-id
    }

    const res = {
      setHeader: vi.fn(),
      on: vi.fn() // metricas no final da resposta
    }

    let capturedContext = null
    const next = vi.fn(() => {
      capturedContext = getContext()
    })

    observabilityMiddleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', expect.any(String))
    expect(capturedContext.correlationId).toBeDefined()
    expect(capturedContext.tenantId).toBe(null)

    const generatedId = res.setHeader.mock.calls[0][1]
    expect(capturedContext.correlationId).toBe(generatedId)
  })

  it('deve registrar Rate, Duration e Errors automaticamente nas métricas ao finalizar a resposta', () => {

    let finishCallback
    const req = { method: 'POST', url: '/payments', headers: {} }
    const res = {
      setHeader: vi.fn(),
      statusCode: 500, // Simulando uma resposta de erro
      on: vi.fn((event, callback) => {
        if (event === 'finish') finishCallback = callback;
      })
    }
    const next = vi.fn()

    observabilityMiddleware(req, res, next)
    expect(metrics.getMetrics().rates['POST /payments']).toBe(1)

    finishCallback()

    expect(metrics.getMetrics().durations['POST /payments'].length).toBe(1)
    expect(metrics.getMetrics().durations['POST /payments'][0]).toBeGreaterThanOrEqual(0)
    expect(metrics.getMetrics().durations['POST /payments'][0]).toBeLessThan(1000)
    expect(metrics.getMetrics().errors['POST /payments']).toBe(1)
  })

  it('deve rastrear um incidente de ponta a ponta: métricas RED registram a falha e o Logger captura o correlationId do erro 500', async () => {
    const errorLogSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

    const req = {
      method: 'POST',
      url: '/payments',
      headers: { 'x-correlation-id': 'incidente-uuid-777' }
    }

    let finishHandler
    const res = {
      statusCode: null,
      body: null,
      setHeader: vi.fn(),
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; },
      on: vi.fn((event, cb) => { if (event === 'finish') finishHandler = cb; })
    }

    await observabilityMiddleware(req, res, async () => {
      try {
        // Banco de dados falhando em todas as tentativas:
        const operacaoBanco = vi.fn().mockRejectedValue(new Error('FATAL: Database connection timeout'))
        await retryWithJitter(operacaoBanco, { maxRetries: 3, baseDelayMs: 1 })
      } catch (err) {
        // Quando o retry esgota, o erro vai para o errorHandler:
        errorHandler(err, req, res, () => {})
        finishHandler() // Simula o Express encerrando a resposta
      }
    })

    expect(metrics.getMetrics().rates['POST /payments']).toBe(1)
    expect(metrics.getMetrics().errors['POST /payments']).toBe(1)
    expect(metrics.getMetrics().durations['POST /payments'].length).toBe(1)
    expect(res.statusCode).toBe(500)
    expect(res.body.error).toBe('Ocorreu um erro interno')
    expect(errorLogSpy).toHaveBeenCalledTimes(1)
    expect(errorLogSpy).toHaveBeenCalledWith(expect.stringContaining('Database connection timeout'), expect.any(Error))

    errorLogSpy.mockRestore()
  })

  it('deve reutilizar o correlationId fornecido pelo cliente no cabeçalho sem gerar um novo', () => {
    const req = {
      // method: 'POST', 
      // url: '/payments',
      headers: {
        'x-correlation-id': 'rastreio-existente-abc'
      }
    }

    const res = {
      setHeader: vi.fn(),
      on: vi.fn() // metricas no final da resposta
    }

    let capturedContext = null
    const next = vi.fn(() => {
      capturedContext = getContext()
    })

    observabilityMiddleware(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', 'rastreio-existente-abc')
    expect(capturedContext.correlationId).toBe('rastreio-existente-abc')
  })

  it('não deve incrementar métrica de erro para statusCode 200, mas deve incrementar na fronteira 400', () => {
    let finishCallback
    const req = { method: 'POST', url: '/payments', headers: {} }
    const res = {
      setHeader: vi.fn(),
      statusCode: 200, // Simulando uma resposta de sucesso
      on: vi.fn((event, callback) => {
        if (event === 'finish') finishCallback = callback;
      })
    }
    const next = vi.fn()

    observabilityMiddleware(req, res, next)
    finishCallback()

    expect(metrics.getMetrics().errors['POST /payments']).toBeUndefined()

    metrics.resetMetrics()

    let finishCallback2
    const req2 = { method: 'POST', url: '/payments', headers: {} }
    const res2 = {
      setHeader: vi.fn(),
      statusCode: 400, // Simulando uma resposta de 400
      on: vi.fn((event, callback) => {
        if (event === 'finish') finishCallback2 = callback;
      })
    }
    const next2 = vi.fn()

    observabilityMiddleware(req2, res2, next2)
    finishCallback2()

    expect(metrics.getMetrics().errors['POST /payments']).toBe(1)
  })
})

