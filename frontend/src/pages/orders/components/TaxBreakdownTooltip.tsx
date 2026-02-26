import { Separator } from '@/components/ui/separator'
import type { Order, TaxBreakdown } from '@/types'

type BreakdownKey = keyof TaxBreakdown

const RATE_ITEMS: { key: BreakdownKey; label: string }[] = [
  { key: 'state_rate', label: 'State' },
  { key: 'county_rate', label: 'County' },
  { key: 'city_rate', label: 'City' },
  { key: 'special_rates', label: 'Special' },
]

function toPercent(rate: number): string {
  return `${(rate * 100).toFixed(4)}%`
}

function RateBar({ value }: { value: number }) {
  return (
    <div
      className="h-1 rounded-full bg-muted-foreground/40"
      style={{ width: `${Math.round(value * 100 * 12)}px`, minWidth: 4 }}
    />
  )
}

function RateRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-400 text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <RateBar value={value} />
        <span className="text-xs font-mono text-zinc-300 w-16 text-right">
          {toPercent(value)}
        </span>
      </div>
    </div>
  )
}

function JurisdictionRow({ name, rate }: { name: string; rate: number }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-zinc-500 truncate max-w-[140px]">{name}</span>
      <span className="font-mono text-zinc-400">{toPercent(rate)}</span>
    </div>
  )
}

function JurisdictionsList({ jurisdictions }: { jurisdictions: Order['jurisdictions'] }) {
  const entries = Object.entries(jurisdictions)
  if (entries.length === 0) return null

  return (
    <>
      <div className="text-[10px] text-zinc-600 font-semibold uppercase tracking-wide">
        Jurisdictions
      </div>
      {entries.flatMap(([, items]) =>
        items.map((item) => (
          <JurisdictionRow key={item.name} name={item.name} rate={item.rate} />
        ))
      )}
    </>
  )
}

export function TaxBreakdownTooltip({ order }: { order: Order }) {
  return (
    <div className="space-y-3 min-w-[220px]">
      <div className="font-semibold text-xs text-zinc-100">Tax Breakdown</div>

      <div className="space-y-1.5">
        {RATE_ITEMS.map(({ key, label }) => (
          <RateRow key={label} label={label} value={order.breakdown[key]} />
        ))}
      </div>

      <Separator className="opacity-20" />

      <div className="flex justify-between text-xs">
        <span className="font-semibold text-zinc-100">Composite</span>
        <span className="font-mono font-bold text-foreground">
          {toPercent(order.composite_tax_rate)}
        </span>
      </div>

      <JurisdictionsList jurisdictions={order.jurisdictions} />
    </div>
  )
}
