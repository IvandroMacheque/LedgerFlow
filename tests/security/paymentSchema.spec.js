import { describe, it, expect } from 'vitest';
import { paymentSchema } from '../../src/presentation/schemas/paymentSchema.js';

describe('PaymentSchema Security Validation (Zod)', () => {
  // Seu primeiro passo: construir os casos de teste de validação do schema aqui.

  it('deve aprovar payload valido', () => {

    const payload = {
      tenantId: 'tenant-1',
      walletId: 'wallet-1',
      amountInCents: 5000,
      idempotencyKey: 'machequeivandrojunho',
      type: 'CREDIT'
    }

    const result = paymentSchema.safeParse(payload)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(payload)
  })

  it('deve rejeitar os payloads invalidos', () => {
    const validPayload = {
      tenantId: 'tenant-1',
      walletId: 'wallet-1',
      amountInCents: 5000,
      idempotencyKey: 'machequeivandrojunho',
      type: 'CREDIT'
    }

    const result = paymentSchema.safeParse({
      ...validPayload,
      amountInCents: 5000.50
    })
    expect(result.success).toBe(false)

    const result2 = paymentSchema.safeParse({
      ...validPayload,
      amountInCents: '5000'
    })
    expect(result2.success).toBe(false)

    const result3 = paymentSchema.safeParse({
      ...validPayload,
      amountInCents: -500
    })
    expect(result3.success).toBe(false)

    const result4 = paymentSchema.safeParse({
      ...validPayload,
      tenantId: "tenant'; DROP TABLE;--"
    })
    expect(result4.success).toBe(false)

    const result5 = paymentSchema.safeParse({
      ...validPayload,
      amountInCents: ""
    })
    expect(result5.success).toBe(false)

    const result6 = paymentSchema.safeParse({
      ...validPayload,
      idempotencyKey: "manolashe"
    })
    expect(result6.success).toBe(false)

    const result7 = paymentSchema.safeParse({
      ...validPayload,
      type: 'PIX'
    })
    expect(result7.success).toBe(false)

    const result8 = paymentSchema.safeParse({
      ...validPayload,
      isAdmin: true
    })
    expect(result8.success).toBe(false)
  })
});

