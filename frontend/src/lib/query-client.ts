import { QueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ApiError } from './api'

function handleGlobalError(error: unknown) {
  if (!(error instanceof Error)) return
  // Don't toast auth errors — ProtectedRoute handles those
  if (error instanceof ApiError && error.status === 401) return
  // Don't toast 403s — pages show their own forbidden message
  if (error instanceof ApiError && error.status === 403) return

  if (error instanceof ApiError && error.status >= 500) {
    toast.error('Server error. Please try again later.')
  } else if (error.message === 'Failed to fetch') {
    toast.error('Network error. Check your connection.')
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
})

queryClient.getQueryCache().config.onError = handleGlobalError as never
queryClient.getMutationCache().config.onError = handleGlobalError as never
