import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  MapPin,
  TrendingUp,
  DollarSign,
  Package,
  Percent,
  X,
  ArrowUpDown,
  Download,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import SpotlightCard from '@/components/SpotlightCard'
import CountUp from '@/components/CountUp'
import GradientText from '@/components/GradientText'
import BlurText from '@/components/BlurText'
import ShinyText from '@/components/ShinyText'
import { MOCK_ORDERS, MOCK_STATS } from '@/lib/mock-data'
import type { Order } from '@/types'

const formatMoney = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const formatRate = (r: number) => `${(r * 100).toFixed(4)}%`

// ─── Mini Sparkline ──────────────────────────────────────────────────────────
const SPARK_DATA = [40, 55, 45, 60, 52, 70, 65, 80, 75, 90, 85, 100]
function Sparkline({ color }: { color: string }) {
  const max = Math.max(...SPARK_DATA)
  const min = Math.min(...SPARK_DATA)
  const range = max - min || 1
  const h = 28, w = 80
  const pts = SPARK_DATA.map(
    (v, i) => `${(i / (SPARK_DATA.length - 1)) * w},${h - ((v - min) / range) * h}`
  ).join(' ')
  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        points={pts}
        fill="none"
        stroke={`rgb(${color})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  icon: Icon,
  color,
  delay = 0,
  subtitle,
  trend = '+12.4%',
}: {
  label: string
  value: number
  prefix?: string
  suffix?: string
  icon: React.ElementType
  color: string
  delay?: number
  subtitle?: string
  trend?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <SpotlightCard
        spotlightColor={`rgba(${color}, 0.15)` as `rgba(${number}, ${number}, ${number}, ${number})`}
        className="!p-5 !rounded-xl h-full"
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `rgba(${color}, 0.12)`,
              boxShadow: `0 0 16px rgba(${color}, 0.15)`,
            }}
          >
            <Icon className="w-[18px] h-[18px]" style={{ color: `rgb(${color})` }} />
          </div>
          <div className="flex items-center gap-1">
            <Sparkline color={color} />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-0.5">
            {prefix && (
              <span
                className="text-base font-semibold"
                style={{ color: `rgb(${color})`, opacity: 0.7 }}
              >
                {prefix}
              </span>
            )}
            <CountUp
              to={value}
              duration={1.6}
              delay={delay}
              separator=","
              className="text-[26px] font-bold text-foreground tabular-nums leading-none"
            />
            {suffix && (
              <span
                className="text-sm font-medium ml-0.5"
                style={{ color: `rgb(${color})`, opacity: 0.7 }}
              >
                {suffix}
              </span>
            )}
          </div>
          <div className="text-xs font-medium text-foreground/70">{label}</div>
          <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid rgba(${color}, 0.1)` }}>
            <span className="text-[10px] text-muted-foreground/50">{subtitle}</span>
            <span
              className="text-[10px] font-semibold"
              style={{ color: `rgb(${color})` }}
            >
              ↑ {trend}
            </span>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  )
}

