export class InMemoryWalletRepository {

    constructor() {
        this.wallets = new Map()
    }

    async save(wallet) {
        const key = `${wallet.tenantId}:${wallet.id}`
        this.wallets.set(key, wallet)
    }

    async findById(id, tenantId) {
        const key = `${tenantId}:${id}`
        const wallet = this.wallets.get(key)

        return wallet || null
    }
}

