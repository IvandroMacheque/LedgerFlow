const tones = {
  green: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  amber: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  red: 'border-red-400/20 bg-red-400/10 text-red-300',
  blue: 'border-blue-400/20 bg-blue-400/10 text-blue-300',
  neutral: 'border-slate-700 bg-slate-800 text-slate-300',
};

/** Presentation-only mapping of HTTP / outbox states to semantic colors. */
export default function StatusBadge({ status, children }) {
  const tone = status === 'PENDING' ? 'blue'
    : status === 'PROCESSED' || (Number(status) >= 200 && Number(status) < 300) ? 'green'
      : status === 409 || status === 422 || status === '409' || status === '422' ? 'amber'
        : status === 'FAILED' || Number(status) >= 400 ? 'red' : 'neutral';
  return <span data-tone={tone} className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[0.65rem] font-medium leading-none ${tones[tone]}`}>
    {children ?? status}
  </span>;
}
