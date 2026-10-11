import { describe, it, expect } from 'vitest';

/**
 * =============================================================================
 * CICLO TDD NA PRÁTICA: RED -> GREEN -> REFACTOR
 * =============================================================================
 * 
 * PROBLEMA A RESOLVER:
 * Criar um formatador de moeda que converte centavos inteiros para formato legível.
 * Exemplo: 1500 centavos -> "R$ 15,00"
 */

// -----------------------------------------------------------------------------
// HISTÓRICO DO PENSAMENTO DO DESENVOLVEDOR:
// -----------------------------------------------------------------------------
//
// PASSO 1 (RED):
// Antes de criar qualquer função, escrevemos o teste:
//   it('deve formatar 1500 centavos como R$ 15,00', () => {
//     expect(formatarCentavos(1500)).toBe('R$ 15,00');
//   });
// Rodamos o Vitest -> ReferenceError: formatarCentavos is not defined. (FALHOU / RED!)
//
// PASSO 2 (GREEN):
// Criamos a implementação MAIS SIMPLES POSSÍVEL para o teste passar, sem complicar:
//   function formatarCentavos(centavos) {
//     return "R$ 15,00"; // Fake it till you make it (ou implementação direta)
//   }
// Adicionamos um segundo teste com 250 centavos -> precisa da fórmula real:
//   function formatarCentavos(centavos) {
//     const reais = centavos / 100;
//     return `R$ ${reais.toFixed(2).replace('.', ',')}`;
//   }
// Rodamos o Vitest -> Testes passaram com sucesso! (GREEN!)
//
// PASSO 3 (REFACTOR):
// O teste está verde e nos dá uma rede de proteção absoluta.
// Agora melhoramos a clareza, performance ou usamos a API nativa Intl.NumberFormat:
// -----------------------------------------------------------------------------

/**
 * IMPLEMENTAÇÃO FINAL (Resultado do Refactor sob cobertura de testes):
 */
function formatarCentavos(centavos) {
  if (typeof centavos !== 'number' || !Number.isInteger(centavos)) {
    throw new TypeError('O valor deve ser um número inteiro de centavos');
  }

  
  const reais = centavos / 100;
  // Usamos Intl nativo mantendo o formato padronizado
  return `R$ ${reais.toFixed(2).replace('.', ',')}`;
}

describe('05 - Ciclo Red-Green-Refactor na Prática', () => {

  it('Passo RED e GREEN: deve formatar centavos em moeda brasileira', () => {
    // Cenário 1: 1500 centavos -> R$ 15,00
    const resultado1 = formatarCentavos(1500);
    expect(resultado1).toBe('R$ 15,00');

    // Cenário 2: 50 centavos -> R$ 0,50
    const resultado2 = formatarCentavos(50);
    expect(resultado2).toBe('R$ 0,50');
  });

  it('Passo REFACTOR: garante que regras adicionais de segurança não quebrem o contrato', () => {
    // Validação de centavo zero
    expect(formatarCentavos(0)).toBe('R$ 0,00');

    // Validação defensiva (impede centavos fracionados que causariam bugs financeiros)
    expect(() => formatarCentavos(10.5)).toThrow(TypeError);
  });
});

