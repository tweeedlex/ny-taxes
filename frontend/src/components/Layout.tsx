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
        style={{ width: 'var(--sidebar-width)', background: 'hsl(240 10% 4.5%)' }}
      >
        {/* Sidebar top glow */}
        <div
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none opacity-20"
          style={{
            background: 'radial-gradient(ellipse at 50% -20%, #6366f1 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div className="relative px-4 py-5 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 0 20px rgba(99,102,241,0.4)',
            }}
          >
            <MapPin className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground leading-none tracking-tight">
              NY Taxes
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Admin Panel v2</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald-400 block" />
            <span className="text-[9px] text-emerald-400/80 font-medium">Live</span>
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
              className={({ isActive }) =>
                cn('nav-item', isActive && 'active')
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}
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
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-emerald-400 font-medium">All systems normal</div>
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
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                boxShadow: '0 0 12px rgba(99,102,241,0.3)',
              }}
            >
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">Admin</div>
              <div className="text-[9px] text-muted-foreground/60 truncate">edit_orders · edit_users</div>
            </div>
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
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

