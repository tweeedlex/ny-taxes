import React from 'react'
import { motion } from 'motion/react'
import CountUp from '@/components/CountUp'

// Sparkline is only used by StatCard, so it lives here
const SPARK_DATA = [40, 55, 45, 60, 52, 70, 65, 80, 75, 90, 85, 100]

function Sparkline({ className }: { className?: string }) {
  const max = Math.max(...SPARK_DATA)
  const min = Math.min(...SPARK_DATA)
  const range = max - min || 1
  const h = 24, w = 72
  const pts = SPARK_DATA.map(
    (v, i) => `${(i / (SPARK_DATA.length - 1)) * w},${h - ((v - min) / range) * h}`
  ).join(' ')
  return (
    <svg width={w} height={h} className={className}>
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type Accent = 'amber' | 'emerald' | 'neutral'

const ACCENT_STYLES: Record<Accent, { icon: string; bg: string; trend: string; divider: string; spark: string }> = {
  amber: {

    bg: "bg-rose-200/55 ring-1 ring-rose-300/60 dark:bg-secondary dark:ring-0",
    icon: "text-rose-900 dark:text-foreground",
    trend: "text-rose-900 dark:text-muted-foreground",
    divider: "border-rose-300/50 dark:border-border",
    spark: "text-rose-700/70 dark:text-muted-foreground/40",
  },
  emerald: {
    bg: "bg-emerald-200/55 ring-1 ring-emerald-300/60 dark:bg-secondary dark:ring-0",
    icon: "text-emerald-900 dark:text-foreground",
    trend: "text-emerald-900 dark:text-muted-foreground",
    divider: "border-emerald-300/50 dark:border-border",
    spark: "text-emerald-700/70 dark:text-muted-foreground/40",
  },
  neutral: {
    bg: "bg-sky-200/50 ring-1 ring-sky-300/60 dark:bg-secondary dark:ring-0",
    icon: "text-sky-900 dark:text-foreground",
    trend: "text-sky-900 dark:text-muted-foreground",
    divider: "border-sky-300/50 dark:border-border",
    spark: "text-sky-700/70 dark:text-muted-foreground/40",
  },
}

interface StatCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  icon: React.ElementType
  subtitle?: string
  trend?: string
  delay?: number
  accent?: Accent
}

export function StatCard({
  label, value, prefix = '', suffix = '', icon: Icon,
  subtitle, trend = '+12.4%', delay = 0, accent = 'amber',
}: StatCardProps) {
  const s = ACCENT_STYLES[accent]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <div className="rounded-xl border border-border bg-card p-5 h-full">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg}`}>
            <Icon className={`w-4 h-4 ${s.icon}`} />
          </div>
          <Sparkline className={s.spark} />
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-0.5">
            {prefix && (
              <span className="text-base font-semibold text-muted-foreground">{prefix}</span>
            )}
            <CountUp
              to={value}
              duration={1.6}
              delay={delay}
              separator=","
              className="text-[26px] font-bold text-foreground tabular-nums leading-none"
            />
            {suffix && (
              <span className="text-sm font-medium text-muted-foreground ml-0.5">{suffix}</span>
            )}
          </div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className={`flex items-center justify-between mt-2 pt-2 border-t ${s.divider}`}>
            <span className="text-[10px] text-muted-foreground/60">{subtitle}</span>
            <span className={`text-[10px] font-semibold ${s.trend}`}>↑ {trend}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
