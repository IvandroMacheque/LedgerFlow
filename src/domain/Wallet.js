export class Wallet {

    #balance
    
    constructor(id, tenantId, initialBalance) {
        this.id = id
        this.tenantId = tenantId
        this.#balance = initialBalance
    }

    get balance() {
        return this.#balance
    }

    debit(amount, fee) {
        // metodos da classe Money
        const totalADeduzir = amount.add(fee)
        this.#balance = this.#balance.subtract(totalADeduzir)
    }

    credit(amount, fee) {

        if (fee.amountInCents >= amount.amountInCents) throw new RangeError

        const totalACreditar = amount.subtract(fee)
        this.#balance = this.#balance.add(totalACreditar)
    }

    refund(amount) {
        this.#balance = this.#balance.add(amount)
    }
}

