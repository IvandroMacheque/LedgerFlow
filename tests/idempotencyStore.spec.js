import { describe, it, expect } from "vitest";
import { IdempotencyStore } from "../src/domain/idempotencyStore";
import { DuplicateTransactionError } from "../src/domain/errors";

describe('Controlador para garantir que requisições repetidas não executem operações em duplicidade', () => {

    it('deve retornar falso para a consulta de chave inedita', () => {
        const store = new IdempotencyStore()

        expect(store.has('chave-inexistente')).toBe(false)
    })

    it('deve salvar uma chave, verificar se existe uma chave e consultar a chave', () => {
        const store = new IdempotencyStore()

        store.save('tx-key-1', {id: 'tx-123', status: 'SUCCESS'})

        expect(store.has('tx-key-1')).toBe(true)

        expect(store.get('tx-key-1')).toEqual({id: 'tx-123', status: 'SUCCESS'})
    })

    it('deve retornar erro de duplicado caso tente salvar a chave duas vezes', () => {
        const store = new IdempotencyStore()

        store.save('chave-duplicada', { saldo : 100 })

        expect(() => store.save('chave-duplicada', { saldo : 100})).toThrow(DuplicateTransactionError)
    })
})