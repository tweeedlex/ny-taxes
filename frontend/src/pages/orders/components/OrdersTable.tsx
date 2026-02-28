import { ArrowUpDown, ArrowUp, ArrowDown, Package } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderTableRow } from './OrderTableRow'
import type { Order, OrdersSortOption } from '@/types'

const COLUMNS: { label: string; w: string }[] = [
  { label: 'ID', w: 'w-16' },
  { label: 'Timestamp', w: 'w-36' },
  { label: 'Author', w: 'w-28' },
  { label: 'Reporting Code', w: 'w-36' },
  { label: 'Coordinates', w: 'w-24' },
  { label: 'Subtotal', w: 'w-24' },
  { label: 'Tax Rate', w: 'w-24' },
  { label: 'Tax Amount', w: 'w-24' },
  { label: 'Total', w: 'w-24' },
]

const SORT_MAP: Record<string, { asc: OrdersSortOption; desc: OrdersSortOption }> = {
  Timestamp: { asc: 'oldest', desc: 'newest' },
  Subtotal: { asc: 'subtotal_asc', desc: 'subtotal_desc' },
  'Tax Amount': { asc: 'tax_asc', desc: 'tax_desc' },
}

interface OrdersTableProps {
  orders: Order[]
  loading?: boolean
  expandedId: number | null
  onToggleExpand: (id: number) => void
  sort?: OrdersSortOption
  onSortChange?: (sort: OrdersSortOption) => void
}

export function OrdersTable({ orders, loading = false, expandedId, onToggleExpand, sort = 'newest', onSortChange }: OrdersTableProps) {
  const handleSortClick = (label: string) => {
    if (!onSortChange || !SORT_MAP[label]) return
    const mapping = SORT_MAP[label]
    // Toggle: if current sort matches desc, go asc; otherwise default to desc
    if (sort === mapping.desc) {
      onSortChange(mapping.asc)
    } else {
      onSortChange(mapping.desc)
    }
  }

  const getSortIcon = (label: string) => {
    const mapping = SORT_MAP[label]
    if (!mapping) return null
    if (sort === mapping.asc) return <ArrowUp className="w-3 h-3" />
    if (sort === mapping.desc) return <ArrowDown className="w-3 h-3" />
    return <ArrowUpDown className="w-3 h-3 opacity-40" />
  }

  return (
    <div className="w-full rounded-xl border border-border bg-background">
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-max w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map(({ label, w }) => (
                <th
                  key={label}
                  className={`px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${w}`}
                >
                  {SORT_MAP[label] ? (
                    <button
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => handleSortClick(label)}
                    >
                      {label}
                      {getSortIcon(label)}
                    </button>
                  ) : (
                    <span>{label}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows />
            ) : orders.length > 0 ? (
              orders.map((order, idx) => (
                <OrderTableRow
                  key={order.id}
                  order={order}
                  index={idx}
                  isExpanded={expandedId === order.id}
                  onToggle={() => onToggleExpand(order.id)}
                />
              ))
            ) : (
              <EmptyState />
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: 9 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full bg-card" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={9} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center">
            <Package className="w-6 h-6 text-zinc-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">No orders found</div>
            <div className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</div>
          </div>
        </div>
      </td>
    </tr>
  )
}
