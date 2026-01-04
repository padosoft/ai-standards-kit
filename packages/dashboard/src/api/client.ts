/**
 * API Client for AI Orchestrator Backend
 */

import type {
  Run,
  Step,
  Event,
  Artifact,
  Guideline,
  Webhook,
  WebhookDelivery,
  Stats,
  TimeSeriesData,
  SystemHealth,
  Alert,
  AlertRule,
  DashboardSettings,
  PaginatedResponse,
} from '@/types'

const API_BASE = '/api'

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: unknown
  ) {
    super(`API Error: ${status} ${statusText}`)
    this.name = 'ApiError'
  }
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error: string | null
  timestamp: string
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, response.statusText, body)
  }

  const json: ApiResponse<T> = await response.json()

  // API returns wrapped response {success, data, error, timestamp}
  // Extract the data field
  if (json.success === false) {
    throw new ApiError(500, json.error || 'Unknown error', json)
  }

  return json.data
}

// =============================================================================
// Stats & Health
// =============================================================================

export async function getStats(): Promise<Stats> {
  return request<Stats>('/stats')
}

export async function getTimeSeries(
  period: '1h' | '24h' | '7d' | '30d' = '24h'
): Promise<TimeSeriesData> {
  return request<TimeSeriesData>(`/stats/timeseries?period=${period}`)
}

export async function getHealth(): Promise<SystemHealth> {
  return request<SystemHealth>('/health')
}

// =============================================================================
// Runs
// =============================================================================

interface RunsResponse {
  runs: Run[]
  count?: number
}

export async function getRuns(params?: {
  status?: string
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<Run>> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))

  const query = searchParams.toString()
  const response = await request<RunsResponse>(`/runs${query ? `?${query}` : ''}`)

  // Map backend response to PaginatedResponse format
  const count = response.count ?? response.runs.length
  return {
    items: response.runs,
    total: count,
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 50,
    total_pages: Math.ceil(count / (params?.page_size ?? 50)),
  }
}

export async function getRun(runId: string): Promise<Run & { steps: Step[]; artifacts: Artifact[] }> {
  return request(`/runs/${runId}`)
}

export async function getRunTimeline(runId: string): Promise<{
  run: Run
  steps: Array<Step & { duration_seconds?: number }>
}> {
  return request(`/runs/${runId}/timeline`)
}

