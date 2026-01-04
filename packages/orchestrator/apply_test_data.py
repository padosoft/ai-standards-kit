#!/usr/bin/env python3
"""Apply test data migration to ai-enterprise database."""

import mysql.connector
from datetime import datetime, timedelta
import json

conn = mysql.connector.connect(
    host='localhost',
    port=3306,
    user='root',
    password='',
    database='ai-enterprise'
)
cursor = conn.cursor()

print('Applying migration 004 (test data)...')

now = datetime.now()

# Sample runs
runs = [
    ('run-001-test', 'Implement user authentication with JWT tokens', 'safe', 'done', 5, 5, now - timedelta(hours=2), now - timedelta(hours=1), now - timedelta(hours=1), None),
    ('run-002-test', 'Add pagination to products API endpoint', 'safe', 'done', 3, 3, now - timedelta(hours=4), now - timedelta(hours=3), now - timedelta(hours=3), None),
    ('run-003-test', 'Refactor database queries for better performance', 'safe', 'done', 4, 4, now - timedelta(hours=6), now - timedelta(hours=5), now - timedelta(hours=5), None),
    ('run-004-test', 'Create unit tests for OrderService', 'safe', 'done', 3, 3, now - timedelta(hours=8), now - timedelta(hours=7), now - timedelta(hours=7), None),
    ('run-005-test', 'Implement email notification system', 'safe', 'done', 6, 6, now - timedelta(days=1), now - timedelta(hours=23), now - timedelta(hours=23), None),
    ('run-006-test', 'Build GraphQL API for mobile app', 'safe', 'running', 5, 2, now - timedelta(minutes=30), now, None, None),
    ('run-007-test', 'Migrate database schema to v2', 'safe', 'running', 4, 1, now - timedelta(minutes=15), now, None, None),
    ('run-008-test', 'Setup CI/CD pipeline with GitHub Actions', 'safe', 'pending', 0, 0, now - timedelta(minutes=5), now - timedelta(minutes=5), None, None),
    ('run-009-test', 'Deploy to production with zero downtime', 'strict', 'failed', 4, 2, now - timedelta(hours=10), now - timedelta(hours=9), now - timedelta(hours=9), 'Connection refused: Unable to connect to production database'),
    ('run-010-test', 'Generate API documentation from OpenAPI spec', 'safe', 'failed', 3, 1, now - timedelta(hours=12), now - timedelta(hours=11), now - timedelta(hours=11), 'Invalid OpenAPI specification: missing required field "paths"'),
    ('run-011-test', 'Refactor legacy payment module', 'safe', 'cancelled', 5, 1, now - timedelta(hours=14), now - timedelta(hours=13), now - timedelta(hours=13), 'Cancelled by user'),
    ('run-012-test', 'Add caching layer for API responses', 'safe', 'done', 4, 4, now - timedelta(days=2), now - timedelta(hours=47), now - timedelta(hours=47), None),
    ('run-013-test', 'Implement rate limiting middleware', 'safe', 'done', 3, 3, now - timedelta(days=2), now - timedelta(hours=46), now - timedelta(hours=46), None),
    ('run-014-test', 'Create admin dashboard components', 'safe', 'done', 7, 7, now - timedelta(days=3), now - timedelta(hours=70), now - timedelta(hours=70), None),
    ('run-015-test', 'Setup monitoring with Prometheus', 'safe', 'done', 4, 4, now - timedelta(days=3), now - timedelta(hours=69), now - timedelta(hours=69), None),
]

for r in runs:
    cursor.execute('''
        INSERT INTO runs (run_id, task, mode, status, total_steps, completed_steps, created_at, updated_at, completed_at, error_message)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE run_id=run_id
    ''', r)

print('  - 15 runs inserted')

