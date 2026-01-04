import { Link } from 'react-router-dom'
import { PlayCircle, Clock, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime, truncate } from '@/utils/format'
import type { Run } from '@/types'

interface ActiveRunsListProps {
  runs: Run[]
}

export function ActiveRunsList({ runs }: ActiveRunsListProps) {
  const activeRuns = runs.filter((r) => r.status === 'running' || r.status === 'pending')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-blue-500" />
          Active Runs
        </CardTitle>
        <Badge variant="info">{activeRuns.length}</Badge>
      </CardHeader>
      <CardContent>
        {activeRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active runs
          </p>
        ) : (
          <div className="space-y-3">
            {activeRuns.slice(0, 5).map((run) => (
              <Link
                key={run.run_id}
                to={`/runs/${run.run_id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="status-dot running" />
                    <span className="font-medium text-sm truncate">
                      {truncate(run.task, 40)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(run.created_at)}</span>
                    <span>•</span>
                    <span>
                      Step {run.completed_steps}/{run.total_steps}
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-24 mr-3">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${(run.completed_steps / run.total_steps) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
            {activeRuns.length > 5 && (
              <Link
                to="/runs?status=running"
                className="block text-center text-sm text-primary hover:underline py-2"
              >
                View all {activeRuns.length} active runs
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
