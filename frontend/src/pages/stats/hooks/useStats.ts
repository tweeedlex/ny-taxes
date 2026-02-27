import { useOrdersStats } from '@/pages/orders/hooks/useOrdersStats'

function formatApiDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return formatApiDate(d)
}

function defaultTo(): string {
  return formatApiDate(new Date())
}

export { formatApiDate, defaultFrom, defaultTo }

export function useStats(fromDate: string, toDate: string) {
  return useOrdersStats(fromDate, toDate)
}
