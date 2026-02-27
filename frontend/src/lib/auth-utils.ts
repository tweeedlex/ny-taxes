import type { User } from '@/types'

export function hasAuthority(user: User | null, authority: string): boolean {
  return user?.authorities.includes(authority) ?? false
}
