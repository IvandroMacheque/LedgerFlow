export default function Panel({ id, title, description, icon: Icon, action, children, className = '' }) {
  return <section id={id} aria-label={title} className={`panel ${className}`}>
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" strokeWidth={1.6} />}
        <div className="min-w-0"><h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
        </div>
      </div>
      {action}
    </header>
    {children}
  </section>;
}
