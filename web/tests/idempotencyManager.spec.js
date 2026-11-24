import { describe, it, expect } from 'vitest';
import { IdempotencyManager } from '../src/state/idempotencyManager.js';

describe('Gerenciador de Ciclo de Vida de Idempotência (idempotencyManager.js)', () => {
  it('deve gerar chave única com no mínimo 16 caracteres compatível com o schema Zod', () => {
    // Cenário: inicialização ou geração de chave
    const manager = new IdempotencyManager()
    const key = manager.getKey()

    expect(typeof key).toBe('string')
    expect(key.length).toBeGreaterThanOrEqual(16)
  })

  it('deve preservar a mesma chave durante falhas transitórias de rede ou status 500', () => {
    // Cenário: chamada falha com 500 ou offline -> retentativa deve reutilizar a mesma chave
    const manager = new IdempotencyManager('chave-inicial-previa-1234')
    const key = manager.getKey()

    manager.handleTransactionResult({
      status: 500,
      ok: false
    })

    const secondKey = manager.getKey()

    expect(secondKey).toBe(key)
    expect(key).toEqual('chave-inicial-previa-1234')
  })

  it('deve rotacionar a chave após conclusão com sucesso (status 200 OK)', () => {
    // Cenário: resposta 200 OK -> próxima chamada deve ter nova chave
    const manager = new IdempotencyManager()
    const key = manager.getKey()

    manager.handleTransactionResult({
      status: 200,
      ok: true
    })

    const secondKey = manager.getKey()

    expect(secondKey).not.toBe(key)
  })

  it('deve rotacionar a chave se receber apenas status 200 ou apenas ok true isoladamente', () => {
    const manager = new IdempotencyManager()
    
    // Caso 1: apenas status 200 (sem a propriedade ok)
    const key1 = manager.getKey()
    manager.handleTransactionResult({ status: 200 })
    const key2 = manager.getKey()
    expect(key2).not.toBe(key1)

    // Caso 2: apenas ok: true (sem a propriedade status)
    manager.handleTransactionResult({ ok: true })
    const key3 = manager.getKey()
    expect(key3).not.toBe(key2)
  })

  it('deve rotacionar a chave quando o usuário alterar os dados do formulário ou solicitar manualmente', () => {
    // Cenário: alteração de valor/tipo ou clique em regenerar
    const manager = new IdempotencyManager()
    const key1 = manager.getKey()

    // Teste de alteração no formulário:
    manager.onFormChange()
    const key2 = manager.getKey()
    expect(key2).not.toBe(key1)
    
    // Teste de regeneração manual explícita:
    const key3 = manager.regenerateKey()
    expect(key3).not.toBe(key2)
  })

  it('deve preservar a chave se o resultado for nulo ou erro 400', () => {
    const manager = new IdempotencyManager()
    const key1 = manager.getKey()

    // Com null:
    manager.handleTransactionResult(null)
    expect(manager.getKey()).toBe(key1)

    // Com erro 400:
    manager.handleTransactionResult({ status: 400, ok: false })
    expect(manager.getKey()).toBe(key1)
  })
})

