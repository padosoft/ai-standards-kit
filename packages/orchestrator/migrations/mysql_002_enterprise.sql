-- Enterprise extensions for ai-orchestrator
-- Apply after mysql_001_init.sql

USE ai_orch;

-- ============================================================================
-- GUIDELINES: Parlant-style behavioral guidelines as structured entities
-- ============================================================================
CREATE TABLE IF NOT EXISTS guidelines (
  guideline_id  VARCHAR(40)   NOT NULL,
  category      VARCHAR(50)   NOT NULL,  -- 'behavior', 'security', 'quality', 'custom'
  priority      INT           NOT NULL DEFAULT 100,  -- lower = higher priority
  name          VARCHAR(100)  NOT NULL,
  description   TEXT          NOT NULL,
  condition_json JSON         NULL,      -- optional: when this guideline applies
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    DATETIME(6)   NOT NULL,
  updated_at    DATETIME(6)   NOT NULL,
  PRIMARY KEY (guideline_id),
  INDEX idx_guidelines_category (category, priority),
  INDEX idx_guidelines_active (is_active, priority)
) ENGINE=InnoDB;

-- ============================================================================
-- AGENT_CONFIGS: Agent-specific configurations and contracts
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_configs (
  agent_name        VARCHAR(40)   NOT NULL,
  display_name      VARCHAR(100)  NOT NULL,
  description       TEXT          NULL,
  default_contract  JSON          NOT NULL,
  capabilities      JSON          NULL,     -- what this agent can do
  max_retries       INT           NOT NULL DEFAULT 3,
  timeout_seconds   INT           NOT NULL DEFAULT 300,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        DATETIME(6)   NOT NULL,
  updated_at        DATETIME(6)   NOT NULL,
  PRIMARY KEY (agent_name)
) ENGINE=InnoDB;

-- ============================================================================
-- EVENTS: Detailed audit trail for observability
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  event_id      BIGINT        NOT NULL AUTO_INCREMENT,
  run_id        VARCHAR(40)   NULL,
  step_id       INT           NULL,
  event_type    VARCHAR(50)   NOT NULL,  -- 'run.created', 'step.started', 'step.rejected', etc.
  event_data    JSON          NULL,
  created_at    DATETIME(6)   NOT NULL,
  PRIMARY KEY (event_id),
  INDEX idx_events_run (run_id, created_at),
  INDEX idx_events_type (event_type, created_at),
  INDEX idx_events_created (created_at)
) ENGINE=InnoDB;

-- ============================================================================
-- POLICIES: Security and validation policies
-- ============================================================================
CREATE TABLE IF NOT EXISTS policies (
  policy_id     VARCHAR(40)   NOT NULL,
  policy_type   VARCHAR(50)   NOT NULL,  -- 'command_block', 'artifact_limit', 'path_restrict'
  name          VARCHAR(100)  NOT NULL,
  config_json   JSON          NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    DATETIME(6)   NOT NULL,
  PRIMARY KEY (policy_id),
  INDEX idx_policies_type (policy_type, is_active)
) ENGINE=InnoDB;

-- ============================================================================
-- Alter existing tables for enterprise features
-- ============================================================================

-- Add retry tracking and timeout to steps
ALTER TABLE steps
  ADD COLUMN retry_count INT NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN max_retries INT NOT NULL DEFAULT 3 AFTER retry_count,
  ADD COLUMN timeout_at DATETIME(6) NULL AFTER updated_at,
  ADD COLUMN started_at DATETIME(6) NULL AFTER created_at,
  ADD COLUMN completed_at DATETIME(6) NULL AFTER started_at;

-- Add error tracking to runs
ALTER TABLE runs
  ADD COLUMN error_message TEXT NULL AFTER constraints_json,
  ADD COLUMN completed_at DATETIME(6) NULL AFTER updated_at,
  ADD COLUMN total_steps INT NOT NULL DEFAULT 0 AFTER mode,
  ADD COLUMN completed_steps INT NOT NULL DEFAULT 0 AFTER total_steps;