export async function cancelRun(runId: string, reason?: string): Promise<{ cancelled: boolean }> {
  return request(`/runs/${runId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function retryRun(runId: string): Promise<Run> {
  return request(`/runs/${runId}/retry`, {
    method: 'POST',
  })
}

// =============================================================================
// Steps
// =============================================================================

export async function getStep(runId: string, stepId: number): Promise<Step> {
  return request(`/runs/${runId}/steps/${stepId}`)
}

// =============================================================================
// Events
// =============================================================================

interface EventsResponse {
  events: Event[]
  count: number
}

export async function getEvents(params?: {
  run_id?: string
  event_type?: string
  page?: number
  page_size?: number
}): Promise<PaginatedResponse<Event>> {
  const searchParams = new URLSearchParams()
  if (params?.run_id) searchParams.set('run_id', params.run_id)
  if (params?.event_type) searchParams.set('event_type', params.event_type)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))

  const query = searchParams.toString()
  const response = await request<EventsResponse>(`/events${query ? `?${query}` : ''}`)

  // Map backend response to PaginatedResponse format
  return {
    items: response.events,
    total: response.count,
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 50,
    total_pages: Math.ceil(response.count / (params?.page_size ?? 50)),
  }
}

// =============================================================================
// Guidelines
// =============================================================================

interface GuidelinesResponse {
  guidelines: Guideline[]
  count: number
}

export async function getGuidelines(category?: string): Promise<Guideline[]> {
  const query = category ? `?category=${category}` : ''
  const response = await request<GuidelinesResponse>(`/guidelines${query}`)
  return response.guidelines
}

export async function createGuideline(data: Partial<Guideline>): Promise<Guideline> {
  return request('/guidelines', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateGuideline(
  guidelineId: string,
  data: Partial<Guideline>
): Promise<Guideline> {
  return request(`/guidelines/${guidelineId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteGuideline(guidelineId: string): Promise<void> {
  await request(`/guidelines/${guidelineId}`, { method: 'DELETE' })
}

// =============================================================================
// Webhooks
// =============================================================================

export async function getWebhooks(): Promise<Webhook[]> {
  return request<Webhook[]>('/webhooks')
}

export async function createWebhook(data: Omit<Webhook, 'webhook_id' | 'created_at' | 'updated_at'>): Promise<Webhook> {
  return request('/webhooks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateWebhook(webhookId: string, data: Partial<Webhook>): Promise<Webhook> {
  return request(`/webhooks/${webhookId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  await request(`/webhooks/${webhookId}`, { method: 'DELETE' })
}

export async function testWebhook(webhookId: string): Promise<{ success: boolean; status_code?: number }> {
  return request(`/webhooks/${webhookId}/test`, { method: 'POST' })
}

export async function getWebhookDeliveries(
  webhookId: string,
  params?: { page?: number; page_size?: number }
): Promise<PaginatedResponse<WebhookDelivery>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))

  const query = searchParams.toString()
  return request(`/webhooks/${webhookId}/deliveries${query ? `?${query}` : ''}`)
}

// =============================================================================
// Alerts
// =============================================================================

export async function getAlerts(params?: {
  acknowledged?: boolean
  severity?: string
}): Promise<Alert[]> {
  const searchParams = new URLSearchParams()
  if (params?.acknowledged !== undefined) searchParams.set('acknowledged', String(params.acknowledged))
  if (params?.severity) searchParams.set('severity', params.severity)

  const query = searchParams.toString()
  return request<Alert[]>(`/alerts${query ? `?${query}` : ''}`)
}

export async function acknowledgeAlert(alertId: string): Promise<Alert> {
  return request(`/alerts/${alertId}/acknowledge`, { method: 'POST' })
}

export async function getAlertRules(): Promise<AlertRule[]> {
  return request<AlertRule[]>('/alerts/rules')
}

export async function updateAlertRule(ruleId: string, data: Partial<AlertRule>): Promise<AlertRule> {
  return request(`/alerts/rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Settings
// =============================================================================

export async function getSettings(): Promise<DashboardSettings> {
  return request<DashboardSettings>('/settings')
}

export async function updateSettings(data: Partial<DashboardSettings>): Promise<DashboardSettings> {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// =============================================================================
// Discord
// =============================================================================

export async function testDiscordWebhook(webhookUrl: string): Promise<{ success: boolean }> {
  return request('/discord/test', {
    method: 'POST',
    body: JSON.stringify({ webhook_url: webhookUrl }),
  })
}

export async function sendWeeklySummary(): Promise<{ success: boolean }> {
  return request('/discord/weekly-summary', { method: 'POST' })
}

// =============================================================================
// SSE Connection
// =============================================================================

export function createEventSource(onEvent: (event: MessageEvent) => void): EventSource {
  const eventSource = new EventSource(`${API_BASE}/events/stream`)

  eventSource.onmessage = onEvent

  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error)
  }

  return eventSource
}

// =============================================================================
// Export all
// =============================================================================

export const api = {
  // Stats
  getStats,
  getTimeSeries,
  getHealth,
  // Runs
  getRuns,
  getRun,
  getRunTimeline,
  cancelRun,
  retryRun,
  // Steps
  getStep,
  // Events
  getEvents,
  // Guidelines
  getGuidelines,
  createGuideline,
  updateGuideline,
  deleteGuideline,
  // Webhooks
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getWebhookDeliveries,
  // Alerts
  getAlerts,
  acknowledgeAlert,
  getAlertRules,
  updateAlertRule,
  // Settings
  getSettings,
  updateSettings,
  // Discord
  testDiscordWebhook,
  sendWeeklySummary,
  // SSE
  createEventSource,
}

export default api
