-- Migration: Add parallel step execution support
-- Version: 0.4.0

USE ai_orch;

-- Add new columns to steps table for parallel execution
ALTER TABLE steps
  ADD COLUMN dependencies JSON DEFAULT NULL COMMENT 'List of step IDs this step depends on',
  ADD COLUMN parallel_group INT DEFAULT NULL COMMENT 'Steps in same group can run in parallel',
  ADD COLUMN started_at DATETIME(6) DEFAULT NULL COMMENT 'When step execution started',
  ADD COLUMN completed_at DATETIME(6) DEFAULT NULL COMMENT 'When step completed (accepted/rejected)',
  ADD COLUMN timeout_seconds INT DEFAULT 300 COMMENT 'Step timeout in seconds',
  ADD COLUMN retry_count INT DEFAULT 0 COMMENT 'Current retry count',
  ADD COLUMN max_retries INT DEFAULT 3 COMMENT 'Maximum retry attempts';

-- Add index for parallel group queries
CREATE INDEX idx_steps_parallel_group ON steps(run_id, parallel_group);

-- Add columns to runs table
ALTER TABLE runs
  ADD COLUMN total_steps INT DEFAULT 0 COMMENT 'Total number of steps in this run',
  ADD COLUMN completed_steps INT DEFAULT 0 COMMENT 'Number of completed steps',
  ADD COLUMN completed_at DATETIME(6) DEFAULT NULL COMMENT 'When run completed',
  ADD COLUMN error_message TEXT DEFAULT NULL COMMENT 'Error message if run failed';

-- Create webhooks configuration table
CREATE TABLE IF NOT EXISTS webhook_configs (
  webhook_id    VARCHAR(40)  NOT NULL,
  url           TEXT         NOT NULL,
  events        JSON         NOT NULL COMMENT 'List of event types to receive',
  secret        VARCHAR(255) DEFAULT NULL COMMENT 'HMAC secret for signature verification',
  retry_count   INT          DEFAULT 3,
  enabled       BOOLEAN      DEFAULT TRUE,
  created_at    DATETIME(6)  NOT NULL,
  updated_at    DATETIME(6)  NOT NULL,
  PRIMARY KEY (webhook_id),
  INDEX idx_webhook_enabled (enabled)
) ENGINE=InnoDB;

-- Create webhook delivery log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  delivery_id   VARCHAR(40)  NOT NULL,
  webhook_id    VARCHAR(40)  NOT NULL,
  event_type    VARCHAR(50)  NOT NULL,
  run_id        VARCHAR(40)  DEFAULT NULL,
  step_id       INT          DEFAULT NULL,
  payload       JSON         NOT NULL,
  status_code   INT          DEFAULT NULL,
  response_body TEXT         DEFAULT NULL,
  attempts      INT          DEFAULT 0,
  success       BOOLEAN      DEFAULT FALSE,
  created_at    DATETIME(6)  NOT NULL,
  delivered_at  DATETIME(6)  DEFAULT NULL,
  PRIMARY KEY (delivery_id),
  INDEX idx_delivery_webhook (webhook_id),
  INDEX idx_delivery_run (run_id),
  INDEX idx_delivery_created (created_at),
  CONSTRAINT fk_delivery_webhook
    FOREIGN KEY (webhook_id) REFERENCES webhook_configs(webhook_id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create guidelines table for dynamic governance rules
CREATE TABLE IF NOT EXISTS guidelines (
  guideline_id  VARCHAR(40)  NOT NULL,
  category      ENUM('behavior','security','quality','custom') NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT         NOT NULL,
  condition_    JSON         DEFAULT NULL COMMENT 'When guideline applies',
  action        JSON         NOT NULL COMMENT 'What the guideline enforces',
  priority      INT          DEFAULT 0,
  enabled       BOOLEAN      DEFAULT TRUE,
  created_at    DATETIME(6)  NOT NULL,
  updated_at    DATETIME(6)  NOT NULL,
  PRIMARY KEY (guideline_id),
  INDEX idx_guideline_category (category, enabled),
  INDEX idx_guideline_priority (priority)
) ENGINE=InnoDB;

-- Create agent configurations table
CREATE TABLE IF NOT EXISTS agent_configs (
  agent_id      VARCHAR(40)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT         DEFAULT NULL,
  max_retries   INT          DEFAULT 3,
  timeout_seconds INT        DEFAULT 300,
  contract_overrides JSON    DEFAULT NULL,
  enabled       BOOLEAN      DEFAULT TRUE,
  created_at    DATETIME(6)  NOT NULL,
  updated_at    DATETIME(6)  NOT NULL,
  PRIMARY KEY (agent_id),
  INDEX idx_agent_enabled (enabled)
) ENGINE=InnoDB;

-- Create events/audit log table
CREATE TABLE IF NOT EXISTS events (
  event_id      VARCHAR(40)  NOT NULL,
  run_id        VARCHAR(40)  DEFAULT NULL,
  step_id       INT          DEFAULT NULL,
  event_type    VARCHAR(50)  NOT NULL,
  event_data    JSON         DEFAULT NULL,
  created_at    DATETIME(6)  NOT NULL,
  PRIMARY KEY (event_id),
  INDEX idx_events_run (run_id),
  INDEX idx_events_type (event_type),
  INDEX idx_events_created (created_at)
) ENGINE=InnoDB;
