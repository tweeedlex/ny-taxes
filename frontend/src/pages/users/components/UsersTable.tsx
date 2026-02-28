import { Skeleton } from '@/components/ui/skeleton'
import { Users } from 'lucide-react'
import { UserTableRow } from './UserTableRow'
import type { User } from '@/types'

const COLUMNS = [
  { label: 'User', w: 'min-w-[320px]' },
  { label: 'Login', w: 'min-w-[160px]' },
  { label: 'Authorities', w: 'min-w-[360px]' },
  { label: 'Created', w: 'min-w-[160px]', hidden: 'hidden lg:table-cell' },
  { label: '', w: 'w-24' },
] as const

interface UsersTableProps {
  users: User[]
  loading?: boolean
}

export function UsersTable({ users, loading = false }: UsersTableProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-background">
      {/* ===== DESKTOP/TABLET TABLE ===== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[720px] lg:min-w-[980px]">
          <thead>
            <tr className="border-b border-border bg-card">
              {COLUMNS.map(({ label, w, hidden }, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${w} ${hidden ?? ''}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <LoadingRows />
            ) : users.length > 0 ? (
              users.map((u, idx) => (
                <UserTableRow key={u.id} user={u} index={idx} variant="table" />
              ))
            ) : (
              <EmptyState />
            )}
          </tbody>
        </table>
      </div>

      {/* ===== MOBILE CARDS ===== */}
      <div className="md:hidden">
        {loading ? (
          <MobileLoading />
        ) : users.length > 0 ? (
          <div className="divide-y divide-border">
            {users.map((u, idx) => (
              <UserTableRow key={u.id} user={u} index={idx} variant="card" />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">No users found</div>
                <div className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: 5 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full bg-card" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function MobileLoading() {
  return (
    <div className="p-3 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full bg-card" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40 bg-card" />
              <Skeleton className="h-3 w-24 bg-card" />
            </div>
            <Skeleton className="h-4 w-14 bg-card" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Skeleton className="h-9 w-full bg-card" />
            <Skeleton className="h-9 w-full bg-card" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={5} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">No users found</div>
            <div className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters</div>
          </div>
        </div>
      </td>
    </tr>
  )
}