# Sample steps
steps = [
    ('run-001-test', 1, 'researcher', 'Analyze existing auth patterns', 'accepted', 0, 3, now - timedelta(hours=2), now - timedelta(hours=2), now - timedelta(minutes=115)),
    ('run-001-test', 2, 'planner', 'Design JWT authentication flow', 'accepted', 0, 3, now - timedelta(minutes=115), now - timedelta(minutes=115), now - timedelta(minutes=100)),
    ('run-001-test', 3, 'coder', 'Implement JWTService class', 'accepted', 1, 3, now - timedelta(minutes=100), now - timedelta(minutes=100), now - timedelta(minutes=80)),
    ('run-001-test', 4, 'coder', 'Create auth middleware', 'accepted', 0, 3, now - timedelta(minutes=80), now - timedelta(minutes=80), now - timedelta(minutes=70)),
    ('run-001-test', 5, 'reviewer', 'Review and test auth implementation', 'accepted', 0, 3, now - timedelta(minutes=70), now - timedelta(minutes=70), now - timedelta(minutes=60)),
    ('run-006-test', 1, 'researcher', 'Analyze GraphQL requirements', 'accepted', 0, 3, now - timedelta(minutes=30), now - timedelta(minutes=30), now - timedelta(minutes=25)),
    ('run-006-test', 2, 'planner', 'Design GraphQL schema', 'accepted', 0, 3, now - timedelta(minutes=25), now - timedelta(minutes=25), now - timedelta(minutes=15)),
    ('run-006-test', 3, 'coder', 'Implement resolvers', 'running', 0, 3, now - timedelta(minutes=15), now - timedelta(minutes=15), None),
    ('run-006-test', 4, 'coder', 'Add mutations', 'pending', 0, 3, now - timedelta(minutes=15), None, None),
    ('run-006-test', 5, 'reviewer', 'Test GraphQL API', 'pending', 0, 3, now - timedelta(minutes=15), None, None),
    ('run-009-test', 1, 'researcher', 'Analyze production environment', 'accepted', 0, 3, now - timedelta(hours=10), now - timedelta(hours=10), now - timedelta(minutes=595)),
    ('run-009-test', 2, 'planner', 'Create deployment plan', 'accepted', 0, 3, now - timedelta(minutes=595), now - timedelta(minutes=595), now - timedelta(minutes=580)),
    ('run-009-test', 3, 'coder', 'Setup blue-green deployment', 'rejected', 3, 3, now - timedelta(minutes=580), now - timedelta(minutes=580), now - timedelta(minutes=540)),
    ('run-009-test', 4, 'reviewer', 'Verify deployment', 'skipped', 0, 3, now - timedelta(minutes=540), None, None),
]

for s in steps:
    cursor.execute('''
        INSERT INTO steps (run_id, step_id, agent, goal, status, retry_count, max_retries, created_at, started_at, completed_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE run_id=run_id
    ''', s)

print('  - 14 steps inserted')

