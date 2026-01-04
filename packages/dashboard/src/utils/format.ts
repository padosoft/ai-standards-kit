import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

/**
 * Format a date string for display
 */
export function formatDate(dateString: string, formatStr = 'dd/MM/yyyy HH:mm'): string {
  try {
    const date = parseISO(dateString)
    return format(date, formatStr, { locale: it })
  } catch {
    return dateString
  }
}

/**
 * Format a date as relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return formatDistanceToNow(date, { addSuffix: true, locale: it })
  } catch {
    return dateString
  }
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Format a number with locale-specific separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('it-IT').format(num)
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Truncate a string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 3)}...`
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'done':
    case 'accepted':
    case 'healthy':
      return 'text-green-600 dark:text-green-400'
    case 'running':
    case 'pending':
      return 'text-blue-600 dark:text-blue-400'
    case 'failed':
    case 'rejected':
    case 'unhealthy':
      return 'text-red-600 dark:text-red-400'
    case 'degraded':
      return 'text-yellow-600 dark:text-yellow-400'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get status background color class
 */
export function getStatusBgColor(status: string): string {
  switch (status) {
    case 'done':
    case 'accepted':
    case 'healthy':
      return 'bg-green-100 dark:bg-green-900/30'
    case 'running':
    case 'pending':
      return 'bg-blue-100 dark:bg-blue-900/30'
    case 'failed':
    case 'rejected':
    case 'unhealthy':
      return 'bg-red-100 dark:bg-red-900/30'
    case 'degraded':
      return 'bg-yellow-100 dark:bg-yellow-900/30'
    default:
      return 'bg-muted'
  }
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-red-600 dark:text-red-400'
    case 'error':
      return 'text-red-500 dark:text-red-400'
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'info':
    default:
      return 'text-blue-600 dark:text-blue-400'
  }
}

/**
 * Format date and time
 */
export function formatDateTime(dateString: string): string {
  try {
    const date = parseISO(dateString)
    return format(date, 'dd/MM/yyyy HH:mm:ss', { locale: it })
  } catch {
    return dateString
  }
}
