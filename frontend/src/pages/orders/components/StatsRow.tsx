import { Package, DollarSign, TrendingUp, Percent } from 'lucide-react'
import { StatCard } from './StatCard'
import { useOrdersStats } from '../hooks/useOrdersStats'

function formatStatsDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

export function StatsRow() {
  const now = new Date()
  const fromDate = formatStatsDate(new Date(now.getFullYear(), now.getMonth(), 1))
  const toDate = formatStatsDate(now)

  const { data } = useOrdersStats(fromDate, toDate)

  const totalOrders = data?.total_orders ?? 0
  const totalAmount = data?.total_amount ?? 0
  const totalTax = data?.total_tax_amount ?? 0
  const avgRate = totalAmount > 0 ? (totalTax / totalAmount) * 100 : 0

  return (
    <div className="px-4 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Total Orders"
        value={totalOrders}
        icon={Package}
        accent="neutral"
        delay={0}
        subtitle="This month"
      />
      <StatCard
        label="Total Revenue"
        value={totalAmount}
        prefix="$"
        icon={DollarSign}
        accent="emerald"
        delay={0.1}
        subtitle="Gross amount"
      />
      <StatCard
        label="Tax Collected"
        value={totalTax}
        prefix="$"
        icon={TrendingUp}
        accent="amber"
        delay={0.2}
        subtitle="NYS + County + City"
      />
      <StatCard
        label="Avg. Tax Rate"
        value={parseFloat(avgRate.toFixed(3))}
        suffix="%"
        icon={Percent}
        accent="amber"
        delay={0.3}
        subtitle="Composite rate"
      />
    </div>
  )
}
