import { useState } from 'react'
import { Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { hasAuthority } from '@/lib/auth-utils'
import { CreateUserDialog } from './CreateUserDialog'

export function UsersHeader() {
  const [createOpen, setCreateOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const canEdit = hasAuthority(user, 'edit_users')

  return (
    <div className="border-b border-border">
      <div className="px-4 sm:px-8 py-4 sm:py-7 flex flex-col xs:flex-row xs:items-start gap-3 xs:gap-0 justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-md bg-secondary flex items-center justify-center">
              <Users className="w-3 h-3 text-muted-foreground" />
            </div>
            <span className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
              Users
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            User Management
          </h1>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 mt-1">
            <Button
              size="sm"
              className="h-8 gap-1.5 font-semibold"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add User
            </Button>
          </div>
        )}
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
