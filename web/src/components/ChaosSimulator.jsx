import { ArrowRight, Braces, FlaskConical, GitFork, ShieldAlert } from 'lucide-react';
import Panel from './ui/Panel';
import StatusBadge from './ui/StatusBadge';
import { ErrorMessage, Skeleton } from './ui/Feedback';

export default function ChaosSimulator({ onBolaAttack, onRaceTest, onCorruptPayload, bolaResult = null, raceStatuses = [], payloadResult = null, isLoading = false, activeAction = null, error = null }) {
  return <Panel id="chaos" title="Provas de engenharia" description="Force a falha. Inspecione a resposta." icon={FlaskConical}
    action={<span className="rounded border border-amber-400/20 bg-amber-400/5 px-2 py-1 font-mono text-[0.6rem] text-amber-300">CHAOS LAB</span>}>
    <div className="divide-y divide-slate-800">
      <article className="p-5"><div className="flex items-start gap-3"><ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-300" /><div className="min-w-0 flex-1">
        <h3 className="text-xs font-semibold">Isolamento de tenant <span className="ml-1 font-mono font-normal text-slate-400">BOLA / IDOR</span></h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">Um tenant tenta movimentar a carteira de outro.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[0.65rem]"><span className="text-slate-300">tenant-beta</span><ArrowRight aria-hidden="true" className="size-3 text-slate-500" /><span className="text-red-300">wallet-alpha-1</span></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={isLoading} onClick={onBolaAttack} className="button-lab">{activeAction === 'bola' && isLoading ? 'Simulando…' : 'Simular ataque'}<ArrowUp /></button>
          {bolaResult && <div className="flex flex-wrap items-center gap-2"><StatusBadge status={bolaResult.status}>{bolaResult.status} BOLA Blocked</StatusBadge><span className="font-mono text-[0.65rem] text-slate-400">{bolaResult.message}</span></div>}</div>
      </div></div></article>
      <article className="p-5"><div className="flex items-start gap-3"><GitFork aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-300" /><div className="min-w-0 flex-1">
        <h3 className="text-xs font-semibold">Concorrência & idempotência</h3><p className="mt-1.5 text-xs leading-relaxed text-slate-400">5 requisições simultâneas. Uma única chave.</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={isLoading} onClick={onRaceTest} className="button-lab">{activeAction === 'race' && isLoading ? 'Executando…' : 'Disparar 5 requisições'}<ArrowUp /></button>
          <ol aria-label="Resultados de concorrência" className="flex flex-wrap gap-1.5">{raceStatuses.map((status, index) => <li key={index}><StatusBadge status={status} /></li>)}</ol></div>
      </div></div></article>
      <article className="p-5"><div className="flex items-start gap-3"><Braces aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-blue-300" /><div className="min-w-0 flex-1">
        <h3 className="text-xs font-semibold">Payload corrompido <span className="ml-1 font-mono font-normal text-slate-400">Zod Gate</span></h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">Valor negativo e chave curta barrados na entrada.</p>
        <code className="mt-3 block break-all font-mono text-[0.65rem] text-slate-300">{'{ "amount": -100, "idempotencyKey": "x" }'}</code>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={isLoading} onClick={onCorruptPayload} className="button-lab">{activeAction === 'payload' && isLoading ? 'Injetando…' : 'Injetar payload'}<ArrowUp /></button>
          {payloadResult && <StatusBadge status={payloadResult.status}>{payloadResult.status} {payloadResult.message}</StatusBadge>}</div>
      </div></div></article>
    </div>
    {isLoading && <Skeleton label="Executando prova de engenharia…" rows={1} />}
    {error && <div className="px-5 pb-5"><ErrorMessage error={error} /></div>}
    <p className="border-t border-slate-800 bg-slate-950/30 px-5 py-3 text-[0.65rem] text-slate-400">Resultados de exemplo · callbacks aguardam implementação manual</p>
  </Panel>;
}

function ArrowUp() { return <ArrowRight aria-hidden="true" className="size-3" />; }
