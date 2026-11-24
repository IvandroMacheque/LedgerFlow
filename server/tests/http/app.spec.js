import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Composition Root HTTP & Middlewares (app.js)', () => {
  it('deve expor x-correlation-id e permitir x-tenant-id na negociacao de CORS', async () => {
    // Cenário: requisição OPTIONS ou GET deve retornar os headers de CORS exigidos pelo browser
    const app = createApp()
    app.get('/ping', (req, res) => res.json({ ok: true }))

    const response = await request(app)
    .options('/ping')
    .set('Origin', 'http://localhost:5173')
    .set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'Content-Type, x-tenant-id, x-correlation-id')

    expect(response.status).toBe(200) // ou 200
    expect(response.headers['access-control-expose-headers']).toContain('x-correlation-id')
    expect(response.headers['access-control-allow-headers']).toContain('x-tenant-id')
    expect(response.headers['access-control-allow-headers']).toContain('x-correlation-id')
  })

  it('deve executar o observabilityMiddleware propagando x-correlation-id na resposta e abrindo o contexto', async () => {
    // Cenário: requisição com ou sem x-correlation-id deve receber o header na resposta
    const app = createApp()
    app.get('/test-obs', (req, res) => res.json({ ok: true }))

    const resA = await request(app).get('/test-obs').set('x-correlation-id', 'corr-custom-123')
    expect(resA.headers['x-correlation-id']).toBe('corr-custom-123')

    const resB = await request(app).get('/test-obs')
    expect(resB.headers['x-correlation-id']).toBeDefined()
    expect(resB.headers['x-correlation-id'].length).toBeGreaterThanOrEqual(16)

  })

  it('deve capturar erros disparados pelas rotas e repassar para o errorHandler centralizado', async () => {
    // Cenário: rota que lança erro deve retornar o formato JSON padronizado pelo errorHandler
    const app = createApp({
      testRoutes: (router) => {
        router.get('/test-error', (req, res, next) => {
          next(new Error('Falha inesperada de infraestrutura'))
        })
      }
    })

    const response = await request(app).get('/test-error')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: 'Ocorreu um erro interno' })
  })
})
