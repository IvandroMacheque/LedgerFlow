import { CircleAlert, X } from 'lucide-react';

export function ErrorMessage({ error }) {
  if (!error) return null;
  const tone = error.status === 409 || error.status === 422 ? 'amber' : 'red';
  return <div role="alert" data-tone={tone} className={`feedback rounded-lg border p-3 text-xs ${tone === 'amber' ? 'border-amber-400/25 bg-amber-400/10 text-amber-200' : 'border-red-400/25 bg-red-400/10 text-red-200'}`}>
    <div className="flex items-start gap-2"><CircleAlert aria-hidden="true" className="size-4 shrink-0" />
      <p><span className="font-mono font-semibold">{error.status} </span>{error.message}</p>
    </div>
  </div>;
}

export function Skeleton({ label = 'Carregando dados…', rows = 3 }) {
  return <div role="status" className="space-y-3 p-5"><span className="sr-only">{label}</span>
    {Array.from({ length: rows }, (_, index) => <div key={index} aria-hidden="true" className={`skeleton h-4 rounded bg-slate-800 ${index % 2 ? 'w-2/3' : 'w-full'}`} />)}
  </div>;
}

export function Toast({ message, onDismiss }) {
  if (!message) return null;
  return <aside role="status" aria-label="Notificação da ação" className="feedback fixed inset-x-4 bottom-5 z-30 mx-auto flex max-w-lg items-start gap-3 rounded-xl border border-indigo-400/30 bg-slate-900 p-4 shadow-2xl shadow-black/40">
    <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-indigo-300" />
    <p className="flex-1 text-sm leading-relaxed text-slate-200">{message}</p>
    <button type="button" onClick={onDismiss} aria-label="Fechar notificação" className="icon-button"><X aria-hidden="true" className="size-4" /></button>
  </aside>;
}
