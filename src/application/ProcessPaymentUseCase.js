import { WalletNotFoundError } from "../domain/errors"
import { calculateFee } from "../domain/feeCalculator"
import { Money } from "../domain/Money"
import { Wallet } from "../domain/Wallet"

export class ProcessPaymentUseCase {

    constructor(walletRepository, idempotencyStore) {
        this.walletRepository = walletRepository
        this.idempotencyStore = idempotencyStore
    }

    async execute(command) {

        if (this.idempotencyStore.has(command.idempotencyKey)) {
            return this.idempotencyStore.get(command.idempotencyKey)
        }
        // buscar a carteira
        const wallet = await this.walletRepository.findById(command.walletId, command.tenantId)

        if (!wallet) throw new WalletNotFoundError()

        // calcular a taxa
        const feeCents = calculateFee(command.amountInCents)

        // criar VOs
        const amount = new Money(command.amountInCents)
        const fee = new Money(feeCents)

        // se for debito, retiramos e se for credito, creditamos
        if (command.type === "DEBIT") {
            wallet.debit(amount, fee)
        } else {
            wallet.credit(amount, fee)
        }

        // persistimos os dados
        await this.walletRepository.save(wallet)

        const response = {
            success: true,
            walletId : wallet.id,
            feeInCents : feeCents,
            balanceInCents : wallet.balance.amountInCents
        }

        this.idempotencyStore.save(command.idempotencyKey, response)

        return response
    }
}

