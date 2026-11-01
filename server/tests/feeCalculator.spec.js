import { describe, it, expect } from "vitest";
import { calculateFee } from "../src/domain/feeCalculator";

describe ( "Calculo da taxa operacional cobrada pela plataforma sobre uma transação financeira", () => {

    it("deve exportar uma funcao chamada calculateFee", () => {
        expect(typeof calculateFee).toBe('function')
    })

    it("deve calcular a taxa padrao de 2.5% para transacoes normais", () => {
        const fee = calculateFee(10000)
        expect(fee).toBe(250)
    })

    it("deve arredondar para cima todo resultado em fraccao", () => {
        const fee = calculateFee(3001)
        expect(fee).toBe(76)
    })

    it("deve ter piso minimo de 50 centavos", () => {
        const fee = calculateFee(1000)
        expect(fee).toBe(50)
    })

    it("deve ter piso maximo de 1500 centavos", () => {
        const fee = calculateFee(100000)
        expect(fee).toBe(1500)
    })

    it("nao deve aceitar valores negativos ou zero", () => {
        expect(() => calculateFee(0)).toThrow(RangeError)
        expect(() => calculateFee(-500)).toThrow(RangeError)
    })

    it("deve aceitar somente valores inteiros", () => {
        expect(() => calculateFee(100.5)).toThrow(TypeError)
    })

} )