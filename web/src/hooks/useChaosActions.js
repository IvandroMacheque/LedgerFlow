import { useCallback, useState } from 'react';
import { ChaosRunner } from '../services/chaosRunner';
import { apiRequest } from '../services/apiClient';
import { formatApiError } from '../utils/formatApiError';

function toSessionLog(method, path, res) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    time: new Date(res.timestamp || Date.now()).toLocaleTimeString('pt-BR', { hour12: false }),
    method,
    path,
    status: res.status,
    duration: res.durationMs ?? 0,
    correlationId: res.correlationId || '—',
    body: res.data ?? res.error ?? {},
  };
}

export function useChaosActions({ onLog } = {}) {
  const [bolaResult, setBolaResult] = useState(null);
  const [raceStatuses, setRaceStatuses] = useState([]);
  const [payloadResult, setPayloadResult] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const runBola = useCallback(async () => {
    setActiveAction('bola');
    setIsLoading(true);
    setError(null);
    const res = await simulateBolaAttack({
      attackerTenant: 'tenant-beta',
      victimWalletId: 'wallet-alpha-1',
    });
    if (res.response) {
      onLog?.(toSessionLog('GET', '/wallets/wallet-alpha-1', res.response));
    }
    setBolaResult({
      status: res.status,
      message: res.isBlocked ? 'NotFoundError (Isolado)' : 'Falha de isolamento!',
    });
    setIsLoading(false);
    setActiveAction(null);
    return {
      message: res.isBlocked
        ? `BOLA bloqueado com sucesso: HTTP ${res.status}.`
        : `Alerta: acesso retornou HTTP ${res.status}.`,
    };
  }, [onLog]);

  const runRace = useCallback(async () => {
    setActiveAction('race');
    setIsLoading(true);
    setError(null);
    const raceKey = `race_${crypto.randomUUID()}`;
    const res = await simulateIdempotencyRace({
      count: 5,
      idempotencyKey: raceKey,
      path: '/payments',
      tenantId: 'tenant-alpha',
    });
    res.results?.forEach((item) => onLog?.(toSessionLog('POST', '/payments', item)));
    setRaceStatuses(res.statuses || []);
    setIsLoading(false);
    setActiveAction(null);
    return {
      message: `Corrida executada (${res.total} reqs): ${res.statuses?.join(' / ')}`,
    };
  }, [onLog]);

  const runCorruptPayload = useCallback(async () => {
    setActiveAction('payload');
    setIsLoading(true);
    setError(null);
    const res = await injectCorruptPayload();
    onLog?.(toSessionLog('POST', '/payments', res));
    const parsed = formatApiError(res.error, 'ValidationError');
    setPayloadResult({
      status: res.status,
      message: parsed.message,
    });
    setIsLoading(false);
    setActiveAction(null);
    return {
      message: `Zod Gate barrou payload inválido: HTTP ${res.status}.`,
    };
  }, [onLog]);

  return {
    bolaResult,
    raceStatuses,
    payloadResult,
    activeAction,
    isLoading,
    error,
    runBola,
    runRace,
    runCorruptPayload,
  };
}

export function simulateBolaAttack(options = {}) {
  const runner = new ChaosRunner(apiRequest);
  return runner.runBolaAttack(options);
}

export function simulateIdempotencyRace(options = {}) {
  const runner = new ChaosRunner(apiRequest);
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
  } = options;

  return runner.runRaceConditionBurst({
    count,
    idempotencyKey,
    path,
    tenantId,
    payload,
  });
}

export function injectCorruptPayload() {
  return apiRequest({
    path: '/payments',
    method: 'POST',
    tenantId: 'tenant-alpha',
    body: {
      walletId: 'wallet-alpha-1',
      amountInCents: -100,
      type: 'DEBIT',
      idempotencyKey: 'x',
    },
  });
}
