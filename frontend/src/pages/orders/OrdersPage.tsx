import { TooltipProvider } from '@/components/ui/tooltip'
import { PageHeader } from './components/PageHeader'
import { StatsRow } from './components/StatsRow'
import { FilterBar } from './components/FilterBar'
import { OrdersTable } from './components/OrdersTable'
import { Pagination } from './components/Pagination'
import { useOrdersFilter } from './hooks/useOrdersFilter'

export default function OrdersPage() {
  const {
    search, setSearch,
    page, setPage,
    pageSize, setPageSize,
    showFilters, setShowFilters,
    expandedId, toggleExpanded,
    paged, total, totalPages,
  } = useOrdersFilter()

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex flex-col overflow-x-hidden w-full">
        <PageHeader />
        <StatsRow />
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          page={page}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          total={total}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((s) => !s)}
        />
        <div className="px-4 lg:px-8 pb-8 flex-1 min-w-0 w-full">
          <OrdersTable
            orders={paged}
            expandedId={expandedId}
            onToggleExpand={toggleExpanded}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}