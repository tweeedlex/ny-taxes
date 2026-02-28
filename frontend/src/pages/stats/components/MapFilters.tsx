import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Play } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { CoordinateStreamParams } from '@/types'

const COOLDOWN_SEC = 2

interface Props {
  onApply: (filters: CoordinateStreamParams) => void
}

function apiToInput(v: string): string {
  return v.replace(/\./g, '-')
}
function inputToApi(v: string): string {
  return v.replace(/-/g, '.')
}

export function MapFilters({ onApply }: Props) {
  const [draft, setDraft] = useState<CoordinateStreamParams>({})
  const [cooldown, setCooldown] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const update = useCallback(
    (patch: Partial<CoordinateStreamParams>) => {
      setDraft((prev) => ({ ...prev, ...patch }))
    },
    [],
  )

  const hasDraft = Object.values(draft).some((v) => v !== undefined && v !== '')

  const clearDraft = useCallback(() => setDraft({}), [])

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SEC)
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const handleApply = useCallback(() => {
    if (cooldown > 0) return
    onApply(draft)
    startCooldown()
  }, [cooldown, draft, onApply, startCooldown])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const isOnCooldown = cooldown > 0

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground font-medium">
          Reporting Code
        </label>
        <Input
          placeholder="e.g. 8081"
          value={draft.reporting_code ?? ''}
          onChange={(e) => update({ reporting_code: e.target.value || undefined })}
          className="h-8 text-xs w-32 bg-card border-border text-foreground"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground font-medium">From</label>
        <Input
          type="date"
          min="2025-03-01"
          value={draft.timestamp_from ? apiToInput(draft.timestamp_from) : ''}
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
          value={draft.timestamp_to ? apiToInput(draft.timestamp_to) : ''}
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
          value={draft.subtotal_min ?? ''}
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
          value={draft.subtotal_max ?? ''}
          onChange={(e) =>
            update({ subtotal_max: e.target.value ? Number(e.target.value) : undefined })
          }
          className="h-8 text-xs w-28 bg-card border-border text-foreground"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {hasDraft && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDraft}
            className="h-8 px-2 text-xs gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </Button>
        )}

        <Button
          size="sm"
          onClick={handleApply}
          disabled={isOnCooldown}
          className="h-8 px-3 text-xs gap-1.5 relative overflow-hidden"
        >
          {isOnCooldown ? (
            <>
              {/* Shrinking progress bar overlay */}
              <span
                className="absolute inset-0 bg-primary/20 origin-left transition-none"
                style={{
                  transform: `scaleX(${cooldown / COOLDOWN_SEC})`,
                  transformOrigin: 'left',
                  transition: 'transform 1s linear',
                }}
              />
              <span className="relative">{cooldown}s</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              Apply
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
