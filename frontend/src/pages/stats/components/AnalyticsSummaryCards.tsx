import { Package, DollarSign, TrendingUp, Percent } from 'lucide-react'
import { StatCard } from '@/pages/orders/components/StatCard'
import type { OrdersStatsResponse } from '@/types'

interface Props {
  data: OrdersStatsResponse | undefined
}

export function AnalyticsSummaryCards({ data }: Props) {
  const totalOrders = data?.total_orders ?? 0
  const totalRevenue = data?.total_amount ?? 0
  const totalTax = data?.total_tax_amount ?? 0
  const avgRate = totalRevenue > 0 ? (totalTax / totalRevenue) * 100 : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label="Total Orders"
        value={totalOrders}
        icon={Package}
        accent="neutral"
        delay={0}
      />
      <StatCard
        label="Total Revenue"
        value={totalRevenue}
        prefix="$"
        icon={DollarSign}
        accent="emerald"
        delay={0.1}
      />
      <StatCard
        label="Total Tax"
        value={totalTax}
        prefix="$"
        icon={TrendingUp}
        accent="amber"
        delay={0.2}
      />
      <StatCard
        label="Avg. Tax Rate"
        value={parseFloat(avgRate.toFixed(3))}
        suffix="%"
        icon={Percent}
        accent="amber"
        delay={0.3}
      />
    </div>
  )
}
