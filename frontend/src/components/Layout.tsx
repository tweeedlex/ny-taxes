import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, LogOut, MapPin, Menu, ShoppingCart, Upload, Users, X, } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Separator } from './ui/separator'
import { ThemeToggle } from './ThemeToggle'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/lib/endpoints'
import { queryClient } from '@/lib/query-client'
import toast from 'react-hot-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface NavItem {
  to: string
  icon: typeof ShoppingCart
  label: string
  authorities: string[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/orders', icon: ShoppingCart, label: 'Orders', authorities: ['read_orders', 'edit_orders'] },
  { to: '/import', icon: Upload, label: 'CSV Import', authorities: ['edit_orders'] },
  { to: '/stats', icon: BarChart3, label: 'Statistics', authorities: ['read_orders', 'edit_orders'] },
  { to: '/users', icon: Users, label: 'Users', authorities: ['read_users', 'edit_users'] },
]

function getUserInitials(user: { full_name: string | null; login: string }): string {
  if (user.full_name) {
    return user.full_name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return user.login.slice(0, 2).toUpperCase()
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearUser = useAuthStore((s) => s.clearUser)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore logout errors
    }
    clearUser()
    queryClient.clear()
    navigate('/login')
    toast.success('Signed out')
  }

  const visibleNav = NAV_ITEMS.filter(
    (item) => user?.authorities.some(ua => item.authorities.includes(ua)),
  )

  return (
    <div className="flex flex-col h-full">
      <div className="absolute top-0 left-0 right-0 h-px bg-border" />

      {/* Logo */}
      <div className="relative px-4 py-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-foreground">
          <MapPin className="w-4 h-4 text-background" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground leading-none tracking-tight">NYS Taxes</div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle className="p-0" />
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-3">
        <Separator className="opacity-20" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        <p className="px-3 py-1 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-2">
          Workspace
        </p>
        {visibleNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) => cn('nav-item', isActive && 'active')}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
      </nav>
      {/* User + Logout */}
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary border border-border">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 bg-secondary text-foreground">
            {user ? getUserInitials(user) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">
              {user?.full_name || user?.login || 'Unknown'}
            </div>
          </div>
          <button
            className="p-1.5 rounded-md text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-rose-600 hover:bg-rose-700 text-white focus-visible:ring-rose-500"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-full flex-col z-20 border-r border-border"
        style={{ width: 'var(--sidebar-width)', background: 'var(--sidebar)' }}
      >
        <SidebarContent />
      </aside>

      {/* ── MOBILE HEADER ── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-[1050] h-14 border-b border-border flex items-center justify-between px-4"
        style={{ background: 'var(--sidebar)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-foreground shrink-0">
            <MapPin className="w-3.5 h-3.5 text-background" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground leading-none">NYS Taxes</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden fixed left-0 top-0 h-full z-[1150] border-r border-border flex flex-col"
              style={{ width: 'var(--sidebar-width)', background: 'var(--sidebar)' }}
            >
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN ── */}
      <main
        className="flex-1 min-h-screen overflow-x-hidden pt-14 md:pt-0 !ml-0 md:!ml-[240px] transition-all"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <Outlet />
      </main>

    </div>
  )
}
