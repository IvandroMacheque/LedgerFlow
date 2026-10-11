import { describe, it, expect } from 'vitest';

/**
 * FUNÇÃO DE EXEMPLO:
 * Realiza a divisão entre dois números com validação de divisor zero.
 *
 * O QUE FAZ: Divide dividendo por divisor, ou lança Error se divisor === 0.
 * POR QUE EXISTE: Demonstra controle defensivo de fluxo com exceções explícitas.
 */
function dividir(dividendo, divisor) {
  if (divisor === 0) {
    throw new Error('Divisão por zero não permitida');
  }

  return dividendo / divisor;
}

describe('03 - Testando Erros e Exceções Intencionais', () => {

  it('deve realizar uma divisão normal com sucesso', () => {
    const resultado = dividir(10, 2);
    expect(resultado).toBe(5);
  });

  /**
   * COMO TESTAR EXCEÇÕES:
   * A pegadinha mais comum para quem está começando em testes automatizados.
   */
  it('deve lançar um erro quando o divisor for zero', () => {
    // =========================================================================
    // O ERRO MAIS COMUM DE INICIANTES:
    // =========================================================================
    // Se você fizer:
    // expect(dividir(10, 0)).toThrow();
    //
    // O JavaScript vai executar `dividir(10, 0)` ANTES de passar para o `expect`.
    // Como a função lança um erro imediatamente, o próprio teste explode sem ser capturado!
    //
    // =========================================================================
    // A FORMA CORRETA: ENCAPSULAR NUMA ARROW FUNCTION
    // =========================================================================
    // O QUE FAZ: Passamos uma função anônima `() => dividir(10, 0)` para o `expect`.
    // POR QUE EXISTE: O Vitest executa essa função internamente dentro de um bloco `try / catch`.
    // Se ela lançar um erro, o Vitest intercepta e confirma que o teste passou.
    // Se ela NÃO lançar o erro, o teste falha dizendo que esperava uma exceção.

    expect(() => dividir(10, 0)).toThrow('Divisão por zero não permitida');
  });

  it('deve verificar o tipo específico da exceção lançada', () => {
    // Você também pode validar se o erro é uma instância da classe Error ou customizada
    expect(() => dividir(50, 0)).toThrowError(Error);
  });
});

