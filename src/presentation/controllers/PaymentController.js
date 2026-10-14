import { paymentSchema } from "../schemas/paymentSchema";

export class PaymentController {
  constructor(processPaymentUseCase) {
    this.processPaymentUseCase = processPaymentUseCase;
  }

  async handle(req, res, next) {
    // Stub inicial
    try {
      const payload = {
        ...req.body,
        tenantId: req.tenantId
      }

      const validation = paymentSchema.parse(payload)

      const result = await this.processPaymentUseCase.execute(validation)
      return res.status(200).json(result)

    } catch (error) {
      return next(error)
    }
  }


}

