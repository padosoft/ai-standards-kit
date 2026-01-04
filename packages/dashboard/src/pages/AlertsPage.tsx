import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Trash2,
  Check,
  Filter,
  Loader2,
} from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Alert, AlertSeverity } from '@/types'

const severityConfig: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  warning: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
}

export function AlertsPage() {
  const queryClient = useQueryClient()
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all')
  const [showAcknowledged, setShowAcknowledged] = useState(false)

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', { severity: severityFilter, acknowledged: showAcknowledged }],
    queryFn: () =>
      api.getAlerts({
        severity: severityFilter === 'all' ? undefined : severityFilter,
        acknowledged: showAcknowledged,
      }),
    refetchInterval: 15000,
  })

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => api.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  const deleteAlertMutation = useMutation({
    mutationFn: (alertId: string) => api.deleteAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  const unacknowledgedCount = alerts?.filter((a) => !a.acknowledged).length ?? 0
  const criticalCount = alerts?.filter((a) => a.severity === 'critical' && !a.acknowledged).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">System alerts and notifications</p>
        </div>
        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-sm">
              {criticalCount} Critical
            </Badge>
          )}
          {unacknowledgedCount > 0 && (
            <Badge variant="info" className="text-sm">
              {unacknowledgedCount} Unread
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <Button
                variant={severityFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSeverityFilter('all')}
              >
                All
              </Button>
              {Object.entries(severityConfig).map(([severity, config]) => (
                <Button
                  key={severity}
                  variant={severityFilter === severity ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSeverityFilter(severity as AlertSeverity)}
                >
                  <config.icon className={cn('h-4 w-4 mr-1', config.color)} />
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAcknowledged(!showAcknowledged)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showAcknowledged ? 'Hide Acknowledged' : 'Show Acknowledged'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !alerts?.length ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-muted-foreground">No alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <AlertRow
                  key={alert.alert_id}
                  alert={alert}
                  onAcknowledge={() => acknowledgeMutation.mutate(alert.alert_id)}
                  onDelete={() => deleteAlertMutation.mutate(alert.alert_id)}
                  isLoading={acknowledgeMutation.isPending || deleteAlertMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface AlertRowProps {
  alert: Alert
  onAcknowledge: () => void
  onDelete: () => void
  isLoading: boolean
}

function AlertRow({ alert, onAcknowledge, onDelete, isLoading }: AlertRowProps) {
  const config = severityConfig[alert.severity]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-lg border transition-colors',
        alert.acknowledged ? 'opacity-60' : '',
        config.bg
      )}
    >
      <div className={cn('p-2 rounded-lg', config.bg)}>
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{alert.title}</span>
          <Badge
            variant={
              alert.severity === 'critical'
                ? 'destructive'
                : alert.severity === 'warning'
                  ? 'warning'
                  : 'info'
            }
          >
            {alert.severity}
          </Badge>
          {alert.acknowledged && (
            <Badge variant="outline" className="text-green-500">
              Acknowledged
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{formatRelativeTime(alert.created_at)}</span>
          {alert.run_id && (
            <>
              <span>•</span>
              <a href={`/runs/${alert.run_id}`} className="hover:text-primary">
                Run: {alert.run_id.slice(0, 8)}
              </a>
            </>
          )}
          {alert.source && (
            <>
              <span>•</span>
              <span>Source: {alert.source}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {!alert.acknowledged && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAcknowledge}
            disabled={isLoading}
            title="Acknowledge"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isLoading}
          title="Delete"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
