import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  done: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  in_progress: 'bg-blue-500/15 text-blue-400 border-blue-500/20 animate-pulse',
  failed: 'bg-red-500/15 text-red-400 border-red-500/20',
  pending: 'bg-muted text-muted-foreground border-border',
}

const STATUS_LABELS: Record<string, string> = {
  done: 'Done',
  in_progress: 'In Progress',
  failed: 'Failed',
  pending: 'Pending',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-medium', STATUS_STYLES[status])}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
