import { useCallback, useEffect, useRef, useState } from 'react';
import { toCents, formatCurrency } from '../utils/currency';
import { apiRequest } from '../services/apiClient';
import { IdempotencyManager } from '../state/idempotencyManager';
import { formatApiError } from '../utils/formatApiError';

const WALLET_BY_TENANT = {
  'tenant-alpha': 'wallet-alpha-1',
  'tenant-beta': 'wallet-beta-1',
};

function resolveWalletId(tenantId) {
  return WALLET_BY_TENANT[tenantId] || 'wallet-alpha-1';
}

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

/** @param {{tenantId: 'tenant-alpha'|'tenant-beta', onLog?: (log: object) => void}} context */
export function usePaymentFlow({ tenantId, onLog } = {}) {
  const walletId = resolveWalletId(tenantId);
  const idempotencyRef = useRef(new IdempotencyManager());
  const [idempotencyKey, setIdempotencyKey] = useState(() => idempotencyRef.current.getKey());
  const [wallet, setWallet] = useState({
    walletId,
    balanceInCents: 0,
    formattedBalance: 'R$ 0,00',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWallet = useCallback(async (signal, overrideTenantId) => {
    const activeTenant = overrideTenantId || tenantId;
    const targetWalletId = resolveWalletId(activeTenant);
    setIsLoading(true);
    setError(null);
    const path = `/wallets/${targetWalletId}`;
    const res = await apiRequest({ path, method: 'GET', tenantId: activeTenant, signal });
    if (signal?.aborted) return;

    onLog?.(toSessionLog('GET', path, res));

    if (res.ok && res.data) {
      const balanceInCents = res.data.balanceInCents ?? 0;
      setWallet({
        walletId: res.data.id || targetWalletId,
        balanceInCents,
        formattedBalance: formatCurrency(balanceInCents),
      });
    } else {
      setWallet({
        walletId: targetWalletId,
        balanceInCents: 0,
        formattedBalance: formatCurrency(0),
      });
      const parsed = formatApiError(res.error, 'Não foi possível carregar a carteira.');
      setError({
        status: res.status,
        message: parsed.message,
      });
    }
    setIsLoading(false);
  }, [tenantId, onLog]);

  useEffect(() => {
    const controller = new AbortController();
    fetchWallet(controller.signal);
    return () => controller.abort();
  }, [fetchWallet]);

  const regenerateKey = useCallback(() => {
    const next = idempotencyRef.current.regenerateKey();
    setIdempotencyKey(next);
    return next;
  }, []);

  const executePayment = useCallback(async ({ amount, operation }) => {
    setError(null);
    let amountInCents;
    try {
      amountInCents = toCents(amount);
    } catch (validationErr) {
      const fieldError = {
        status: 400,
        message: validationErr.message,
        fields: { amount: validationErr.message },
      };
      setError(fieldError);
      return { ok: false, message: validationErr.message };
    }

    setIsLoading(true);
    const currentKey = idempotencyRef.current.getKey();
    const res = await submitPayment({
      tenantId,
      walletId: wallet.walletId,
      amount,
      operation,
      idempotencyKey: currentKey,
    });

    onLog?.(toSessionLog('POST', '/payments', res));
    idempotencyRef.current.handleTransactionResult(res);
    setIdempotencyKey(idempotencyRef.current.getKey());

    if (res.ok) {
      await fetchWallet();
      return {
        ok: true,
        message: `Operação ${operation} de ${formatCurrency(amountInCents)} confirmada (HTTP ${res.status}).`,
      };
    }

    const parsed = formatApiError(res.error, 'Falha ao processar pagamento.');
    const normalizedError = {
      status: res.status,
      message: parsed.message,
      fields: parsed.fields,
    };
    setError(normalizedError);
    setIsLoading(false);
    return {
      ok: false,
      message: `Erro HTTP ${res.status}: ${normalizedError.message}`,
    };
  }, [tenantId, wallet.walletId, onLog, fetchWallet]);

  const resetSandbox = useCallback(async (nextTenantId) => {
    const activeTenant = nextTenantId || tenantId;
    setIsLoading(true);
    setError(null);
    const res = await resetSandboxState(activeTenant);
    onLog?.(toSessionLog('POST', '/sandbox/reset', res));
    const nextKey = idempotencyRef.current.regenerateKey();
    setIdempotencyKey(nextKey);
    await fetchWallet(undefined, activeTenant);
    return {
      ok: res.ok,
      message: res.ok
        ? (res.data?.message || 'Sandbox reiniciado com sucesso no banco de dados.')
        : `Erro ao reiniciar sandbox (HTTP ${res.status}).`,
    };
  }, [tenantId, onLog, fetchWallet]);

  return {
    wallet,
    idempotencyKey,
    isLoading,
    error,
    executePayment,
    regenerateKey,
    resetSandbox,
    refreshWallet: fetchWallet,
  };
}

/** @param {{tenantId:string,walletId:string,amount:string,operation:string,idempotencyKey:string}} payment */
export function submitPayment(payment) {
  const amountInCents = toCents(payment.amount);
  return apiRequest({
    path: '/payments',
    method: 'POST',
    tenantId: payment.tenantId,
    body: {
      walletId: payment.walletId,
      amountInCents,
      type: payment.operation,
      idempotencyKey: payment.idempotencyKey,
    },
  });
}

export function regeneratePaymentKey() {
  return crypto.randomUUID();
}

export function resetSandboxState(tenantId = 'tenant-alpha') {
  return apiRequest({
    path: '/sandbox/reset',
    method: 'POST',
    tenantId: tenantId || 'tenant-alpha',
  });
}
