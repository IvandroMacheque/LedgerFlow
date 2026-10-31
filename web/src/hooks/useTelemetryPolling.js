import { metrics, outboxEvents, requestLogs } from '../mocks/playground';

/** @param {{tenantId:string}} context */
export function useTelemetryPolling(context) {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Buscar eventos/RED por tenant, coletar logs
  // reais da sessão, controlar isPolling/isLoading/isProcessing/error.
  // Cancelar polling no unmount e na troca de tenant; impedir sobreposição.
  // Fixtures abaixo são uma sessão de exemplo, não o histórico do tenant ativo.
  return { events: outboxEvents, metrics, logs: requestLogs, isPolling: false, isLoading: false, isProcessing: false, error: null };
}

/** @param {boolean} enabled */
export function toggleTelemetryPolling(enabled) {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Iniciar/pausar intervalo gerenciado pelo hook.
  // Stub não cria timers; o App apenas alterna o indicador visual.
  return { message: 'Mock: indicador de polling alternado. Nenhuma consulta periódica está em execução.' };
}

/** @param {{tenantId:string}} context */
export function processOutboxWorker(context) {
  // TODO: [IMPLEMENTAÇÃO MANUAL] Acionar endpoint autorizado do Worker,
  // expor isProcessing/erro e atualizar os eventos com o resultado real.
  return { message: 'Mock: callback do Worker acionado. Nenhum evento foi processado.' };
}
