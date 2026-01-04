import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ScrollText,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Event } from '@/types'

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
  'run.created': 'text-blue-500 bg-blue-500/10',
  'run.completed': 'text-green-500 bg-green-500/10',
  'run.failed': 'text-red-500 bg-red-500/10',
  'run.cancelled': 'text-yellow-500 bg-yellow-500/10',
  'step.started': 'text-blue-400 bg-blue-400/10',
  'step.accepted': 'text-green-400 bg-green-400/10',
  'step.rejected': 'text-red-400 bg-red-400/10',
}

type EventType = 'all' | 'run' | 'step'

export function EventsPage() {
  const [page, setPage] = useState(1)
  const [eventType, setEventType] = useState<EventType>('all')
  const [dateFilter, setDateFilter] = useState('')
  const pageSize = 50

  const { data, isLoading } = useQuery({
    queryKey: ['events', { page, date: dateFilter }],
    queryFn: () =>
      api.getEvents({
        page,
        page_size: pageSize,
      }),
    refetchInterval: 10000,
  })

  // Filter events client-side by event type prefix (run.*, step.*)
  const filteredEvents = (data?.items ?? []).filter((event) => {
    if (eventType === 'all') return true
    // Filter by event type prefix (e.g., 'run' matches 'run.created', 'run.completed', etc.)
    return event.event_type?.startsWith(eventType + '.')
  })

  // Group events by date
  const groupedEvents = filteredEvents.reduce(
    (acc, event) => {
      const date = format(parseISO(event.created_at), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(event)
      return acc
    },
    {} as Record<string, Event[]>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="text-muted-foreground">Audit log of all system events</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <Button
                variant={eventType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEventType('all')}
              >
                All Events
              </Button>
              <Button
                variant={eventType === 'run' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEventType('run')}
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                Run Events
              </Button>
              <Button
                variant={eventType === 'step' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEventType('step')}
              >
                <Clock className="h-4 w-4 mr-1" />
                Step Events
              </Button>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-40"
              />
              {dateFilter && (
                <Button variant="ghost" size="sm" onClick={() => setDateFilter('')}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Event Log
            </span>
            <Badge variant="outline">{filteredEvents.length} events{eventType !== 'all' && ` (${eventType})`}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !filteredEvents.length ? (
            <p className="text-center text-muted-foreground py-8">No events found</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEvents || {}).map(([date, events]) => (
                <div key={date}>
                  <div className="sticky top-0 bg-background py-2 border-b mb-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {events.map((event) => (
                      <EventRow key={event.event_id} event={event} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data && data.total > pageSize && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to{' '}
                {Math.min(page * pageSize, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * pageSize >= data.total}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EventRow({ event }: { event: Event }) {
  const Icon = eventIcons[event.event_type] || ScrollText
  const colorClass = eventColors[event.event_type] || 'text-muted-foreground bg-muted'
  const [iconColor, bgColor] = colorClass.split(' ')

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={cn('p-2 rounded-lg', bgColor)}>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {event.event_type.replace('.', ' → ')}
          </span>
          <Badge variant="outline" className="text-xs">
            {event.event_type.split('.')[0]}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          {event.run_id && (
            <Link to={`/runs/${event.run_id}`} className="hover:text-primary">
              Run: {event.run_id.slice(0, 8)}
            </Link>
          )}
          {event.step_id !== undefined && (
            <>
              <span>•</span>
              <span>Step #{event.step_id}</span>
            </>
          )}
        </div>
      </div>

      <div className="text-right">
        <span className="text-xs text-muted-foreground">
          {format(parseISO(event.created_at), 'HH:mm:ss')}
        </span>
        <div className="text-xs text-muted-foreground">
          {formatRelativeTime(event.created_at)}
        </div>
      </div>
    </div>
  )
}
