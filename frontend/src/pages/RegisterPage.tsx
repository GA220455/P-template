import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert } from '../components/Feedback'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL', 'CHF']

export function RegisterPage() {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      await signUp({
        full_name: fullName,
        email,
        password,
        base_currency: currency,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-brand">
          <span className="brand-mark">FT</span>
          <span className="brand-name">FinanceTrack</span>
        </div>
        <h1>Crea tu cuenta</h1>
        <p className="subtitle">
          Empezarás con 12 categorías predeterminadas listas para usar.
        </p>

        {error ? <Alert>{error}</Alert> : null}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName">Nombre completo</label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="reg-email">Correo electrónico</label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="row row-2">
            <div className="field">
              <label htmlFor="reg-password">Contraseña</label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="reg-currency">Divisa base</label>
              <select
                id="reg-currency"
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
          </div>
          <p className="muted" style={{ marginTop: '-0.4rem', marginBottom: '1rem' }}>
            Mínimo 8 caracteres. Se guarda cifrada con bcrypt.
          </p>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
