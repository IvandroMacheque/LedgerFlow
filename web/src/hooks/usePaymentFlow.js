import { INITIAL_KEY, REGENERATED_KEY, wallets } from '../mocks/playground'
import { toCents } from '../utils/currency'
import { apiRequest } from '../services/apiClient'

/** @param {{tenantId: 'tenant-alpha'|'tenant-beta'}} context */
export function usePaymentFlow({ tenantId }) {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Gerenciar carteira por tenant, valor decimal,
  // CREDIT/DEBIT, chave idempotente, isLoading e error {status,message,fields?}.
  // Coordenar apiRequest e conversão monetária fora dos componentes; cancelar
  // respostas obsoletas ao trocar tenant. Este stub só seleciona uma fixture.
  return { wallet: wallets[tenantId], idempotencyKey: INITIAL_KEY, isLoading: false, error: null };
}

/** @param {{tenantId:string,walletId:string,amount:string,operation:string,idempotencyKey:string}} payment */
export function submitPayment(payment) {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Validar/converter input e enviar pagamento.
  const amount = toCents(payment.amount)
  const call = apiRequest({
    path: '/payments',
    method: 'POST',
    tenantId: payment.tenantId,
    body: {
      walletId: payment.walletId,
      amountInCents: amount,
      type: payment.operation,
      idempotencyKey: payment.idempotencyKey
    }
  })
  call.message = 'Mock: operação recebida pela interface. O stub não envia pagamentos nem altera o saldo.'

  // Preservar chave no retry, atualizar carteira e alimentar telemetria.
  // Retornar resultado normalizado; nunca simular uma aprovação em produção.
  return call
}

export function regeneratePaymentKey() {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Gerar uma NOVA chave a cada acionamento manual.
  // O stub devolve sempre a mesma segunda fixture; não garante unicidade.
  return REGENERATED_KEY;
}

export function resetSandboxState(tenantId = 'tenant-alpha' || null) {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Definir endpoint/contrato de reset do sandbox
  const res = apiRequest({
    path: '/sandbox/reset',
    method: 'POST',
    tenantId: tenantId
  })
   res.message = 'Mock: campos visuais restaurados. Nenhum estado do servidor foi alterado.'
  // e recarregar carteira, outbox e histórico após confirmação do servidor.
  return res
}
