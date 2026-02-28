import { motion } from 'motion/react'
import type { Order, TaxBreakdown } from '@/types'

type BreakdownKey = keyof TaxBreakdown

const BREAKDOWN_ITEMS: { key: BreakdownKey; label: string; color: string }[] = [
  {key: 'state_rate', label: 'State', color: '#0A84FF'},
  {key: 'county_rate', label: 'County', color: '#64D2FF'},
  {key: 'city_rate', label: 'City', color: '#BF5AF2'},
  {key: 'special_rates', label: 'Special', color: '#FF9F0A'},
]

export function ExpandedOrderRow({order, colSpan}: { order: Order; colSpan: number }) {
  return (
    <motion.tr
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      transition={{duration: 0.15}}
    >
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-3">
          Tax Breakdown
        </div>
        <div className="space-y-2.5">
          {BREAKDOWN_ITEMS.map(({key, label, color}) => {
            const value = order.breakdown[key]
            const jurisdictions = order.jurisdictions[key] ?? []
            return (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{label}</span>
                    {jurisdictions.map((j) => (
                      <span key={j.name} className="text-zinc-600 text-[10px]">
                          {j.name}
                        </span>
                    ))}
                  </div>
                  <span className="font-mono" style={{color}}>
                      {(value * 100).toFixed(4)}%
                    </span>
                </div>
                <div className="h-1.5 rounded-full bg-card overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{background: color}}
                    initial={{width: 0}}
                    animate={{width: `${(value / order.composite_tax_rate) * 100}%`}}
                    transition={{duration: 0.5, ease: 'easeOut'}}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </td>
    </motion.tr>
  )
}
