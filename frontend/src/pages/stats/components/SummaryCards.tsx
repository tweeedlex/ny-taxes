import { Package, DollarSign, TrendingUp } from 'lucide-react'
import { StatCard } from '@/pages/orders/components/StatCard'
import type { OrdersStatsResponse } from '@/types'

interface Props {
  data: OrdersStatsResponse | undefined
}

export function SummaryCards({ data }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <StatCard
        label="Total Orders"
        value={data?.total_orders ?? 0}
        icon={Package}
        accent="neutral"
        delay={0}
      />
      <StatCard
        label="Total Revenue"
        value={data?.total_amount ?? 0}
        prefix="$"
        icon={DollarSign}
        accent="emerald"
        delay={0.1}
      />
      <StatCard
        label="Total Tax"
        value={data?.total_tax_amount ?? 0}
        prefix="$"
        icon={TrendingUp}
        accent="amber"
        delay={0.2}
      />
    </div>
  )
}
