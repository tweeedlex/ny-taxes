import { Package, DollarSign, TrendingUp, Percent } from 'lucide-react'
import { StatCard } from './StatCard'
import { MOCK_STATS } from '@/lib/mock-data'

export function StatsRow() {
  return (
    <div className="px-4 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Total Orders"
        value={MOCK_STATS.total_orders}
        icon={Package}
        accent="neutral"
        delay={0}
        subtitle="All time"
        trend="+8.2%"
      />
      <StatCard
        label="Total Revenue"
        value={MOCK_STATS.total_amount}
        prefix="$"
        icon={DollarSign}
        accent="emerald"
        delay={0.1}
        subtitle="Gross amount"
        trend="+14.7%"
      />
      <StatCard
        label="Tax Collected"
        value={MOCK_STATS.total_tax_amount}
        prefix="$"
        icon={TrendingUp}
        accent="amber"
        delay={0.2}
        subtitle="NYS + County + City"
        trend="+11.3%"
      />
      <StatCard
        label="Avg. Tax Rate"
        value={parseFloat((MOCK_STATS.avg_tax_rate * 100).toFixed(3))}
        suffix="%"
        icon={Percent}
        accent="amber"
        delay={0.3}
        subtitle="Composite rate"
        trend="+0.1%"
      />
    </div>
  )
}
