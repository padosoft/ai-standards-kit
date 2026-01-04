import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Webhook,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  Send,
  Clock,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import type { Webhook as WebhookType } from '@/types'

const eventTypes = [
  'run.created',
  'run.completed',
  'run.failed',
  'run.cancelled',
  'step.started',
  'step.accepted',
  'step.rejected',
]

export function WebhooksPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: api.getWebhooks,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.updateWebhook(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testWebhook(id),
  })

  const activeCount = webhooks?.filter((w) => w.enabled).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">Configure event notifications</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="info">{activeCount} Active</Badge>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Webhook
          </Button>
        </div>
      </div>

      {/* Add/Edit form */}
      {(showForm || editingId) && (
        <WebhookForm
          webhook={editingId ? webhooks?.find((w) => w.webhook_id === editingId) : undefined}
          onClose={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}

      {/* Webhooks list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Configured Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !webhooks?.length ? (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No webhooks configured</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.webhook_id}
                  className={cn(
                    'p-4 rounded-lg border transition-colors',
                    webhook.enabled ? 'bg-background' : 'bg-muted/50 opacity-60'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: webhook.webhook_id,
                          enabled: !webhook.enabled,
                        })
                      }
                      className="mt-1"
                    >
                      {webhook.enabled ? (
                        <ToggleRight className="h-6 w-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{webhook.name}</span>
                        {webhook.last_triggered_at && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatRelativeTime(webhook.last_triggered_at)}
                          </Badge>
                        )}
                        {webhook.failure_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {webhook.failure_count} failures
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        <code className="text-xs bg-muted px-2 py-0.5 rounded truncate max-w-md">
                          {webhook.url}
                        </code>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testMutation.mutate(webhook.webhook_id)}
                        disabled={testMutation.isPending}
                        title="Test webhook"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(webhook.webhook_id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(webhook.webhook_id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface WebhookFormProps {
  webhook?: WebhookType
  onClose: () => void
}

function WebhookForm({ webhook, onClose }: WebhookFormProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(webhook?.name ?? '')
  const [url, setUrl] = useState(webhook?.url ?? '')
  const [secret, setSecret] = useState(webhook?.secret ?? '')
  const [events, setEvents] = useState<string[]>(webhook?.events ?? [])
  const [enabled, setEnabled] = useState(webhook?.enabled ?? true)

  const createMutation = useMutation({
    mutationFn: (data: Partial<WebhookType>) => api.createWebhook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<WebhookType>) =>
      api.updateWebhook(webhook!.webhook_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name,
      url,
      secret: secret || undefined,
      events,
      enabled,
    }

    if (webhook) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{webhook ? 'Edit Webhook' : 'Add Webhook'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Webhook"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL</label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Secret (optional)</label>
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Webhook secret for signature verification"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Events</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {eventTypes.map((event) => (
                <button
                  key={event}
                  type="button"
                  onClick={() => toggleEvent(event)}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm border transition-colors',
                    events.includes(event)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted'
                  )}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className="flex items-center gap-2"
            >
              {enabled ? (
                <ToggleRight className="h-6 w-6 text-green-500" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="text-sm">{enabled ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending || events.length === 0}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {webhook ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
