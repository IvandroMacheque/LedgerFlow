import express from 'express'
import cors from 'cors'
import { observabilityMiddleware } from './presentation/middlewares/observabilityMiddleware.js'
import { errorHandler } from './presentation/middlewares/errorHandler.js'
import { tenantContext } from './presentation/middlewares/tenantContext.js'
import { PaymentController } from './presentation/controllers/PaymentController.js'
import { WalletController } from './presentation/controllers/WalletController.js'
import { metrics } from './infra/observability/metrics.js'
import { Wallet } from './domain/Wallet.js'
import { Money } from './domain/Money.js'

/**
 * Composition Root da aplicação HTTP.
 * @param {object} dependencies - Injeção opcional de casos de uso/repositórios
 * @returns {import('express').Express}
 */
export function createApp(dependencies = {}) {
  const app = express();

  // TODO: [IMPLEMENTAÇÃO MANUAL]
  // 1. Configurar CORS (allowedHeaders e exposedHeaders)
  app.use(cors({
    origin: '*',
    allowedHeaders: [
      'Content-Type',
      'x-tenant-id',
      'x-correlation-id',
      'idempotency-key'
    ],
    exposedHeaders: [
      'x-correlation-id'
    ],
    optionsSuccessStatus: 200
  }))

  // 2. express.json()
  app.use(express.json())

  // 3. observabilityMiddleware
  app.use(observabilityMiddleware)

  // 3.1 Controladores
  const paymentController = new PaymentController(dependencies.processPaymentUseCase)
  const walletController = new WalletController(dependencies.walletRepository)

  // 4. Rotas
  if (dependencies.testRoutes) dependencies.testRoutes(app)
  app.post('/payments', tenantContext, (req, res, next) => paymentController.handle(req, res, next))
  app.get('/wallets/:id', tenantContext, (req, res, next) => walletController.getById(req, res, next))
  app.get('/health', (req, res) => { res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }) })
  app.get('/metrics', (req, res) => { res.status(200).json(metrics.getMetrics()) })
  app.get('/outbox', async (req, res, next) => {
    try {
      const events = dependencies.outboxRepository?.listRecent
        ? await dependencies.outboxRepository.listRecent()
        : []
      res.status(200).json(events)
    } catch (error) {
      next(error)
    }
  })
  app.post('/sandbox/reset', async (req, res, next) => {
    try {
      if (dependencies.walletRepository) {
        await dependencies.walletRepository.save(new Wallet('wallet-alpha-1', 'tenant-alpha', new Money(1250000)))
        await dependencies.walletRepository.save(new Wallet('wallet-beta-1', 'tenant-beta', new Money(420000)))
      }
      res.status(200).json({ success: true, message: 'Sandbox reiniciado com sucesso' })
    } catch (error) {
      next(error)
    }
  })

  // 5. errorHandler
  app.use(errorHandler)

  return app
}
