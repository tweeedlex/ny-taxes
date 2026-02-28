import { useEffect, useRef, useState } from 'react'
import { Upload, Loader2, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ordersApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Props {
  onUploaded: () => void
}

export function UploadSection({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // (опційно, але дуже бажано) — щоб файл НЕ відкривався в браузері,
  // якщо юзер дропне його десь поза зоною
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  const isCsvFile = (file: File) => {
    const nameOk = file.name.toLowerCase().endsWith('.csv')
    // інколи type буває пустим, тому перевірка по імені — основна
    const typeOk = file.type === 'text/csv' || file.type === 'application/vnd.ms-excel' || file.type === ''
    return nameOk && typeOk
  }

  const setFile = (file: File | null) => {
    setSelectedFile(file)
    // скидаємо value інпута, щоб можна було знову вибрати той самий файл
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (!isCsvFile(file)) {
      toast.error('Only .csv files are supported')
      setFile(null)
      return
    }
    setFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      await ordersApi.importCsv(selectedFile)
      toast.success('Import started')
      setFile(null)
      onUploaded()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.detail)
      } else {
        toast.error('Upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  // ───── Drag & Drop handlers ─────
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    setIsDragOver(true)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // потрібно для drop
    if (!isDragOver) setIsDragOver(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragOver(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    dragCounter.current = 0
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!isCsvFile(file)) {
      toast.error('Only .csv files are supported')
      return
    }

    setFile(file)
    toast.success('File selected')
  }

  return (
    <Card
      className={cn(
        'relative transition-colors',
        isDragOver && 'border-dashed border-primary/60 bg-primary/5'
      )}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Upload className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Upload CSV</h3>
            <p className="text-xs text-muted-foreground">Import orders from a CSV file</p>
          </div>
        </div>

        {/* Input row */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
              'hover:border-ring/40',
              isDragOver ? 'border-dashed border-primary/60 bg-primary/5' : 'border-border'
            )}
            onClick={() => inputRef.current?.click()}
          >
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {selectedFile ? selectedFile.name : 'Choose a .csv file...'}
            </span>

            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <Button size="sm" disabled={!selectedFile || uploading} onClick={handleUpload}>
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload
          </Button>
        </div>

        <div className="rounded-lg bg-muted/30 border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">CSV format</p>
          <code className="text-[11px] text-muted-foreground">
            latitude, longitude, subtotal, timestamp
          </code>
          <p className="text-[11px] text-muted-foreground mt-2">
            Timestamps before March 1, 2025 or coordinates outside NYS will be treated as errors.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}