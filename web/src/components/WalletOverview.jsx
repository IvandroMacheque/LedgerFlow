import { ArrowUpRight, Wallet } from 'lucide-react';
import { ErrorMessage, Skeleton } from './ui/Feedback';

export default function WalletOverview({ walletId, formattedBalance, balanceInCents, isLoading = false, error = null }) {
  return <section aria-label="Carteira selecionada" className="panel overflow-hidden">
    <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Wallet aria-hidden="true" className="size-4 text-slate-400" />Carteira selecionada</h2>
      <span className="flex items-center gap-1.5 font-mono text-[0.65rem] text-emerald-300"><span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-400" />MOCK</span>
    </div>
    {isLoading ? <Skeleton label="Carregando carteira…" /> : error ? <div className="p-5"><ErrorMessage error={error} /></div> : <>
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-5">
        <div><p className="text-xs text-slate-400">Saldo disponível</p><p className="mt-2 text-[clamp(1.8rem,2.8vw,2.6rem)] font-medium leading-tight tracking-tight text-white">{formattedBalance}</p></div>
        <div className="mb-1 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-right"><p className="text-[0.6rem] text-slate-400">amountInCents</p><p className="mt-1 font-mono text-sm text-indigo-200">{balanceInCents}</p></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/35 px-5 py-3 font-mono text-xs"><span className="text-slate-400">walletId</span><span className="flex min-w-0 items-center gap-2 break-all text-slate-300">{walletId}<ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" /></span></div>
    </>}
  </section>;
}
