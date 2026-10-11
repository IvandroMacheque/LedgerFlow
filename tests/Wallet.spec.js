import { describe, it, expect } from "vitest";
import { Wallet } from "../src/domain/Wallet";
import { Money } from "../src/domain/Money";
import { InsufficientFundsError } from "../src/domain/errors";

describe("Entidade: Wallet - Encapsulamento de identidade, estado e regras de negócio de carteira", () => {
  // Testes de Wallet serão implementados aqui
  it('deve criar e encapsular o saldo', () => {
    const wallet = new Wallet('w-1', 'tenant-1', new Money(1000))

    expect(wallet.id).toBe('w-1')
    expect(wallet.tenantId).toBe('tenant-1')
    expect(wallet.balance.amountInCents).toBe(1000)

    // da erro, diz que o balance so e getter
    // wallet.balance = new Money(50000)

    expect(wallet.balance.amountInCents).toBe(1000)
  })

  it('deve debitar o valor e a taxa, caso o saldo e menor que o debito da erro de saldo insuficiente', () => {
    const wallet = new Wallet('w-1', 'tenant-1', new Money(10000))

    wallet.debit(new Money(2000), new Money(50))

    expect(wallet.balance.amountInCents).toBe(7950)

    expect(() => wallet.debit(new Money(10000), new Money(50))).toThrow(InsufficientFundsError)
  })

  it('deve creditar o montante e debitar a taxa, se a taxa for maior ou igual ao montante deve lancar erro de range', () => {
    const wallet = new Wallet('w-1', 'tenant-1', new Money(1000))

    wallet.credit(new Money(5000), new Money(125))

    expect(wallet.balance.amountInCents).toBe(5875)

    expect(() => wallet.credit(new Money(50), new Money(50))).toThrow(RangeError)
    expect(() => wallet.credit(new Money(50), new Money(100))).toThrow(RangeError)

  })

  it('deve estornar somente o valor principal, a taxa fica retida na plataforma', () => {
    const wallet = new Wallet('w-1', 'tenant-1', new Money(5000))

    wallet.refund(new Money(2000))

    expect(wallet.balance.amountInCents).toBe(7000)
  })
});
