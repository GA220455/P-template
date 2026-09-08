import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import { ACCOUNT_TYPE_LABELS, type AccountType, type TransactionKind } from '../api/types'
import { Alert, EmptyState, Loading } from '../components/Feedback'
import { formatMoney } from '../lib/format'
import { useAsync } from '../lib/useAsync'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL', 'CHF', 'JPY']
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

export function AccountsPage() {
  const accounts = useAsync(() => api.accounts(), [])
  const categories = useAsync(() => api.categories(), [])

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [currency, setCurrency] = useState('EUR')
  const [opening, setOpening] = useState('0')
  const [accountError, setAccountError] = useState<string | null>(null)

  const [catName, setCatName] = useState('')
  const [catKind, setCatKind] = useState<TransactionKind>('expense')
  const [catColor, setCatColor] = useState(COLORS[0])
  const [catError, setCatError] = useState<string | null>(null)

  const [notice, setNotice] = useState<string | null>(null)

  async function createAccount(event: FormEvent) {
    event.preventDefault()
    setAccountError(null)
    setNotice(null)
    const accountName = name.trim()
    try {
      await api.createAccount({
        name: accountName,
        type,
        currency,
        opening_balance: opening || '0',
      })
      setName('')
      setOpening('0')
      accounts.reload()
      setNotice(`Cuenta «${accountName}» creada.`)
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
    }
  }

  async function createCategory(event: FormEvent) {
    event.preventDefault()
    setCatError(null)
    setNotice(null)
    const categoryName = catName.trim()
    try {
      await api.createCategory({ name: categoryName, kind: catKind, color: catColor })
      setCatName('')
      categories.reload()
      setNotice(`Categoría «${categoryName}» creada.`)
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'No se pudo crear la categoría')
    }
  }

  async function removeAccount(id: string, label: string) {
    setNotice(null)
    try {
      await api.deleteAccount(id)
      accounts.reload()
      setNotice(`Cuenta «${label}» eliminada.`)
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta')
    }
  }

  async function removeCategory(id: string, label: string) {
    setNotice(null)
    try {
      await api.deleteCategory(id)
      categories.reload()
      setNotice(`Categoría «${label}» eliminada.`)
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'No se pudo eliminar la categoría')
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Cuentas y categorías</h1>
          <p className="muted">Configura dónde guardas tu dinero y cómo lo clasificas.</p>
        </div>
      </div>

      {notice ? <Alert kind="info">{notice}</Alert> : null}

      <section className="stack">
        <div className="card">
          <div className="card-title">Tus cuentas</div>
          {accounts.error ? <Alert>{accounts.error}</Alert> : null}
          {accounts.loading ? (
            <Loading />
          ) : (accounts.data ?? []).length === 0 ? (
            <EmptyState title="Todavía no tienes cuentas" hint="Crea la primera con el formulario de abajo." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Divisa</th>
                    <th className="num">Apertura</th>
                    <th className="num">Ingresos</th>
                    <th className="num">Gastos</th>
                    <th className="num">Saldo actual</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(accounts.data ?? []).map((account) => (
                    <tr key={account.id}>
                      <td>
                        <strong>{account.name}</strong>
                      </td>
                      <td className="muted">{ACCOUNT_TYPE_LABELS[account.type]}</td>
                      <td className="muted">{account.currency}</td>
                      <td className="num">{formatMoney(account.opening_balance, account.currency)}</td>
                      <td className="num positive">{formatMoney(account.income_total, account.currency)}</td>
                      <td className="num negative">{formatMoney(account.expense_total, account.currency)}</td>
                      <td className="num">{formatMoney(account.current_balance, account.currency)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => removeAccount(account.id, account.name)}
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={createAccount} style={{ marginTop: '1.25rem' }}>
            {accountError ? <Alert>{accountError}</Alert> : null}
            <div className="form-grid">
              <div className="field">
                <label htmlFor="a-name">Nombre</label>
                <input
                  id="a-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Cuenta nómina"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="a-type">Tipo</label>
                <select
                  id="a-type"
                  value={type}
                  onChange={(event) => setType(event.target.value as AccountType)}
                >
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="a-currency">Divisa</label>
                <select
                  id="a-currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="a-opening">Saldo inicial</label>
                <input
                  id="a-opening"
                  type="number"
                  step="0.01"
                  value={opening}
                  onChange={(event) => setOpening(event.target.value)}
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Añadir cuenta
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Tus categorías</div>
          {catError ? <Alert>{catError}</Alert> : null}
          {categories.loading ? (
            <Loading />
          ) : (categories.data ?? []).length === 0 ? (
            <EmptyState title="Sin categorías" />
          ) : (
            <div className="cat-list">
              {['income', 'expense'].map((kind) => {
                const group = (categories.data ?? []).filter((item) => item.kind === kind)
                if (group.length === 0) return null
                return (
                  <div key={kind}>
                    <p className="muted" style={{ marginBottom: '0.5rem' }}>
                      {kind === 'income' ? 'Ingresos' : 'Gastos'}
                    </p>
                    <div className="toolbar">
                      {group.map((category) => (
                        <span key={category.id} className="pill">
                          <i className="pill-dot" style={{ background: category.color }} />
                          {category.name}
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '0 0.2rem' }}
                            onClick={() => removeCategory(category.id, category.name)}
                            aria-label={`Eliminar categoría ${category.name}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <form onSubmit={createCategory} style={{ marginTop: '1.25rem' }}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="c-name">Nombre</label>
                <input
                  id="c-name"
                  value={catName}
                  onChange={(event) => setCatName(event.target.value)}
                  placeholder="Mascotas"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="c-kind">Tipo</label>
                <select
                  id="c-kind"
                  value={catKind}
                  onChange={(event) => setCatKind(event.target.value as TransactionKind)}
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="c-color">Color</label>
                <select
                  id="c-color"
                  value={catColor}
                  onChange={(event) => setCatColor(event.target.value)}
                >
                  {COLORS.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Añadir categoría
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}
