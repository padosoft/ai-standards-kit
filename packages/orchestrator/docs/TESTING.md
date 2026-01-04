# Testing AI Orchestrator

This document describes how to test the AI Orchestrator system.

## Prerequisites

1. **MySQL 8.0+** running on localhost:3306
2. **Python 3.10+** with packages installed:
   ```bash
   pip install mysql-connector-python starlette uvicorn httpx psutil pydantic
   ```
3. **Node.js 18+** (for dashboard)

## Database Setup

### 1. Create the Database

```sql
CREATE DATABASE `ai-enterprise`;
```

### 2. Apply Migrations

From the orchestrator directory:

```bash
cd packages/orchestrator
python apply_test_data.py
```

Or manually apply migrations:

```sql
-- Run these in order
SOURCE migrations/mysql_001_base.sql;
SOURCE migrations/mysql_002_enterprise.sql;
SOURCE migrations/mysql_003_dashboard.sql;
SOURCE migrations/mysql_004_test_data.sql;
```

### 3. Configure Environment

Create `.env` file in `packages/orchestrator/`:

```env
AI_ORCH_DB_HOST=localhost
AI_ORCH_DB_PORT=3306
AI_ORCH_DB_USER=root
AI_ORCH_DB_PASS=
AI_ORCH_DB_NAME=ai-enterprise
AI_ORCH_HTTP_PORT=8080
AI_ORCH_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
AI_ORCH_REPO_ROOT=/path/to/ai-enterprise
AI_ORCH_ARTIFACTS_DIR=/path/to/ai-enterprise/.ai/artifacts
```

## Testing the HTTP API Server

### Start the Server

```bash
cd packages/orchestrator
python run_server.py 8080
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8080/health

# Stats
curl http://localhost:8080/api/stats

# List runs
curl http://localhost:8080/api/runs

# Get single run with steps
curl http://localhost:8080/api/runs/run-001-test

# List events
curl http://localhost:8080/api/events

# List alerts
curl http://localhost:8080/api/alerts

# List webhooks
curl http://localhost:8080/api/webhooks

# Get settings
curl http://localhost:8080/api/settings
```

### Test Mutations

```bash
# Acknowledge alert
curl -X POST http://localhost:8080/api/alerts/alert-001-test/acknowledge

# Create webhook
curl -X POST http://localhost:8080/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Webhook", "url": "https://example.com/hook", "events": ["run.completed"]}'

# Update settings
curl -X PUT http://localhost:8080/api/settings \
  -H "Content-Type: application/json" \
  -d '{"retention_days": 60}'
```

## Testing the Dashboard

### Start the Dashboard

```bash
cd packages/dashboard
npm install
npm run dev
```

Dashboard will be available at http://localhost:3000

### Pages to Test

1. **Dashboard** (`/`) - Overview with stats and charts
2. **Runs** (`/runs`) - List of orchestration runs
3. **Run Detail** (`/runs/:id`) - Steps and artifacts for a run
4. **Events** (`/events`) - Real-time event stream
5. **Alerts** (`/alerts`) - System alerts
6. **Webhooks** (`/webhooks`) - Webhook management
7. **Guidelines** (`/guidelines`) - Parlant guidelines
8. **Agents** (`/agents`) - Agent configurations
9. **Policies** (`/policies`) - Security policies
10. **Health** (`/health`) - System health status
11. **Settings** (`/settings`) - Dashboard settings

## Testing the MCP Server

The MCP (Model Context Protocol) server is designed to be used with Claude Code.

### Prerequisites for MCP Testing

```bash
pip install fastmcp mcp
```

### Test with MCP CLI

```bash
cd packages/orchestrator/src
python -m mcp.cli ai_orchestrator.server:mcp
```

### Configure in Claude Code

Add to your Claude Code settings (`.claude/settings.json`):

```json
{
  "mcpServers": {
    "ai-orchestrator": {
      "command": "python",
      "args": ["-m", "ai_orchestrator.server"],
      "env": {
        "AI_ORCH_DB_HOST": "localhost",
        "AI_ORCH_DB_PORT": "3306",
        "AI_ORCH_DB_USER": "root",
        "AI_ORCH_DB_PASS": "",
        "AI_ORCH_DB_NAME": "ai-enterprise",
        "AI_ORCH_REPO_ROOT": "/path/to/your/project"
      },
      "cwd": "/path/to/ai-enterprise/packages/orchestrator/src"
    }
  }
}
```

### MCP Tools Available

| Tool | Description |
|------|-------------|
| `orchestrate` | Start a new orchestration run |
| `start_step` | Begin a step execution |
| `commit_step` | Complete a step with output |
| `finalize` | Complete the entire run |
| `get_run` | Get run status and details |
| `list_runs` | List all runs |
| `get_step` | Get step details |
| `list_events` | Get event history |
| `get_guidelines` | Get applicable guidelines |
| `cancel_run` | Cancel a running run |

### Test MCP over HTTP

The HTTP server also exposes MCP tools:

```bash
# Invoke MCP tool via HTTP
curl -X POST http://localhost:8080/mcp/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "list_runs",
    "arguments": {"limit": 5}
  }'
```

## Integration Tests

### End-to-End Flow

1. Start the backend:
   ```bash
   python run_server.py 8080
   ```

2. Start the dashboard:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in browser

4. Verify:
   - Dashboard shows stats (15 runs, 14 steps, etc.)
   - Runs page shows all test runs
   - Run detail shows steps and artifacts
   - Events stream updates in real-time
   - Alerts show 6 items (2 critical, 2 warning, 2 info)
   - Settings page allows configuration

## Troubleshooting

### "Unread result found" Error

This means the MySQL cursor has unread results. Usually fixed by consuming all results before the next query.

### "Decimal is not JSON serializable"

Ensure all Decimal values from MySQL are converted to float before JSON serialization.

### Port Already in Use

```bash
# Windows
taskkill /F /IM python.exe

# Linux/Mac
kill $(lsof -t -i:8080)
```

### CORS Errors

Ensure `AI_ORCH_CORS_ORIGINS` includes your frontend URL.
