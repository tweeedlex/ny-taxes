import { useCallback } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { CoordinateStreamParams } from '@/types'

interface Props {
  filters: CoordinateStreamParams
  onChange: (filters: CoordinateStreamParams) => void
}

function apiToInput(v: string): string {
  return v.replace(/\./g, '-')
}
function inputToApi(v: string): string {
  return v.replace(/-/g, '.')
}

export function MapFilters({ filters, onChange }: Props) {
  const update = useCallback(
    (patch: Partial<CoordinateStreamParams>) => {
      onChange({ ...filters, ...patch })
    },
    [filters, onChange],
  )

  const hasFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== '',
  )

  const clear = useCallback(() => onChange({}), [onChange])

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground font-medium">
          Reporting Code
        </label>
        <Input
          placeholder="e.g. 8081"
          value={filters.reporting_code ?? ''}
          onChange={(e) => update({ reporting_code: e.target.value || undefined })}
          className="h-8 text-xs w-32 bg-card border-border text-foreground"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground font-medium">From</label>
        <Input
          type="date"
          min="2025-03-01"
          value={filters.timestamp_from ? apiToInput(filters.timestamp_from) : ''}
          onChange={(e) =>
            update({ timestamp_from: e.target.value ? inputToApi(e.target.value) : undefined })
          }
          className="h-8 text-xs w-40 bg-card border-border text-foreground"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground font-medium">To</label>
        <Input
          type="date"
          min="2025-03-01"
          value={filters.timestamp_to ? apiToInput(filters.timestamp_to) : ''}
          onChange={(e) =>
            update({ timestamp_to: e.target.value ? inputToApi(e.target.value) : undefined })
          }
          className="h-8 text-xs w-40 bg-card border-border text-foreground"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground font-medium">Subtotal Min</label>
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          value={filters.subtotal_min ?? ''}
          onChange={(e) =>
            update({ subtotal_min: e.target.value ? Number(e.target.value) : undefined })
          }
          className="h-8 text-xs w-28 bg-card border-border text-foreground"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground font-medium">Subtotal Max</label>
        <Input
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          value={filters.subtotal_max ?? ''}
          onChange={(e) =>
            update({ subtotal_max: e.target.value ? Number(e.target.value) : undefined })
          }
          className="h-8 text-xs w-28 bg-card border-border text-foreground"
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear} className="h-8 px-2 text-xs gap-1">
          <X className="w-3 h-3" />
          Clear
        </Button>
      )}
    </div>
  )
}
