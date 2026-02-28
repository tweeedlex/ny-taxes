function formatApiDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

export function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return formatApiDate(d)
}

export function defaultTo(): string {
  return formatApiDate(new Date())
}
