import { Layers3, RotateCcw, ShieldCheck } from 'lucide-react';
import { ErrorMessage } from './ui/Feedback';

export default function HeaderTenantBar({ tenantId, onTenantChange, onResetSandbox, activeScreen = 'operations', isLoading = false, error = null }) {
  return <header className="border-b border-slate-800 bg-slate-950">
    <div className="page-shell flex flex-wrap items-center justify-between gap-5 py-4">
      <a href="#/operacoes" className="flex items-center gap-3 rounded-md text-slate-100" aria-label="LedgerFlow — início">
        <span className="flex size-9 items-center justify-center rounded-lg border border-indigo-400/25 bg-indigo-400/10"><Layers3 aria-hidden="true" className="size-5 text-indigo-300" strokeWidth={1.7} /></span>
        <span className="text-lg font-semibold tracking-tight">LedgerFlow<span className="ml-2 align-middle font-mono text-[0.6rem] font-normal tracking-normal text-slate-400">/ playground</span></span>
      </a>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck aria-hidden="true" className="size-3.5" /> Security context</span>
        <div role="group" aria-label="Selecionar tenant" className="flex rounded-lg border border-slate-800 bg-slate-900 p-1">
          {['tenant-alpha', 'tenant-beta'].map((tenant) => <button type="button" key={tenant} aria-pressed={tenantId === tenant} disabled={isLoading}
            onClick={() => onTenantChange?.(tenant)} className={`rounded-md px-3 py-2 font-mono text-xs transition-colors ${tenantId === tenant ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>{tenant}</button>)}
        </div>
        <button type="button" onClick={onResetSandbox} disabled={isLoading} className="button-secondary text-xs"><RotateCcw aria-hidden="true" className="size-3.5" />Reset Sandbox State</button>
      </div>
    </div>
    <div className="border-t border-slate-800/70">
      <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-3">
        <nav aria-label="Telas do playground" className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {[
            { id: 'operations', href: '#/operacoes', label: 'Operações' },
            { id: 'engineering', href: '#/provas', label: 'Provas de engenharia' },
            { id: 'telemetry', href: '#/telemetria', label: 'Telemetria' },
          ].map((screen) => <a key={screen.id} href={screen.href} aria-current={activeScreen === screen.id ? 'page' : undefined}
            className={`border-b-2 pb-1 transition-colors ${activeScreen === screen.id ? 'border-indigo-400 text-indigo-200' : 'border-transparent text-slate-400 hover:text-indigo-300'}`}>{screen.label}</a>)}
        </nav>
        <span className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-[0.65rem] text-slate-400"><span>x-tenant-id</span><span className="text-slate-600">:</span><span className="text-indigo-300">{tenantId}</span></span>
      </div>
    </div>
    {error && <div className="page-shell pb-3"><ErrorMessage error={error} /></div>}
  </header>;
}
