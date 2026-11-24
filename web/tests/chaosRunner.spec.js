import { describe, it, expect, vi } from 'vitest';
import { ChaosRunner } from '../src/services/chaosRunner.js';

describe('Orquestrador de Caos e Concorrência (chaosRunner.js)', () => {
  it('deve disparar N requisições concorrentes em burst com a mesma idempotencyKey e consolidar 200 vs 409', async () => {
    // Cenário: N requisições com Promise.all consolidando sucessos vs 409 Conflict
    const mockApiClient = vi.fn()
    mockApiClient
    .mockResolvedValueOnce({ ok: true, status: 200, data: { success: true } })
    .mockResolvedValue({ ok: false, status: 409, error: { message: 'Conflict' } })

    const runner = new ChaosRunner(mockApiClient)

    const summary = await runner.runRaceConditionBurst({
      count: 5,
      path: '/api/v1/payments',
      tenantId: 'tenant-alpha',
      payload: { amountInCents: 1000 },
      idempotencyKey: 'idem_burst_0001',
    })

    for (const [callOptions] of mockApiClient.mock.calls) {
      // Se o chaosRunner injetar a chave nos headers:
      expect(callOptions.headers['idempotency-key']).toBe('idem_burst_0001')
      // Ou se ele passar diretamente no objeto options:
      // expect(callOptions.idempotencyKey).toBe('idem_burst_0001')
    }

    expect(mockApiClient).toHaveBeenCalledTimes(5)
    expect(summary.total).toBe(5)
    expect(summary.successCount).toBe(1)
    expect(summary.conflictCount).toBe(4)
    expect(summary.statuses).toEqual([200, 409, 409, 409, 409])
  })

  it('deve executar ataque BOLA forçando tenant-beta sobre recurso do tenant-alpha e validar bloqueio 404', async () => {
    // Cenário: chamada cruzada de tenant esperando 404 Not Found
    const mockApiClient = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      error: { message: 'Wallet not found' },
      correlationId: 'corr-bola-001',
    })

    const runner = new ChaosRunner(mockApiClient)
    const result = await runner.runBolaAttack({
      attackerTenant: 'tenant-beta',
      victimWalletId: 'wallet-alpha-1',
    })

    const [callOptions] = mockApiClient.mock.calls[0]

    expect(mockApiClient).toHaveBeenCalledTimes(1)
    expect(callOptions.tenantId).toBe('tenant-beta')
    expect(callOptions.path).toContain('wallet-alpha-1')
    expect(result.isBlocked).toBe(true)
    expect(result.status).toBe(404)
  })

    it('deve usar count padrão igual a 5 quando a opção for omitida no burst', async () => {
    const mockApiClient = vi.fn().mockResolvedValue({ status: 200 })
    const runner = new ChaosRunner(mockApiClient)

    const summary = await runner.runRaceConditionBurst({
      path: '/api/v1/payments',
      tenantId: 'tenant-alpha',
      payload: {},
      idempotencyKey: 'idem_default_count',
    })

    expect(summary.total).toBe(5)
    expect(mockApiClient).toHaveBeenCalledTimes(5)
  })

  it('deve adotar tenants padrão e validar bloqueio com 403 e desbloqueio com 200', async () => {
    const mockApiClient = vi.fn()
      .mockResolvedValueOnce({ status: 403 })
      .mockResolvedValueOnce({ status: 200 })

    const runner = new ChaosRunner(mockApiClient)

    // Caso 1: usando defaults ({}) e recebendo 403 Forbidden
    const blockedResult = await runner.runBolaAttack({})
    expect(blockedResult.attackerTenant).toBe('tenant-beta')
    expect(blockedResult.victimWalletId).toBe('wallet-alpha-1')
    expect(blockedResult.isBlocked).toBe(true)
    expect(blockedResult.status).toBe(403)

    // Caso 2: resposta 200 (não bloqueado)
    const allowedResult = await runner.runBolaAttack({})
    expect(allowedResult.isBlocked).toBe(false)
  })
})

