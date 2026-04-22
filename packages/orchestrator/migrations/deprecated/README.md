# Deprecated Migrations

This folder contains obsolete migration files that should **NOT** be applied.

## Files

### mysql_002_parallel_steps.sql

**Status**: Deprecated (do not use)

**Reason**: This migration conflicts with `mysql_002_enterprise.sql` which supersedes it. Both migrations attempt to:
- Add the same columns to `steps` table (`started_at`, `completed_at`, `retry_count`, `max_retries`)
- Add the same columns to `runs` table (`completed_at`, `total_steps`, `completed_steps`, `error_message`)
- Create the same tables (`guidelines`, `agent_configs`, `events`, `webhook_configs`)

**Replacement**: Use `mysql_002_enterprise.sql` instead, which includes all parallel execution features plus additional enterprise capabilities.

**Error if applied**:
```
ERROR 1060 (42S21) at line 7: Duplicate column name 'started_at'
```

This file is kept for historical reference only.
