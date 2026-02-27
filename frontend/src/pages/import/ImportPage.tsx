import { Upload } from 'lucide-react'
import { UploadSection } from './components/UploadSection'
import { TasksTable } from './components/TasksTable'
import { useImportTasks } from './hooks/useImportTasks'

export default function ImportPage() {
  const { tasks, isLoading, invalidate } = useImportTasks()

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-border">
        <div className="px-4 sm:px-8 py-4 sm:py-7">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-md bg-secondary flex items-center justify-center">
              <Upload className="w-3 h-3 text-muted-foreground" />
            </div>
            <span className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
              Import
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            CSV Import
          </h1>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-6 flex-1">
        <UploadSection onUploaded={invalidate} />
        <TasksTable tasks={tasks} isLoading={isLoading} />
      </div>
    </div>
  )
}
