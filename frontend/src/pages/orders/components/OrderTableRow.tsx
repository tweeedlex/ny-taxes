import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Percent, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ExpandedOrderRow } from "./ExpandedOrderRow";
import { formatMoney, formatDate, formatTime } from "../utils/formatters";
import type { Order } from "@/types";

const COLUMN_COUNT = 9;

interface OrderTableRowProps {
  order: Order;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function OrderTableRow({
  order,
  index,
  isExpanded,
  onToggle,
}: OrderTableRowProps) {
  const mapsUrl = `https://www.google.com/maps?q=${order.latitude},${order.longitude}`;

  return (
    <React.Fragment>
      <motion.tr
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
        className="table-row-hover border-b border-border cursor-pointer"
        onClick={onToggle}
      >
        {/* ID */}
        <td className="px-2 lg:px-4 py-3">
          <span className="font-mono text-xs text-muted-foreground">
            #{order.id}
          </span>
        </td>

        {/* Timestamp */}
        <td className="px-2 lg:px-4 py-3">
          <div className="text-xs text-foreground">
            {formatDate(order.timestamp)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {formatTime(order.timestamp)}
          </div>
        </td>

        {/* Author */}
        <td className="px-2 lg:px-4 py-3">
          {order.author_login ? (
            <div className="flex items-center gap-2">
              <div
                className="size-5 rounded-full bg-muted border border-border text-foreground
                   grid place-items-center text-[9px] font-bold leading-none"
                aria-hidden
              >
                {order.author_login[0]?.toUpperCase()}
              </div>

              <span className="text-xs text-foreground">
                {order.author_login}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">—</span>
          )}
        </td>

        {/* Reporting Code */}
        <td className="px-2 lg:px-4 py-3">
          <Badge
            variant="secondary"
            className="
      text-[10px] font-mono px-2 py-0.5 rounded-md
      bg-secondary text-foreground border border-border
    "
          >
            {order.reporting_code}
          </Badge>
        </td>

        {/* Coordinates */}
        <td className="px-2 lg:px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title={`${order.latitude.toFixed(5)}, ${order.longitude.toFixed(5)}`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="font-mono text-[10px]">
              {order.latitude.toFixed(2)}, {order.longitude.toFixed(2)}
            </span>
          </a>
        </td>

        {/* Subtotal */}
        <td className="px-2 lg:px-4 py-3">
          <span className="text-xs font-semibold text-foreground">
            {formatMoney(order.subtotal)}
          </span>
        </td>

        {/* Tax Rate */}
        <td className="px-2 lg:px-4 py-3">
          <div className="inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground">
            <Percent className="w-2.5 h-2.5" />
            {(order.composite_tax_rate * 100).toFixed(4)}
          </div>
        </td>

        {/* Tax Amount */}
        <td className="px-2 lg:px-4 py-3">
          <span className="text-xs font-semibold text-muted-foreground">
            {formatMoney(order.tax_amount)}
          </span>
        </td>

        {/* Total */}
        <td className="px-2 lg:px-4 py-3">
          <span className="text-xs font-bold text-foreground">
            {formatMoney(order.total_amount)}
          </span>
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
  );
}
