export class InsufficientFundsError extends Error {

    constructor(valorInformado, saldoAtual){

        // mensagem do erro
        super(`O valor fornecido (${valorInformado}) e insuficiente. O seu saldo e de (${saldoAtual})`)

        // nome do erro
        this.name = 'InsufficientFundsError'

        //valor fornecido
        this.valorInformado = valorInformado
        this.saldoAtual = saldoAtual
    }
}

export class DuplicateTransactionError extends Error {

    constructor(idempotencyKey){

    super(`A transacao ja foi registrada (${idempotencyKey})`)

    this.name = 'DuplicateTransactionError'
    this.idempotencyKey = idempotencyKey

    }
}

export class WalletNotFoundError extends Error {

    constructor(message = 'Wallet not found') {
        super(message)
        this.name = 'WalletNotFoundError'
    }
}
