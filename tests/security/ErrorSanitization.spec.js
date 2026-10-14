import { describe, it, expect } from 'vitest';
import { errorHandler } from '../../src/presentation/middlewares/errorHandler.js';
import { InsufficientFundsError, DuplicateTransactionError } from '../../src/domain/errors.js';
import { z } from 'zod';

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
});

