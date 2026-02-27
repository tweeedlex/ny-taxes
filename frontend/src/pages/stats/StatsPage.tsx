import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { DateRangeFilter } from './components/DateRangeFilter'
import { SummaryCards } from './components/SummaryCards'
import { DailyTable } from './components/DailyTable'
import { useStats, defaultFrom, defaultTo } from './hooks/useStats'

export default function StatsPage() {
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(defaultTo)

  const { data, isLoading } = useStats(fromDate, toDate)

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b border-border">
        <div className="px-4 sm:px-8 py-4 sm:py-7">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-md bg-secondary flex items-center justify-center">
              <BarChart3 className="w-3 h-3 text-muted-foreground" />
            </div>
            <span className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
              Analytics
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Statistics
          </h1>
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-6 flex-1">
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          onFromChange={setFromDate}
          onToChange={setToDate}
        />
        <SummaryCards data={data} />
        <DailyTable daily={data?.daily ?? []} isLoading={isLoading} />
      </div>
    </div>
  )
}
