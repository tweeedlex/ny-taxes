import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '@/lib/endpoints'
import { useWs } from '@/hooks/use-ws'
import type { FileTask, ImportTasksWsMessage } from '@/types'

export function useImportTasks() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['import-tasks'],
    queryFn: ordersApi.importTasks,
  })

  const { lastJsonMessage } = useWs('/orders/import/tasks/ws')

  useEffect(() => {
    if (!lastJsonMessage) return
    const msg = lastJsonMessage as unknown as ImportTasksWsMessage
    if (msg.tasks) {
      queryClient.setQueryData<FileTask[]>(['import-tasks'], msg.tasks)
    }
  }, [lastJsonMessage, queryClient])

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['import-tasks'] })
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['orders-stats'] })
  }, [queryClient])

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    invalidate,
  }
}
