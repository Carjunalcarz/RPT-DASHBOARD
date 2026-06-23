export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value)

export const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'N/A'

  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const toErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message
    if (message) return message
  }

  return fallback
}

export const formatMonthDay = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const isDateRangeOverlapping = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) => aStart <= bEnd && aEnd >= bStart

export const getSortedYears = <T>(items: T[], getDateValue: (item: T) => string) => {
  return [...new Set(items.map((item) => new Date(getDateValue(item)).getFullYear()).filter(Number.isFinite))].sort(
    (a, b) => b - a,
  )
}
