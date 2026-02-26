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
    icon: 'text-amber-400',
    bg: 'bg-amber-400/10',
    trend: 'text-amber-400',
    divider: 'border-amber-400/10',
    spark: 'text-amber-400/40',
  },
  emerald: {
    icon: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    trend: 'text-emerald-400',
    divider: 'border-emerald-400/10',
    spark: 'text-emerald-400/40',
  },
  neutral: {
    icon: 'text-zinc-300',
    bg: 'bg-zinc-700/60',
    trend: 'text-zinc-400',
    divider: 'border-zinc-700/60',
    spark: 'text-zinc-500/60',
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
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 h-full">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg}`}>
            <Icon className={`w-4 h-4 ${s.icon}`} />
          </div>
          <Sparkline className={s.spark} />
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-0.5">
            {prefix && (
              <span className="text-base font-semibold text-zinc-400">{prefix}</span>
            )}
            <CountUp
              to={value}
              duration={1.6}
              delay={delay}
              separator=","
              className="text-[26px] font-bold text-zinc-50 tabular-nums leading-none"
            />
            {suffix && (
              <span className="text-sm font-medium text-zinc-400 ml-0.5">{suffix}</span>
            )}
          </div>
          <div className="text-xs font-medium text-zinc-400">{label}</div>
          <div className={`flex items-center justify-between mt-2 pt-2 border-t ${s.divider}`}>
            <span className="text-[10px] text-zinc-600">{subtitle}</span>
            <span className={`text-[10px] font-semibold ${s.trend}`}>↑ {trend}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
