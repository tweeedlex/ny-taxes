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
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-8 text-sm bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/40"
            />
          </div>

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-8 w-[160px] text-xs border-border bg-card text-foreground">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 sm:ml-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filteredTotal} of {total}
          </span>
        </div>
      </div>
    </div>
  )
}
