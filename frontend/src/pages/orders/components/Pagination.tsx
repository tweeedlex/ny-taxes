import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i)
  }

  const pages: (number | '...')[] = [0]

  if (current > 2) {
    pages.push('...')
  }

  const start = Math.max(1, current - 1)
  const end = Math.min(total - 2, current + 1)

  for (let i = start; i <= end; i++) {
    if (!pages.includes(i)) pages.push(i)
  }

  if (current < total - 3) {
    pages.push('...')
  }

  if (!pages.includes(total - 1)) {
    pages.push(total - 1)
  }

  return pages
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const [inputValue, setInputValue] = useState('')

  const handleGoToPage = useCallback(() => {
    const num = parseInt(inputValue, 10)
    if (num >= 1 && num <= totalPages) {
      onPageChange(num - 1)
      setInputValue('')
    }
  }, [inputValue, totalPages, onPageChange])

  if (totalPages <= 1) return null

  const pageNumbers = getPageNumbers(page, totalPages)

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        Page {page + 1} of {totalPages}
      </span>

      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 border-border bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-30"
          disabled={page === 0}
          onClick={() => onPageChange(0)}
          title="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 border-border bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-30"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          title="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Page numbers */}
        {pageNumbers.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className="w-7 text-center text-xs text-muted-foreground select-none">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={page === p ? 'default' : 'outline'}
              size="icon"
              className={`h-7 w-7 text-xs border-border ${
                page === p
                  ? 'bg-primary text-primary-foreground border-primary font-semibold'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onPageChange(p)}
            >
              {p + 1}
            </Button>
          ),
        )}

        {/* Next page */}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 border-border bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-30"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          title="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 border-border bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-30"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(totalPages - 1)}
          title="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>

        {/* Go to page input */}
        {totalPages > 7 && (
          <div className="flex items-center gap-1 ml-2">
            <Input
              type="number"
              min={1}
              max={totalPages}
              placeholder="#"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
              className="h-7 w-14 text-xs text-center bg-card border-border text-foreground placeholder:text-muted-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs border-border bg-transparent text-muted-foreground hover:text-foreground"
              onClick={handleGoToPage}
            >
              Go
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
