import { InsufficientFundsError } from "./errors"

export class Money {

    constructor (amountInCents) {

        if (!Number.isInteger(amountInCents)) throw new TypeError
        if (amountInCents < 0) throw new RangeError

        this.amountInCents = amountInCents
        Object.freeze(this)
    }

    add(otherMoney) {
        const novoValor = this.amountInCents + otherMoney.amountInCents
        return new Money(novoValor)
    }

    subtract(otherMoney) {

        if (otherMoney.amountInCents > this.amountInCents) throw new InsufficientFundsError(otherMoney.amountInCents, this.amountInCents)

        const novoValor = this.amountInCents - otherMoney.amountInCents
        return new Money(novoValor)
    }

    isZero() {
        return this.amountInCents === 0
    }

}

