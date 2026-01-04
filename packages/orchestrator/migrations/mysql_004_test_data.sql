-- Test data for AI Orchestrator Dashboard
-- Apply after mysql_003_dashboard.sql
-- This creates sample data to test the dashboard and APIs

USE ai_orch;

-- ============================================================================
-- SAMPLE RUNS (various statuses)
-- ============================================================================

INSERT INTO runs (run_id, task, mode, status, total_steps, completed_steps, created_at, updated_at, completed_at, error_message) VALUES
-- Completed runs
('run-001-test', 'Implement user authentication with JWT tokens', 'safe', 'done', 5, 5, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR), NULL),
('run-002-test', 'Add pagination to products API endpoint', 'safe', 'done', 3, 3, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR), NULL),
('run-003-test', 'Refactor database queries for better performance', 'safe', 'done', 4, 4, DATE_SUB(NOW(), INTERVAL 6 HOUR), DATE_SUB(NOW(), INTERVAL 5 HOUR), DATE_SUB(NOW(), INTERVAL 5 HOUR), NULL),
('run-004-test', 'Create unit tests for OrderService', 'safe', 'done', 3, 3, DATE_SUB(NOW(), INTERVAL 8 HOUR), DATE_SUB(NOW(), INTERVAL 7 HOUR), DATE_SUB(NOW(), INTERVAL 7 HOUR), NULL),
('run-005-test', 'Implement email notification system', 'safe', 'done', 6, 6, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 23 HOUR), DATE_SUB(NOW(), INTERVAL 23 HOUR), NULL),

-- Running runs
('run-006-test', 'Build GraphQL API for mobile app', 'safe', 'running', 5, 2, DATE_SUB(NOW(), INTERVAL 30 MINUTE), NOW(), NULL, NULL),
('run-007-test', 'Migrate database schema to v2', 'safe', 'running', 4, 1, DATE_SUB(NOW(), INTERVAL 15 MINUTE), NOW(), NULL, NULL),

-- Pending runs
('run-008-test', 'Setup CI/CD pipeline with GitHub Actions', 'safe', 'pending', 0, 0, DATE_SUB(NOW(), INTERVAL 5 MINUTE), DATE_SUB(NOW(), INTERVAL 5 MINUTE), NULL, NULL),

-- Failed runs
('run-009-test', 'Deploy to production with zero downtime', 'strict', 'failed', 4, 2, DATE_SUB(NOW(), INTERVAL 10 HOUR), DATE_SUB(NOW(), INTERVAL 9 HOUR), DATE_SUB(NOW(), INTERVAL 9 HOUR), 'Connection refused: Unable to connect to production database'),
('run-010-test', 'Generate API documentation from OpenAPI spec', 'safe', 'failed', 3, 1, DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_SUB(NOW(), INTERVAL 11 HOUR), DATE_SUB(NOW(), INTERVAL 11 HOUR), 'Invalid OpenAPI specification: missing required field "paths"'),

-- Cancelled run
('run-011-test', 'Refactor legacy payment module', 'safe', 'cancelled', 5, 1, DATE_SUB(NOW(), INTERVAL 14 HOUR), DATE_SUB(NOW(), INTERVAL 13 HOUR), DATE_SUB(NOW(), INTERVAL 13 HOUR), 'Cancelled by user'),

-- More completed runs for charts
('run-012-test', 'Add caching layer for API responses', 'safe', 'done', 4, 4, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 47 HOUR), DATE_SUB(NOW(), INTERVAL 47 HOUR), NULL),
('run-013-test', 'Implement rate limiting middleware', 'safe', 'done', 3, 3, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 46 HOUR), DATE_SUB(NOW(), INTERVAL 46 HOUR), NULL),
('run-014-test', 'Create admin dashboard components', 'safe', 'done', 7, 7, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 70 HOUR), DATE_SUB(NOW(), INTERVAL 70 HOUR), NULL),
('run-015-test', 'Setup monitoring with Prometheus', 'safe', 'done', 4, 4, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 69 HOUR), DATE_SUB(NOW(), INTERVAL 69 HOUR), NULL);


