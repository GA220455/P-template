export type TransactionKind = 'income' | 'expense'
export type AccountType = 'cash' | 'checking' | 'savings' | 'credit' | 'investment'

export interface User {
  id: string
  email: string
  full_name: string
  base_currency: string
  created_at: string
}

export interface Account {
  id: string
  name: string
  type: AccountType
  currency: string
  opening_balance: string
}

export interface AccountWithBalance extends Account {
  current_balance: string
  income_total: string
  expense_total: string
}

export interface Category {
  id: string
  name: string
  kind: TransactionKind
  color: string
}

export interface Transaction {
  id: string
  account_id: string
  category_id: string
  kind: TransactionKind
  amount: string
  currency: string
  description: string
  occurred_on: string
  created_at: string
  category_name: string
  category_color: string
  account_name: string
}

export interface TransactionPage {
  items: Transaction[]
  total: number
}

export interface CategoryTotal {
  category_id: string
  category_name: string
  color: string
  total: string
}

export interface MonthlyPoint {
  month: string
  income: string
  expense: string
}

export interface Summary {
  base_currency: string
  income: string
  expense: string
  net: string
  balance: string
  transaction_count: number
}

export interface Dashboard {
  summary: Summary
  by_category: CategoryTotal[]
  by_month: MonthlyPoint[]
}

export interface FxQuote {
  base: string
  quote: string
  rate: string
  observed_on: string
  source: string
}

export interface FxConversion {
  amount: string
  converted: string
  quote: FxQuote
}

export interface TransactionFilters {
  kind?: TransactionKind
  account_id?: string
  category_id?: string
  date_from?: string
  date_to?: string
  search?: string
  limit?: number
  offset?: number
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Efectivo',
  checking: 'Cuenta corriente',
  savings: 'Ahorro',
  credit: 'Tarjeta de crédito',
  investment: 'Inversión',
}
