import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Radio,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Pause,
  Play,
  Trash2,
  Bell,
} from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import { useRealtimeStore, useNotificationsStore } from '@/stores/app'
import type { SSEEvent } from '@/types'

const eventIcons: Record<string, typeof PlayCircle> = {
  'run.created': PlayCircle,
  'run.completed': CheckCircle,
  'run.failed': XCircle,
  'run.cancelled': AlertCircle,
  'step.started': Clock,
  'step.accepted': CheckCircle,
  'step.rejected': XCircle,
}

const eventColors: Record<string, string> = {
  'run.created': 'text-blue-500',
  'run.completed': 'text-green-500',
  'run.failed': 'text-red-500',
  'run.cancelled': 'text-yellow-500',
  'step.started': 'text-blue-400',
  'step.accepted': 'text-green-400',
  'step.rejected': 'text-red-400',
}

export function LivePage() {
  const [isPaused, setIsPaused] = useState(false)
  const [events, setEvents] = useState<SSEEvent[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)
  const { connected: isConnected } = useRealtimeStore()
  const { addAlert } = useNotificationsStore()

  useEffect(() => {
    if (isPaused) return

    const eventSource = api.createEventSource((messageEvent: MessageEvent) => {
      try {
        const event: SSEEvent = JSON.parse(messageEvent.data)
        // Ensure event has required fields
        if (!event.event_type) {
          event.event_type = 'unknown'
        }
        if (!event.event_id) {
          event.event_id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        }
        if (!event.timestamp) {
          event.timestamp = new Date().toISOString()
        }

        setEvents((prev) => [event, ...prev].slice(0, 100))

        // Show notification for important events
        if (event.event_type === 'run.failed' || event.event_type === 'run.completed') {
          addAlert({
            alert_id: event.event_id,
            severity: event.event_type === 'run.failed' ? 'error' : 'info',
            title: event.event_type.replace('.', ' '),
            message: `Run ${event.run_id?.slice(0, 8) || 'unknown'}`,
            run_id: event.run_id,
            created_at: new Date().toISOString(),
            acknowledged: false,
          })
        }
      } catch (err) {
        console.warn('Failed to parse SSE event:', err)
      }
    })

    eventSourceRef.current = eventSource

    // Note: Connection status is managed globally by Layout component
    // This EventSource is just for the LivePage event display

    return () => {
      eventSource.close()
    }
  }, [isPaused, addAlert])

  const clearEvents = () => {
    setEvents([])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Feed</h1>
          <p className="text-muted-foreground">Real-time event stream</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              )}
            />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={clearEvents}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Radio className={cn('h-5 w-5', isConnected ? 'text-green-500' : 'text-red-500')} />
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="font-semibold">{isConnected ? 'Live' : 'Offline'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-sm text-muted-foreground">Events Received</div>
                <div className="font-semibold">{events.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-sm text-muted-foreground">Runs Completed</div>
                <div className="font-semibold">
                  {events.filter((e) => e.event_type === 'run.completed').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-sm text-muted-foreground">Runs Failed</div>
                <div className="font-semibold">
                  {events.filter((e) => e.event_type === 'run.failed').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live event stream */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className={cn('h-5 w-5', isConnected && !isPaused && 'animate-pulse text-green-500')} />
            Event Stream
            {isPaused && <Badge variant="warning">Paused</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
              <p className="text-muted-foreground">Waiting for events...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Events will appear here in real-time
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-auto">
              {events.map((event, index) => {
                const eventType = event.event_type || 'unknown'
                const Icon = eventIcons[eventType] || Bell
                const color = eventColors[eventType] || 'text-muted-foreground'

                return (
                  <div
                    key={`${event.event_id}-${index}`}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-all',
                      index === 0 && 'ring-2 ring-primary/20 bg-primary/5'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {(event.event_type || 'unknown').replace('.', ' → ')}
                        </span>
                        {index === 0 && (
                          <Badge variant="info" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      {event.run_id && (
                        <Link
                          to={`/runs/${event.run_id}`}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          {event.run_id}
                          {event.step_id !== undefined && ` • Step #${event.step_id}`}
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(event.timestamp)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
