import { motion } from 'motion/react'
import { Badge } from '@/components/ui/badge'
import type { Order, TaxBreakdown } from '@/types'

type BreakdownKey = keyof TaxBreakdown

const BREAKDOWN_ITEMS: { key: BreakdownKey; label: string; color: string }[] = [
 { key: 'state_rate',   label: 'State',   color: '#0A84FF' }, // systemBlue
  { key: 'county_rate',  label: 'County',  color: '#64D2FF' }, // systemTeal
  { key: 'city_rate',    label: 'City',    color: '#BF5AF2' }, // systemPurple
  { key: 'special_rates',label: 'Special', color: '#FF9F0A' }, // systemOrange
]

export function ExpandedOrderRow({ order, colSpan }: { order: Order; colSpan: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <td colSpan={colSpan} className="px-4 pb-3 pt-0">
        <div className="rounded-lg p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 border border-border bg-background">
          <JurisdictionsPanel order={order} />
          <RateBreakdownPanel order={order} />
        </div>
      </td>
    </motion.tr>
  )
}

function JurisdictionsPanel({ order }: { order: Order }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-3">
        Jurisdictions
      </div>
      <div className="space-y-1.5">
        {Object.entries(order.jurisdictions).map(([tier, items]) =>
          items.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                <span className="text-xs text-zinc-400">{item.name}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 capitalize border-zinc-700 text-muted-foreground bg-transparent"
                >
                  {tier}
                </Badge>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {(item.rate * 100).toFixed(4)}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function RateBreakdownPanel({ order }: { order: Order }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-3">
        Rate Breakdown
      </div>
      <div className="space-y-2">
        {BREAKDOWN_ITEMS.map(({ key, label, color }) => {
          const value = order.breakdown[key]
          return (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono" style={{ color }}>
                  {(value * 100).toFixed(4)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-card overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(value / order.composite_tax_rate) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
