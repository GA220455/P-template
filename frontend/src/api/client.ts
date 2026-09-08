import type {
  Account,
  AccountWithBalance,
  Category,
  Dashboard,
  FxConversion,
  FxQuote,
  Transaction,
  TransactionFilters,
  TransactionPage,
  User,
} from './types'

const TOKEN_KEY = 'financetrack.token'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

function describeError(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload) return payload
  if (payload && typeof payload === 'object') {
    const detail = (payload as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: string; loc?: unknown[] } | undefined
      if (first?.msg) {
        const field = Array.isArray(first.loc) ? first.loc.slice(1).join('.') : ''
        return field ? `${field}: ${first.msg}` : first.msg
      }
    }
  }
  return fallback
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(path, { ...init, headers })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. ¿Está arrancado el backend?')
  }

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401) setToken(null)
    throw new ApiError(response.status, describeError(payload, response.statusText))
  }
  return payload as T
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const encoded = search.toString()
  return encoded ? `?${encoded}` : ''
}

export const api = {
  register(input: {
    email: string
    full_name: string
    password: string
    base_currency: string
  }): Promise<User> {
    return request('/api/auth/register', { method: 'POST', body: JSON.stringify(input) })
  },

  async login(email: string, password: string): Promise<string> {
    const form = new URLSearchParams({ username: email, password })
    const token = await request<{ access_token: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    return token.access_token
  },

  me(): Promise<User> {
    return request('/api/auth/me')
  },

  accounts(): Promise<AccountWithBalance[]> {
    return request('/api/accounts')
  },

  createAccount(input: Omit<Account, 'id'>): Promise<Account> {
    return request('/api/accounts', { method: 'POST', body: JSON.stringify(input) })
  },

  deleteAccount(id: string): Promise<void> {
    return request(`/api/accounts/${id}`, { method: 'DELETE' })
  },

  categories(): Promise<Category[]> {
    return request('/api/categories')
  },

  createCategory(input: Omit<Category, 'id'>): Promise<Category> {
    return request('/api/categories', { method: 'POST', body: JSON.stringify(input) })
  },

  deleteCategory(id: string): Promise<void> {
    return request(`/api/categories/${id}`, { method: 'DELETE' })
  },

  transactions(filters: TransactionFilters = {}): Promise<TransactionPage> {
    return request(`/api/transactions${query({ ...filters })}`)
  },

  createTransaction(input: {
    account_id: string
    category_id: string
    amount: string
    description: string
    occurred_on: string
  }): Promise<Transaction> {
    return request('/api/transactions', { method: 'POST', body: JSON.stringify(input) })
  },

  deleteTransaction(id: string): Promise<void> {
    return request(`/api/transactions/${id}`, { method: 'DELETE' })
  },

  dashboard(months = 6): Promise<Dashboard> {
    return request(`/api/stats/dashboard${query({ months })}`)
  },

  currencies(): Promise<Record<string, string>> {
    return request('/api/fx/currencies')
  },

  convert(input: { amount: string; base: string; quote: string }): Promise<FxConversion> {
    return request('/api/fx/convert', { method: 'POST', body: JSON.stringify(input) })
  },

  rates(base: string, quotes: string[]): Promise<FxQuote[]> {
    return request(`/api/fx/rates${query({ base, quotes: quotes.join(',') })}`)
  },
}
