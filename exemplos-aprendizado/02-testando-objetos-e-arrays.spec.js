import { describe, it, expect } from 'vitest';

/**
 * FUNÇÃO DE EXEMPLO:
 * Cria uma estrutura de usuário ativo por padrão.
 *
 * O QUE FAZ: Retorna um objeto com identificador, nome e flag booleana de status.
 * POR QUE EXISTE: Retorna uma referência nova na memória a cada execução.
 */
function criarUsuario(id, nome) {
  return {
    id: id,
    nome: nome,
    ativo: true,
  };
}

describe('02 - Testando Objetos e Arrays (toBe vs toEqual)', () => {

  /**
   * CONCEITO CRUCIAL:
   * Em JavaScript:
   * - Primitivos (números, strings) são comparados por VALOR (10 === 10 é true).
   * - Objetos e Arrays são comparados por REFERÊNCIA de memória ({ a: 1 } === { a: 1 } é false).
   */

  it('deve falhar se usarmos toBe() em objetos (comentado para demonstração)', () => {
    const usuario1 = { id: 1, nome: 'Alice' };
    const usuario2 = { id: 1, nome: 'Alice' };

    // Se descomentarmos a linha abaixo, o teste FALHA, pois são duas instâncias separadas na memória RAM:
    // expect(usuario1).toBe(usuario2); // AssertionError: expected { id: 1, nome: 'Alice' } to be { id: 1, nome: 'Alice' }

    // Porém, se for a MESMA referência na memória, toBe funciona:
    const mesmaReferencia = usuario1;
    expect(mesmaReferencia).toBe(usuario1);
  });

  it('deve usar toEqual() para comparar a estrutura e os valores de um objeto', () => {
    // 1. Arrange
    const id = 'usr-001';
    const nome = 'Carlos Silva';
    const objetoEsperado = {
      id: 'usr-001',
      nome: 'Carlos Silva',
      ativo: true,
    };

    // 2. Act
    const usuarioCriado = criarUsuario(id, nome);

    // 3. Assert
    // O QUE FAZ `toEqual()`: Percorre recursivamente todas as chaves e valores do objeto (deep equality).
    // POR QUE EXISTE: Para validar se os dados dentro do objeto correspondem ao esperado,
    // independentemente de onde o objeto está alocado na memória.
    // ERRO COMUM: Usar `toBe()` e receber falsos negativos (testes que quebram mesmo com os dados corretos).
    expect(usuarioCriado).toEqual(objetoEsperado);
  });

  it('deve validar arrays com toEqual() ou matchers específicos', () => {
    // Arrange
    const permissoesIniciais = ['LEITURA', 'ESCRITA'];

    // Act
    const listaClonada = [...permissoesIniciais];

    // Assert
    // `toEqual` checa os itens e a ordem do array
    expect(listaClonada).toEqual(['LEITURA', 'ESCRITA']);

    // Dica extra: você também pode checar se contém um item específico
    expect(listaClonada).toContain('LEITURA');
  });
});

