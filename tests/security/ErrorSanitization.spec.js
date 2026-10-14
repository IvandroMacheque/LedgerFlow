import { describe, it, expect } from 'vitest';
import { errorHandler } from '../../src/presentation/middlewares/errorHandler.js';
import { InsufficientFundsError, DuplicateTransactionError } from '../../src/domain/errors.js';
import { z } from 'zod';
import { tenantContext } from '../../src/presentation/middlewares/tenantContext.js';
import { paymentSchema } from '../../src/presentation/schemas/paymentSchema.js';

describe('Error Sanitization & Defensive Error Handling', () => {
  // Sua tarefa será simular erros de infraestrutura, negócio e validação aqui

  it('deve retornar o erro correto com o devido codigo', () => {
    const req = {}
    const res = {
      statusCode: null,
      data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.data = payload;
        return this;
      },
    }
    const leakError = new Error('FATAL: password "secreta123" failed for user "postgres"')

    errorHandler(leakError, req, res, () => {})

    expect(res.statusCode).toBe(500)
    expect(res.data.error).toBe("Ocorreu um erro interno")
    expect(JSON.stringify(res.data)).not.toContain('secreta123')
    expect(JSON.stringify(res.data)).not.toContain('postgres')
  })

  it('deve retornar o erro de saldo insuficiente com o devido codigo', () => {
    const req = {}
    const res = {
      statusCode: null,
      data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.data = payload;
        return this;
      },
    }
    const leakError = new InsufficientFundsError(3000, 1000)

    errorHandler(leakError, req, res, () => {})

    expect(res.statusCode).toBe(422)
    expect(res.data.error).toBe("O valor fornecido (3000) e insuficiente. O seu saldo e de (1000)")
    expect(JSON.stringify(res.data)).toContain('3000')
    expect(JSON.stringify(res.data)).toContain('1000')
  })

  it('deve retornar o erro de transacao duplicada com o devido codigo', () => {
    const req = {}
    const res = {
      statusCode: null,
      data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.data = payload;
        return this;
      },
    }
    const leakError = new DuplicateTransactionError('chave-123')

    errorHandler(leakError, req, res, () => {})

    expect(res.statusCode).toBe(409)
    expect(res.data.error).toBe("A transacao ja foi registrada (chave-123)")
    expect(JSON.stringify(res.data)).toContain('chave-123')
  })

  it('deve retornar o erro de zod com o devido codigo', () => {
    const req = {}
    const res = {
      statusCode: null,
      data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.data = payload;
        return this;
      },
    }

    const payload = {
      tenantId: 'tenant-1',
      walletId: 'wallet-1',
      amountInCents: -5000,
      idempotencyKey: 'machequeivandrojunho',
      type: 'CREDIT'
    }

    let leakError
    try {
      paymentSchema.parse(payload)
    } catch (err) {
      leakError = err
    }

    errorHandler(leakError, req, res, () => {})

    expect(res.statusCode).toBe(400)
    expect(res.data.error[0].path).toEqual([ 'amountInCents' ])
    expect(JSON.stringify(res.data.error[0].message)).toContain("Too small")
  })
});