-- ============================================================================
-- SAMPLE STEPS
-- ============================================================================

-- Steps for run-001 (completed)
INSERT INTO steps (run_id, step_id, agent, goal, status, retry_count, max_retries, created_at, started_at, completed_at) VALUES
('run-001-test', 1, 'researcher', 'Analyze existing auth patterns', 'accepted', 0, 3, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 115 MINUTE)),
('run-001-test', 2, 'planner', 'Design JWT authentication flow', 'accepted', 0, 3, DATE_SUB(NOW(), INTERVAL 115 MINUTE), DATE_SUB(NOW(), INTERVAL 115 MINUTE), DATE_SUB(NOW(), INTERVAL 100 MINUTE)),
('run-001-test', 3, 'coder', 'Implement JWTService class', 'accepted', 1, 3, DATE_SUB(NOW(), INTERVAL 100 MINUTE), DATE_SUB(NOW(), INTERVAL 100 MINUTE), DATE_SUB(NOW(), INTERVAL 80 MINUTE)),
('run-001-test', 4, 'coder', 'Create auth middleware', 'accepted', 0, 3, DATE_SUB(NOW(), INTERVAL 80 MINUTE), DATE_SUB(NOW(), INTERVAL 80 MINUTE), DATE_SUB(NOW(), INTERVAL 70 MINUTE)),
('run-001-test', 5, 'reviewer', 'Review and test auth implementation', 'accepted', 0, 3, DATE_SUB(NOW(), INTERVAL 70 MINUTE), DATE_SUB(NOW(), INTERVAL 70 MINUTE), DATE_SUB(NOW(), INTERVAL 60 MINUTE));

