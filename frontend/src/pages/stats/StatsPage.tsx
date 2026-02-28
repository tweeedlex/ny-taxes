import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, MapPin } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DateRangeFilter } from './components/DateRangeFilter'
import { AnalyticsSummaryCards } from './components/AnalyticsSummaryCards'
import { DailyChart } from './components/DailyChart'
import { DailyTable } from './components/DailyTable'
import { MapFilters } from './components/MapFilters'
import { OrdersMap } from './components/OrdersMap'
import { useOrdersStatsDaily } from './hooks/useOrdersStatsDaily'
import { defaultFrom, defaultTo } from './hooks/useStats'
import type { CoordinateStreamParams } from '@/types'

type TabValue = 'analytics' | 'map'

export default function StatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as TabValue) || 'analytics'

  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(defaultTo)
  const [appliedFilters, setAppliedFilters] = useState<CoordinateStreamParams>({})

  const { data, isLoading } = useOrdersStatsDaily(fromDate, toDate)

  const handleTabChange = useCallback(
    (value: string) => {
      setSearchParams({ tab: value }, { replace: true })
    },
    [setSearchParams],
  )

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

      <div className="px-4 sm:px-8 py-6 flex-1">
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="analytics" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Orders Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6 mt-0">
            <DateRangeFilter
              fromDate={fromDate}
              toDate={toDate}
              onFromChange={setFromDate}
              onToChange={setToDate}
            />
            <AnalyticsSummaryCards data={data} />
            <DailyChart daily={data?.daily ?? []} isLoading={isLoading} />
            <DailyTable daily={data?.daily ?? []} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="map" className="space-y-6 mt-0">
            <MapFilters onApply={setAppliedFilters} />
            <OrdersMap filters={appliedFilters} enabled={tab === 'map'} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
