import { useState, useMemo } from 'react'
import { MOCK_ORDERS } from '@/lib/mock-data'

export function useOrdersFilter() {
  const [search, setSearchState] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSizeState] = useState(10)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return MOCK_ORDERS
    const q = search.toLowerCase()
    return MOCK_ORDERS.filter(
      (o) =>
        o.reporting_code.toLowerCase().includes(q) ||
        (o.author_login ?? '').toLowerCase().includes(q) ||
        String(o.id).includes(q)
    )
  }, [search])

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize)

  function setSearch(value: string) {
    setSearchState(value)
    setPage(0)
  }

  function setPageSize(value: number) {
    setPageSizeState(value)
    setPage(0)
  }

  function toggleExpanded(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return {
    search, setSearch,
    page, setPage,
    pageSize, setPageSize,
    showFilters, setShowFilters,
    expandedId, toggleExpanded,
    paged, total, totalPages,
  }
}
