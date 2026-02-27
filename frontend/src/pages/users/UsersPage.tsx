import { useState, useMemo } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuthStore } from '@/store/auth.store'
import { hasAuthority } from '@/lib/auth-utils'
import { UsersHeader } from './components/UsersHeader'
import { FilterBarUsers } from './components/FilterBarUsers'
import { UsersTable } from './components/UsersTable'
import { useUsers } from './hooks/useUsers'

export default function UsersPage() {
  const user = useAuthStore((s) => s.user)
  const { data: users = [], isLoading, refetch } = useUsers()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    let result = users
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.login.toLowerCase().includes(q) ||
          (u.full_name ?? '').toLowerCase().includes(q),
      )
    }
    if (statusFilter === 'active') result = result.filter((u) => u.is_active)
    if (statusFilter === 'inactive') result = result.filter((u) => !u.is_active)
    return result
  }, [users, search, statusFilter])

  if (!hasAuthority(user, 'read_users')) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">You do not have permission to view users.</p>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen flex flex-col">
        <UsersHeader />
        <FilterBarUsers
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          total={users.length}
          filteredTotal={filtered.length}
          onRefresh={() => refetch()}
        />
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <UsersTable users={filtered} loading={isLoading} />
        </div>
      </div>
    </TooltipProvider>
  )
}
