import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MapPin, Percent } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TaxBreakdownTooltip } from './TaxBreakdownTooltip'
import { ExpandedOrderRow } from './ExpandedOrderRow'
import { formatMoney, formatDate, formatTime } from '../utils/formatters'
import type { Order } from '@/types'

const COLUMN_COUNT = 10

interface OrderTableRowProps {
  order: Order
  index: number
  isExpanded: boolean
  onToggle: () => void
}

export function OrderTableRow({ order, index, isExpanded, onToggle }: OrderTableRowProps) {
  return (
    <React.Fragment>
      <motion.tr
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
        className="table-row-hover border-b border-zinc-800/60 cursor-pointer"
        onClick={onToggle}
      >
        {/* ID */}
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-zinc-500">#{order.id}</span>
        </td>

        {/* Timestamp */}
        <td className="px-4 py-3">
          <div className="text-xs text-zinc-200">{formatDate(order.timestamp)}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">{formatTime(order.timestamp)}</div>
        </td>

        {/* Author */}
        <td className="px-4 py-3">
          {order.author_login ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-300">
                {order.author_login[0].toUpperCase()}
              </div>
              <span className="text-xs text-zinc-300">{order.author_login}</span>
            </div>
          ) : (
            <span className="text-xs text-zinc-600 italic">—</span>
          )}
        </td>

        {/* Coordinates */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-zinc-600 shrink-0" />
            <span className="text-[11px] font-mono text-zinc-500">
              {order.latitude.toFixed(4)}, {order.longitude.toFixed(4)}
            </span>
          </div>
        </td>

        {/* Reporting Code */}
        <td className="px-4 py-3">
          <Badge
            variant="secondary"
            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700"
          >
            {order.reporting_code}
          </Badge>
        </td>

        {/* Subtotal */}
        <td className="px-4 py-3">
          <span className="text-xs font-semibold text-zinc-100">
            {formatMoney(order.subtotal)}
          </span>
        </td>

        {/* Tax Rate */}
        <td className="px-4 py-3">
          <div className="inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground">
            <Percent className="w-2.5 h-2.5" />
            {(order.composite_tax_rate * 100).toFixed(4)}
          </div>
        </td>

        {/* Tax Amount */}
        <td className="px-4 py-3">
          <span className="text-xs font-semibold text-muted-foreground">
            {formatMoney(order.tax_amount)}
          </span>
        </td>

        {/* Total */}
        <td className="px-4 py-3">
          <span className="text-xs font-bold text-foreground">
            {formatMoney(order.total_amount)}
          </span>
        </td>

        {/* Breakdown */}
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex items-center gap-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
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
                        ? `rgba(161,161,170,${0.2 + i * 0.2})`
                        : 'rgba(255,255,255,0.04)',
                    }}
                  />
                ))}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="p-3 bg-zinc-900 border-zinc-800">
              <TaxBreakdownTooltip order={order} />
            </TooltipContent>
          </Tooltip>
        </td>
      </motion.tr>

      <AnimatePresence>
        {isExpanded && (
          <ExpandedOrderRow
            key={`exp-${order.id}`}
            order={order}
            colSpan={COLUMN_COUNT}
          />
        )}
      </AnimatePresence>
    </React.Fragment>
  )
}
