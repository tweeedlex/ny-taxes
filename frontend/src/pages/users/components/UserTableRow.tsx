import { useState } from "react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { User } from "@/types";
import { usersApi } from "@/lib/endpoints";
import { ApiError } from "@/lib/api";
import { hasAuthority } from "@/lib/auth-utils";
import { useAuthStore } from "@/store/auth.store";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditUserDialog } from "./EditUserDialog";
import { authorityLabel } from "../utils/authority";

interface UserTableRowProps {
  user: User;
  index: number;
  variant?: "table" | "card";
}

function initials(user: User) {
  if (user.full_name) {
    const parts = user.full_name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return user.login.slice(0, 2).toUpperCase();
}


export function UserTableRow({
  user,
  index,
  variant = "table",
}: UserTableRowProps) {
  const currentUser = useAuthStore((s) => s.user);
  const canEdit = hasAuthority(currentUser, "edit_users");
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.delete(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted");
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.detail : "Failed to delete user",
      );
    },
  });

  // ===== MOBILE CARD VARIANT =====
  if (variant === "card") {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: index * 0.03 }}
          className="p-3"
        >
          <div className="rounded-xl border border-border bg-background">
            <div className="p-3">
              <div className="flex items-start gap-3">
                <div
                  className="size-10 rounded-full border border-border bg-secondary text-foreground grid place-items-center text-[12px] font-bold leading-none"
                  aria-hidden
                >
                  {initials(user)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {user.full_name || user.login}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {user.login}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(user.authorities ?? []).map((a) => (
                      <Badge
                        key={a}
                        variant="secondary"
                        className={cn(
                          "h-5 px-2 text-[10px] rounded-md",
                          "bg-secondary text-foreground border border-border",
                        )}
                        title={a} 
                      >
                        {authorityLabel(a)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="grid grid-cols-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="h-11 flex items-center justify-center gap-2 text-sm text-foreground hover:bg-card/60 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="h-11 flex items-center justify-center gap-2 text-sm text-destructive hover:bg-destructive/10 transition-colors border-l border-border"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {canEdit && (
          <>
            <EditUserDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              user={user}
            />
            <ConfirmDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              title="Delete user"
              description={`Are you sure you want to delete "${user.full_name || user.login}"? This action cannot be undone.`}
              variant="destructive"
              confirmLabel="Delete"
              onConfirm={() => deleteMutation.mutate()}
            />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
        className="group border-b border-border hover:bg-card/40 transition-colors"
      >
        {/* User */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="size-9 rounded-full border border-border bg-secondary text-foreground grid place-items-center text-[11px] font-bold leading-none shrink-0"
              aria-hidden
            >
              {initials(user)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">
                  {user.full_name || user.login}
                </span>
                {!user.is_active && (
                  <Badge
                    variant="outline"
                    className="text-[9px] h-4 border-red-500/30 text-red-400"
                  >
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {user.login}
              </div>
            </div>
          </div>
        </td>


        <td className="px-4 py-3">
          <span className="text-xs font-mono text-muted-foreground">
            {user.login}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {user.authorities.map((a) => (
              <Badge
                key={a}
                variant="secondary"
                className={cn(
                  "h-5 px-2 text-[10px] font-mono rounded-md",
                  "bg-secondary text-foreground border border-border",
                )}
                title={a}
              >
                {authorityLabel(a)}
              </Badge>
            ))}
          </div>
        </td>

        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="text-xs text-muted-foreground">
            {new Date(user.created_at).toLocaleDateString()}
          </span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3 w-24">
          {canEdit && (
            <div className="flex justify-end gap-2">
              <div className="flex gap-2 opacity-0 translate-x-1 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto">
                <button
                  type="button"
                  aria-label="Edit user"
                  onClick={() => setEditOpen(true)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted/40 hover:border-foreground/20 hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  aria-label="Delete user"
                  onClick={() => setDeleteOpen(true)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </td>
      </motion.tr>

      {canEdit && (
        <>
          <EditUserDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            user={user}
          />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Delete user"
            description={`Are you sure you want to delete "${user.full_name || user.login}"? This action cannot be undone.`}
            variant="destructive"
            confirmLabel="Delete"
            onConfirm={() => deleteMutation.mutate()}
          />
        </>
      )}
    </>
  );
}
