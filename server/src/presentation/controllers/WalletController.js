import { WalletNotFoundError } from '../../domain/errors.js';

export class WalletController {
  constructor(walletRepository) {
    this.walletRepository = walletRepository;
  }

  async getById(req, res, next) {
    // TODO: [IMPLEMENTAÇÃO MANUAL]
    try{
      // 1. Obter id da carteira de req.params.id e tenantId de req.tenantId
      const id = req.params.id
      const tenantId = req.tenantId

      // 2. Buscar carteira no repositório forçando par (id, tenantId)
      const wallet = await this.walletRepository.findById(id, tenantId)

      // 3. Se não existir, lançar WalletNotFoundError
      if (!wallet) throw new WalletNotFoundError()

      // 4. Se existir, responder 200 com { id, tenantId, balanceInCents }
      res.status(200).json({
          id: wallet.id,
          tenantId: wallet.tenantId,
          balanceInCents: wallet.balance.amountInCents
        })
    } catch (error) {
      next(error)
    }
  }
}
