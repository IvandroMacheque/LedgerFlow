import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startServer } from '../../src/server.js';

describe('Lifecycle do Processo e Graceful Shutdown (server.js)', () => {
  let workerMock;
  let poolMock;
  let appMock;

  beforeEach(() => {
    workerMock = {
      start: vi.fn(),
      stop: vi.fn(),
    };
    poolMock = {
      end: vi.fn().mockResolvedValue(),
    };
    appMock = {
      listen: vi.fn((port, cb) => {
        if (cb) cb();
        return {
          close: vi.fn((cb) => cb && cb()),
        };
      }),
    };
  });

  it('deve inicializar o servidor HTTP na porta configurada e disparar o loop do worker', async () => {
    // Cenário: inicialização controlada com porta e disparo de worker.start()
    const instance = await startServer({
      port: 4000,
      app: appMock,
      worker: workerMock,
      pool: poolMock,
    })

    expect(appMock.listen).toHaveBeenCalledWith(4000, expect.any(Function))
    expect(workerMock.start).toHaveBeenCalledOnce()
    expect(instance).toHaveProperty('close')
  })

  it('deve executar o graceful shutdown encerrando o worker, o servidor HTTP e o pool', async () => {
    // Cenário: fechamento ordenado das conexões e interrupção do loop
    const instance = await startServer({
      port: 4000,
      app: appMock,
      worker: workerMock,
      pool: poolMock,
    })

    await instance.close()

    expect(workerMock.stop).toHaveBeenCalledOnce()
    expect(instance.server.close).toHaveBeenCalledOnce()
    expect(poolMock.end).toHaveBeenCalledOnce()
  })
});
