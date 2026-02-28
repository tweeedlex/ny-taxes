export const AUTHORITIES = {
  READ_USERS: 'read_users',
  EDIT_USERS: 'edit_users',
  READ_ORDERS: 'read_orders',
  EDIT_ORDERS: 'edit_orders',
} as const

export type Authority = (typeof AUTHORITIES)[keyof typeof AUTHORITIES]