// ─── Tax Breakdown Tooltip ─────────────────────────────────────────────────
function TaxBreakdownPopover({ order }: { order: Order }) {
  return (
    <div className="space-y-3 min-w-[220px]">
      <div className="font-semibold text-xs text-foreground">Tax Breakdown</div>
      <div className="space-y-1.5">
        {[
          { label: 'State', value: order.breakdown.state_rate },
          { label: 'County', value: order.breakdown.county_rate },
          { label: 'City', value: order.breakdown.city_rate },
          { label: 'Special', value: order.breakdown.special_rates },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground text-xs">{label}</span>
            <div className="flex items-center gap-2">
              <div
                className="h-1 rounded-full bg-indigo-500/40"
                style={{ width: `${Math.round(value * 100 * 12)}px`, minWidth: 4 }}
              />
              <span className="text-xs font-mono text-foreground/80 w-16 text-right">
                {(value * 100).toFixed(4)}%
              </span>
            </div>
          </div>
        ))}
      </div>
      <Separator className="opacity-30" />
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-foreground">Composite</span>
        <span className="font-mono font-bold" style={{ color: 'rgb(99, 102, 241)' }}>
          {formatRate(order.composite_tax_rate)}
        </span>
      </div>
      {Object.entries(order.jurisdictions).length > 0 && (
        <>
          <div className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wide">
            Jurisdictions
          </div>
          {Object.entries(order.jurisdictions).flatMap(([, items]) =>
            items.map((item) => (
              <div key={item.name} className="flex justify-between text-[11px]">
                <span className="text-muted-foreground truncate max-w-[140px]">{item.name}</span>
                <span className="font-mono text-foreground/70">{(item.rate * 100).toFixed(4)}%</span>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}

// ─── Expanded Row ──────────────────────────────────────────────────────────
function ExpandedRow({ order, colSpan }: { order: Order; colSpan: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <td colSpan={colSpan} className="px-4 pb-3 pt-0">
        <div
          className="rounded-lg p-4 grid grid-cols-2 gap-6"
          style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}
        >
          {/* Jurisdiction map */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-3">
              Jurisdictions
            </div>
            <div className="space-y-1.5">
              {Object.entries(order.jurisdictions).map(([tier, items]) =>
                items.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                        {tier}
                      </Badge>
                    </div>
                    <span className="text-xs font-mono text-foreground/70">
                      {(item.rate * 100).toFixed(4)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Rate bar chart */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-3">
              Rate Breakdown
            </div>
            <div className="space-y-2">
              {[
                { label: 'State', value: order.breakdown.state_rate, color: '#6366f1' },
                { label: 'County', value: order.breakdown.county_rate, color: '#8b5cf6' },
                { label: 'City', value: order.breakdown.city_rate, color: '#a78bfa' },
                { label: 'Special', value: order.breakdown.special_rates, color: '#c4b5fd' },
              ].map(({ label, value, color }) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono" style={{ color }}>
                      {(value * 100).toFixed(4)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(value / order.composite_tax_rate) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </td>
    </motion.tr>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [loading] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return MOCK_ORDERS
    const q = search.toLowerCase()
    return MOCK_ORDERS.filter(
      (o) =>
        o.reporting_code.toLowerCase().includes(q) ||
        (o.author_login ?? '').toLowerCase().includes(q) ||
        String(o.id).includes(q)
    )
  }, [search])

  const total = filtered.length
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex flex-col">
        {/* ── Page Header ── */}
        <div
          className="relative overflow-hidden border-b border-border"
          style={{
            background: 'linear-gradient(180deg, hsl(240 10% 5.5%) 0%, hsl(240 10% 4%) 100%)',
          }}
        >
          {/* Dot grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          {/* Left glow blob — violet */}
          <div
            className="absolute -left-20 -top-10 w-80 h-60 opacity-[0.07] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse, #8b5cf6 0%, transparent 65%)',
              filter: 'blur(40px)',
            }}
          />
          {/* Right glow blob — indigo */}
          <div
            className="absolute top-0 right-0 w-[500px] h-56 opacity-[0.08] pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 80% 0%, #6366f1 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />
          {/* Horizontal scanline */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px opacity-30"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #6366f1 30%, #8b5cf6 50%, #6366f1 70%, transparent 100%)',
            }}
          />

          <div className="relative px-8 py-7">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center"
                    style={{ background: 'rgba(99,102,241,0.2)' }}
                  >
                    <Package className="w-3 h-3 text-indigo-400" />
                  </div>
                  <ShinyText
                    text="Orders"
                    className="text-[11px] font-medium tracking-widest uppercase"
                    color="#6b7280"
                    shineColor="#a5b4fc"
                    speed={4}
                  />
                </div>
                <GradientText
                  colors={['#c7d2fe', '#a5b4fc', '#818cf8', '#a5b4fc', '#c7d2fe']}
                  animationSpeed={6}
                  className="!text-3xl !font-bold !rounded-none !max-w-none !mx-0"
                >
                  Order Management
                </GradientText>
                <BlurText
                  text="Browse, filter and analyse all drone delivery orders with full tax breakdown."
                  className="text-sm text-muted-foreground mt-1.5 !flex-wrap"
                  delay={60}
                  stepDuration={0.25}
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-muted-foreground border-border/60 hover:border-indigo-500/40"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export orders as CSV</TooltipContent>
                </Tooltip>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Order
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="px-8 py-6 grid grid-cols-4 gap-4">
          <StatCard
            label="Total Orders"
            value={MOCK_STATS.total_orders}
            icon={Package}
            color="99, 102, 241"
            delay={0}
            subtitle="All time"
            trend="+8.2%"
          />
          <StatCard
            label="Total Revenue"
            value={MOCK_STATS.total_amount}
            prefix="$"
            icon={DollarSign}
            color="16, 185, 129"
            delay={0.1}
            subtitle="Gross amount"
            trend="+14.7%"
          />
          <StatCard
            label="Tax Collected"
            value={MOCK_STATS.total_tax_amount}
            prefix="$"
            icon={TrendingUp}
            color="245, 158, 11"
            delay={0.2}
            subtitle="NYS + County + City"
            trend="+11.3%"
          />
          <StatCard
            label="Avg. Tax Rate"
            value={parseFloat((MOCK_STATS.avg_tax_rate * 100).toFixed(3))}
            suffix="%"
            icon={Percent}
            color="59, 130, 246"
            delay={0.3}
            subtitle="Composite rate"
            trend="+0.1%"
          />
        </div>

        {/* ── Filters / Search bar ── */}
        <div className="px-8 pb-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by ID, code, author…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
                className="pl-9 h-8 text-sm bg-secondary/50 border-border/60 focus-visible:ring-indigo-500/40"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className={`h-8 gap-1.5 text-sm border-border/60 ${showFilters ? 'border-indigo-500/50 text-indigo-400' : 'text-muted-foreground'}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {showFilters && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-indigo-500 ml-0.5"
                />
              )}
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {total === 0 ? 'No results' : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} of ${total}`}
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v))
                  setPage(0)
                }}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs">
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Expanded filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div
                  className="grid grid-cols-4 gap-3 p-4 rounded-xl border border-border/60"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  {[
                    { label: 'Reporting Code', placeholder: 'e.g. NY-NYC-MANH' },
                    { label: 'Date From', placeholder: 'YYYY-MM-DD', type: 'date' },
                    { label: 'Date To', placeholder: 'YYYY-MM-DD', type: 'date' },
                    { label: 'Min Subtotal', placeholder: '0.00' },
                  ].map(({ label, placeholder, type }) => (
                    <div key={label} className="space-y-1">
                      <label className="text-[11px] text-muted-foreground font-medium">{label}</label>
                      <Input
                        type={type ?? 'text'}
                        placeholder={placeholder}
                        className="h-8 text-xs bg-secondary/40 border-border/60"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Table ── */}
        <div className="px-8 pb-8 flex-1">
          <div
            className="rounded-xl overflow-hidden border border-border/60"
            style={{ background: 'hsl(240 8% 6%)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {[
                    { label: 'ID', w: 'w-16' },
                    { label: 'Timestamp', w: 'w-36' },
                    { label: 'Author', w: 'w-28' },
                    { label: 'Coordinates', w: 'w-36' },
                    { label: 'Code', w: 'w-36' },
                    { label: 'Subtotal', w: 'w-24' },
                    { label: 'Tax Rate', w: 'w-24' },
                    { label: 'Tax Amount', w: 'w-24' },
                    { label: 'Total', w: 'w-24' },
                    { label: 'Breakdown', w: 'w-20' },
                  ].map(({ label, w }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${w}`}
                    >
                      <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                        {label}
                        {['Subtotal', 'Tax Amount', 'Total', 'Tax Rate'].includes(label) && (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/30">
                        {Array.from({ length: 10 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : paged.map((order, idx) => (
                      <React.Fragment key={order.id}>
                        <motion.tr
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.04 }}
                          className="table-row-hover border-b border-border/30 cursor-pointer"
                          onClick={() =>
                            setExpandedId(expandedId === order.id ? null : order.id)
                          }
                        >
                          {/* ID */}
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-muted-foreground">
                              #{order.id}
                            </span>
                          </td>

                          {/* Timestamp */}
                          <td className="px-4 py-3">
                            <div className="text-xs text-foreground">
                              {formatDate(order.timestamp)}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {formatTime(order.timestamp)}
                            </div>
                          </td>

                          {/* Author */}
                          <td className="px-4 py-3">
                            {order.author_login ? (
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                                  style={{
                                    background: 'rgba(99,102,241,0.2)',
                                    color: '#a5b4fc',
                                  }}
                                >
                                  {order.author_login[0].toUpperCase()}
                                </div>
                                <span className="text-xs text-foreground/80">
                                  {order.author_login}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 italic">—</span>
                            )}
                          </td>

                          {/* Coordinates */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {order.latitude.toFixed(4)}, {order.longitude.toFixed(4)}
                              </span>
                            </div>
                          </td>

                          {/* Reporting Code */}
                          <td className="px-4 py-3">
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-mono px-2 py-0.5 rounded-md"
                              style={{
                                background: 'rgba(99,102,241,0.1)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99,102,241,0.2)',
                              }}
                            >
                              {order.reporting_code}
                            </Badge>
                          </td>

                          {/* Subtotal */}
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold text-foreground">
                              {formatMoney(order.subtotal)}
                            </span>
                          </td>

                          {/* Tax Rate */}
                          <td className="px-4 py-3">
                            <div
                              className="inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-md"
                              style={{
                                background: 'rgba(245,158,11,0.1)',
                                color: '#fbbf24',
                              }}
                            >
                              <Percent className="w-2.5 h-2.5" />
                              {(order.composite_tax_rate * 100).toFixed(4)}
                            </div>
                          </td>

                          {/* Tax Amount */}
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold text-amber-400">
                              {formatMoney(order.tax_amount)}
                            </span>
                          </td>

                          {/* Total */}
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold text-emerald-400">
                              {formatMoney(order.total_amount)}
                            </span>
                          </td>

                          {/* Breakdown */}
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="flex items-center gap-0.5 text-muted-foreground/60 hover:text-indigo-400 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {[
                                    order.breakdown.state_rate,
                                    order.breakdown.county_rate,
                                    order.breakdown.city_rate,
                                    order.breakdown.special_rates,
                                  ].map((rate, i) => (
                                    <div
                                      key={i}
                                      className="w-3.5 h-3.5 rounded-sm"
                                      style={{
                                        background: rate > 0
                                          ? `rgba(99,102,241,${0.3 + i * 0.2})`
                                          : 'rgba(255,255,255,0.05)',
                                      }}
                                    />
                                  ))}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="left"
                                className="p-3"
                                style={{
                                  background: 'hsl(240 8% 9%)',
                                  border: '1px solid hsl(var(--border))',
                                }}
                              >
                                <TaxBreakdownPopover order={order} />
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        </motion.tr>

                        <AnimatePresence>
                          {expandedId === order.id && (
                            <ExpandedRow key={`exp-${order.id}`} order={order} colSpan={10} />
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))}

                {paged.length === 0 && !loading && (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(99,102,241,0.1)' }}
                        >
                          <Package className="w-6 h-6 text-indigo-400/60" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground/60">No orders found</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Try adjusting your search or filters
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs border-border/60"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                  Prev
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = i
                  return (
                    <Button
                      key={p}
                      variant={page === p ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 w-7 p-0 text-xs border-border/60"
                      style={
                        page === p
                          ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }
                          : {}
                      }
                      onClick={() => setPage(p)}
                    >
                      {p + 1}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs border-border/60"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronUp className="w-3.5 h-3.5 rotate-90" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
