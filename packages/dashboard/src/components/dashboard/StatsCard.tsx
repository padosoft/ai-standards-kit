import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/utils/cn'
import type { TrendData } from '@/types'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: TrendData
  iconColor?: string
  className?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  iconColor = 'text-primary',
  className,
}: StatsCardProps) {
  return (
    <Card className={cn('card-hover', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trend.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : trend.direction === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    'text-xs',
                    trend.direction === 'up' && 'text-green-500',
                    trend.direction === 'down' && 'text-red-500',
                    trend.direction === 'stable' && 'text-muted-foreground'
                  )}
                >
                  {trend.percentage > 0 ? '+' : ''}
                  {trend.percentage.toFixed(1)}% {trend.comparison_period}
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'p-3 rounded-full bg-primary/10',
              iconColor === 'text-primary' && 'bg-primary/10',
              iconColor === 'text-green-500' && 'bg-green-500/10',
              iconColor === 'text-red-500' && 'bg-red-500/10',
              iconColor === 'text-yellow-500' && 'bg-yellow-500/10'
            )}
          >
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
