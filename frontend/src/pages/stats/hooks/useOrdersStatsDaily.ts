import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '@/lib/endpoints'

export function useOrdersStatsDaily(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ['orders-stats-daily', fromDate, toDate],
    queryFn: () => ordersApi.statsDaily(fromDate, toDate),
    enabled: !!fromDate && !!toDate,
  })
}
