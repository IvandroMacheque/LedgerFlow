import { describe, it, expect } from 'vitest';

/**
 * FUNÇÃO DE EXEMPLO:
 * Calcula o valor final com desconto percentual.
 *
 * O QUE FAZ: Recebe um preço e uma porcentagem (ex: 10 para 10%), calculando o valor final.
 * POR QUE EXISTE: Demonstra manipulação de tipos primitivos (number).
 */
function calcularPrecoComDesconto(preco, porcentagemDesconto) {
  const desconto = preco * (porcentagemDesconto / 100);
  return preco - desconto;
}

/**
 * O QUE É `describe`?
 * Um agrupador de testes relacionados (uma suíte de testes).
 * 
 * POR QUE EXISTE: Organiza a saída do terminal para que você saiba exatamente
 * qual funcionalidade está sendo testada.
 * 
 * ERRO COMUM SEM ELE: Testes soltos geram logs confusos no terminal quando o projeto cresce.
 */
describe('01 - Básico com Valores Primitivos e Padrão AAA', () => {

  /**
   * O QUE É `it` (ou `test`)?
   * A declaração individual de um cenário de teste. A frase deve completar:
   * "it should..." (ele deve...).
   */
  it('deve aplicar 10% de desconto corretamente sobre 100', () => {
    // =========================================================================
    // ETAPA 1: ARRANGE (Preparar / Organizar)
    // =========================================================================
    // O QUE FAZ: Prepara as entradas (inputs) e o resultado esperado da regra de negócio.
    // POR QUE EXISTE: Deixa explícito qual é o estado inicial do teste antes de agir.
    // ERRO COMUM: Misturar preparação com chamada de função torna o teste difícil de ler e depurar.
    const precoOriginal = 100;
    const porcentagemDesconto = 10;
    const resultadoEsperado = 90;

    // =========================================================================
    // ETAPA 2: ACT (Agir / Executar)
    // =========================================================================
    // O QUE FAZ: Invoca a unidade de código que você quer testar com os dados preparados.
    // POR QUE EXISTE: Isola o momento exato em que a regra é processada.
    // ERRO COMUM: Executar múltiplas ações não relacionadas no mesmo teste.
    const resultadoObtido = calcularPrecoComDesconto(precoOriginal, porcentagemDesconto);

    // =========================================================================
    // ETAPA 3: ASSERT (Verificar / Afirmar)
    // =========================================================================
    // O QUE FAZ: Compara o que o código retornou (`resultadoObtido`) com o esperado (`resultadoEsperado`).
    // POR QUE `toBe()`: `toBe` compara primitivos (números, strings, booleanos) via `Object.is` (similar a ===).
    // ERRO COMUM: Usar matchers errados ou esquecer o `expect`, fazendo o teste passar em falso (falso positivo).
    expect(resultadoObtido).toBe(resultadoEsperado);
  });

  it('deve retornar o mesmo valor quando o desconto for 0%', () => {
    // Arrange
    const precoOriginal = 250;
    const porcentagemDesconto = 0;
    const resultadoEsperado = 250;

    // Act
    const resultadoObtido = calcularPrecoComDesconto(precoOriginal, porcentagemDesconto);

    // Assert
    expect(resultadoObtido).toBe(resultadoEsperado);
  });
});

