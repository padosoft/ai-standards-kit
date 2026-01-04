/**
 * Global application store using Zustand
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { DashboardSettings, Alert, SSEEvent } from '@/types'

// =============================================================================
// Theme Store
// =============================================================================

interface ThemeState {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme })
        // Apply theme to document
        const root = document.documentElement
        if (theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.toggle('dark', prefersDark)
        } else {
          root.classList.toggle('dark', theme === 'dark')
        }
      },
    }),
    {
      name: 'ai-dashboard-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// =============================================================================
// Settings Store
// =============================================================================

interface SettingsState {
  settings: DashboardSettings
  isLoading: boolean
  updateSettings: (settings: Partial<DashboardSettings>) => void
  setLoading: (loading: boolean) => void
}

const defaultSettings: DashboardSettings = {
  theme: 'system',
  refresh_interval_seconds: 30,
  retention_days: 30,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notifications: {
    browser_notifications: true,
    sound_enabled: false,
    notify_on_error: true,
    notify_on_completion: false,
  },
  discord: {
    enabled: false,
    weekly_summary_enabled: false,
    weekly_summary_day: 'monday',
    weekly_summary_time: '09:00',
  },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      isLoading: false,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'ai-dashboard-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// =============================================================================
// Notifications Store
// =============================================================================

interface NotificationsState {
  alerts: Alert[]
  unreadCount: number
  addAlert: (alert: Alert) => void
  acknowledgeAlert: (alertId: string) => void
  clearAll: () => void
  setAlerts: (alerts: Alert[]) => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  alerts: [],
  unreadCount: 0,
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 100), // Keep last 100
      unreadCount: state.unreadCount + 1,
    })),
  acknowledgeAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.alert_id === alertId ? { ...a, acknowledged: true } : a
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  clearAll: () => set({ alerts: [], unreadCount: 0 }),
  setAlerts: (alerts) =>
    set({
      alerts,
      unreadCount: alerts.filter((a) => !a.acknowledged).length,
    }),
}))

// =============================================================================
// Real-time Store (SSE)
// =============================================================================

interface RealtimeState {
  connected: boolean
  lastEvent: SSEEvent | null
  recentEvents: SSEEvent[]
  activeRuns: string[]
  setConnected: (connected: boolean) => void
  addEvent: (event: SSEEvent) => void
  addActiveRun: (runId: string) => void
  removeActiveRun: (runId: string) => void
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connected: true, // Default to true, will be updated by SSE connection
  lastEvent: null,
  recentEvents: [],
  activeRuns: [],
  setConnected: (connected) => set({ connected }),
  addEvent: (event) =>
    set((state) => ({
      lastEvent: event,
      recentEvents: [event, ...state.recentEvents].slice(0, 50),
    })),
  addActiveRun: (runId) =>
    set((state) => ({
      activeRuns: state.activeRuns.includes(runId)
        ? state.activeRuns
        : [...state.activeRuns, runId],
    })),
  removeActiveRun: (runId) =>
    set((state) => ({
      activeRuns: state.activeRuns.filter((id) => id !== runId),
    })),
}))

// =============================================================================
// UI Store
// =============================================================================

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'ai-dashboard-ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
