import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/apiClient';

function summarizeMetrics(raw) {
  if (!raw || typeof raw !== 'object') {
    return { totalRequests: 0, errorRate: '0.0', averageDuration: '0' };
  }
  const rates = Object.values(raw.rates || {});
  const errors = Object.values(raw.errors || {});
  const durations = Object.values(raw.durations || {}).flat();

  const totalRequests = rates.reduce((sum, n) => sum + Number(n || 0), 0);
  const totalErrors = errors.reduce((sum, n) => sum + Number(n || 0), 0);
  const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(1) : '0.0';
  const averageDuration = durations.length > 0
    ? String(Math.round(durations.reduce((sum, n) => sum + Number(n || 0), 0) / durations.length))
    : '0';

  return { totalRequests, errorRate, averageDuration };
}

function normalizeOutboxEvents(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    eventId: row.id ?? row.eventId,
    type: row.eventType ?? row.type,
    status: row.status,
    attempts: row.attempts ?? 0,
  }));
}

/** @param {{tenantId:string, sessionLogs?: Array<object>}} context */
export function useTelemetryPolling({ tenantId, sessionLogs = [] } = {}) {
  const [events, setEvents] = useState([]);
  const [metrics, setMetrics] = useState({ totalRequests: 0, errorRate: '0.0', averageDuration: '0' });
  const [isPolling, setIsPolling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const fetchTelemetry = useCallback(async (signal) => {
    setError(null);
    const [outboxRes, metricsRes] = await Promise.all([
      apiRequest({ path: '/outbox', method: 'GET', tenantId, signal }),
      apiRequest({ path: '/metrics', method: 'GET', tenantId, signal }),
    ]);

    if (signal?.aborted) return;

    if (outboxRes.ok) {
      setEvents(normalizeOutboxEvents(outboxRes.data));
    } else if (!outboxRes.ok && outboxRes.status !== 0) {
      setError({ status: outboxRes.status, message: 'Erro ao consultar outbox.' });
    }

    if (metricsRes.ok) {
      setMetrics(summarizeMetrics(metricsRes.data));
    }
  }, [tenantId]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetchTelemetry(controller.signal).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });
    return () => controller.abort();
  }, [fetchTelemetry]);

  useEffect(() => {
    if (!isPolling) return undefined;
    const controller = new AbortController();
    const interval = window.setInterval(() => {
      fetchTelemetry(controller.signal);
    }, 3000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [isPolling, fetchTelemetry]);

  const togglePolling = useCallback(() => {
    setIsPolling((prev) => !prev);
  }, []);

  const triggerRefresh = useCallback(async () => {
    setIsProcessing(true);
    await fetchTelemetry();
    setIsProcessing(false);
    return { message: 'Telemetria e eventos do Outbox atualizados a partir do servidor.' };
  }, [fetchTelemetry]);

  return {
    events,
    metrics,
    logs: sessionLogs,
    isPolling,
    isLoading,
    isProcessing,
    error,
    togglePolling,
    triggerRefresh,
  };
}

/** @param {boolean} enabled */
export function toggleTelemetryPolling(enabled) {
  return {
    message: enabled
      ? 'Polling ativado: consultando /outbox e /metrics a cada 3 segundos.'
      : 'Polling pausado.',
  };
}

/** @param {{tenantId:string}} context */
export function processOutboxWorker(context) {
  return apiRequest({
    path: '/outbox',
    method: 'GET',
    tenantId: context?.tenantId || 'tenant-alpha',
  });
}
