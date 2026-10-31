import { ArrowDownLeft, ArrowUpRight, Fingerprint, RefreshCw, SendHorizontal } from 'lucide-react';
import Panel from './ui/Panel';
import { ErrorMessage } from './ui/Feedback';

export default function PaymentForm({ amount = '', operation = 'CREDIT', idempotencyKey, onAmountChange, onOperationChange, onRegenerateKey, onSubmit, isLoading = false, error = null }) {
  return <Panel title="Nova operação" description="Explore o contrato de pagamentos." icon={SendHorizontal}>
    <form noValidate aria-busy={isLoading} onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }} className="space-y-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="payment-amount" className="field-label">Valor <span className="font-normal text-slate-400">(decimal)</span></label>
          <div className="relative"><span aria-hidden="true" className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">R$</span>
            <input id="payment-amount" type="text" inputMode="decimal" autoComplete="off" spellCheck={false} placeholder="0.00" value={amount} disabled={isLoading}
              onChange={(event) => onAmountChange?.(event.target.value)} aria-invalid={Boolean(error?.fields?.amount)} aria-describedby={error?.fields?.amount ? 'payment-amount-error' : 'payment-amount-hint'}
              className={`field pl-10 font-mono ${error?.fields?.amount ? 'border-red-400/60' : ''}`} />
          </div>
          {error?.fields?.amount ? <p id="payment-amount-error" className="feedback mt-2 text-xs text-red-300">{error.fields.amount}</p> : <p id="payment-amount-hint" className="mt-2 text-[0.65rem] text-slate-400">Conversão para centavos no hook.</p>}
        </div>
        <fieldset disabled={isLoading}><legend className="field-label">Tipo de operação</legend>
          <div className="grid grid-cols-2 gap-2">{['CREDIT', 'DEBIT'].map((type) => <button key={type} type="button" aria-pressed={operation === type} onClick={() => onOperationChange?.(type)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border font-mono text-xs transition-colors ${operation === type ? 'border-indigo-400/50 bg-indigo-400/10 text-indigo-200' : 'border-slate-700 bg-slate-950/40 text-slate-400 hover:border-slate-500'}`}>
            {type === 'CREDIT' ? <ArrowDownLeft aria-hidden="true" className="size-3.5" /> : <ArrowUpRight aria-hidden="true" className="size-3.5" />}{type}</button>)}</div>
        </fieldset>
      </div>
      <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-1.5 font-mono text-xs text-slate-400"><Fingerprint aria-hidden="true" className="size-3.5" />idempotencyKey</span>
        <button type="button" onClick={onRegenerateKey} disabled={isLoading} className="flex items-center gap-1.5 rounded text-[0.65rem] text-indigo-300 transition-colors hover:text-indigo-200"><RefreshCw aria-hidden="true" className="size-3" />Regenerar Chave Manualmente</button></div>
        <output className="block break-all rounded-lg border border-dashed border-slate-700 bg-slate-950/60 px-3 py-3 font-mono text-xs text-slate-300">{idempotencyKey}</output>
        {error?.fields?.idempotencyKey && <p className="feedback mt-2 text-xs text-red-300">{error.fields.idempotencyKey}</p>}
      </div>
      <ErrorMessage error={error} />
      <button type="submit" disabled={isLoading} className="button-primary w-full"><SendHorizontal aria-hidden="true" className="size-4" />{isLoading ? 'Enviando operação…' : 'Enviar operação'}<span aria-hidden="true" className="ml-auto font-mono text-xs opacity-70">↵</span></button>
      <p className="text-center text-[0.65rem] text-slate-400">Sandbox visual · nenhum valor real é movimentado</p>
    </form>
  </Panel>;
}
