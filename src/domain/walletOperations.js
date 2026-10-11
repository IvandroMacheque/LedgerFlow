import { InsufficientFundsError } from "./errors"

export function applyDebit(wallet, transaction) {

    const valorDeduzido = transaction.amountCents + transaction.feeCents

    const novoSaldo = wallet.balanceCents - valorDeduzido

    if (valorDeduzido > wallet.balanceCents) throw new InsufficientFundsError(valorDeduzido, wallet.balanceCents)

    return Object.freeze ({
        ...wallet,
        balanceCents: novoSaldo
    })
}

export function applyCredit(wallet, transaction){

    const valorCreditado = transaction.amountCents - transaction.feeCents

    if (transaction.amountCents <= transaction.feeCents) throw new RangeError()

    const novoSaldo = wallet.balanceCents + valorCreditado

    return Object.freeze({
        ...wallet,
        balanceCents: novoSaldo
    })

}

export function applyRefund(wallet, originalTransaction){

    const novoSaldo = wallet.balanceCents + originalTransaction.amountCents

    return Object.freeze({
        ...wallet,
        balanceCents: novoSaldo
    })
}