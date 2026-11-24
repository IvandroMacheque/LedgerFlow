import { chaosFixtures } from '../mocks/playground'
import { ChaosRunner } from '../services/chaosRunner'
import { apiRequest } from '../services/apiClient'

export function useChaosActions() {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Expor resultados, activeAction, isLoading e
  // error das provas; registrar cada resposta individual na telemetria.
  return { ...chaosFixtures, activeAction: null, isLoading: false, error: null };
}

export function simulateBolaAttack(options = {}) {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Tentar DEBIT como tenant-beta contra
  const runner = new ChaosRunner(apiRequest)

  const attack = runner.runBolaAttack(options)
  attack.message = 'Mock BOLA: exemplo 404. Nenhum ataque foi executado.'

  // wallet-alpha-1, independente do tenant visual, e registrar o HTTP recebido.
  return attack
}

export function simulateIdempotencyRace(options = {}) {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Enviar 5 pagamentos concorrentes com a mesma
  const runner = new ChaosRunner(apiRequest)
  const {
    count = 5,
    idempotencyKey = 'race_idem_key_001',
    path = '/payments',
    tenantId = 'tenant-alpha',
    payload = {
      walletId: 'wallet-alpha-1',
      amountInCents: 1000,
      type: 'DEBIT',
      idempotencyKey,
    },
  } = options

  const race = runner.runRaceConditionBurst({
    count,
    idempotencyKey,
    path,
    tenantId,
    payload,
  })
  race.message = 'Mock de concorrência: 200 / 409 / 409 / 409 / 409. Nenhuma requisição foi enviada.'

  // idempotencyKey; retornar todos os códigos reais sem forçar 200/409.
  return race
}

export function injectCorruptPayload() {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Enviar amount negativo e chave curta;
  // exibir validação 400 e campos recebidos sem reproduzir Zod no componente.
  return { ...chaosFixtures.payloadResult, message: 'Mock Zod Gate: exemplo 400. Nenhum payload foi enviado.' };
}
