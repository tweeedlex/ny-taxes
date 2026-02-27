import { useState } from 'react'
import { Package, Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CreateOrderDialog } from './CreateOrderDialog'

export function PageHeader() {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="border-b border-border">
      <div className="px-4 sm:px-8 py-4 sm:py-7 flex flex-col xs:flex-row xs:items-start gap-3 xs:gap-0 justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-md bg-secondary flex items-center justify-center">
              <Package className="w-3 h-3 text-muted-foreground" />
            </div>
            <span className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
              Orders
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Order Management
          </h1>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-foreground bg-transparent"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export orders as CSV</TooltipContent>
          </Tooltip>
          <Button
            size="sm"
            className="h-8 gap-1.5 font-semibold"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            New Order
          </Button>
        </div>
      </div>

      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
