import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '@/lib/endpoints'
import type { OrdersFilterParams } from '@/types'

export function useOrders(params: OrdersFilterParams) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.list(params),
  })
}
