export function Alert({ kind = 'error', children }: { kind?: 'error' | 'info'; children: string }) {
  return <div className={`alert alert-${kind}`}>{children}</div>
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {hint ? <span>{hint}</span> : null}
    </div>
  )
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="empty">
      <span className="muted">{label}</span>
    </div>
  )
}
