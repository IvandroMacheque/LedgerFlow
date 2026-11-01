import { describe, it, expect } from "vitest";
import { applyDebit, applyCredit, applyRefund } from "../src/domain/walletOperations";
import { InsufficientFundsError } from "../src/domain/errors";

describe('Funcoes de transacao com retorno do novo estado sem mutar o objeto original', () => {

    it("deve exportar uma funcao chamada applyDebit", () => {
            expect(typeof applyDebit).toBe('function')
        })

    it('deve deduzir valor informado do saldo', () => {
        const wallet = {
            id: "wallet-123",
            tenantId: "tenant-abc",
            balanceCents: 10000 // 100,00
        }
        const transaction = {
            id: "tx-999",
            type: "DEBIT",
            amountCents: 2000, // 20,00
            feeCents: 50,      // 0,50
            idempotencyKey: "key-1"
        }

        const updateWallet = applyDebit(wallet, transaction)

        expect(updateWallet.balanceCents).toBe(7950)
    })

    it('nao deve alterar a carteira original e deve retornar a instancia protegida', () => {

        const wallet = {
            id: "wallet-123",
            tenantId: "tenant-abc",
            balanceCents: 10000 // 100,00
        }
        const transaction = {
            id: "tx-999",
            type: "DEBIT",
            amountCents: 2000, // 20,00
            feeCents: 50,      // 0,50
            idempotencyKey: "key-1"
        }

        const updateWallet = applyDebit(wallet, transaction)

        // se a carteira continua intacta
        expect(wallet.balanceCents).toBe(10000)

        // se o objeto retornado nao e mesma referencia da memoria
        expect(updateWallet).not.toBe(wallet)

        // se o objeto retornado esta congelado
        expect(Object.isFrozen(updateWallet)).toBe(true)

    })

    it('deve debitar somente valor maior que o saldo da conta, caso nao, lancar InsufficientFoundsError', () => {

        const wallet = {
            id: "wallet-123",
            tenantId: "tenant-abc",
            balanceCents: 1000 // 10,00
        }
        const transaction = {
            id: "tx-999",
            type: "DEBIT",
            amountCents: 1000, // 10,00
            feeCents: 50,      // 0,50
            idempotencyKey: "key-1"
        }

        expect(() => applyDebit(wallet, transaction)).toThrow(InsufficientFundsError)
    })

    it ('deve exportar uma funcao chamada applyCredit', () => {
        expect(typeof applyCredit).toBe('function')
    })

    it('deve creditar o valor informado no saldo', () => {
        const wallet = {
            id: "wallet-123",
            tenantId: "tenant-abc",
            balanceCents: 1000 // 10,00
        }
        const transaction = {
            id: "tx-998",
            type: "CREDIT",
            amountCents: 5000, // 50,00
            feeCents: 125,      // 1,25
            idempotencyKey: "key-2"
        }

        const updateWallet = applyCredit(wallet,  transaction)

        expect(updateWallet.balanceCents).toBe(5875)
        expect(Object.isFrozen(updateWallet)).toBe(true)
    })

    it('deve retornar erro de range se a taxa consumir todo o credito', () => {
        const wallet = {
            id: "wallet-123",
            tenantId: "tenant-abc",
            balanceCents: 1000 // 10,00
        }
        const transaction = {
            id: "tx-998",
            type: "CREDIT",
            amountCents: 50,
            feeCents: 125,      // 1,25
            idempotencyKey: "key-2"
        }

        expect(() => applyCredit(wallet, transaction)).toThrow(RangeError)
        
    })

    it("deve exportar uma funcao chamada applyRefund", () => {
        expect(typeof applyRefund).toBe('function')
    })

    it('deve retornar somente o o principal no estorno', () => {
        const wallet = {
            id: "wallet-123",
            tenantId: "tenant-abc",
            balanceCents: 5000
        }
        const originalTransaction = {
            id: "tx-997",
            type: "DEBIT",
            amountCents: 2000, 
            feeCents: 50,      
            idempotencyKey: "key-2"
        }

        const updateWallet = applyRefund(wallet, originalTransaction)

        expect(updateWallet.balanceCents).toBe(7000)
        expect(Object.isFrozen(updateWallet)).toBe(true)
    })

})