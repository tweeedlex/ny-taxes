import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RefreshCw, Search } from 'lucide-react'

interface Props {
  search: string
  onSearchChange: (v: string) => void
  statusFilter: string
  onStatusFilterChange: (v: string) => void
  total: number
  filteredTotal: number
  onRefresh: () => void
}

export function FilterBarUsers({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  total,
  filteredTotal,
  onRefresh,
}: Props) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* MOBILE-FIRST: 2 строки (как на рефе), потом в ряд */}
      <div className="flex flex-col gap-3">
        {/* row 1: search + select */}
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

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-9 w-full s:w-[210px] text-xs border-border bg-card text-foreground">
              <SelectValue placeholder="All permissions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All permissions</SelectItem>
              <SelectItem value="edit_orders">Edit orders</SelectItem>
              <SelectItem value="edit_users">Edit users</SelectItem>
              <SelectItem value="read_orders">Read orders</SelectItem>
              <SelectItem value="read_users">Read users</SelectItem>
            </SelectContent>
          </Select>
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
