import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout'
import { OverviewPage } from '@/pages/OverviewPage'
import { RunsPage } from '@/pages/RunsPage'
import { RunDetailPage } from '@/pages/RunDetailPage'
import { MetricsPage } from '@/pages/MetricsPage'
import { AlertsPage } from '@/pages/AlertsPage'
import { EventsPage } from '@/pages/EventsPage'
import { LivePage } from '@/pages/LivePage'
import { GuidelinesPage } from '@/pages/GuidelinesPage'
import { WebhooksPage } from '@/pages/WebhooksPage'
import { HealthPage } from '@/pages/HealthPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/runs/:runId" element={<RunDetailPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/guidelines" element={<GuidelinesPage />} />
        <Route path="/webhooks" element={<WebhooksPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}
