export function authorityLabel(value: string) {
  // edit_orders -> Edit Orders
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * When checking "edit_X", automatically add "read_X" if it exists in the valid list.
 */
export function withImpliedAuthorities(
  next: string[],
  added: string,
  valid: readonly string[],
): string[] {
  if (added.startsWith('edit_')) {
    const readCounterpart = 'read_' + added.slice('edit_'.length)
    if (valid.includes(readCounterpart) && !next.includes(readCounterpart)) {
      return [...next, readCounterpart]
    }
  }
  return next
}

/**
 * When unchecking "read_X", automatically remove "edit_X" if present.
 */
export function withoutDependentAuthorities(
  next: string[],
  removed: string,
): string[] {
  if (removed.startsWith('read_')) {
    const editCounterpart = 'edit_' + removed.slice('read_'.length)
    return next.filter((a) => a !== editCounterpart)
  }
  return next
}
