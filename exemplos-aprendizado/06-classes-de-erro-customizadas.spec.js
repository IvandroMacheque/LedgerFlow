import { describe, it, expect } from 'vitest';

/**
 * =============================================================================
 * EXEMPLO DE ESTUDO: CRIANDO E TESTANDO ERROS CUSTOMIZADOS
 * =============================================================================
 * 
 * Por que não usar apenas `new Error('mensagem')`?
 * Porque no mundo real, você quer saber O TIPO exato do problema (para devolver
 * o status HTTP correto, logar métricas ou tomar decisões automáticas no código).
 */

// -----------------------------------------------------------------------------
// 1. A CLASSE DO ERRO CUSTOMIZADO
// -----------------------------------------------------------------------------
class IdadeInvalidaError extends Error {
  /**
   * O QUE FAZ O CONSTRUCTOR?
   * Recebe os dados específicos que causaram o erro (aqui, a idade informada).
   */
  constructor(idadeInformada) {
    // `super()` chama o construtor da classe pai `Error`, definindo a mensagem do erro (`error.message`).
    super(`A idade fornecida (${idadeInformada}) é inválida para este cadastro.`);

    // IMPORTANTE: Por padrão em JS, `this.name` seria 'Error'.
    // Precisamos mudar para o nome exato da nossa classe para identificação!
    this.name = 'IdadeInvalidaError';

    // Podemos salvar propriedades extras diretamente no erro para auditoria ou logs:
    this.idadeInformada = idadeInformada;
  }
}

// -----------------------------------------------------------------------------
// 2. A SALA DE TESTES (Como testar a anatomia de um Erro Customizado)
// -----------------------------------------------------------------------------
describe('06 - Anatomia de Classes de Erro Customizadas', () => {

  it('deve instanciar o erro com o nome correto e herdar de Error', () => {
    // Arrange & Act
    // Criamos o erro normalmente com `new` (sem lançar com throw ainda)
    const erro = new IdadeInvalidaError(-5);

    // =========================================================================
    // ASSERT 1: Herança (error instanceof Error)
    // =========================================================================
    // O QUE FAZ: Confirma que nossa classe é um Error legítimo do JavaScript.
    // POR QUE É IMPORTANTE: Se não herdar de Error, você perde o rastreamento
    // de linhas (stack trace) e não funciona em blocos catch comuns.
    expect(erro).toBeInstanceOf(Error);
    expect(erro).toBeInstanceOf(IdadeInvalidaError);

    // =========================================================================
    // ASSERT 2: A propriedade `name`
    // =========================================================================
    // POR QUE É IMPORTANTE: Se você esquecer `this.name = 'IdadeInvalidaError'`,
    // ele fica com o nome genérico 'Error'.
    expect(erro.name).toBe('IdadeInvalidaError');
  });

  it('deve conter a mensagem descritiva e os dados que causaram a falha', () => {
    // Arrange & Act
    const erro = new IdadeInvalidaError(-5);

    // =========================================================================
    // ASSERT 3: Mensagem clara
    // =========================================================================
    // Checa se a mensagem gerada explica o problema e inclui o valor problemático
    expect(erro.message).toContain('-5');
    expect(erro.message).toBe('A idade fornecida (-5) é inválida para este cadastro.');

    // =========================================================================
    // ASSERT 4: Metadados extras
    // =========================================================================
    // Permite que quem capturou o erro leia o valor numérico diretamente
    expect(erro.idadeInformada).toBe(-5);
  });

  it('deve ser capturado por try/catch ou toThrow quando for disparado com throw', () => {
    // Uma função qualquer de negócio que usa esse erro:
    function cadastrar(idade) {
      if (idade < 0) {
        throw new IdadeInvalidaError(idade);
      }
      return 'Cadastrado com sucesso';
    }

    // Como vimos no Exemplo 3, podemos checar se a função lança ESSE erro específico:
    expect(() => cadastrar(-10)).toThrow(IdadeInvalidaError);
  });
});

