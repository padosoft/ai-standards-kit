import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  StopCircle,
  RotateCcw,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime, formatDuration, formatDateTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Run, Step, StepStatus } from '@/types'
import { useState } from 'react'

const stepStatusConfig: Record<StepStatus, { icon: typeof PlayCircle; color: string }> = {
  pending: { icon: Clock, color: 'text-yellow-500' },
  running: { icon: PlayCircle, color: 'text-blue-500' },
  awaiting_confirmation: { icon: AlertCircle, color: 'text-orange-500' },
  accepted: { icon: CheckCircle, color: 'text-green-500' },
  rejected: { icon: XCircle, color: 'text-red-500' },
  skipped: { icon: StopCircle, color: 'text-gray-500' },
}

export function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>()
  const queryClient = useQueryClient()

  const { data: run, isLoading } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.getRun(runId!),
    enabled: !!runId,
    refetchInterval: (data) =>
      data?.status === 'running' || data?.status === 'pending' ? 5000 : false,
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelRun(runId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['run', runId] })
    },
  })

  const retryMutation = useMutation({
    mutationFn: () => api.retryRun(runId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['run', runId] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!run) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Run not found</p>
        <Link to="/runs" className="text-primary hover:underline mt-2 inline-block">
          Back to runs
        </Link>
      </div>
    )
  }

  const progress = run.total_steps > 0 ? (run.completed_steps / run.total_steps) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to="/runs"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to runs
          </Link>
          <h1 className="text-2xl font-bold">{run.task}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <code className="bg-muted px-2 py-0.5 rounded">{run.run_id}</code>
            <span>•</span>
            <span>Created {formatRelativeTime(run.created_at)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {(run.status === 'running' || run.status === 'pending') && (
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          {run.status === 'failed' && (
            <Button onClick={() => retryMutation.mutate()} disabled={retryMutation.isPending}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Status and progress */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('status-dot', run.status)} />
              <span className="font-semibold capitalize">{run.status}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Progress</div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>
                  {run.completed_steps} / {run.total_steps} steps
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Duration</div>
            <div className="font-semibold mt-1">
              {run.duration_seconds ? formatDuration(run.duration_seconds) : 'In progress...'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Timestamps</div>
            <div className="text-sm mt-1 space-y-1">
              <div>Started: {formatDateTime(run.created_at)}</div>
              {run.completed_at && <div>Ended: {formatDateTime(run.completed_at)}</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error message */}
      {run.error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap font-mono">{run.error}</pre>
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Steps</CardTitle>
        </CardHeader>
        <CardContent>
          {run.steps.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No steps yet</p>
          ) : (
            <div className="space-y-2">
              {run.steps.map((step) => (
                <StepRow key={step.step_id} step={step} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Artifacts */}
      {run.artifacts && run.artifacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Artifacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {run.artifacts.map((artifact) => (
                <a
                  key={artifact.artifact_id}
                  href={artifact.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{artifact.filename}</div>
                    <div className="text-xs text-muted-foreground">{artifact.content_type}</div>
                  </div>
                  <Badge variant="outline">{artifact.artifact_type}</Badge>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StepRow({ step }: { step: Step }) {
  const [expanded, setExpanded] = useState(false)
  const config = stepStatusConfig[step.status]
  const Icon = config.icon

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Icon className={cn('h-5 w-5', config.color)} />
        <div className="flex-1 min-w-0">
          <div className="font-medium">Step #{step.step_id}</div>
          <div className="text-sm text-muted-foreground truncate">{step.tool_name}</div>
        </div>
        <Badge variant="outline" className="capitalize">
          {step.status.replace('_', ' ')}
        </Badge>
        {step.duration_seconds !== undefined && (
          <span className="text-sm text-muted-foreground">
            {formatDuration(step.duration_seconds)}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t">
          <div className="pt-3">
            <div className="text-sm font-medium text-muted-foreground mb-1">Description</div>
            <p className="text-sm">{step.description}</p>
          </div>

          {step.tool_input && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Input</div>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48">
                {JSON.stringify(step.tool_input, null, 2)}
              </pre>
            </div>
          )}

          {step.tool_output && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Output</div>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48">
                {typeof step.tool_output === 'string'
                  ? step.tool_output
                  : JSON.stringify(step.tool_output, null, 2)}
              </pre>
            </div>
          )}

          {step.error && (
            <div>
              <div className="text-sm font-medium text-red-500 mb-1">Error</div>
              <pre className="text-xs bg-red-500/10 text-red-500 p-3 rounded-lg overflow-auto">
                {step.error}
              </pre>
            </div>
          )}

          {step.retry_count !== undefined && step.retry_count > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RotateCcw className="h-4 w-4" />
              <span>Retried {step.retry_count} times</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
