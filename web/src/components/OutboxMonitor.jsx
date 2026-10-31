import { Database, Pause, Play, Zap } from 'lucide-react';
import Panel from './ui/Panel';
import StatusBadge from './ui/StatusBadge';
import { ErrorMessage, Skeleton } from './ui/Feedback';

export default function OutboxMonitor({ events = [], isPolling = false, isLoading = false, isProcessing = false, error = null, onTogglePolling, onProcessWorker }) {
  return <Panel id="outbox" title="Transactional Outbox" description="Consistência eventual, evento a evento." icon={Database}
    action={<span className="flex items-center gap-1.5 font-mono text-[0.65rem] text-slate-400"><span aria-hidden="true" className={`size-1.5 rounded-full ${isPolling ? 'bg-blue-400' : 'bg-slate-500'}`} />{isPolling ? 'POLLING ATIVO' : 'POLLING PAUSADO'}</span>}>
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <code className="font-mono text-[0.65rem] text-slate-400">public.outbox_events</code>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={isLoading} onClick={onTogglePolling} className="button-secondary text-[0.65rem]">
        {isPolling ? <Pause aria-hidden="true" className="size-3" /> : <Play aria-hidden="true" className="size-3" />}{isPolling ? 'Pausar polling' : 'Ativar polling'}</button>
        <button type="button" disabled={isLoading || isProcessing} onClick={onProcessWorker} className="button-secondary text-[0.65rem]"><Zap aria-hidden="true" className="size-3 text-amber-300" />{isProcessing ? 'Processando…' : 'Processar Worker'}</button>
      </div>
    </div>
    {error && <div className="px-5 pb-4"><ErrorMessage error={error} /></div>}
    {isLoading ? <Skeleton label="Carregando eventos…" rows={4} /> : events.length === 0 ? <div className="border-t border-slate-800 px-5 py-10 text-center"><Database aria-hidden="true" className="mx-auto mb-3 size-6 text-slate-500" /><p className="text-sm text-slate-300">Nenhum evento no outbox.</p><p className="mt-2 text-xs text-slate-400">Os eventos recebidos aparecerão nesta tabela.</p></div> :
      <div className="overflow-x-auto" role="region" aria-label="Eventos do outbox" tabIndex={0}>
        <table className="w-full border-collapse text-left text-[0.65rem]">
          <caption className="sr-only">Eventos da tabela outbox_events</caption>
          <thead className="border-y border-slate-800 bg-slate-950/40 text-slate-400"><tr>{['eventId', 'type', 'status', 'attempts'].map((column) => <th key={column} scope="col" className="px-5 py-3 font-mono font-normal last:text-right">{column}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-800/80 font-mono">{events.map((event) => <tr key={event.eventId} className="transition-colors hover:bg-slate-800/40">
            <td className="whitespace-nowrap px-5 py-3.5 text-slate-300">{event.eventId}</td><td className="whitespace-nowrap px-5 py-3.5 text-slate-400">{event.type}</td>
            <td className="px-5 py-3.5"><StatusBadge status={event.status} /></td><td className="px-5 py-3.5 text-right text-slate-300">{event.attempts}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-slate-950/30 px-5 py-3 text-[0.65rem] text-slate-400"><span><span className="font-mono text-slate-300">{events.length}</span> eventos de exemplo</span><span>Worker & polling: stubs</span></div>
  </Panel>;
}
