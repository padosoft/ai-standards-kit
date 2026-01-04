// =============================================================================
// API Types - Match Python backend models
// =============================================================================

export type RunStatus = 'pending' | 'running' | 'done' | 'failed'
export type StepStatus = 'pending' | 'accepted' | 'rejected'
export type RunMode = 'safe' | 'fast'
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'
export type GuidelineCategory = 'behavior' | 'security' | 'quality' | 'custom'

export interface Run {
  run_id: string
  status: RunStatus
  task: string
  mode: RunMode
  total_steps: number
  completed_steps: number
  created_at: string
  updated_at: string
  completed_at?: string
  error_message?: string
  duration_seconds?: number
}

export interface Step {
  run_id: string
  step_id: number
  agent: string
  goal: string
  status: StepStatus
  retry_count: number
  max_retries: number
  contract: StepContract
  output?: StepOutput
  dependencies?: number[]
  parallel_group?: number
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
}

export interface StepContract {
  required_input: string[]
  required_output: string[]
  optional_output: string[]
  severity: 'blocker' | 'warning' | 'info'
  max_retries: number
  timeout_seconds: number
  dependencies: number[]
}

export interface StepOutput {
  summary: string
  details?: string
  artifact_paths?: Record<string, string>
  test_results?: TestResult[]
}

export interface TestResult {
  name: string
  passed: boolean
  duration_ms?: number
  error?: string
}

export interface Artifact {
  run_id: string
  step_id: number
  name: string
  path: string
  content_type: string
  size_bytes: number
  sha256: string
  created_at: string
}

export interface Event {
  event_id: string
  run_id?: string
  step_id?: number
  event_type: string
  event_data?: Record<string, unknown>
  created_at: string
}

export type GuidelineSource = 'db' | 'builtin' | 'standards'

export interface Guideline {
  id: string
  guideline_id?: string  // alias for id
  category: GuidelineCategory | string
  name: string
  description: string
  content?: string  // alias for description
  priority: number
  enabled?: boolean
  tags?: string[]
  condition?: string | Record<string, unknown>
  source?: GuidelineSource
  source_path?: string | null
}

export interface Webhook {
  webhook_id: string
  url: string
  events: string[]
  secret?: string
  retry_count: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface WebhookDelivery {
  delivery_id: string
  webhook_id: string
  event_type: string
  run_id?: string
  step_id?: number
  status_code?: number
  success: boolean
  attempts: number
  created_at: string
  delivered_at?: string
}

// =============================================================================
// Dashboard-specific types
// =============================================================================

export interface Stats {
  active_runs: number
  total_runs: number
  total_runs_today: number
  total_runs_week?: number
  success_rate: number
  avg_duration_seconds: number
  total_steps: number
  total_steps_today: number
  retry_rate: number
  runs_by_status: Record<string, number>
  runs_trend: number  // Percentage change vs yesterday
  tool_usage?: Record<string, number>
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable'
  percentage: number
  comparison_period: string
}

export interface TimeSeriesPoint {
  timestamp: string
  value: number
}

export interface TimeSeriesData {
  runs_completed: TimeSeriesPoint[]
  runs_failed: TimeSeriesPoint[]
  avg_duration: TimeSeriesPoint[]
  active_runs: TimeSeriesPoint[]
}

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency_ms?: number
  last_check: string
  details?: string
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  services: ServiceHealth[]
  uptime_seconds: number
}

export interface Alert {
  alert_id: string
  severity: AlertSeverity
  title: string
  message: string
  run_id?: string
  step_id?: number
  created_at: string
  acknowledged: boolean
  acknowledged_at?: string
}

export interface AlertRule {
  rule_id: string
  name: string
  description: string
  condition: string
  severity: AlertSeverity
  enabled: boolean
  notify_discord: boolean
  created_at: string
}

// =============================================================================
// Settings types
// =============================================================================

export interface DashboardSettings {
  theme: 'light' | 'dark' | 'system'
  refresh_interval_seconds: number
  retention_days: number
  timezone: string
  notifications: NotificationSettings
  discord: DiscordSettings
}

export interface NotificationSettings {
  browser_notifications: boolean
  sound_enabled: boolean
  notify_on_error: boolean
  notify_on_completion: boolean
}

export interface DiscordSettings {
  enabled: boolean
  alerts_webhook_url?: string
  alerts_channel_name?: string
  weekly_summary_enabled: boolean
  weekly_summary_webhook_url?: string
  weekly_summary_channel_name?: string
  weekly_summary_day: 'monday' | 'friday' | 'sunday'
  weekly_summary_time: string // HH:mm format
}

// =============================================================================
// API Response types
// =============================================================================

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApiError {
  error: string
  detail?: string
  status_code: number
}

// =============================================================================
// SSE Event types
// =============================================================================

export interface SSEEvent {
  type: string
  data: {
    event_type: string
    run_id?: string
    step_id?: number
    timestamp: string
    payload?: Record<string, unknown>
  }
}
