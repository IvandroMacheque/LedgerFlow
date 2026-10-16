import { describe, it, expect, vi } from 'vitest';
import { runWithContext, getContext, setTenantId } from '../../src/infra/observability/context';
import { logger } from '../../src/infra/observability/logger';

describe('Observabilidade: Contexto Assíncrono e Logger Estruturado', () => {
  // Passo 1: Definir o primeiro it() comprovando o isolamento do correlationId entre contextos concorrentes

  it('deve isolar o correlationId e tenantId entre as requisicoes concorrentes', async () => {
    // criar funcao auxiliar para gerar delay
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    const contextA = {
      correlationId: 'req-1',
      tenantId: 'tenant-a'
    }
    const contextB = {
      correlationId: 'req-2',
      tenantId: 'tenant-b'
    }

    const promessaA = runWithContext(contextA, async () => {
      await sleep(25)
      return getContext()
    })

    const promessaB = runWithContext(contextB, async () => {
      await sleep(10)
      return getContext()
    })

    const [resA, resB] = await Promise.all([promessaA, promessaB])

    expect(resA.correlationId).toBe('req-1')
    expect(resA.tenantId).toBe('tenant-a')
    expect(resB.correlationId).toBe('req-2')
    expect(resB.tenantId).toBe('tenant-b')

    expect(getContext()).toEqual({})
  })

  it('deve permitir atualizar o tenantId dentro de um contexto ativo', async () => {
    const context = {
      correlationId: 'req-sem-tenant'
    }

    const res = runWithContext(context, () => {
      setTenantId('tenant-autenticado')
      return getContext()
    })


    expect(res.correlationId).toBe('req-sem-tenant')
    expect(res.tenantId).toBe('tenant-autenticado')
  })

  it('deve emitir log INFO em formato JSON com correlationId e tenantId automáticos', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => {})

    const context = {
      correlationId: 'req-log-1',
      tenantId: 'tenant-alfa'
    }
    runWithContext(context, () => {
      logger.info('Transação criada', { amount: 5000 })
      return getContext()
    })

    expect(stdoutSpy).toHaveBeenCalledTimes(1)

    const output = stdoutSpy.mock.calls[0][0]
    const logJson = JSON.parse(output)

    expect(logJson.level).toBe('INFO')
    expect(logJson.message).toBe('Transação criada')
    expect(logJson.correlationId).toBe('req-log-1')
    expect(logJson.tenantId).toBe('tenant-alfa')
    expect(logJson.metadata).toEqual({ amount: 5000 })
    expect(logJson.timestamp).toBeDefined()

    stdoutSpy.mockRestore()
  })

  it('deve emitir log ERROR em formato JSON para stderr contendo os detalhes do erro', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => {})
    const context = {
      correlationId: 'req-log-2',
      tenantId: 'tenant-alfa'
    }

    const fakeError = new Error('Falha de conexao com o banco')

    const res = runWithContext(context, () => {
      logger.error('Erro na transacao', fakeError, { walletId: 'w-1'})
      return getContext()
    })

    expect(stderrSpy).toHaveBeenCalledTimes(1)

    const output = stderrSpy.mock.calls[0][0]
    const logJson = JSON.parse(output)

    expect(logJson.level).toBe('ERROR')
    expect(logJson.message).toBe('Erro na transacao')
    expect(logJson.error.name).toBe('Error')
    expect(logJson.error.message).toBe('Falha de conexao com o banco')
    expect(logJson.error.stack).toBeDefined()
    expect(logJson.metadata).toEqual({walletId: 'w-1'})

    stderrSpy.mockRestore()
  })

  it('deve emitir log WARN em formato JSON para stdout com metadata', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => {})
    const context = {
      correlationId: 'req-warn-1',
      tenantId: 'tenant-beta'
    }

    runWithContext(context, () => {
      logger.warn('Alerta de lentidao', { delayMs: 450})
      return getContext()
    })

    expect(stdoutSpy).toHaveBeenCalledTimes(1)

    const output = stdoutSpy.mock.calls[0][0]
    const logJson = JSON.parse(output)

    expect(logJson.level).toBe('WARN')
    expect(logJson.message).toBe('Alerta de lentidao')
    expect(logJson.correlationId).toBe('req-warn-1')
    expect(logJson.tenantId).toBe('tenant-beta')
    expect(logJson.metadata).toEqual({ delayMs: 450 })

    stdoutSpy.mockRestore()
  })

  it('deve mascarar campos sensíveis como senhas e tokens dentro do metadata', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => {})

    logger.info('Tentativa de autenticacao', {
      user: 'admin',
      password: 'senha-super-secreta-123',
      token: 'jwt-token-sensivel',
      secret: 'api-secret-key'
    })

    const output = stdoutSpy.mock.calls[0][0]
    const logJson = JSON.parse(output)

    expect(logJson.metadata.user).toBe('admin')
    expect(logJson.metadata.password).toBe('[REDACTED]')
    expect(logJson.metadata.token).toBe('[REDACTED]')
    expect(logJson.metadata.secret).toBe('[REDACTED]')

    stdoutSpy.mockRestore()
  })

  it('não deve lançar erro se setTenantId for chamado fora de um contexto ativo', () => {
    const context = {
      correlationId: 'req-qualquer-tenant'
    }

    runWithContext(context, () => {
      return getContext()
    })

    setTenantId('qualquer-tenant')

    expect(getContext()).toEqual({})
  })
});

