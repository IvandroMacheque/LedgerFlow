import { chaosFixtures } from '../mocks/playground';

export function useChaosActions() {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Expor resultados, activeAction, isLoading e
  // error das provas; registrar cada resposta individual na telemetria.
  return { ...chaosFixtures, activeAction: null, isLoading: false, error: null };
}

export function simulateBolaAttack() {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Tentar DEBIT como tenant-beta contra
  // wallet-alpha-1, independente do tenant visual, e registrar o HTTP recebido.
  return { ...chaosFixtures.bolaResult, message: 'Mock BOLA: exemplo 404. Nenhum ataque foi executado.' };
}

export function simulateIdempotencyRace() {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Enviar 5 pagamentos concorrentes com a mesma
  // idempotencyKey; retornar todos os códigos reais sem forçar 200/409.
  return { statuses: chaosFixtures.raceStatuses, message: 'Mock de concorrência: 200 / 409 / 409 / 409 / 409. Nenhuma requisição foi enviada.' };
}

export function injectCorruptPayload() {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Enviar amount negativo e chave curta;
  // exibir validação 400 e campos recebidos sem reproduzir Zod no componente.
  return { ...chaosFixtures.payloadResult, message: 'Mock Zod Gate: exemplo 400. Nenhum payload foi enviado.' };
}
