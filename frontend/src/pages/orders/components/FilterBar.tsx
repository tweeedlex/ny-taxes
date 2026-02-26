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
    <div className="px-8 pb-4 space-y-3">
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={onSearchChange} />

        <Button
          variant="outline"
          size="sm"
          className={`h-8 gap-1.5 text-sm border-zinc-700 bg-transparent ${
            showFilters
              ? 'border-amber-500/50 text-amber-400'
              : 'text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
          }`}
          onClick={onToggleFilters}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {showFilters && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-zinc-500">{rangeText}</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[70px] text-xs border-zinc-700 bg-zinc-900 text-zinc-300">
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
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-200">
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
    <div className="relative flex-1 max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
      <Input
        placeholder="Search by ID, code, author…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 h-8 text-sm bg-zinc-900 border-zinc-700 focus-visible:ring-amber-500/40 text-zinc-200 placeholder:text-zinc-600"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
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
      <div className="grid grid-cols-4 gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
        {FILTER_FIELDS.map(({ label, placeholder, type }) => (
          <div key={label} className="space-y-1">
            <label className="text-[11px] text-zinc-500 font-medium">{label}</label>
            <Input
              type={type ?? 'text'}
              placeholder={placeholder}
              className="h-8 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 placeholder:text-zinc-600"
            />
          </div>
        ))}
      </div>
    </motion.div>
  )
}
