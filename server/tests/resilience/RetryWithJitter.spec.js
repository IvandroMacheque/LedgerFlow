import { describe, it, expect, vi } from 'vitest';
import { retryWithJitter } from '../../src/infra/resilience/retryWithJitter';
import { logger } from '../../src/infra/observability/logger';

describe('Resiliência: Retry com Backoff Exponencial e Jitter', () => {
  // Passo 1: Testar que erros de domínio (isRetryable === false) NÃO sofrem retentativa e abortam na 1ª tentativa
  it('deve abortar na 1ª tentativa sem retentar quando o erro não for transitório (erro de domínio)', async () => {
    const operacao = vi.fn().mockRejectedValue(new Error('Saldo insuficiente'))
    const options = {
        maxRetries: 3,
        baseDelayMs: 50,
        isRetryable: (err) => err.message !== 'Saldo insuficiente'
      }

    await expect(retryWithJitter(operacao, options)).rejects.toThrow('Saldo insuficiente')
    expect(operacao).toHaveBeenCalledTimes(1)
  })

  it('deve se recuperar de falhas transitórias tentando até o sucesso na 3ª tentativa', async () => {
    const operacao = vi.fn()
    .mockRejectedValueOnce(new Error('ECONNREFUSED:banco fora'))
    .mockRejectedValueOnce(new Error('ECONNREFUSED:banco fora'))
    .mockResolvedValueOnce({ status: 'SUCCESS' })

    const options = {
      maxRetries: 3,
      baseDelayMs: 5, 
      isRetryable: (err) => err.message.includes('ECONNREFUSED')
    }

    const resultado = await retryWithJitter(operacao, options)

    expect(resultado).toEqual({ status: 'SUCCESS' })
    expect(operacao).toHaveBeenCalledTimes(3)
  })

  it('deve emitir log WARN a cada tentativa de retry antes de esperar', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

    const operacao = vi.fn()
    .mockRejectedValueOnce(new Error('ECONNREFUSED'))
    .mockRejectedValueOnce(new Error('ECONNREFUSED'))
    .mockResolvedValueOnce('OK')

    const options = {
      maxRetries: 3,
      baseDelayMs: 5
    }

    await retryWithJitter(operacao, options)

    expect(warnSpy).toHaveBeenCalledTimes(2)
    expect(warnSpy.mock.calls[0][1]).toMatchObject({ attempt: 1 })
    expect(warnSpy.mock.calls[1][1]).toMatchObject({ attempt: 2 })

    warnSpy.mockRestore()
  })

    it('deve obrigatoriamente pausar a execução chamando sleep com o delay calculado', async () => {
      const sleepSpy = vi.fn()
      const operacao = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce('OK')

      await retryWithJitter(operacao, { maxRetries: 2, sleep: sleepSpy })

      // A PROVA: Se alguém comentar o sleep, sleepSpy terá 0 chamadas e o teste quebra!
      expect(sleepSpy).toHaveBeenCalledTimes(1)
      expect(sleepSpy).toHaveBeenCalledWith(expect.any(Number))
    })

    it('deve utilizar os valores padrão (maxRetries = 3, isRetryable = true) quando options não forem fornecidas', async () => {
      const operacaoSucesso = vi.fn().mockResolvedValue('SUCESSO_DIRETO')
      const resultado = await retryWithJitter(operacaoSucesso)

      expect(resultado).toBe('SUCESSO_DIRETO')

      const operacaoFalha = vi.fn()
      .mockRejectedValueOnce(new Error('falha temporaria'))
      .mockResolvedValueOnce('OK_DEFAULT')

      const res = await retryWithJitter(operacaoFalha, {sleep: vi.fn()})
      expect(res).toBe('OK_DEFAULT')
      expect(operacaoFalha).toHaveBeenCalledTimes(2)
    })
})

