import { formatMoney, toNumber } from '../lib/format'
import type { CategoryTotal } from '../api/types'
import { EmptyState } from './Feedback'

export function CategoryBreakdown({
  data,
  currency,
}: {
  data: CategoryTotal[]
  currency: string
}) {
  const peak = Math.max(1, ...data.map((item) => toNumber(item.total)))

  return (
    <div className="card">
      <div className="card-title">
        <span>Gasto por categoría</span>
        <span className="muted">en {currency}</span>
      </div>

      {data.length === 0 ? (
        <EmptyState title="Sin gastos registrados" hint="Añade un gasto para ver el desglose." />
      ) : (
        <div className="cat-list">
          {data.slice(0, 8).map((item) => (
            <div key={item.category_id}>
              <div className="cat-row-label">
                <span>{item.category_name}</span>
                <span>{formatMoney(item.total, currency)}</span>
              </div>
              <div className="cat-track">
                <div
                  className="cat-fill"
                  style={{
                    width: `${(toNumber(item.total) / peak) * 100}%`,
                    background: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
