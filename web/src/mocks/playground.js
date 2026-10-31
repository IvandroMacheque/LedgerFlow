// Fixtures visuais determinísticas. Não representam estado real do motor financeiro.
export const INITIAL_KEY = 'idem_sandbox_alpha_0001';
export const REGENERATED_KEY = 'idem_sandbox_manual_0002';

export const wallets = {
  'tenant-alpha': { walletId: 'wallet-alpha-1', balanceInCents: 1250000, formattedBalance: 'R$ 12.500,00' },
  'tenant-beta': { walletId: 'wallet-beta-1', balanceInCents: 420000, formattedBalance: 'R$ 4.200,00' },
};

export const chaosFixtures = {
  bolaResult: { status: 404, message: 'NotFoundError' },
  raceStatuses: [200, 409, 409, 409, 409],
  payloadResult: { status: 400, message: 'Bad Request' },
};

export const outboxEvents = [
  { eventId: 'evt_a1f8c201', type: 'PaymentCreated', status: 'PENDING', attempts: 0 },
  { eventId: 'evt_b7e2a093', type: 'PaymentCreated', status: 'PROCESSED', attempts: 1 },
  { eventId: 'evt_c3d9f812', type: 'PaymentCreated', status: 'PROCESSED', attempts: 1 },
  { eventId: 'evt_d8a1b604', type: 'PaymentCreated', status: 'FAILED', attempts: 3 },
];

// Totais das seis entradas estáticas abaixo. Nenhuma métrica é calculada.
export const metrics = { totalRequests: 6, errorRate: '66.7', averageDuration: '12' };
export const requestLogs = [
  { id: 'log-6', time: '14:32:18', method: 'POST', path: '/payments', status: 500, duration: 18, correlationId: 'corr_6f2b9e14', body: { error: 'InternalServerError', message: 'Internal server error', correlationId: 'corr_6f2b9e14' } },
  { id: 'log-5', time: '14:32:16', method: 'POST', path: '/payments', status: 400, duration: 2, correlationId: 'corr_5a8c301d', body: { error: 'ValidationError', message: 'Invalid payload', fields: { amount: 'Must be positive', idempotencyKey: 'Key too short' } } },
  { id: 'log-4', time: '14:32:14', method: 'POST', path: '/payments', status: 409, duration: 8, correlationId: 'corr_4b19d602', body: { error: 'ConflictError', message: 'Duplicate transaction' } },
  { id: 'log-3', time: '14:32:12', method: 'POST', path: '/payments', status: 404, duration: 4, correlationId: 'corr_3e7f82a1', body: { error: 'NotFoundError', message: 'Wallet not found' } },
  { id: 'log-2', time: '14:32:10', method: 'POST', path: '/payments', status: 200, duration: 24, correlationId: 'corr_2c681a9f', body: { paymentId: 'pay_demo_0002', operation: 'CREDIT', amountInCents: 12500 } },
  { id: 'log-1', time: '14:32:08', method: 'GET', path: '/wallets/wallet-alpha-1', status: 200, duration: 16, correlationId: 'corr_1d5a3b08', body: { walletId: 'wallet-alpha-1', balanceInCents: 1250000 } },
];
