import { describe, it, expect } from "vitest";
import { Money } from "../src/domain/Money.js"
import { InsufficientFundsError } from "../src/domain/errors.js";

describe("Value Object: Money - Representação imutável de valores monetários em centavos", () => {
  // Testes do Money serão implementados aqui

  it('deve receber o valor, expor o valor e o objeto deve nascer congelado', () => {
    const money = new Money(1000)

    expect(money.amountInCents).toBe(1000)
    expect(Object.isFrozen(money)).toBe(true)
  })

  it('deve rejeitar numeros decimais com erro de tipagem e valores negativos com erro de range', () => {
    expect(() => new Money(10.5)).toThrow(TypeError)
    expect(() => new Money(-100)).toThrow(RangeError)
  })

  it('deve somar dois valores retornando uma nova instancia sem modificar as principais', () => {
    const m1 = new Money(1000)
    const m2 = new Money(500)

    const total = m1.add(m2)

    expect(total.amountInCents).toBe(1500)
    expect(total).toBeInstanceOf(Money)

    expect(m1.amountInCents).toBe(1000)
    expect(m2.amountInCents).toBe(500)
  })

  it('deve subtrair dois valores retornando nova instancia e nao deve subtrair mais do que tem', () => {
    const m1 = new Money(1000)
    const m2 = new Money(500)

    const total = m1.subtract(m2)

    expect(total.amountInCents).toBe(500)
    expect(total).toBeInstanceOf(Money)

    expect(m1.amountInCents).toBe(1000)
    expect(m2.amountInCents).toBe(500)

    expect(() => m2.subtract(m1)).toThrow(InsufficientFundsError)
  })

  it('deve retornar verdadeiro caso o valor seja 0 e falso caso seja maior que 0', () => {
    expect(new Money(0).isZero()).toBe(true)
    expect(new Money(100).isZero()).toBe(false)
  })
});