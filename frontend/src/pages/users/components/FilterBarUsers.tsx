import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RefreshCw, Search, ChevronDown } from 'lucide-react'

import { VALID_AUTHORITIES } from '../schemas'
import { authorityLabel } from '../utils/authority'

interface Props {
  search: string
  onSearchChange: (v: string) => void

  permissions: string[]
  onPermissionsChange: (v: string[]) => void

  total: number
  filteredTotal: number
  onRefresh: () => void
}

export function FilterBarUsers({
  search,
  onSearchChange,
  permissions,
  onPermissionsChange,
  total,
  filteredTotal,
  onRefresh,
}: Props) {
  const allSelected = permissions.length === VALID_AUTHORITIES.length

  const summary =
    permissions.length === 0
      ? 'All permissions'
      : permissions.length === 1
        ? authorityLabel(permissions[0])
        : `${authorityLabel(permissions[0])} +${permissions.length - 1}`

  const toggleOne = (value: string) => {
    const next = permissions.includes(value)
      ? permissions.filter((p) => p !== value)
      : [...permissions, value]

    onPermissionsChange(next)
  }

  const toggleAll = () => {
    onPermissionsChange(allSelected ? [] : [...VALID_AUTHORITIES])
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col gap-3">
        {/* row 1: search + multi-permissions */}
        <div className="flex flex-col s:flex-row s:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 text-sm bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/40"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'h-9 w-full s:w-[240px] justify-between bg-card border-border text-xs font-normal',
                  'text-foreground hover:bg-card',
                )}
              >
                <span className="truncate">{summary}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              className="w-[--radix-popover-trigger-width] p-2"
            >
              {/* top actions */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {allSelected ? 'Unselect all' : 'Select all'}
                </button>

                <button
                  type="button"
                  onClick={() => onPermissionsChange([])}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>

              {/* list */}
              <div className="pt-2 max-h-64 overflow-auto space-y-1">
                {VALID_AUTHORITIES.map((auth) => {
                  const checked = permissions.includes(auth)
                  return (
                    <button
                      key={auth}
                      type="button"
                      onClick={() => toggleOne(auth)}
                      className={cn(
                        'w-full flex items-center gap-2 rounded-md px-2 py-2',
                        'hover:bg-muted/40 transition-colors text-left',
                      )}
                    >
                      <Checkbox checked={checked} />
                      <div className="min-w-0">
                        <div className="text-sm leading-none">
                          {authorityLabel(auth)}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono mt-1 truncate">
                          {auth}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* selected chips */}
              {permissions.length > 0 && (
                <div className="pt-2 mt-2 border-t border-border flex flex-wrap gap-1.5">
                  {permissions.map((p) => (
                    <Badge
                      key={p}
                      variant="secondary"
                      className="h-5 px-2 text-[10px] rounded-md bg-secondary text-foreground border border-border"
                    >
                      {authorityLabel(p)}
                    </Badge>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* row 2: count + refresh */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filteredTotal} of {total}
          </span>
        </div>
      </div>
    </div>
  )
}
