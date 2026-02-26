import { Separator } from '@/components/ui/separator'
import type { Order, TaxBreakdown } from '@/types'

type BreakdownKey = keyof TaxBreakdown

const RATE_ITEMS: { key: BreakdownKey; label: string }[] = [
  { key: 'state_rate', label: 'State' },
  { key: 'county_rate', label: 'County' },
  { key: 'city_rate', label: 'City' },
  { key: 'special_rates', label: 'Special' },
]

export function TaxBreakdownTooltip({ order }: { order: Order }) {
  return (
    <div className="space-y-3 min-w-[220px]">
      <div className="font-semibold text-xs text-zinc-100">Tax Breakdown</div>

      <div className="space-y-1.5">
        {RATE_ITEMS.map(({ key, label }) => {
          const value = order.breakdown[key]
          return (
            <div key={label} className="flex items-center justify-between gap-4">
              <span className="text-zinc-400 text-xs">{label}</span>
              <div className="flex items-center gap-2">
                <div
                  className="h-1 rounded-full bg-amber-400/40"
                  style={{ width: `${Math.round(value * 100 * 12)}px`, minWidth: 4 }}
                />
                <span className="text-xs font-mono text-zinc-300 w-16 text-right">
                  {(value * 100).toFixed(4)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <Separator className="opacity-20" />

      <div className="flex justify-between text-xs">
        <span className="font-semibold text-zinc-100">Composite</span>
        <span className="font-mono font-bold text-amber-400">
          {(order.composite_tax_rate * 100).toFixed(4)}%
        </span>
      </div>

      {Object.entries(order.jurisdictions).length > 0 && (
        <>
          <div className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">
            Jurisdictions
          </div>
          {Object.entries(order.jurisdictions).flatMap(([, items]) =>
            items.map((item) => (
              <div key={item.name} className="flex justify-between text-[11px]">
                <span className="text-zinc-500 truncate max-w-[140px]">{item.name}</span>
                <span className="font-mono text-zinc-400">{(item.rate * 100).toFixed(4)}%</span>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
