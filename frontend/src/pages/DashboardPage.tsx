import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { Alert, Loading } from '../components/Feedback'
import { FxConverter } from '../components/FxConverter'
import { MonthlyChart } from '../components/MonthlyChart'
import { SummaryCards } from '../components/SummaryCards'
import { TransactionForm } from '../components/TransactionForm'
import { useAsync } from '../lib/useAsync'

export function DashboardPage() {
  const { user } = useAuth()
  const [months, setMonths] = useState(6)
  const [showForm, setShowForm] = useState(false)

  const dashboard = useAsync(() => api.dashboard(months), [months])
  const accounts = useAsync(() => api.accounts(), [])
  const categories = useAsync(() => api.categories(), [])

  if (dashboard.error) return <Alert>{dashboard.error}</Alert>
  if (dashboard.loading || !dashboard.data) return <Loading label="Preparando tu resumen…" />

  const baseCurrency = user?.base_currency ?? dashboard.data.summary.base_currency

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hola, {user?.full_name.split(' ')[0]}</h1>
          <p className="muted">
            Resumen en {baseCurrency}. Los importes en otras divisas se convierten con
            tipos de cambio del Banco Central Europeo.
          </p>
        </div>
        <div className="toolbar">
          <select
            value={months}
            onChange={(event) => setMonths(Number(event.target.value))}
            style={{ width: 'auto' }}
            aria-label="Meses a mostrar"
          >
            {[3, 6, 12].map((option) => (
              <option key={option} value={option}>
                Últimos {option} meses
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Nueva transacción
          </button>
        </div>
      </div>

      <SummaryCards summary={dashboard.data.summary} />

      <section className="charts-grid">
        <MonthlyChart data={dashboard.data.by_month} currency={baseCurrency} />
        <CategoryBreakdown data={dashboard.data.by_category} currency={baseCurrency} />
      </section>

      <FxConverter baseCurrency={baseCurrency} />

      {showForm ? (
        <TransactionForm
          accounts={accounts.data ?? []}
          categories={categories.data ?? []}
          defaultCurrency={baseCurrency}
          onClose={() => setShowForm(false)}
          onSubmit={async (input) => {
            await api.createTransaction(input)
            dashboard.reload()
            accounts.reload()
          }}
        />
      ) : null}
    </>
  )
}
