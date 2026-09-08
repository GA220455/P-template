import { formatMoney, formatMonth, toNumber } from '../lib/format'
import type { MonthlyPoint } from '../api/types'
import { EmptyState } from './Feedback'

export function MonthlyChart({
  data,
  currency,
}: {
  data: MonthlyPoint[]
  currency: string
}) {
  const peak = Math.max(
    1,
    ...data.flatMap((point) => [toNumber(point.income), toNumber(point.expense)]),
  )
  const hasData = data.some(
    (point) => toNumber(point.income) > 0 || toNumber(point.expense) > 0,
  )

  return (
    <div className="card">
      <div className="card-title">
        <span>Ingresos y gastos por mes</span>
        <span className="legend">
          <span>
            <i className="legend-dot bar-income" /> Ingresos
          </span>
          <span>
            <i className="legend-dot bar-expense" /> Gastos
          </span>
        </span>
      </div>

      {!hasData ? (
        <EmptyState
          title="Sin movimientos todavía"
          hint="Registra tu primera transacción para ver la evolución mensual."
        />
      ) : (
        <div className="month-chart">
          {data.map((point) => (
            <div key={point.month} className="month-col">
              <div className="month-bars">
                <div
                  className="bar bar-income"
                  style={{ height: `${(toNumber(point.income) / peak) * 100}%` }}
                  title={`Ingresos ${formatMonth(point.month)}: ${formatMoney(point.income, currency)}`}
                />
                <div
                  className="bar bar-expense"
                  style={{ height: `${(toNumber(point.expense) / peak) * 100}%` }}
                  title={`Gastos ${formatMonth(point.month)}: ${formatMoney(point.expense, currency)}`}
                />
              </div>
              <span className="month-label">{formatMonth(point.month)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
