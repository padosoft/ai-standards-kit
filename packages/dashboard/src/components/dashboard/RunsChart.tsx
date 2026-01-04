import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format, parseISO } from 'date-fns'
import type { TimeSeriesPoint } from '@/types'

interface RunsChartProps {
  completed: TimeSeriesPoint[]
  failed: TimeSeriesPoint[]
  title?: string
}

export function RunsChart({ completed = [], failed = [], title = 'Runs Over Time' }: RunsChartProps) {
  // Handle empty data
  if (!completed.length && !failed.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Merge data for chart
  const data = completed.map((point, index) => ({
    timestamp: point.timestamp,
    completed: point.value,
    failed: failed[index]?.value || 0,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                tickFormatter={(value) => format(parseISO(value), 'HH:mm')}
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
  )
}
