import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RotateCcw,
  StopCircle,
} from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime, formatDuration, truncate } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Run, RunStatus } from '@/types'

const statusConfig: Record<string, { icon: typeof PlayCircle; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  running: { icon: PlayCircle, color: 'text-blue-500', label: 'Running' },
  completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  done: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
  error: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
  cancelled: { icon: StopCircle, color: 'text-gray-500', label: 'Cancelled' },
  canceled: { icon: StopCircle, color: 'text-gray-500', label: 'Cancelled' },
}

const defaultStatusConfig = { icon: Clock, color: 'text-gray-400', label: 'Unknown' }

export function RunsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const pageSize = 20

  const { data, isLoading } = useQuery({
    queryKey: ['runs', { page, status: statusFilter, search }],
    queryFn: () =>
      api.getRuns({
        page,
        page_size: pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
    refetchInterval: 10000,
  })

  const cancelMutation = useMutation({
    mutationFn: (runId: string) => api.cancelRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] })
    },
  })

  const retryMutation = useMutation({
    mutationFn: (runId: string) => api.retryRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] })
    },
  })

  const filteredRuns = (data?.items ?? []).filter((run) =>
    search ? run.task.toLowerCase().includes(search.toLowerCase()) : true
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Runs</h1>
        <p className="text-muted-foreground">Manage and monitor orchestration runs</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search runs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All
              </Button>
              {Object.entries(statusConfig).map(([status, config]) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status as RunStatus)}
                >
                  <config.icon className={cn('h-4 w-4 mr-1', config.color)} />
                  {config.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Runs list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Runs</span>
            <Badge variant="outline">{data?.total ?? 0} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !filteredRuns?.length ? (
            <p className="text-center text-muted-foreground py-8">No runs found</p>
          ) : (
            <div className="space-y-2">
              {filteredRuns.map((run) => (
                <RunRow
                  key={run.run_id}
                  run={run}
                  onCancel={() => cancelMutation.mutate(run.run_id)}
                  onRetry={() => retryMutation.mutate(run.run_id)}
                  isLoading={cancelMutation.isPending || retryMutation.isPending}
                />
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

interface RunRowProps {
  run: Run
  onCancel: () => void
  onRetry: () => void
  isLoading: boolean
}

function RunRow({ run, onCancel, onRetry, isLoading }: RunRowProps) {
  const config = statusConfig[run.status] || defaultStatusConfig
  const Icon = config.icon
  const progress = run.total_steps > 0 ? (run.completed_steps / run.total_steps) * 100 : 0

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      <Icon className={cn('h-5 w-5 flex-shrink-0', config.color)} />

      <div className="flex-1 min-w-0">
        <Link
          to={`/runs/${run.run_id}`}
          className="font-medium hover:text-primary transition-colors block truncate"
        >
          {truncate(run.task, 60)}
        </Link>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>{run.run_id.slice(0, 8)}</span>
          <span>•</span>
          <span>{formatRelativeTime(run.created_at)}</span>
          {run.duration_seconds && (
            <>
              <span>•</span>
              <span>{formatDuration(run.duration_seconds)}</span>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="w-32 hidden lg:block">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                run.status === 'completed' && 'bg-green-500',
                run.status === 'failed' && 'bg-red-500',
                run.status === 'running' && 'bg-blue-500',
                run.status === 'pending' && 'bg-yellow-500',
                run.status === 'cancelled' && 'bg-gray-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-12 text-right">
            {run.completed_steps}/{run.total_steps}
          </span>
        </div>
      </div>

      <Badge variant={run.status === 'completed' ? 'success' : run.status === 'failed' ? 'destructive' : 'info'}>
        {config.label}
      </Badge>

      {/* Actions */}
      <div className="flex gap-2">
        {(run.status === 'running' || run.status === 'pending') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            title="Cancel run"
          >
            <StopCircle className="h-4 w-4" />
          </Button>
        )}
        {run.status === 'failed' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            disabled={isLoading}
            title="Retry run"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
