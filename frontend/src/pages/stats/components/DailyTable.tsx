import { CalendarDays } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { OrdersStatsDay } from '@/types'
import { formatMoney } from '@/pages/orders/utils/formatters'

interface Props {
  daily: OrdersStatsDay[]
  isLoading: boolean
}

export function DailyTable({ daily, isLoading }: Props) {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-background overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-28">Orders</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-36">Revenue</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-36">Tax</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <LoadingRows />
          ) : daily.length > 0 ? (
            daily.map((day) => (
              <tr key={day.date} className="border-b border-border hover:bg-card/40 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{day.date}</td>
                <td className="px-4 py-3 text-right tabular-nums">{day.total_orders}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(day.total_amount)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(day.total_tax_amount)}</td>
              </tr>
            ))
          ) : (
            <EmptyState />
          )}
        </tbody>
      </table>
    </div>
  )
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: 4 }).map((_, j) => (
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
      <td colSpan={4} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">No data for this period</div>
            <div className="text-xs text-muted-foreground mt-1">Try adjusting the date range</div>
          </div>
        </div>
      </td>
    </tr>
  )
}
