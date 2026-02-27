import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '@/lib/endpoints'

export function useOrdersStats(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ['orders-stats', fromDate, toDate],
    queryFn: () => ordersApi.stats(fromDate, toDate),
    enabled: !!fromDate && !!toDate,
  })
}
