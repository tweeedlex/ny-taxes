import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/endpoints'
import { useAuthStore } from '@/store/auth.store'
import { ApiError } from '@/lib/api'
import { Spinner } from './Spinner'

export default function ProtectedRoute() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const { data, isLoading, error } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (error) {
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login', { replace: true })
      }
    }
  }, [error, navigate])

  useEffect(() => {
    if (data) {
      setUser(data)
    }
  }, [data, setUser])

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return null
  }

  return <Outlet />
}
