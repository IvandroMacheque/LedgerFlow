import { describe, it, expect } from 'vitest';
import { toCents, formatCurrency } from '../src/utils/currency.js';

describe('Blindagem Monetária de Borda (currency.js)', () => {
  describe('toCents', () => {
    it('deve converter valores decimais numéricos para centavos inteiros sem imprecisão de float', () => {
      // Cenário: 19.99 * 100 em IEEE 754 dá 1998.9999999999998 -> deve retornar 1999
      const value1 = toCents(19.99)
      const value2 = toCents(10.5)
      const value3 = toCents(0.01)

      expect(value1).toBe(1999)
      expect(value2).toBe(1050)
      expect(value3).toBe(1)
    });

    it('deve aceitar strings com ponto ou vírgula e converter para centavos inteiros', () => {
      // Cenário: "19.99" e "19,99" devem retornar 1999
      expect(toCents("19.99")).toBe(1999)
      expect(toCents("19,99")).toBe(1999)
      expect(toCents("1250,50")).toBe(125050)
      expect(toCents("  42.10  ")).toBe(4210)
    });

    it('deve rejeitar entradas inválidas, vazias, nulas ou infinitas lançando erro explícito', () => {
      // Cenário: NaN, null, undefined, "", "abc", Infinity
      expect(() => toCents(null)).toThrow()
      expect(() => toCents(undefined)).toThrow()
      expect(() => toCents('')).toThrow()
      expect(() => toCents('   ')).toThrow()
      expect(() => toCents('abc')).toThrow()
      expect(() => toCents(NaN)).toThrow()
      expect(() => toCents(Infinity)).toThrow()
    });

    it('deve rejeitar valores negativos se a regra de entrada monetária exigir estritamente valores positivos', () => {
      // Cenário: -10 ou "-10.50"
      expect(() => toCents(-10)).toThrow()
      expect(() => toCents('-10.50')).toThrow()
      expect(() => toCents(-0.01)).toThrow()
      expect(() => toCents(0)).toThrow()
    });
  });

  describe('formatCurrency / fromCents', () => {
    it('deve formatar centavos inteiros em representação monetária BRL sem perda de precisão', () => {
      // Cenário: 1999 centavos -> "R$ 19,99" (ou formatação pt-BR padrão)
      const formated = formatCurrency(1999)

      expect(formated).toMatch(/R\$\s?19,99/)
      expect(formatCurrency(0)).toMatch(/R\$\s?0,00/)
      expect(formatCurrency(125050)).toMatch(/R\$\s?1\.250,50/)
    });
  });
});

