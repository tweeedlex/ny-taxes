import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Upload,
  BarChart3,
  Users,
  LogOut,
  MapPin,
  Zap,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { ThemeToggle } from './ThemeToggle'

const NAV_ITEMS = [
  { to: '/orders', icon: ShoppingCart, label: 'Orders', badge: '1.2k' },
  { to: '/orders/import', icon: Upload, label: 'CSV Import' },
  { to: '/stats', icon: BarChart3, label: 'Statistics' },
  { to: '/users', icon: Users, label: 'Users' },
]

export default function Layout() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-0 h-full flex flex-col z-20 border-r border-border"
        style={{ width: 'var(--sidebar-width)', background: 'var(--sidebar)' }}
      >
        {/* Subtle top border accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-border" />

        {/* Logo */}
        <div className="relative px-4 py-5 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-foreground"
          >
            <MapPin className="w-4 h-4 text-background" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground leading-none tracking-tight">
              NY Taxes
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Admin Panel v2</div>
          </div>
          <ThemeToggle className='justify-end p-4 ml-auto'/>
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
              className={({ isActive }) =>
                cn('nav-item', isActive && 'active')
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-700/80 text-zinc-400"
                >
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* System status */}
        <div className="px-3 mb-2">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border"
          >
            <Activity className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-foreground font-medium">All systems normal</div>
              <div className="text-[9px] text-muted-foreground/50">API · WS · MinIO</div>
            </div>
          </div>
        </div>

        <div className="px-3">
          <Separator className="opacity-20" />
        </div>

        {/* User + Logout */}
        <div className="p-3 space-y-1">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-zinc-700 text-zinc-200">
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

      {/* Main */}
      <main
        className="flex-1 min-h-screen"
        style={{ marginLeft: 'var(--sidebar-width)' }}
      >
        <Outlet />
      </main>
    </div>
  )
}

