import { Link } from 'react-router-dom'
import {
  ScrollText,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Event } from '@/types'

interface RecentEventsProps {
  events: Event[]
}

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

export function RecentEvents({ events }: RecentEventsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          Recent Events
        </CardTitle>
        <Link to="/events" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent events
          </p>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 10).map((event) => {
              const Icon = eventIcons[event.event_type] || ScrollText
              const color = eventColors[event.event_type] || 'text-muted-foreground'

              return (
                <div
                  key={event.event_id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Icon className={cn('h-4 w-4 flex-shrink-0', color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {event.event_type.replace('.', ' → ')}
                    </p>
                    {event.run_id && (
                      <Link
                        to={`/runs/${event.run_id}`}
                        className="text-xs text-muted-foreground hover:text-primary truncate block"
                      >
                        {event.run_id}
                        {event.step_id !== undefined && ` #${event.step_id}`}
                      </Link>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(event.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
