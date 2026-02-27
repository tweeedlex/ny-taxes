import { Skeleton } from '@/components/ui/skeleton'
import { Users } from 'lucide-react'
import { UserTableRow } from './UserTableRow'
import type { User } from '@/types'

const COLUMNS = [
  { label: 'User', w: 'w-[360px]' },
  { label: 'Login', w: 'w-40' },
  { label: 'Authorities', w: 'w-[420px]' },
  { label: 'Created', w: 'w-40' },
  { label: '', w: 'w-24' },
] as const

interface UsersTableProps {
  users: User[]
  loading?: boolean
}

export function UsersTable({ users, loading = false }: UsersTableProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-background">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[980px]">
          <thead>
            <tr className="border-b border-border bg-card">
              {COLUMNS.map(({ label, w }, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${w}`}
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
                <UserTableRow key={u.id} user={u} index={idx} />
              ))
            ) : (
              <EmptyState />
            )}
          </tbody>
        </table>
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
