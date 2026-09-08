import { useState } from 'react'
import { api } from '../api/client'
import type { TransactionFilters } from '../api/types'
import { Alert, EmptyState, Loading } from '../components/Feedback'
import { TransactionForm } from '../components/TransactionForm'
import { formatDate, formatMoney } from '../lib/format'
import { useAsync } from '../lib/useAsync'

const PAGE_SIZE = 25

const EMPTY_FILTERS: TransactionFilters = {
  kind: undefined,
  account_id: undefined,
  category_id: undefined,
  date_from: undefined,
  date_to: undefined,
  search: '',
  limit: PAGE_SIZE,
  offset: 0,
}

export function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS)
  const [showForm, setShowForm] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const transactions = useAsync(() => api.transactions(filters), [filters])
  const accounts = useAsync(() => api.accounts(), [])
  const categories = useAsync(() => api.categories(), [])

  function patch(next: Partial<TransactionFilters>, resetPage = true) {
    setFilters((prev) => ({ ...prev, ...next, offset: resetPage ? 0 : prev.offset }))
  }

  const page = transactions.data?.items ?? []
  const total = transactions.data?.total ?? 0
  const currentPage = Math.floor((filters.offset ?? 0) / PAGE_SIZE) + 1
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  async function handleDelete(id: string) {
    setActionError(null)
    try {
      await api.deleteTransaction(id)
      transactions.reload()
      accounts.reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Transacciones</h1>
          <p className="muted">{total} movimiento{total === 1 ? '' : 's'} encontrado{total === 1 ? '' : 's'}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Nueva transacción
        </button>
      </div>

      {actionError ? <Alert>{actionError}</Alert> : null}
      {transactions.error ? <Alert>{transactions.error}</Alert> : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="filters">
          <div className="field">
            <label htmlFor="f-kind">Tipo</label>
            <select
              id="f-kind"
              value={filters.kind ?? ''}
              onChange={(event) =>
                patch({ kind: (event.target.value || undefined) as TransactionFilters['kind'] })
              }
            >
              <option value="">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-account">Cuenta</label>
            <select
              id="f-account"
              value={filters.account_id ?? ''}
              onChange={(event) => patch({ account_id: event.target.value || undefined })}
            >
              <option value="">Todas</option>
              {(accounts.data ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-category">Categoría</label>
            <select
              id="f-category"
              value={filters.category_id ?? ''}
              onChange={(event) => patch({ category_id: event.target.value || undefined })}
            >
              <option value="">Todas</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.kind === 'income' ? 'ingreso' : 'gasto'})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-from">Desde</label>
            <input
              id="f-from"
              type="date"
              value={filters.date_from ?? ''}
              onChange={(event) => patch({ date_from: event.target.value || undefined })}
            />
          </div>

          <div className="field">
            <label htmlFor="f-to">Hasta</label>
            <input
              id="f-to"
              type="date"
              value={filters.date_to ?? ''}
              onChange={(event) => patch({ date_to: event.target.value || undefined })}
            />
          </div>

          <div className="field">
            <label htmlFor="f-search">Buscar</label>
            <input
              id="f-search"
              type="search"
              placeholder="Descripción o categoría"
              value={filters.search ?? ''}
              onChange={(event) => patch({ search: event.target.value })}
            />
          </div>
        </div>

        {JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS) ? (
          <button type="button" className="btn btn-ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
            Limpiar filtros
          </button>
        ) : null}
      </div>

      <div className="card">
        {transactions.loading ? (
          <Loading />
        ) : page.length === 0 ? (
          <EmptyState
            title="No hay transacciones"
            hint="Crea una cuenta y registra tu primer movimiento."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Categoría</th>
                    <th>Cuenta</th>
                    <th className="num">Importe</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {page.map((item) => (
                    <tr key={item.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.occurred_on)}</td>
                      <td>{item.description || <span className="muted">—</span>}</td>
                      <td>
                        <span className="pill">
                          <i className="pill-dot" style={{ background: item.category_color }} />
                          {item.category_name}
                        </span>
                      </td>
                      <td className="muted">{item.account_name}</td>
                      <td className={`num ${item.kind === 'income' ? 'positive' : 'negative'}`}>
                        {item.kind === 'income' ? '+' : '−'}
                        {formatMoney(item.amount, item.currency)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => handleDelete(item.id)}
                          aria-label={`Eliminar transacción de ${item.description || item.category_name}`}
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={currentPage <= 1}
                onClick={() => patch({ offset: (filters.offset ?? 0) - PAGE_SIZE }, false)}
              >
                ← Anterior
              </button>
              <span className="muted">
                Página {currentPage} de {pages}
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={currentPage >= pages}
                onClick={() => patch({ offset: (filters.offset ?? 0) + PAGE_SIZE }, false)}
              >
                Siguiente →
              </button>
            </div>
          </>
        )}
      </div>

      {showForm ? (
        <TransactionForm
          accounts={accounts.data ?? []}
          categories={categories.data ?? []}
          defaultCurrency="EUR"
          onClose={() => setShowForm(false)}
          onSubmit={async (input) => {
            await api.createTransaction(input)
            transactions.reload()
            accounts.reload()
          }}
        />
      ) : null}
    </>
  )
}
