import { FileText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/StatusBadge'
import type { FileTask } from '@/types'

interface Props {
  tasks: FileTask[]
  isLoading: boolean
}

function formatFileId(filePath: string): string {
  const fileName = filePath.split('/').pop() ?? filePath
  if (fileName.length <= 20) return fileName
  const name = fileName.replace(/\.[^.]+$/, '')
  const ext = fileName.slice(name.length)
  if (name.length <= 14) return fileName
  return `${name.slice(0, 6)}...${name.slice(-6)}${ext}`
}

function getFileUrl(filePath: string): string {
  const apiUrl = import.meta.env.VITE_API_URL || ''
  return `${apiUrl}/orders/import/tasks/files/${encodeURIComponent(filePath.split('/').pop() ?? filePath)}`
}

export function TasksTable({ tasks, isLoading }: Props) {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-background">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-44">File</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-28">Status</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
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
    </div>
  )
}

function TaskRow({ task }: { task: FileTask }) {
  const processed = task.successful_rows + task.failed_rows
  const total = task.total_rows || 1
  const successPct = (task.successful_rows / total) * 100
  const errorPct = (task.failed_rows / total) * 100
  const remainingPct = 100 - successPct - errorPct
  const displayId = formatFileId(task.file_path)

  return (
    <tr className="border-b border-border hover:bg-card/40 transition-colors">
      {/* File (ID + name) */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">#{task.id}</span>
          <a
            href={getFileUrl(task.file_path)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-foreground hover:underline truncate"
            title={task.file_path.split('/').pop() ?? task.file_path}
          >
            {displayId}
          </a>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={task.status} />
      </td>

      {/* Progress */}
      <td className="px-4 py-3">
        <div className="space-y-1">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {successPct > 0 && (
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${successPct}%` }}
              />
            )}
            {errorPct > 0 && (
              <div
                className="bg-red-500 transition-all duration-300"
                style={{ width: `${errorPct}%` }}
              />
            )}
            {remainingPct > 0 && (
              <div
                className="bg-muted-foreground/20 transition-all duration-300"
                style={{ width: `${remainingPct}%` }}
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="text-emerald-500">{Math.round(successPct)}% done</span>
            {errorPct > 0 && <span className="text-red-500">{Math.round(errorPct)}% error</span>}
            <span>{Math.round(remainingPct)}% left</span>
            <span className="ml-auto">{processed}/{task.total_rows}</span>
          </div>
        </div>
      </td>

      {/* Rows */}
      <td className="px-4 py-3 min-w-[100px] hidden sm:table-cell">
        <div className="text-xs space-y-0.5">
          <div className="text-emerald-500">{task.successful_rows} ok</div>
          {task.failed_rows > 0 && <div className="text-red-500">{task.failed_rows} fail</div>}
          <div className="text-muted-foreground">{task.total_rows} total</div>
        </div>
      </td>

      {/* Created */}
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
          {Array.from({ length: 5 }).map((_, j) => (
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
      <td colSpan={5} className="py-16 text-center">
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
