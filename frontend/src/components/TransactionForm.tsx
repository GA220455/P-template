import { useMemo, useState, type FormEvent } from 'react'
import type { AccountWithBalance, Category, TransactionKind } from '../api/types'
import { todayISO } from '../lib/format'
import { Alert } from './Feedback'
import { Modal } from './Modal'

interface Props {
  accounts: AccountWithBalance[]
  categories: Category[]
  defaultCurrency: string
  onClose: () => void
  onSubmit: (input: {
    account_id: string
    category_id: string
    amount: string
    description: string
    occurred_on: string
  }) => Promise<void>
}

export function TransactionForm({
  accounts,
  categories,
  defaultCurrency,
  onClose,
  onSubmit,
}: Props) {
  const [kind, setKind] = useState<TransactionKind>('expense')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayISO())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const options = useMemo(
    () => categories.filter((category) => category.kind === kind),
    [categories, kind],
  )

  const account = accounts.find((item) => item.id === accountId)
  const currency = account?.currency ?? defaultCurrency

  function switchKind(next: TransactionKind) {
    setKind(next)
    setCategoryId('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!accountId || !categoryId || !amount) {
      setError('Completa cuenta, categoría e importe.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        account_id: accountId,
        category_id: categoryId,
        amount,
        description,
        occurred_on: occurredOn,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la transacción')
    } finally {
      setSaving(false)
    }
  }

  if (accounts.length === 0) {
    return (
      <Modal title="Nueva transacción" onClose={onClose}>
        <Alert kind="info">
          Necesitas crear al menos una cuenta antes de registrar movimientos.
        </Alert>
      </Modal>
    )
  }

  return (
    <Modal title="Nueva transacción" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error ? <Alert>{error}</Alert> : null}

        <div className="field">
          <label htmlFor="kind">Tipo</label>
          <div className="segmented" id="kind">
            <button
              type="button"
              className={kind === 'expense' ? 'active' : ''}
              onClick={() => switchKind('expense')}
            >
              Gasto
            </button>
            <button
              type="button"
              className={kind === 'income' ? 'active' : ''}
              onClick={() => switchKind('income')}
            >
              Ingreso
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="account">Cuenta</label>
            <select
              id="account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="category">Categoría</label>
            <select
              id="category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              <option value="">Selecciona…</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="amount">Importe ({currency})</label>
            <input
              id="amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="date">Fecha</label>
            <input
              id="date"
              type="date"
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="field" style={{ marginTop: '0.9rem' }}>
          <label htmlFor="description">Descripción</label>
          <input
            id="description"
            type="text"
            maxLength={200}
            placeholder="p. ej. Compra semanal"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
