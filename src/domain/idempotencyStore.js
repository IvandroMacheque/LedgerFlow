import { DuplicateTransactionError } from "./errors"

export class IdempotencyStore {
    
    constructor () {
        this.storage = new Map()
    }

    has(key) {
        return this.storage.has(key)
    }

    save(key, value) {
        if (this.has(key)) {
            throw new DuplicateTransactionError(key)
        }
        this.storage.set(key, value)
    }

    get(key){
        return this.storage.get(key)
    }
}