-- Steps for run-006 (running)
INSERT INTO steps (run_id, step_id, agent, goal, status, retry_count, max_retries, created_at, started_at, completed_at) VALUES
('run-006-test', 1, 'researcher', 'Analyze GraphQL requirements', 'accepted', 0, 3, DATE_SUB(NOW(), INTERVAL 30 MINUTE), DATE_SUB(NOW(), INTERVAL 30 MINUTE), DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
('run-006-test', 2, 'planner', 'Design GraphQL schema', 'accepted', 0, 3, DATE_SUB(NOW(), INTERVAL 25 MINUTE), DATE_SUB(NOW(), INTERVAL 25 MINUTE), DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
('run-006-test', 3, 'coder', 'Implement resolvers', 'running', 0, 3, DATE_SUB(NOW(), INTERVAL 15 MINUTE), DATE_SUB(NOW(), INTERVAL 15 MINUTE), NULL),
('run-006-test', 4, 'coder', 'Add mutations', 'pending', 0, 3, DATE_SUB(NOW(), INTERVAL 15 MINUTE), NULL, NULL),
('run-006-test', 5, 'reviewer', 'Test GraphQL API', 'pending', 0, 3, DATE_SUB(NOW(), INTERVAL 15 MINUTE), NULL, NULL);

-- Steps for run-009 (failed)
INSERT INTO steps (run_id, step_id, agent, goal, status, retry_count, max_retries, created_at, started_at, completed_at) VALUES
('run-009-test', 1, 'researcher', 'Analyze production environment', 'accepted', 0, 3, DATE_SUB(NOW(), INTERVAL 10 HOUR), DATE_SUB(NOW(), INTERVAL 10 HOUR), DATE_SUB(NOW(), INTERVAL 595 MINUTE)),
('run-009-test', 2, 'planner', 'Create deployment plan', 'accepted', 0, 3, DATE_SUB(NOW(), INTERVAL 595 MINUTE), DATE_SUB(NOW(), INTERVAL 595 MINUTE), DATE_SUB(NOW(), INTERVAL 580 MINUTE)),
('run-009-test', 3, 'coder', 'Setup blue-green deployment', 'rejected', 3, 3, DATE_SUB(NOW(), INTERVAL 580 MINUTE), DATE_SUB(NOW(), INTERVAL 580 MINUTE), DATE_SUB(NOW(), INTERVAL 540 MINUTE)),
('run-009-test', 4, 'reviewer', 'Verify deployment', 'skipped', 0, 3, DATE_SUB(NOW(), INTERVAL 540 MINUTE), NULL, NULL);


-- ============================================================================
-- SAMPLE EVENTS
-- ============================================================================

INSERT INTO events (run_id, step_id, event_type, event_data, created_at) VALUES
-- Run 001 events
('run-001-test', NULL, 'run.created', '{"task": "Implement user authentication with JWT tokens", "mode": "safe"}', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('run-001-test', 1, 'step.started', '{"agent": "researcher", "goal": "Analyze existing auth patterns"}', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('run-001-test', 1, 'step.accepted', '{"duration_seconds": 300}', DATE_SUB(NOW(), INTERVAL 115 MINUTE)),
('run-001-test', 2, 'step.started', '{"agent": "planner"}', DATE_SUB(NOW(), INTERVAL 115 MINUTE)),
('run-001-test', 2, 'step.accepted', '{"duration_seconds": 900}', DATE_SUB(NOW(), INTERVAL 100 MINUTE)),
('run-001-test', 3, 'step.started', '{"agent": "coder"}', DATE_SUB(NOW(), INTERVAL 100 MINUTE)),
('run-001-test', 3, 'step.rejected', '{"error": "Missing import statement", "attempt": 1}', DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
('run-001-test', 3, 'step.started', '{"agent": "coder", "retry": true}', DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
('run-001-test', 3, 'step.accepted', '{"duration_seconds": 1200}', DATE_SUB(NOW(), INTERVAL 80 MINUTE)),
('run-001-test', 4, 'step.started', '{"agent": "coder"}', DATE_SUB(NOW(), INTERVAL 80 MINUTE)),
('run-001-test', 4, 'step.accepted', '{"duration_seconds": 600}', DATE_SUB(NOW(), INTERVAL 70 MINUTE)),
('run-001-test', 5, 'step.started', '{"agent": "reviewer"}', DATE_SUB(NOW(), INTERVAL 70 MINUTE)),
('run-001-test', 5, 'step.accepted', '{"duration_seconds": 600, "tests_passed": true}', DATE_SUB(NOW(), INTERVAL 60 MINUTE)),
('run-001-test', NULL, 'run.completed', '{"success": true, "total_duration_seconds": 3600}', DATE_SUB(NOW(), INTERVAL 60 MINUTE)),

-- Run 006 events (running)
('run-006-test', NULL, 'run.created', '{"task": "Build GraphQL API for mobile app", "mode": "safe"}', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('run-006-test', 1, 'step.started', '{"agent": "researcher"}', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('run-006-test', 1, 'step.accepted', '{"duration_seconds": 300}', DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
('run-006-test', 2, 'step.started', '{"agent": "planner"}', DATE_SUB(NOW(), INTERVAL 25 MINUTE)),
('run-006-test', 2, 'step.accepted', '{"duration_seconds": 600}', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
('run-006-test', 3, 'step.started', '{"agent": "coder"}', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),

-- Run 009 events (failed)
('run-009-test', NULL, 'run.created', '{"task": "Deploy to production with zero downtime", "mode": "strict"}', DATE_SUB(NOW(), INTERVAL 10 HOUR)),
('run-009-test', 3, 'step.rejected', '{"error": "Connection refused", "attempt": 3}', DATE_SUB(NOW(), INTERVAL 9 HOUR)),
('run-009-test', NULL, 'run.failed', '{"error": "Connection refused: Unable to connect to production database"}', DATE_SUB(NOW(), INTERVAL 9 HOUR));


-- ============================================================================
-- SAMPLE WEBHOOKS
-- ============================================================================

INSERT INTO webhooks (webhook_id, name, url, secret, events, enabled, failure_count, last_triggered_at, created_at) VALUES
('wh-001-test', 'Slack Notifications', 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX', 'slack-secret-123', '["run.completed", "run.failed"]', TRUE, 0, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 7 DAY)),
('wh-002-test', 'CI/CD Trigger', 'https://api.github.com/repos/org/repo/dispatches', 'github-pat-xxx', '["run.completed"]', TRUE, 0, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 14 DAY)),
('wh-003-test', 'Monitoring Alert', 'https://monitoring.example.com/webhook', NULL, '["run.failed", "step.rejected"]', TRUE, 2, DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_SUB(NOW(), INTERVAL 30 DAY)),
('wh-004-test', 'Old Integration (disabled)', 'https://old-service.example.com/hook', NULL, '["run.created"]', FALSE, 5, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 60 DAY));


-- ============================================================================
-- SAMPLE ALERTS
-- ============================================================================

INSERT INTO alerts (alert_id, severity, title, message, source, run_id, acknowledged, created_at) VALUES
('alert-001-test', 'critical', 'Production Deployment Failed', 'Run run-009-test failed: Connection refused to production database. Immediate attention required.', 'orchestrator', 'run-009-test', FALSE, DATE_SUB(NOW(), INTERVAL 9 HOUR)),
('alert-002-test', 'critical', 'API Documentation Generation Failed', 'Run run-010-test failed: Invalid OpenAPI specification', 'orchestrator', 'run-010-test', FALSE, DATE_SUB(NOW(), INTERVAL 11 HOUR)),
('alert-003-test', 'warning', 'High Retry Rate Detected', 'Step retry rate exceeded 20% in the last hour. Consider reviewing agent prompts.', 'monitor', NULL, FALSE, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
('alert-004-test', 'warning', 'Webhook Delivery Failures', 'Webhook "Monitoring Alert" has failed 2 consecutive times.', 'webhook-dispatcher', NULL, TRUE, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
('alert-005-test', 'info', 'New Agent Configuration Applied', 'Agent "coder" configuration updated with new constraints.', 'admin', NULL, TRUE, DATE_SUB(NOW(), INTERVAL 1 DAY)),
('alert-006-test', 'info', 'Scheduled Maintenance Completed', 'Database optimization completed successfully.', 'system', NULL, TRUE, DATE_SUB(NOW(), INTERVAL 2 DAY));


-- ============================================================================
-- SAMPLE ARTIFACTS
-- ============================================================================

INSERT INTO artifacts (run_id, step_id, name, path, content_type, size_bytes, sha256, created_at) VALUES
('run-001-test', 3, 'jwt-service.patch', '.ai/artifacts/run-001-test/jwt-service.patch', 'text/x-diff', 2048, 'abc123def456...', DATE_SUB(NOW(), INTERVAL 80 MINUTE)),
('run-001-test', 4, 'auth-middleware.patch', '.ai/artifacts/run-001-test/auth-middleware.patch', 'text/x-diff', 1536, 'def456ghi789...', DATE_SUB(NOW(), INTERVAL 70 MINUTE)),
('run-001-test', 5, 'test-results.json', '.ai/artifacts/run-001-test/test-results.json', 'application/json', 4096, 'ghi789jkl012...', DATE_SUB(NOW(), INTERVAL 60 MINUTE));


-- ============================================================================
-- UPDATE SETTINGS WITH TEST VALUES
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
-- SUMMARY
-- ============================================================================
-- Created:
-- - 15 runs (5 completed, 2 running, 1 pending, 2 failed, 1 cancelled, 4 historical)
-- - 14 steps with various statuses
-- - 23 events for audit trail
-- - 4 webhooks (3 active, 1 disabled)
-- - 6 alerts (2 critical, 2 warning, 2 info)
-- - 3 artifacts
-- - 14 settings

SELECT 'Test data inserted successfully!' AS message;
SELECT
    (SELECT COUNT(*) FROM runs WHERE run_id LIKE '%test%') AS runs,
    (SELECT COUNT(*) FROM steps WHERE run_id LIKE '%test%') AS steps,
    (SELECT COUNT(*) FROM events WHERE run_id LIKE '%test%') AS events,
    (SELECT COUNT(*) FROM webhooks WHERE webhook_id LIKE '%test%') AS webhooks,
    (SELECT COUNT(*) FROM alerts WHERE alert_id LIKE '%test%') AS alerts;
