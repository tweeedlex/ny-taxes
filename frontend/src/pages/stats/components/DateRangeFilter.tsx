import { Input } from '@/components/ui/input'

interface Props {
  fromDate: string
  toDate: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
}

// Convert between API format (YYYY.MM.DD) and input format (YYYY-MM-DD)
function apiToInput(v: string): string {
  return v.replace(/\./g, '-')
}
function inputToApi(v: string): string {
  return v.replace(/-/g, '.')
}

export function DateRangeFilter({ fromDate, toDate, onFromChange, onToChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground font-medium">From</label>
        <Input
          type="date"
          min="2025-03-01"
          value={apiToInput(fromDate)}
          onChange={(e) => onFromChange(inputToApi(e.target.value))}
          className="h-8 text-xs w-40 bg-card border-border text-foreground"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground font-medium">To</label>
        <Input
          type="date"
          min="2025-03-01"
          value={apiToInput(toDate)}
          onChange={(e) => onToChange(inputToApi(e.target.value))}
          className="h-8 text-xs w-40 bg-card border-border text-foreground"
        />
      </div>
    </div>
  )
}
