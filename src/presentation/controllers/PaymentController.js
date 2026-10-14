import { paymentSchema } from "../schemas/paymentSchema";

export class PaymentController {
  constructor(processPaymentUseCase) {
    this.processPaymentUseCase = processPaymentUseCase;
  }

  async handle(req, res, next) {
    // Stub inicial
    const payload = {
      ...req.body,
      tenantId: req.tenantId
    }

    // validacao estrita com zod
    const validation = paymentSchema.safeParse(payload)
    if (!validation.success) return res.status(400).json({ errors: validation.error.issues })

    try {
      const result = await this.processPaymentUseCase.execute(validation.data)
      return res.status(200).json(result)
    } catch (error) {
      if (error.message === 'Wallet not found') {
        return res.status(404).json({ error: 'Carteira nao encontrada' })
      }
      if (next) {
        return next(error)
      }
      return res.status(500).json({ error: 'Ocorreu um erro interno' })
    }
  }


}

