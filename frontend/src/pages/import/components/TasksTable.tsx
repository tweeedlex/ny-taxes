import { FileText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/StatusBadge'
import type { FileTask } from '@/types'

interface Props {
  tasks: FileTask[]
  isLoading: boolean
}

export function TasksTable({ tasks, isLoading }: Props) {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-background overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-16">ID</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">File</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-28">Status</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-44">Progress</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24 hidden sm:table-cell">Rows</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-36 hidden md:table-cell">Created</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <LoadingRows />
          ) : tasks.length > 0 ? (
            tasks.map((task) => <TaskRow key={task.id} task={task} />)
          ) : (
            <EmptyState />
          )}
        </tbody>
      </table>
    </div>
  )
}

function TaskRow({ task }: { task: FileTask }) {
  const processed = task.successful_rows + task.failed_rows
  const progress = task.total_rows > 0 ? (processed / task.total_rows) * 100 : 0
  const fileName = task.file_path.split('/').pop() ?? task.file_path

  return (
    <tr className="border-b border-border hover:bg-card/40 transition-colors">
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{task.id}</td>
      <td className="px-4 py-3">
        <span className="text-sm truncate max-w-[200px] inline-block" title={fileName}>
          {fileName}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={task.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Progress value={progress} className="h-1.5 flex-1" />
          <span className="text-[11px] text-muted-foreground w-10 text-right">
            {Math.round(progress)}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="text-xs space-y-0.5">
          <div className="text-emerald-400">{task.successful_rows} ok</div>
          {task.failed_rows > 0 && <div className="text-red-400">{task.failed_rows} fail</div>}
          <div className="text-muted-foreground">{task.total_rows} total</div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
        {new Date(task.created_at).toLocaleString()}
      </td>
    </tr>
  )
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full bg-card" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={6} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">No import tasks</div>
            <div className="text-xs text-muted-foreground mt-1">Upload a CSV file to start importing orders</div>
          </div>
        </div>
      </td>
    </tr>
  )
}
