import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/lib/endpoints'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  })
}
