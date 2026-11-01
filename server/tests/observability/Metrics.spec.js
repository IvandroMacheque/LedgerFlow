import { describe, it, expect, beforeEach } from 'vitest';
import { metrics } from '../../src/infra/observability/metrics';

describe('Observabilidade: Coletor de Métricas RED (Rate, Errors, Duration)', () => {
  // Passo 1: Testar o contador de Rate (Taxa de requisições por rota e método)
  beforeEach(() => { metrics.resetMetrics()})

  it('deve registrar e incrementar a taxa de requisições (Rate) por método e rota', () => {
    metrics.incrementRate('/payments', 'POST')
    metrics.incrementRate('/payments', 'POST')
    metrics.incrementRate('/wallets/w-1', 'GET')

    const data = metrics.getMetrics()

    expect(data.rates['POST /payments']).toBe(2)
    expect(data.rates['GET /wallets/w-1']).toBe(1)
  })

  it('deve registrar erros e permitir calcular a taxa de erro percentual', () => {
    for (let i = 0; i < 10; i++) {
      metrics.incrementRate('/payments', 'POST')
    }
    metrics.incrementErrors('/payments', 'POST', 500)
    metrics.incrementErrors('/payments', 'POST', 500)

    const data = metrics.getMetrics()
    expect(data.errors['POST /payments']).toBe(2)

    const errorRate = (data.errors['POST /payments'] / data.rates['POST /payments']) * 100
    expect(errorRate).toBe(20)
  })

  it('deve registrar durações (Duration) e permitir calcular a latência média da rota', () => {
    metrics.recordDuration('/payments', 'POST', 50)
    metrics.recordDuration('/payments', 'POST', 150)

    const data = metrics.getMetrics()
    expect(data.durations['POST /payments']).toEqual([50, 150])

    const sum = data.durations['POST /payments'].reduce((acc, curr) => acc + curr, 0)
    const avg = sum / data.durations['POST /payments'].length
    expect(avg).toBe(100)
  })
})

