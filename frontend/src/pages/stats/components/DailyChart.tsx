import { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { OrdersStatsDay } from '@/types'
import { formatMoney } from '@/pages/orders/utils/formatters'

interface Props {
  daily: OrdersStatsDay[]
  isLoading: boolean
}

function formatXAxisDate(dateStr: string) {
  const [, m, d] = dateStr.split('.')
  return `${m}/${d}`
}

interface TooltipPayloadEntry {
  color: string
  name: string
  value: number
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <div className="text-xs text-muted-foreground mb-1.5">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DailyChart({ daily, isLoading }: Props) {
  const chartData = useMemo(
    () =>
      daily.map((d) => ({
        date: d.date,
        Revenue: d.total_amount,
        Tax: d.total_tax_amount,
      })),
    [daily],
  )

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-background p-6 h-[320px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading chart...</div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-background p-6 h-[320px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">No data for this period</div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4 sm:p-6">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradTax" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxisDate}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="Revenue"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#gradRevenue)"
          />
          <Area
            type="monotone"
            dataKey="Tax"
            stroke="var(--chart-2)"
            strokeWidth={2}
            fill="url(#gradTax)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
