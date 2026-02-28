export function authorityLabel(value: string) {
  // edit_orders -> Edit Orders
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}