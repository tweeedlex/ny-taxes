import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOrders } from './useOrders'
import type { OrdersFilterParams } from '@/types'

function getParam(sp: URLSearchParams, key: string): string {
  return sp.get(key) ?? ''
}

function getNumParam(sp: URLSearchParams, key: string, fallback: number): number {
  const v = sp.get(key)
  if (!v) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function useOrdersFilter() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const page = getNumParam(searchParams, 'page', 0)
  const pageSize = getNumParam(searchParams, 'pageSize', 10)
  const search = getParam(searchParams, 'search')
  const reportingCode = getParam(searchParams, 'reporting_code')
  const timestampFrom = getParam(searchParams, 'timestamp_from')
  const timestampTo = getParam(searchParams, 'timestamp_to')
  const subtotalMin = getParam(searchParams, 'subtotal_min')
  const subtotalMax = getParam(searchParams, 'subtotal_max')

  const apiParams = useMemo<OrdersFilterParams>(() => {
    const p: OrdersFilterParams = {
      limit: pageSize,
      offset: page * pageSize,
    }
    // search maps to reporting_code on the backend
    const code = reportingCode || search || undefined
    if (code) p.reporting_code = code
    if (timestampFrom) p.timestamp_from = timestampFrom
    if (timestampTo) p.timestamp_to = timestampTo
    if (subtotalMin) p.subtotal_min = Number(subtotalMin)
    if (subtotalMax) p.subtotal_max = Number(subtotalMax)
    return p
  }, [page, pageSize, search, reportingCode, timestampFrom, timestampTo, subtotalMin, subtotalMax])

  const { data, isLoading, refetch } = useOrders(apiParams)

  const orders = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(updates)) {
          if (v === undefined || v === '') {
            next.delete(k)
          } else {
            next.set(k, v)
          }
        }
        return next
      })
    },
    [setSearchParams],
  )

  const setSearch = useCallback(
    (v: string) => updateParams({ search: v || undefined, page: undefined }),
    [updateParams],
  )

  const setPage = useCallback(
    (v: number) => updateParams({ page: v === 0 ? undefined : String(v) }),
    [updateParams],
  )

  const setPageSize = useCallback(
    (v: number) => updateParams({ pageSize: v === 10 ? undefined : String(v), page: undefined }),
    [updateParams],
  )

  const setFilter = useCallback(
    (key: string, v: string) => updateParams({ [key]: v || undefined, page: undefined }),
    [updateParams],
  )

  const toggleExpanded = useCallback(
    (id: number) => setExpandedId((prev) => (prev === id ? null : id)),
    [],
  )

  return {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    showFilters,
    setShowFilters,
    expandedId,
    toggleExpanded,
    orders,
    total,
    totalPages,
    isLoading,
    refetch,
    // Expanded filter values
    reportingCode,
    timestampFrom,
    timestampTo,
    subtotalMin,
    subtotalMax,
    setFilter,
  }
}
