import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '@/lib/endpoints'

export function useOrdersStatsSummary() {
  return useQuery({
    queryKey: ['orders-stats-summary'],
    queryFn: () => ordersApi.statsSummary(),
  })
}
