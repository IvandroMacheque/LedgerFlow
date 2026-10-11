import { describe, it, expect } from 'vitest';

/**
 * FUNÇÃO DE EXEMPLO:
 * Valida se uma pessoa atingiu a maioridade legal (18 anos completos).
 *
 * O QUE FAZ: Retorna boolean indicando se idade >= 18.
 * POR QUE EXISTE: Exemplifica operadores relacionais sensíveis a erros de digitação (`>` vs `>=`).
 */
function ehMaiorDeIdade(idade) {
  if (typeof idade !== 'number' || Number.isNaN(idade)) {
    throw new TypeError('A idade deve ser um número válido');
  }

  return idade >= 18;
}

describe('04 - Testando Condicionais e Valores de Fronteira (Boundary Testing)', () => {

  /**
   * CONCEITO DE TESTE DE FRONTEIRA (BOUNDARY VALUES):
   * A grande maioria dos bugs em sistemas reais ocorre nos valores limite.
   * Se um programador escrever `idade > 18` em vez de `idade >= 18`,
   * testar apenas 10 anos e 30 anos NÃO VAI PEGAR O BUG!
   * 
   * Por isso, sempre testamos o trio de fronteira:
   * 1. Um valor logo antes do limite (17)
   * 2. O valor exato do limite (18)
   * 3. Um valor logo após o limite (19)
   */

  it('deve retornar false para quem tem 17 anos (imediatamente antes do limite)', () => {
    // Arrange & Act
    const resultado = ehMaiorDeIdade(17);

    // Assert
    // O QUE FAZ: Garante que menores de idade não passem
    expect(resultado).toBe(false);
  });

  it('deve retornar true para quem tem exatamente 18 anos (no limite exato)', () => {
    // Arrange & Act
    const resultado = ehMaiorDeIdade(18);

    // Assert
    // POR QUE É CRUCIAL: Se o código estivesse com `idade > 18`, este teste FALHARIA!
    // Ele protege o negócio contra a troca acidental de `>=` por `>`.
    expect(resultado).toBe(true);
  });

  it('deve retornar true para quem tem 19 anos (imediatamente após o limite)', () => {
    // Arrange & Act
    const resultado = ehMaiorDeIdade(19);

    // Assert
    expect(resultado).toBe(true);
  });

  it('deve lançar TypeError se a idade não for numérica', () => {
    // Teste defensivo de tipo
    expect(() => ehMaiorDeIdade('18')).toThrow(TypeError);
    expect(() => ehMaiorDeIdade(null)).toThrow(TypeError);
  });
});

