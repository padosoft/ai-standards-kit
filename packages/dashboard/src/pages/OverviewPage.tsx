import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  CheckCircle,
  Clock,
  TrendingUp,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { api } from '@/api/client'
import { StatsCard, RunsChart, ActiveRunsList, RecentEvents } from '@/components/dashboard'
import { formatDuration, formatPercent } from '@/utils/format'
import type { TrendData } from '@/types'

// Convert numeric trend to TrendData object
function toTrendData(value: number | undefined): TrendData | undefined {
  if (value === undefined || value === null) return undefined
  return {
    direction: value > 0 ? 'up' : value < 0 ? 'down' : 'stable',
    percentage: Math.abs(value),
    comparison_period: 'vs yesterday',
  }
}

export function OverviewPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    refetchInterval: 30000,
  })

  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['timeseries', '24h'],
    queryFn: () => api.getTimeSeries('24h'),
    refetchInterval: 60000,
  })

  const { data: runsData } = useQuery({
    queryKey: ['runs', { page_size: 20 }],
    queryFn: () => api.getRuns({ page_size: 20 }),
    refetchInterval: 30000,
  })

  const { data: eventsData } = useQuery({
    queryKey: ['events', { page_size: 10 }],
    queryFn: () => api.getEvents({ page_size: 10 }),
    refetchInterval: 15000,
  })

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your AI Orchestrator activity
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Runs"
          value={stats?.active_runs ?? 0}
          icon={Activity}
          iconColor="text-blue-500"
        />
        <StatsCard
          title="Completed Today"
          value={stats?.total_runs_today ?? 0}
          icon={CheckCircle}
          iconColor="text-green-500"
          trend={toTrendData(stats?.runs_trend)}
        />
        <StatsCard
          title="Success Rate"
          value={formatPercent(stats?.success_rate ?? 0)}
          icon={TrendingUp}
          iconColor="text-primary"
        />
        <StatsCard
          title="Avg Duration"
          value={formatDuration(stats?.avg_duration_seconds ?? 0)}
          icon={Clock}
          iconColor="text-yellow-500"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Steps Today"
          value={stats?.total_steps_today ?? 0}
          icon={Activity}
        />
        <StatsCard
          title="Retry Rate"
          value={formatPercent(stats?.retry_rate ?? 0)}
          icon={RotateCcw}
          iconColor="text-yellow-500"
        />
        <StatsCard
          title="Failed Today"
          value={stats?.runs_by_status?.failed ?? 0}
          icon={XCircle}
          iconColor="text-red-500"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {!timeSeriesLoading && timeSeries && (
            <RunsChart
              completed={timeSeries.runs_completed}
              failed={timeSeries.runs_failed}
              title="Runs Over Time (24h)"
            />
          )}
        </div>
        <div className="space-y-6">
          <ActiveRunsList runs={runsData?.items ?? []} />
        </div>
      </div>

      {/* Recent events */}
      <RecentEvents events={eventsData?.items ?? []} />
    </div>
  )
}
