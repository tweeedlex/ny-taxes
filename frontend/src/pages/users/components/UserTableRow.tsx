import React from "react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

export type UserRow = {
  id: number | string;
  name: string;
  email: string;
  username: string;
  permissions: string[];
  createdAt: string;
};

interface UserTableRowProps {
  user: UserRow;
  index: number;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

export function UserTableRow({ user, index }: UserTableRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="group border-b border-border hover:bg-card/40 transition-colors"
    >
      {/* User */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="size-9 rounded-full border border-border bg-secondary text-foreground grid place-items-center text-[11px] font-bold leading-none"
            aria-hidden
          >
            {initials(user.name)}
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">
              {user.name}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
        </div>
      </td>

      {/* Username */}
      <td className="px-4 py-3">
        <span className="text-xs font-mono text-muted-foreground">
          {user.username}
        </span>
      </td>

      {/* Permissions */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {user.permissions.map((p) => (
            <Badge
              key={p}
              variant="secondary"
              className={cn(
                "h-5 px-2 text-[10px] font-mono rounded-md",
                "bg-secondary text-foreground border border-border",
              )}
            >
              {p}
            </Badge>
          ))}
        </div>
      </td>

      {/* Created */}
      <td className="px-4 py-3">
        <span className="text-xs text-muted-foreground">{user.createdAt}</span>
      </td>

      {/* Actions (UI, без логіки) */}
      <td className="px-4 py-3 w-24">
        <div className="flex justify-end gap-2">
          <div className="flex gap-2 opacity-0 translate-x-1 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto">
            <button
              type="button"
              aria-label="Edit user"
              className="
    h-8 w-8 inline-flex items-center justify-center rounded-md
    border border-border bg-background
    text-muted-foreground
    transition-colors
    hover:bg-muted/40 hover:border-foreground/20 hover:text-foreground
  "
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              type="button"
              aria-label="Delete user"
              className="
    h-8 w-8 inline-flex items-center justify-center rounded-md
    border border-border bg-background
    text-muted-foreground
    transition-colors
    hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive
  "
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </td>
    </motion.tr>
  );
}
