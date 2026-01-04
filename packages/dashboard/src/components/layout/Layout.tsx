import { ReactNode, useEffect, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useUIStore, useRealtimeStore } from '@/stores/app'
import { api } from '@/api/client'
import { cn } from '@/utils/cn'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { sidebarCollapsed } = useUIStore()
  const { setConnected } = useRealtimeStore()
  const eventSourceRef = useRef<EventSource | null>(null)

  // Global SSE connection for connection status
  useEffect(() => {
    const eventSource = api.createEventSource(() => {
      // We just need the connection status, events are handled by LivePage
    })

    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setConnected(true)
    }

    eventSource.onerror = () => {
      setConnected(false)
    }

    return () => {
      eventSource.close()
    }
  }, [setConnected])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