-- ============================================================================
-- Insert default guidelines (Parlant-style)
-- ============================================================================
INSERT INTO guidelines (guideline_id, category, priority, name, description, created_at, updated_at) VALUES
('g-behavior-001', 'behavior', 10, 'contract_compliance',
 'Always follow step contracts strictly. If validation fails, analyze the error and retry with exact compliance. Do not bloat payload with unnecessary context.',
 NOW(6), NOW(6)),
('g-behavior-002', 'behavior', 20, 'minimal_context',
 'Keep each step focused on its specific goal. Minimize context passed between steps. Each step should be self-contained.',
 NOW(6), NOW(6)),
('g-behavior-003', 'behavior', 30, 'deterministic_changes',
 'Prefer minimal, deterministic changes. Avoid large refactors unless explicitly requested. Small focused diffs are better than comprehensive rewrites.',
 NOW(6), NOW(6)),
('g-quality-001', 'quality', 40, 'test_verification',
 'If tests are available, always run them before marking a coding step complete. A passing test suite is required for reviewer approval.',
 NOW(6), NOW(6)),
('g-security-001', 'security', 5, 'command_safety',
 'Never execute destructive commands (rm -rf, curl|bash, etc.). Always validate artifact paths stay within repo boundaries.',
 NOW(6), NOW(6)),
('g-security-002', 'security', 6, 'secret_protection',
 'Never include secrets, API keys, or credentials in artifacts or output. Sanitize all logs before storage.',
 NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE updated_at = NOW(6);

-- ============================================================================
-- Insert default agent configurations
-- ============================================================================
INSERT INTO agent_configs (agent_name, display_name, description, default_contract, capabilities, max_retries, timeout_seconds, created_at, updated_at) VALUES
('researcher', 'Researcher', 'Analyzes repo structure, docs, and code to extract constraints and facts',
 '{"must_have": ["summary"], "requires_patch": false, "requires_tests": false}',
 '["read_files", "search_code", "analyze_structure"]',
 3, 180, NOW(6), NOW(6)),
('coder', 'Coder', 'Implements minimal correct changes and produces patch files',
 '{"must_have": ["summary"], "requires_patch": true, "requires_tests": false}',
 '["read_files", "write_files", "run_commands", "generate_patch"]',
 3, 300, NOW(6), NOW(6)),
('reviewer', 'Reviewer', 'Reviews changes, runs tests, validates correctness',
 '{"must_have": ["summary"], "requires_patch": false, "requires_tests": true}',
 '["read_files", "run_tests", "analyze_code"]',
 2, 600, NOW(6), NOW(6)),
('planner', 'Planner', 'Decomposes complex tasks into actionable steps',
 '{"must_have": ["summary", "plan"], "requires_patch": false, "requires_tests": false}',
 '["read_files", "analyze_requirements"]',
 2, 120, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE updated_at = NOW(6);

-- ============================================================================
-- Insert default security policies
-- ============================================================================
INSERT INTO policies (policy_id, policy_type, name, config_json, is_active, created_at) VALUES
('pol-cmd-001', 'command_block', 'Block Destructive Commands',
 '{"blocked_patterns": ["rm -rf", "rm -r /", "curl.*\\\\|.*bash", "wget.*\\\\|.*sh", "dd if=", "> /dev/", "mkfs", ":(){ :|:& };:", "chmod -R 777"]}',
 TRUE, NOW(6)),
('pol-artifact-001', 'artifact_limit', 'Artifact Size Limits',
 '{"max_patch_bytes": 2097152, "max_log_bytes": 1048576, "max_total_bytes": 10485760}',
 TRUE, NOW(6)),
('pol-path-001', 'path_restrict', 'Path Restrictions',
 '{"allowed_prefixes": ["./.ai/tmp/", "./src/", "./tests/"], "blocked_patterns": ["../"]}',
 TRUE, NOW(6))
ON DUPLICATE KEY UPDATE config_json = VALUES(config_json);
