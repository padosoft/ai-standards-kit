-- Dashboard extensions for ai-orchestrator
-- Apply after mysql_002_enterprise.sql

USE ai_orch;

-- ============================================================================
-- WEBHOOKS: External notification endpoints
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhooks (
  webhook_id        VARCHAR(40)   NOT NULL,
  name              VARCHAR(100)  NOT NULL,
  url               VARCHAR(500)  NOT NULL,
  secret            VARCHAR(200)  NULL,       -- optional: for signature verification
  events            JSON          NOT NULL,   -- list of event types to trigger on
  enabled           BOOLEAN       NOT NULL DEFAULT TRUE,
  failure_count     INT           NOT NULL DEFAULT 0,
  last_triggered_at DATETIME(6)   NULL,
  created_at        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (webhook_id),
  INDEX idx_webhooks_enabled (enabled)
) ENGINE=InnoDB;

-- ============================================================================
-- ALERTS: System alerts and notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS alerts (
  alert_id      VARCHAR(40)   NOT NULL,
  severity      VARCHAR(20)   NOT NULL,  -- 'critical', 'warning', 'info'
  title         VARCHAR(200)  NOT NULL,
  message       TEXT          NOT NULL,
  source        VARCHAR(100)  NULL,      -- what generated this alert
  run_id        VARCHAR(40)   NULL,      -- optional: related run
  acknowledged  BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (alert_id),
  INDEX idx_alerts_severity (severity, acknowledged, created_at),
  INDEX idx_alerts_created (created_at),
  INDEX idx_alerts_run (run_id)
) ENGINE=InnoDB;

-- ============================================================================
-- SETTINGS: Dashboard configuration settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
  setting_key   VARCHAR(100)  NOT NULL,
  setting_value TEXT          NOT NULL,  -- JSON encoded
  updated_at    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB;

-- ============================================================================
-- Insert default settings
-- ============================================================================
INSERT INTO settings (setting_key, setting_value) VALUES
('retention_days', '30'),
('events_retention_days', '30'),
('alerts_retention_days', '30'),
('stats_refresh_seconds', '30'),
('events_refresh_seconds', '15'),
('health_refresh_seconds', '30'),
('discord_alerts_webhook', '""'),
('discord_summary_webhook', '""'),
('alert_failed_threshold', '5'),
('alert_error_rate_threshold', '10'),
('alert_queue_threshold', '100'),
('notify_on_failure', 'true'),
('notify_on_completion', 'false'),
('weekly_summary_enabled', 'true')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP(6);

-- ============================================================================
-- Add cancelled status to runs if not exists
-- ============================================================================
-- Note: If enum doesn't support 'cancelled', you may need to alter the column
-- ALTER TABLE runs MODIFY status ENUM('pending', 'running', 'done', 'failed', 'cancelled') NOT NULL;
