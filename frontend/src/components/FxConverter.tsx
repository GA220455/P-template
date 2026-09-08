import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '../api/client'
import type { FxConversion } from '../api/types'
import { formatMoney, toNumber } from '../lib/format'
import { Alert } from './Feedback'

export function FxConverter({ baseCurrency }: { baseCurrency: string }) {
  const [currencies, setCurrencies] = useState<Record<string, string>>({})
  const [amount, setAmount] = useState('100')
  const [from, setFrom] = useState(baseCurrency)
  const [to, setTo] = useState('USD')
  const [result, setResult] = useState<FxConversion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api
      .currencies()
      .then((data) => setCurrencies(data))
      .catch(() => setError('No se pudo cargar el listado de divisas.'))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await api.convert({ amount, base: from, quote: to }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al convertir')
    } finally {
      setLoading(false)
    }
  }

  const codes = Object.keys(currencies).sort()

  return (
    <div className="card">
      <div className="card-title">
        <span>Conversor de divisas</span>
        <span className="muted">API Frankfurter · BCE</span>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <form onSubmit={handleSubmit} className="form-grid">
        <div className="field">
          <label htmlFor="fx-amount">Importe</label>
          <input
            id="fx-amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="fx-from">De</label>
          <select id="fx-from" value={from} onChange={(event) => setFrom(event.target.value)}>
            {codes.map((code) => (
              <option key={code} value={code}>
                {code} — {currencies[code]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fx-to">A</label>
          <select id="fx-to" value={to} onChange={(event) => setTo(event.target.value)}>
            {codes.map((code) => (
              <option key={code} value={code}>
                {code} — {currencies[code]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <button type="submit" className="btn btn-primary" disabled={loading || codes.length === 0}>
            {loading ? 'Consultando…' : 'Convertir'}
          </button>
        </div>
      </form>

      {result ? (
        <div className="fx-result">
          <div className="muted">
            {formatMoney(result.amount, result.quote.base)} equivale a
          </div>
          <div className="converted">{formatMoney(result.converted, result.quote.quote)}</div>
          <div className="muted">
            1 {result.quote.base} = {toNumber(result.quote.rate).toFixed(5)}{' '}
            {result.quote.quote} · referencia del {result.quote.observed_on} · fuente{' '}
            {result.quote.source}
          </div>
        </div>
      ) : null}
    </div>
  )
}
