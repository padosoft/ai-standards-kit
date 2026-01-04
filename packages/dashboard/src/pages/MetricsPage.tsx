import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  Calendar,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format, parseISO, subDays } from 'date-fns'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/dashboard'
import { formatDuration, formatPercent } from '@/utils/format'

type TimeRange = '24h' | '7d' | '30d'

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#6b7280']

export function MetricsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    refetchInterval: 60000,
  })

  const { data: timeSeries } = useQuery({
    queryKey: ['timeseries', timeRange],
    queryFn: () => api.getTimeSeries(timeRange),
    refetchInterval: 60000,
  })

  // Prepare chart data
  const runsChartData =
    timeSeries?.runs_completed.map((point, index) => ({
      timestamp: point.timestamp,
      completed: point.value,
      failed: timeSeries.runs_failed[index]?.value || 0,
    })) ?? []

  const statusPieData = stats?.runs_by_status
    ? Object.entries(stats.runs_by_status).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
      }))
    : []

  const toolUsageData = stats?.tool_usage
    ? Object.entries(stats.tool_usage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tool, count]) => ({ tool, count }))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Metrics</h1>
          <p className="text-muted-foreground">Performance analytics and statistics</p>
        </div>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Runs"
          value={stats?.total_runs ?? 0}
          icon={Activity}
          iconColor="text-blue-500"
        />
        <StatsCard
          title="Success Rate"
          value={formatPercent(stats?.success_rate ?? 0)}
          icon={TrendingUp}
          iconColor="text-green-500"
        />
        <StatsCard
          title="Avg Duration"
          value={formatDuration(stats?.avg_duration_seconds ?? 0)}
          icon={Clock}
          iconColor="text-yellow-500"
        />
        <StatsCard
          title="Total Steps"
          value={stats?.total_steps ?? 0}
          icon={Zap}
          iconColor="text-purple-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Runs over time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Runs Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={runsChartData}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) =>
                      format(parseISO(value), timeRange === '24h' ? 'HH:mm' : 'dd/MM')
                    }
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                    labelFormatter={(value) => format(parseISO(value as string), 'dd/MM HH:mm')}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#22c55e"
                    fillOpacity={1}
                    fill="url(#colorCompleted)"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    name="Failed"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorFailed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tool usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Top Tools Used
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={toolUsageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="tool" type="category" width={150} className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Completed Runs</div>
                <div className="text-2xl font-bold">{stats?.runs_by_status?.completed ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500/10">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Failed Runs</div>
                <div className="text-2xl font-bold">{stats?.runs_by_status?.failed ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Retry Rate</div>
                <div className="text-2xl font-bold">{formatPercent(stats?.retry_rate ?? 0)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
