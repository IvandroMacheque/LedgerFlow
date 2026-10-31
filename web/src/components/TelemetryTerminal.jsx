import { Activity, ChevronRight, Circle, Terminal } from 'lucide-react';
import Panel from './ui/Panel';
import StatusBadge from './ui/StatusBadge';
import { ErrorMessage, Skeleton } from './ui/Feedback';

export default function TelemetryTerminal({ metrics = {}, logs = [], isLoading = false, error = null }) {
  return <Panel id="telemetry" title="Telemetria & rastreabilidade" description="Da requisição ao diagnóstico, pelo correlationId." icon={Activity}
    action={<span className="font-mono text-[0.6rem] text-slate-400">RED METRICS</span>}>
    {isLoading ? <Skeleton label="Carregando telemetria…" rows={4} /> : <>
      <dl className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800">
        <div className="metric-cell"><dt>Rate <span className="mt-0.5 block text-[0.6rem] text-slate-400">Total Req</span></dt><dd className="text-slate-100">{metrics.totalRequests ?? '—'}</dd></div>
        <div className="metric-cell"><dt>Errors <span className="mt-0.5 block text-[0.6rem] text-slate-400">Taxa de falha</span></dt><dd className="text-amber-300">{metrics.errorRate == null ? '—' : `${metrics.errorRate}%`}</dd></div>
        <div className="metric-cell"><dt>Duration <span className="mt-0.5 block text-[0.6rem] text-slate-400">Latência média</span></dt><dd className="text-slate-100">{metrics.averageDuration == null ? '—' : `${metrics.averageDuration} ms`}</dd></div>
      </dl>
      <div className="m-4 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/50 px-4 py-3">
          <span className="flex items-center gap-2 font-mono text-[0.65rem] text-slate-300"><Terminal aria-hidden="true" className="size-3.5 text-slate-500" />request_history</span>
          <span className="flex items-center gap-1.5 font-mono text-[0.6rem] text-slate-400"><Circle aria-hidden="true" className="size-1.5 fill-blue-400 text-blue-400" />MOCK SESSION</span>
        </div>
        <div role="region" aria-label="Histórico de requisições" tabIndex={0} className="max-h-[34rem] overflow-y-auto overscroll-contain">
          {logs.length === 0 ? <p className="px-4 py-10 text-center text-xs text-slate-400">Nenhuma requisição nesta sessão.</p> : logs.map((log) => <article key={log.id} className="border-b border-slate-800/70 p-4 last:border-0">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[0.65rem]"><time className="text-slate-400">{log.time}</time><span className="text-indigo-300">{log.method}</span><span className="min-w-0 flex-1 break-all text-slate-200">{log.path}</span><StatusBadge status={log.status} /><span className="text-slate-400">{log.duration}ms</span></div>
            <div className="mt-2 flex flex-wrap items-start gap-x-2 gap-y-1 font-mono text-[0.6rem]"><span className="text-slate-400">x-correlation-id</span><span className="break-all text-blue-300">{log.correlationId}</span></div>
            <details open className="group mt-3"><summary className="flex cursor-pointer list-none items-center gap-1 rounded font-mono text-[0.6rem] text-slate-400 hover:text-slate-200"><ChevronRight aria-hidden="true" className="size-3 transition-transform group-open:rotate-90" />Response body</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-slate-900/50 p-3 font-mono text-[0.65rem] leading-relaxed text-slate-300"><code>{JSON.stringify(log.body, null, 2)}</code></pre>
            </details>
          </article>)}
        </div>
        <p className="flex items-center gap-2 border-t border-slate-800 px-4 py-3 font-mono text-[0.6rem] text-slate-400"><span className="text-indigo-300">❯</span> Aguardando integração manual<span aria-hidden="true" className="h-3 w-1.5 bg-slate-500" /></p>
      </div>
    </>}
    {error && <div className="px-5 pb-5"><ErrorMessage error={error} /></div>}
    <p className="border-t border-slate-800 px-5 py-3 text-[0.65rem] text-slate-400">HTTP 500: exemplo sanitizado, sem stack trace ou detalhes internos.</p>
  </Panel>;
}
