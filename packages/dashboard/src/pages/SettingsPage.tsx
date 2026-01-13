import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings,
  Save,
  Bell,
  Clock,
  Database,
  Palette,
  Moon,
  Sun,
  Monitor,
  MessageCircle,
  Loader2,
  CheckCircle,
  TestTube,
  Send,
  Lightbulb,
} from 'lucide-react'
import { api } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useThemeStore, useSettingsStore, useEnergySaverStore } from '@/stores/app'
import { cn } from '@/utils/cn'
import type { DashboardSettings } from '@/types'

type Theme = 'light' | 'dark' | 'system'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { theme, setTheme } = useThemeStore()
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore()
  const { enabled: energySaverEnabled, setEnabled: setEnergySaverEnabled, idleTimeoutSeconds, setIdleTimeout } = useEnergySaverStore()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings,
  })

  const [localSettings, setLocalSettings] = useState<Partial<DashboardSettings>>({})

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings)
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: (data: Partial<DashboardSettings>) => api.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const testDiscordMutation = useMutation({
    mutationFn: () => api.testDiscordNotification(),
  })

  const updateField = <K extends keyof DashboardSettings>(
    field: K,
    value: DashboardSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    saveMutation.mutate(localSettings)
  }

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure dashboard preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : saveMutation.isSuccess ? (
            <CheckCircle className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Theme</label>
                <div className="flex gap-2 mt-2">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                        theme === option.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Compact Sidebar</div>
                  <div className="text-sm text-muted-foreground">
                    Collapse sidebar by default
                  </div>
                </div>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors',
                    sidebarCollapsed ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      sidebarCollapsed ? 'translate-x-6' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Energy Saver */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Energy Saver
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Enable Energy Saver</div>
                  <div className="text-sm text-muted-foreground">
                    Show a dark screen after inactivity to reduce monitor energy consumption (Fineco style)
                  </div>
                </div>
                <button
                  onClick={() => setEnergySaverEnabled(!energySaverEnabled)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors',
                    energySaverEnabled ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      energySaverEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
              {energySaverEnabled && (
                <div>
                  <label className="text-sm font-medium">Idle Timeout (seconds)</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Time of inactivity before energy saver activates
                  </p>
                  <Input
                    type="number"
                    min={30}
                    max={600}
                    value={idleTimeoutSeconds}
                    onChange={(e) => setIdleTimeout(Number(e.target.value))}
                    className="w-32"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Retention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Runs Retention (days)</label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={localSettings.retention_days ?? 30}
                    onChange={(e) => updateField('retention_days', Number(e.target.value))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: 30 days
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Events Retention (days)</label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={localSettings.events_retention_days ?? 30}
                    onChange={(e) => updateField('events_retention_days', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Alerts Retention (days)</label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={localSettings.alerts_retention_days ?? 30}
                    onChange={(e) => updateField('alerts_retention_days', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refresh Intervals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Refresh Intervals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Stats Refresh (seconds)</label>
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    value={localSettings.stats_refresh_seconds ?? 30}
                    onChange={(e) => updateField('stats_refresh_seconds', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Events Refresh (seconds)</label>
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    value={localSettings.events_refresh_seconds ?? 15}
                    onChange={(e) => updateField('events_refresh_seconds', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Health Check (seconds)</label>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={localSettings.health_refresh_seconds ?? 30}
                    onChange={(e) => updateField('health_refresh_seconds', Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discord Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Discord Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Alerts Webhook URL</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Receive critical alerts and notifications
                </p>
                <Input
                  type="url"
                  value={localSettings.discord_alerts_webhook ?? ''}
                  onChange={(e) => updateField('discord_alerts_webhook', e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Summary Webhook URL</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Receive weekly summary reports (separate channel)
                </p>
                <Input
                  type="url"
                  value={localSettings.discord_summary_webhook ?? ''}
                  onChange={(e) => updateField('discord_summary_webhook', e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                />
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => testDiscordMutation.mutate()}
                  disabled={testDiscordMutation.isPending || !localSettings.discord_alerts_webhook}
                >
                  {testDiscordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Test Alert Webhook
                </Button>
                {testDiscordMutation.isSuccess && (
                  <Badge variant="success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Test sent successfully
                  </Badge>
                )}
                {testDiscordMutation.isError && (
                  <Badge variant="destructive">Test failed</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alert Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alert Thresholds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Failed Runs Threshold</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Alert when failed runs exceed this count
                  </p>
                  <Input
                    type="number"
                    min={1}
                    value={localSettings.alert_failed_threshold ?? 5}
                    onChange={(e) => updateField('alert_failed_threshold', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Error Rate Threshold (%)</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Alert when error rate exceeds this percentage
                  </p>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={localSettings.alert_error_rate_threshold ?? 10}
                    onChange={(e) =>
                      updateField('alert_error_rate_threshold', Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Queue Backlog Threshold</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Alert when pending tasks exceed this count
                  </p>
                  <Input
                    type="number"
                    min={1}
                    value={localSettings.alert_queue_threshold ?? 100}
                    onChange={(e) => updateField('alert_queue_threshold', Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 pt-4 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.notify_on_failure ?? true}
                    onChange={(e) => updateField('notify_on_failure', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Notify on run failure</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.notify_on_completion ?? false}
                    onChange={(e) => updateField('notify_on_completion', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Notify on run completion</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSettings.weekly_summary_enabled ?? true}
                    onChange={(e) => updateField('weekly_summary_enabled', e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Enable weekly summary</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
