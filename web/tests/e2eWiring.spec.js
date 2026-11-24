import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiClientModule from '../src/services/apiClient.js';
import { submitPayment, resetSandboxState, regeneratePaymentKey } from '../src/hooks/usePaymentFlow.js';
import { simulateBolaAttack, simulateIdempotencyRace, injectCorruptPayload } from '../src/hooks/useChaosActions.js';

describe('Integração E2E & Wiring dos Hooks (web/)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve converter valor decimal para centavos e disparar POST /payments com x-tenant-id e idempotencyKey', async () => {
    // Cenário: submitPayment valida/converte e encaminha para apiRequest
    const apiSpy = vi.spyOn(apiClientModule, 'apiRequest').mockResolvedValue({
      ok: true,
      status: 200,
      data: { success: true },
    })

    await submitPayment({
      tenantId: 'tenant-alpha',
      walletId: 'wallet-alpha-1',
      amount: '125.50',
      operation: 'CREDIT',
      idempotencyKey: 'idem_wire_0001',
    })

    expect(apiSpy).toHaveBeenCalledOnce()

    // Extrai o objeto de opções que submitPayment passou para apiRequest
    const [requestArgs] = apiSpy.mock.calls[0]

    // Valida se a conversão e o contrato foram respeitados:
    expect(requestArgs.path).toBe('/payments')
    expect(requestArgs.method).toBe('POST')
    expect(requestArgs.tenantId).toBe('tenant-alpha')
    expect(requestArgs.body.amountInCents).toBe(12550) // Convertido de '125.50' para centavos!
    expect(requestArgs.body.type).toBe('CREDIT')
    expect(requestArgs.body.idempotencyKey).toBe('idem_wire_0001')

  })

  it('deve disparar POST /sandbox/reset para restaurar o estado do playground', async () => {
    // Cenário: resetSandboxState invoca apiRequest('/sandbox/reset')
    const apiSpy = vi.spyOn(apiClientModule, 'apiRequest').mockResolvedValue({
      ok: true,
      status: 200,
      data: { success: true },
    })

    await resetSandboxState()

    expect(apiSpy).toHaveBeenCalledOnce()

    const [requestArgs] = apiSpy.mock.calls[0]
    expect(requestArgs.path).toBe('/sandbox/reset')
    expect(requestArgs.method).toBe('POST')
  })

  it('deve executar a simulacao de BOLA delegando ao ChaosRunner e capturando a resposta 404', async () => {
    // Cenário: simulateBolaAttack dispara contra carteira de outro tenant
    const apiSpy = vi.spyOn(apiClientModule, 'apiRequest').mockResolvedValue({
      ok: false,
      status: 404,
      error: { message: 'Wallet not found' },
    })

    const result = await simulateBolaAttack({
      attackerTenant: 'tenant-beta',
      victimWalletId: 'wallet-alpha-1'
    })

    expect(apiSpy).toHaveBeenCalledOnce()
    const [requestArgs] = apiSpy.mock.calls[0]

    expect(requestArgs.tenantId).toBe('tenant-beta')
    expect(requestArgs.path).toContain('wallet-alpha-1')
    expect(result.isBlocked).toBe(true)
    expect(result.status).toBe(404)
  })

  it('deve executar a simulacao de concorrência disparando burst de 5 pagamentos com a mesma chave', async () => {
    // Cenário: simulateIdempotencyRace executa corrida de idempotência
    const apiSpy = vi.spyOn(apiClientModule, 'apiRequest')
      .mockResolvedValueOnce({ ok: true, status: 200, data: { success: true } })
      .mockResolvedValue({ ok: false, status: 409, error: { message: 'Conflict' } })

    const result = await simulateIdempotencyRace({
      count: 5,
      idempotencyKey: 'race_idem_001',
    })

    expect(apiSpy).toHaveBeenCalledTimes(5)
    for (const [callArgs] of apiSpy.mock.calls) {
      expect(callArgs.headers['idempotency-key']).toBe('race_idem_001')
    }

    expect(result.total).toBe(5)
    expect(result.successCount).toBe(1)
    expect(result.conflictCount).toBe(4)
    expect(result.statuses).toEqual([200, 409, 409, 409, 409])
  })
})
