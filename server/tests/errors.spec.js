import { describe, it, expect } from "vitest";
import { InsufficientFundsError, DuplicateTransactionError } from "../src/domain/errors";

describe("Erros customizados de domínio para garantir que falhas de negócio não sejam tratadas como exceções genéricas", () => {

    it('deve instanciar o erro com o nome correto e herdar de Error (InsufficientFundsError)', () => {
        const erro = new InsufficientFundsError(2000, 1000)

        expect(erro).toBeInstanceOf(Error)
        expect(erro).toBeInstanceOf(InsufficientFundsError)

        // nome do erro
        expect(erro.name).toBe('InsufficientFundsError')

    })

    it ('deve ser descritiva com saldo e valor solicitado (InsufficientFundsError)', () => {

        const erro = new InsufficientFundsError(2000, 1000)

        // verificar se o erro contem os valores
        expect(erro.message).toContain('1000', '2000')
        expect(erro.message).toBe('O valor fornecido (2000) e insuficiente. O seu saldo e de (1000)')

        // verificar se as propriedades foram salvas
        expect(erro.valorInformado).toBe(2000)
        expect(erro.saldoAtual).toBe(1000)

    })

    it('deve instanciar o erro com o nome correto e herdar de Error (DuplicateTransactionError)', () => {
        const erro = new DuplicateTransactionError('chave-123')

        expect(erro).toBeInstanceOf(Error)
        expect(erro).toBeInstanceOf(DuplicateTransactionError)

        // nome do erro
        expect(erro.name).toBe('DuplicateTransactionError')

    })

    it('Deve conter a chave de idempotencia (DuplicateTransactionError)', () => {
        const erro = new DuplicateTransactionError('chave-123')

        expect(erro.idempotencyKey).toBe('chave-123')
        expect(erro.message).toBe("A transacao ja foi registrada (chave-123)")
    })

})