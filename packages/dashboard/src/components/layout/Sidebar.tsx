import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  PlayCircle,
  BarChart3,
  Bell,
  ScrollText,
  Zap,
  BookOpen,
  Webhook,
  HeartPulse,
  Settings,
  ChevronLeft,
  ChevronRight,
  Heart,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useUIStore, useNotificationsStore } from '@/stores/app'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/runs', icon: PlayCircle, label: 'Runs' },
  { to: '/metrics', icon: BarChart3, label: 'Metrics' },
  { to: '/alerts', icon: Bell, label: 'Alerts', badge: true },
  { to: '/events', icon: ScrollText, label: 'Events' },
  { to: '/live', icon: Zap, label: 'Live' },
  { to: '/guidelines', icon: BookOpen, label: 'Guidelines' },
  { to: '/webhooks', icon: Webhook, label: 'Webhooks' },
  { to: '/health', icon: HeartPulse, label: 'Health' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { unreadCount } = useNotificationsStore()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">AI</span>
            </div>
            <span className="font-semibold">Orchestrator</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          className={cn(sidebarCollapsed && 'mx-auto')}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground',
                sidebarCollapsed && 'justify-center px-2'
              )
            }
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.badge && unreadCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </>
            )}
            {sidebarCollapsed && item.badge && unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-xs text-muted-foreground">
            <p>AI Orchestrator</p>
            <p>v0.4.0</p>
            <p className="mt-2 flex items-center gap-1">
              created with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> Lorenzo Padovani
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
