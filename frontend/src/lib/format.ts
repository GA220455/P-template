export function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number(value)
}

export function formatMoney(
  value: string | number,
  currency: string,
  locale = 'es-ES',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(toNumber(value))
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatMonth(month: string): string {
  const [year, index] = month.split('-').map(Number)
  return new Date(year, index - 1, 1).toLocaleDateString('es-ES', {
    month: 'short',
    year: '2-digit',
  })
}

export function todayISO(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}
