import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Upload,
  BarChart3,
  Users,
  LogOut,
  MapPin,
  Zap,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from './ui/separator'
import { ThemeToggle } from './ThemeToggle'

const NAV_ITEMS = [
  { to: '/orders', icon: ShoppingCart, label: 'Orders', badge: '1.2k' },
  { to: '/orders/import', icon: Upload, label: 'CSV Import' },
  { to: '/stats', icon: BarChart3, label: 'Statistics' },
  { to: '/users', icon: Users, label: 'Users' },
]

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  const close = () => setMobileOpen(false)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full flex flex-col z-40 border-r border-border transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{ width: 'var(--sidebar-width)', background: 'var(--sidebar)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-border" />

        {/* Logo */}
        <div className="relative px-4 py-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-foreground">
            <MapPin className="w-4 h-4 text-background" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground leading-none tracking-tight">
              NY Taxes
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Admin Panel v2</div>
          </div>
          <div className="ml-auto flex items-center">
            <ThemeToggle className="justify-end p-2 ml-auto" />
            <button
              onClick={close}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"
            >
              <X className="w-4 h-4" />
            </button>
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
          {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={close}
              className={({ isActive }) =>
                cn('nav-item', isActive && 'active')
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-700/80 text-zinc-400">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3">
          <Separator className="opacity-20" />
        </div>

        {/* User + Logout */}
        <div className="p-3 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary border border-border">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 bg-secondary text-foreground">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">Admin</div>
              <div className="text-[9px] text-muted-foreground/60 truncate">edit_orders · edit_users</div>
            </div>
            <Zap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </div>
          <button
            onClick={() => navigate('/login')}
            className="nav-item w-full text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-500/5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-xs">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-20 h-14 flex items-center gap-3 px-4 border-b border-border"
        style={{ background: 'var(--sidebar)' }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-foreground">
            <MapPin className="w-3 h-3 text-background" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-foreground">NY Taxes</span>
        </div>
        <div className="ml-auto">
          <ThemeToggle className="" />
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-h-screen pt-14 md:pt-0 md:ml-[var(--sidebar-width)]">
        <Outlet />
      </main>
    </div>
  )
}
