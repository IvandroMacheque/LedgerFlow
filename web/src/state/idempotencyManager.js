export class IdempotencyManager {
  constructor(initialKey = null) {
    this.key = initialKey;
  }

  getKey() {
    const chave = crypto.randomUUID()
    // Retorna a chave atual ou gera uma se não existir (mínimo 16 chars)
    if (this.key === null) this.key = chave
    return this.key;
  }

  regenerateKey() {
    const chave = crypto.randomUUID()
    // Gera uma nova chave única (>= 16 caracteres)
    this.key = chave
    return this.key
  }

  handleTransactionResult(result) {
    // Preserva se for erro 500 ou rede; rotaciona se for 200 OK
    if (result?.status === 200 || result?.ok === true) this.regenerateKey()
      else return
  }

  onFormChange() {
    // Rotaciona a chave se o usuário mudar valor ou tipo
    this.regenerateKey()
  }
}

