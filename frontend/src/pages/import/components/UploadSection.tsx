import { useRef, useState } from 'react'
import { Upload, Loader2, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ordersApi } from '@/lib/endpoints'
import { ApiError } from '@/lib/api'

interface Props {
  onUploaded: () => void
}

export function UploadSection({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      await ordersApi.importCsv(selectedFile)
      toast.success('Import started')
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ''
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

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Upload className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Upload CSV</h3>
            <p className="text-xs text-muted-foreground">
              Import orders from a CSV file
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border cursor-pointer hover:border-ring/40 transition-colors"
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
          <Button
            size="sm"
            disabled={!selectedFile || uploading}
            onClick={handleUpload}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
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
