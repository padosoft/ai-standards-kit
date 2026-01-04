import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Wifi,
  Zap,
} from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDuration, formatBytes } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { SystemHealth } from '@/types'

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  degraded: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  unhealthy: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  disabled: { icon: AlertTriangle, color: 'text-gray-500', bg: 'bg-gray-500/10' },
}

const defaultStatusConfig = { icon: AlertTriangle, color: 'text-gray-400', bg: 'bg-gray-400/10' }

export function HealthPage() {
  const {
    data: health,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 30000,
  })

  const overallStatus = health?.status ?? 'healthy'
  const config = statusConfig[overallStatus] || defaultStatusConfig
  const StatusIcon = config.icon

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground">Monitor system status and resources</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Overall status */}
          <Card className={cn('border-2', config.bg)}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={cn('p-4 rounded-lg', config.bg)}>
                  <StatusIcon className={cn('h-8 w-8', config.color)} />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">System Status</div>
                  <div className="text-2xl font-bold capitalize">{overallStatus}</div>
                </div>
                <div className="flex-1" />
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Uptime</div>
                  <div className="font-semibold">
                    {formatDuration(health?.uptime_seconds ?? 0)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Version</div>
                  <div className="font-semibold">{health?.version ?? 'Unknown'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resource metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ResourceCard
              title="CPU Usage"
              value={`${health?.cpu_percent?.toFixed(1) ?? 0}%`}
              icon={Cpu}
              progress={health?.cpu_percent ?? 0}
              status={getResourceStatus(health?.cpu_percent ?? 0)}
            />
            <ResourceCard
              title="Memory Usage"
              value={`${health?.memory_percent?.toFixed(1) ?? 0}%`}
              subtitle={
                health?.memory_used && health?.memory_total
                  ? `${formatBytes(health.memory_used)} / ${formatBytes(health.memory_total)}`
                  : undefined
              }
              icon={Server}
              progress={health?.memory_percent ?? 0}
              status={getResourceStatus(health?.memory_percent ?? 0)}
            />
            <ResourceCard
              title="Disk Usage"
              value={`${health?.disk_percent?.toFixed(1) ?? 0}%`}
              subtitle={
                health?.disk_used && health?.disk_total
                  ? `${formatBytes(health.disk_used)} / ${formatBytes(health.disk_total)}`
                  : undefined
              }
              icon={HardDrive}
              progress={health?.disk_percent ?? 0}
              status={getResourceStatus(health?.disk_percent ?? 0)}
            />
            <ResourceCard
              title="Active Connections"
              value={String(health?.active_connections ?? 0)}
              icon={Wifi}
              status="healthy"
            />
          </div>

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {health?.services?.map((service) => {
                  const serviceConfig = statusConfig[service.status] || defaultStatusConfig
                  const ServiceIcon = serviceConfig.icon

                  return (
                    <div
                      key={service.name}
                      className={cn('p-4 rounded-lg border', serviceConfig.bg)}
                    >
                      <div className="flex items-center gap-3">
                        <ServiceIcon className={cn('h-5 w-5', serviceConfig.color)} />
                        <div className="flex-1">
                          <div className="font-medium">{service.name}</div>
                          {service.message && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {service.message}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={
                            service.status === 'healthy'
                              ? 'success'
                              : service.status === 'degraded'
                                ? 'warning'
                                : 'destructive'
                          }
                        >
                          {service.status}
                        </Badge>
                      </div>
                      {service.latency_ms !== undefined && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Latency: {service.latency_ms}ms</span>
                        </div>
                      )}
                    </div>
                  )
                }) ?? (
                  <p className="text-muted-foreground col-span-full text-center py-4">
                    No services data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Database stats */}
          {health?.database && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Total Records</div>
                    <div className="text-2xl font-bold">{health.database.total_records ?? 0}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Database Size</div>
                    <div className="text-2xl font-bold">
                      {formatBytes(health.database.size_bytes ?? 0)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Connections</div>
                    <div className="text-2xl font-bold">
                      {health.database.active_connections ?? 0}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Avg Query Time</div>
                    <div className="text-2xl font-bold">
                      {health.database.avg_query_ms?.toFixed(1) ?? 0}ms
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Queue stats */}
          {health?.queue && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Task Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Pending Tasks</div>
                    <div className="text-2xl font-bold">{health.queue.pending ?? 0}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Processing</div>
                    <div className="text-2xl font-bold">{health.queue.processing ?? 0}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Completed (24h)</div>
                    <div className="text-2xl font-bold">{health.queue.completed_24h ?? 0}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">Failed (24h)</div>
                    <div className="text-2xl font-bold text-red-500">
                      {health.queue.failed_24h ?? 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

interface ResourceCardProps {
  title: string
  value: string
  subtitle?: string
  icon: typeof Cpu
  progress?: number
  status: 'healthy' | 'degraded' | 'unhealthy'
}

function ResourceCard({ title, value, subtitle, icon: Icon, progress, status }: ResourceCardProps) {
  const config = statusConfig[status]

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={cn('p-3 rounded-lg', config.bg)}>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">{title}</div>
            <div className="text-xl font-bold">{value}</div>
            {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
          </div>
        </div>
        {progress !== undefined && (
          <div className="mt-3">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  status === 'healthy' && 'bg-green-500',
                  status === 'degraded' && 'bg-yellow-500',
                  status === 'unhealthy' && 'bg-red-500'
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getResourceStatus(percent: number): 'healthy' | 'degraded' | 'unhealthy' {
  if (percent >= 90) return 'unhealthy'
  if (percent >= 75) return 'degraded'
  return 'healthy'
}
