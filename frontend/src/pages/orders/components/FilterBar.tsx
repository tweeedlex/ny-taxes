import { Search, X, SlidersHorizontal, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const PAGE_SIZES = [10, 25, 50]

const FILTER_FIELDS = [
  { label: 'Reporting Code', placeholder: 'e.g. NY-NYC-MANH' },
  { label: 'Date From', placeholder: 'YYYY-MM-DD', type: 'date' as const },
  { label: 'Date To', placeholder: 'YYYY-MM-DD', type: 'date' as const },
  { label: 'Min Subtotal', placeholder: '0.00' },
]

interface FilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  page: number
  pageSize: number
  onPageSizeChange: (v: number) => void
  total: number
  showFilters: boolean
  onToggleFilters: () => void
}

export function FilterBar({
  search, onSearchChange, page, pageSize, onPageSizeChange,
  total, showFilters, onToggleFilters,
}: FilterBarProps) {
  const rangeText =
    total === 0
      ? 'No results'
      : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} of ${total}`

  return (
    <div className="px-4 sm:px-8 pb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <SearchInput value={search} onChange={onSearchChange} />

        <Button
          variant="outline"
          size="sm"
          className={`h-8 gap-1.5 text-sm bg-transparent ${
            showFilters
              ? 'border-ring text-foreground'
              : 'border-border text-muted-foreground hover:text-foreground'
          }`}
          onClick={onToggleFilters}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {showFilters && <span className="w-1.5 h-1.5 rounded-full bg-foreground ml-0.5" />}
        </Button>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="text-xs text-muted-foreground">{rangeText}</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[100px] text-xs border-border bg-card text-foreground dark:border-zinc-700 dark:bg-background dark:text-zinc-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && <ExpandedFilters />}
      </AnimatePresence>
    </div>
  )
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1 min-w-[140px] max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      <Input
        placeholder="Search by ID, code, author…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 h-8 text-sm bg-card border-border focus-visible:ring-ring/40 text-foreground placeholder:text-muted-foreground"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

function ExpandedFilters() {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl border border-border bg-background">
        {FILTER_FIELDS.map(({ label, placeholder, type }) => (
          <div key={label} className="space-y-1">
            <label className="text-[11px] text-muted-foreground font-medium">{label}</label>
            <Input
              type={type ?? 'text'}
              placeholder={placeholder}
              className="h-8 text-xs bg-card border-border text-foreground placeholder:text-muted-foreground
             dark:bg-background dark:border-zinc-700 dark:text-zinc-300 dark:placeholder:text-zinc-600"
            />
          </div>
        ))}
      </div>
    </motion.div>
  )
}
