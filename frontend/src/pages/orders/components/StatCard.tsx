import React from "react";
import { motion } from "motion/react";
import CountUp from "@/components/CountUp";

type Accent = "amber" | "emerald" | "neutral";

const ACCENT_STYLES: Record<
  Accent,
  { icon: string; bg: string; trend: string; divider: string; spark: string }
> = {
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
};

interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: React.ElementType;
  delay?: number;
  accent?: Accent;
}

export function StatCard({
  label,
  value,
  prefix = "",
  suffix = "",
  icon: Icon,
  delay = 0,
  accent = "amber",
}: StatCardProps) {
  const s = ACCENT_STYLES[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <div className="w-full rounded-xl border border-border bg-card p-2 md:p-3 lg:p-5 h-full flex items-start justify-between">
        {/* icon */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${s.bg}`}
        >
          <Icon className={`w-4 h-4 ${s.icon}`} />
        </div>

        {/* content */}
        <div className="flex flex-col items-end text-right min-w-[140px]">
          <div className="flex items-baseline justify-end gap-0.5">
            {prefix && (
              <span className="w-3 text-right text-base font-semibold text-muted-foreground leading-none">
                {prefix}
              </span>
            )}

            <CountUp
              to={value}
              duration={0.15}
              delay={delay}
              separator=","
              className="text-[26px] font-bold text-foreground tabular-nums leading-none"
            />

            {suffix && (
              <span className="text-sm font-medium text-muted-foreground ml-0.5 leading-none">
                {suffix}
              </span>
            )}
          </div>

          <div className="text-xs font-medium text-muted-foreground mt-1">
            {label}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
