import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const LINKS = [
  { to: '/', label: 'Resumen', end: true },
  { to: '/transactions', label: 'Transacciones', end: false },
  { to: '/accounts', label: 'Cuentas', end: false },
]

export function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">FT</span>
          <span className="brand-name">FinanceTrack</span>
        </div>
        <nav className="nav">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <div className="user-meta">
            <strong>{user?.full_name}</strong>
            <span>
              {user?.email} · base {user?.base_currency}
            </span>
          </div>
          <button type="button" className="btn btn-ghost" onClick={handleSignOut}>
            Salir
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
