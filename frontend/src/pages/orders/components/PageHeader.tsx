import { Package, Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function PageHeader() {
  return (
    <div className="border-b border-zinc-800">
      <div className="px-8 py-7 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center">
              <Package className="w-3 h-3 text-zinc-400" />
            </div>
            <span className="text-[11px] font-medium tracking-widest uppercase text-zinc-500">
              Orders
            </span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">
            Order Management
          </h1>
          <p className="text-sm text-zinc-500 mt-1.5">
            Browse, filter and analyse all drone delivery orders with full tax breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-200 bg-transparent"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export orders as CSV</TooltipContent>
          </Tooltip>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold border-0"
          >
            <Plus className="w-3.5 h-3.5" />
            New Order
          </Button>
        </div>
      </div>
    </div>
  )
}