# Sample webhooks
webhooks = [
    ('wh-001-test', 'Slack Notifications', 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX', 'slack-secret-123', '["run.completed", "run.failed"]', True, 0, now - timedelta(hours=1), now - timedelta(days=7)),
    ('wh-002-test', 'CI/CD Trigger', 'https://api.github.com/repos/org/repo/dispatches', 'github-pat-xxx', '["run.completed"]', True, 0, now - timedelta(hours=2), now - timedelta(days=14)),
    ('wh-003-test', 'Monitoring Alert', 'https://monitoring.example.com/webhook', None, '["run.failed", "step.rejected"]', True, 2, now - timedelta(hours=12), now - timedelta(days=30)),
    ('wh-004-test', 'Old Integration (disabled)', 'https://old-service.example.com/hook', None, '["run.created"]', False, 5, now - timedelta(days=5), now - timedelta(days=60)),
]

for w in webhooks:
    cursor.execute('''
        INSERT INTO webhooks (webhook_id, name, url, secret, events, enabled, failure_count, last_triggered_at, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE webhook_id=webhook_id
    ''', w)

print('  - 4 webhooks inserted')

# Sample alerts
alerts = [
    ('alert-001-test', 'critical', 'Production Deployment Failed', 'Run run-009-test failed: Connection refused to production database. Immediate attention required.', 'orchestrator', 'run-009-test', False, now - timedelta(hours=9)),
    ('alert-002-test', 'critical', 'API Documentation Generation Failed', 'Run run-010-test failed: Invalid OpenAPI specification', 'orchestrator', 'run-010-test', False, now - timedelta(hours=11)),
    ('alert-003-test', 'warning', 'High Retry Rate Detected', 'Step retry rate exceeded 20% in the last hour. Consider reviewing agent prompts.', 'monitor', None, False, now - timedelta(hours=3)),
    ('alert-004-test', 'warning', 'Webhook Delivery Failures', 'Webhook "Monitoring Alert" has failed 2 consecutive times.', 'webhook-dispatcher', None, True, now - timedelta(hours=12)),
    ('alert-005-test', 'info', 'New Agent Configuration Applied', 'Agent "coder" configuration updated with new constraints.', 'admin', None, True, now - timedelta(days=1)),
    ('alert-006-test', 'info', 'Scheduled Maintenance Completed', 'Database optimization completed successfully.', 'system', None, True, now - timedelta(days=2)),
]

for a in alerts:
    cursor.execute('''
        INSERT INTO alerts (alert_id, severity, title, message, source, run_id, acknowledged, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE alert_id=alert_id
    ''', a)

print('  - 6 alerts inserted')

# Sample events
events = [
    ('run-001-test', None, 'run.created', json.dumps({'task': 'Implement user authentication with JWT tokens', 'mode': 'safe'}), now - timedelta(hours=2)),
    ('run-001-test', 1, 'step.started', json.dumps({'agent': 'researcher', 'goal': 'Analyze existing auth patterns'}), now - timedelta(hours=2)),
    ('run-001-test', 1, 'step.accepted', json.dumps({'duration_seconds': 300}), now - timedelta(minutes=115)),
    ('run-001-test', 2, 'step.started', json.dumps({'agent': 'planner'}), now - timedelta(minutes=115)),
    ('run-001-test', 2, 'step.accepted', json.dumps({'duration_seconds': 900}), now - timedelta(minutes=100)),
    ('run-001-test', 3, 'step.started', json.dumps({'agent': 'coder'}), now - timedelta(minutes=100)),
    ('run-001-test', 3, 'step.rejected', json.dumps({'error': 'Missing import statement', 'attempt': 1}), now - timedelta(minutes=90)),
    ('run-001-test', 3, 'step.started', json.dumps({'agent': 'coder', 'retry': True}), now - timedelta(minutes=90)),
    ('run-001-test', 3, 'step.accepted', json.dumps({'duration_seconds': 1200}), now - timedelta(minutes=80)),
    ('run-001-test', 4, 'step.started', json.dumps({'agent': 'coder'}), now - timedelta(minutes=80)),
    ('run-001-test', 4, 'step.accepted', json.dumps({'duration_seconds': 600}), now - timedelta(minutes=70)),
    ('run-001-test', 5, 'step.started', json.dumps({'agent': 'reviewer'}), now - timedelta(minutes=70)),
    ('run-001-test', 5, 'step.accepted', json.dumps({'duration_seconds': 600, 'tests_passed': True}), now - timedelta(minutes=60)),
    ('run-001-test', None, 'run.completed', json.dumps({'success': True, 'total_duration_seconds': 3600}), now - timedelta(minutes=60)),
    ('run-006-test', None, 'run.created', json.dumps({'task': 'Build GraphQL API for mobile app', 'mode': 'safe'}), now - timedelta(minutes=30)),
    ('run-006-test', 1, 'step.started', json.dumps({'agent': 'researcher'}), now - timedelta(minutes=30)),
    ('run-006-test', 1, 'step.accepted', json.dumps({'duration_seconds': 300}), now - timedelta(minutes=25)),
    ('run-006-test', 2, 'step.started', json.dumps({'agent': 'planner'}), now - timedelta(minutes=25)),
    ('run-006-test', 2, 'step.accepted', json.dumps({'duration_seconds': 600}), now - timedelta(minutes=15)),
    ('run-006-test', 3, 'step.started', json.dumps({'agent': 'coder'}), now - timedelta(minutes=15)),
    ('run-009-test', None, 'run.created', json.dumps({'task': 'Deploy to production with zero downtime', 'mode': 'strict'}), now - timedelta(hours=10)),
    ('run-009-test', 3, 'step.rejected', json.dumps({'error': 'Connection refused', 'attempt': 3}), now - timedelta(hours=9)),
    ('run-009-test', None, 'run.failed', json.dumps({'error': 'Connection refused: Unable to connect to production database'}), now - timedelta(hours=9)),
]

for e in events:
    cursor.execute('''
        INSERT INTO events (run_id, step_id, event_type, event_data, created_at)
        VALUES (%s, %s, %s, %s, %s)
    ''', e)

print('  - 23 events inserted')

# Sample artifacts
artifacts = [
    ('run-001-test', 3, 'jwt-service.patch', '.ai/artifacts/run-001-test/jwt-service.patch', 'text/x-diff', 2048, 'abc123def456', now - timedelta(minutes=80)),
    ('run-001-test', 4, 'auth-middleware.patch', '.ai/artifacts/run-001-test/auth-middleware.patch', 'text/x-diff', 1536, 'def456ghi789', now - timedelta(minutes=70)),
    ('run-001-test', 5, 'test-results.json', '.ai/artifacts/run-001-test/test-results.json', 'application/json', 4096, 'ghi789jkl012', now - timedelta(minutes=60)),
]

for a in artifacts:
    cursor.execute('''
        INSERT INTO artifacts (run_id, step_id, name, path, content_type, size_bytes, sha256, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE run_id=run_id
    ''', a)

print('  - 3 artifacts inserted')

conn.commit()

# Verify
cursor.execute('SELECT COUNT(*) FROM runs WHERE run_id LIKE "%test%"')
print(f'\nTotal test runs: {cursor.fetchone()[0]}')
cursor.execute('SELECT COUNT(*) FROM steps WHERE run_id LIKE "%test%"')
print(f'Total test steps: {cursor.fetchone()[0]}')
cursor.execute('SELECT COUNT(*) FROM events WHERE run_id LIKE "%test%"')
print(f'Total test events: {cursor.fetchone()[0]}')
cursor.execute('SELECT COUNT(*) FROM webhooks')
print(f'Total webhooks: {cursor.fetchone()[0]}')
cursor.execute('SELECT COUNT(*) FROM alerts')
print(f'Total alerts: {cursor.fetchone()[0]}')
cursor.execute('SELECT COUNT(*) FROM settings')
print(f'Total settings: {cursor.fetchone()[0]}')

print('\nMigration 004 done!')

cursor.close()
conn.close()
