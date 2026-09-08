import { formatMoney } from '../lib/format'
import type { Summary } from '../api/types'

export function SummaryCards({ summary }: { summary: Summary }) {
  const currency = summary.base_currency
  const cards = [
    { label: 'Saldo total', value: summary.balance, tone: '' },
    { label: 'Ingresos', value: summary.income, tone: 'positive' },
    { label: 'Gastos', value: summary.expense, tone: 'negative' },
    { label: 'Balance neto', value: summary.net, tone: Number(summary.net) >= 0 ? 'positive' : 'negative' },
  ]

  return (
    <section className="summary-grid">
      {cards.map((card) => (
        <div key={card.label} className="card stat">
          <div className="stat-label">{card.label}</div>
          <div className={`stat-value ${card.tone}`}>{formatMoney(card.value, currency)}</div>
        </div>
      ))}
      <div className="card stat">
        <div className="stat-label">Movimientos</div>
        <div className="stat-value">{summary.transaction_count}</div>
      </div>
    </section>
  )
}
