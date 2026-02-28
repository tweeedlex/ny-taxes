import type { ReactNode } from 'react'
import type { Authority } from '@/constants/authorities'
import { useAuthStore } from '@/store/auth.store'

interface RestrictProps {
  authorities: Authority[]
  children: ReactNode
  fallback?: ReactNode
}

export function Restrict({ authorities, children, fallback }: RestrictProps) {
  const user = useAuthStore((s) => s.user)

  // User not loaded yet — render nothing while ProtectedRoute resolves
  if (!user) return null

  if (!user.authorities.some((auth) => authorities.includes(auth as Authority))) {
    return fallback ?? null
  }

  return children
}
