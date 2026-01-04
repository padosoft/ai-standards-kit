import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Moon, Sun, Search, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/cn'
import { useThemeStore, useNotificationsStore, useRealtimeStore } from '@/stores/app'

export function Header() {
  const navigate = useNavigate()
  const { theme, setTheme } = useThemeStore()
  const { unreadCount } = useNotificationsStore()
  const { connected } = useRealtimeStore()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/runs?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search runs, events..."
            className="pl-8 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Connection status */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
            connected
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}
        >
          {connected ? (
            <>
              <Wifi className="h-3 w-3" />
              <span>Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </>
          )}
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate('/alerts')}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <Moon className="h-5 w-5" />
          ) : theme === 'light' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <div className="h-5 w-5 flex items-center justify-center">
              <Sun className="h-3 w-3" />
              <Moon className="h-3 w-3" />
            </div>
          )}
        </Button>
      </div>
    </header>
  )
}
