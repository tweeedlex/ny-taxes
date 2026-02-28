import { TooltipProvider } from '@/components/ui/tooltip'
import { PageHeader } from './components/PageHeader'
import { StatsRow } from './components/StatsRow'
import { FilterBar } from './components/FilterBar'
import { OrdersTable } from './components/OrdersTable'
import { Pagination } from './components/Pagination'
import { useOrdersFilter } from './hooks/useOrdersFilter'

export default function OrdersPage() {
  const filter = useOrdersFilter()

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex flex-col overflow-x-hidden w-full">
        <PageHeader />
        <StatsRow />
        <FilterBar
          search={filter.search}
          onSearchChange={filter.setSearch}
          page={filter.page}
          pageSize={filter.pageSize}
          onPageSizeChange={filter.setPageSize}
          total={filter.total}
          showFilters={filter.showFilters}
          onToggleFilters={() => filter.setShowFilters((s) => !s)}
          onRefresh={filter.refetch}
          reportingCode={filter.reportingCode}
          timestampFrom={filter.timestampFrom}
          timestampTo={filter.timestampTo}
          subtotalMin={filter.subtotalMin}
          subtotalMax={filter.subtotalMax}
          onFilterChange={filter.setFilter}
        />
        <div className="px-4 lg:px-8 pb-8 flex-1 min-w-0 w-full">
          <Pagination
            page={filter.page}
            totalPages={filter.totalPages}
            onPageChange={filter.setPage}
          />
          <OrdersTable
            orders={filter.orders}
            expandedId={filter.expandedId}
            onToggleExpand={filter.toggleExpanded}
            loading={filter.isLoading}
            sort={filter.sort}
            onSortChange={filter.setSort}
          />
          <Pagination
            page={filter.page}
            totalPages={filter.totalPages}
            onPageChange={filter.setPage}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
