import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-xs text-zinc-500">
        Page {page + 1} of {totalPages}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs border-zinc-700 bg-transparent text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-90" />
          Prev
        </Button>

        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
          <Button
            key={i}
            variant={page === i ? 'default' : 'outline'}
            size="sm"
            className={`h-7 w-7 p-0 text-xs border-zinc-700 ${
              page === i
                ? 'bg-amber-400 text-zinc-950 border-amber-400 hover:bg-amber-300 font-semibold'
                : 'bg-transparent text-zinc-400 hover:text-zinc-200'
            }`}
            onClick={() => onPageChange(i)}
          >
            {i + 1}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs border-zinc-700 bg-transparent text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronUp className="w-3.5 h-3.5 rotate-90" />
        </Button>
      </div>
    </div>
  )
}
