"""HTTP server for the AI Orchestrator.

Provides REST API endpoints for:
1. MCP-over-HTTP (SSE transport for Claude Code)
2. Dashboard API (runs, steps, artifacts, metrics)
3. Webhook management
4. Health checks

This allows the orchestrator to run as a remote service, accessible via:
- Claude Code with type: "sse"
- Web dashboard
- CI/CD integrations
- External monitoring
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, AsyncIterator
from dataclasses import dataclass, asdict

from .db_mysql import DictCursor

logger = logging.getLogger(__name__)


def _cursor(conn) -> DictCursor:
    """Create a DictCursor wrapper for the connection."""
    return DictCursor(conn.cursor())

# Check if required packages are available
try:
    from starlette.applications import Starlette
    from starlette.routing import Route, Mount
    from starlette.requests import Request
    from starlette.responses import JSONResponse, StreamingResponse, Response
    from starlette.middleware import Middleware
    from starlette.middleware.cors import CORSMiddleware
    import uvicorn
    HTTP_AVAILABLE = True
except ImportError:
    HTTP_AVAILABLE = False
    logger.info("starlette/uvicorn not installed. HTTP server disabled. Install with: pip install starlette uvicorn")


@dataclass
class APIResponse:
    """Standard API response wrapper."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    timestamp: str = ""

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _json_serializer(obj):
    """Custom JSON serializer for types not serializable by default."""
    from decimal import Decimal
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def json_response(data: Any, status: int = 200) -> "JSONResponse":
    """Create a JSON response."""
    import json as json_module
    if isinstance(data, APIResponse):
        content = json_module.loads(json_module.dumps(data.to_dict(), default=_json_serializer))
        return JSONResponse(content, status_code=status)
    content = json_module.loads(json_module.dumps(
        APIResponse(success=True, data=data).to_dict(),
        default=_json_serializer
    ))
    return JSONResponse(content, status_code=status)


def error_response(error: str, status: int = 400) -> "JSONResponse":
    """Create an error response."""
    return JSONResponse(
        APIResponse(success=False, error=error).to_dict(),
        status_code=status
    )


# =============================================================================
# DASHBOARD API ENDPOINTS
# =============================================================================

async def health_check(request: Request) -> JSONResponse:
    """Health check endpoint."""
    from .db_mysql import get_pool, load_db_config

    health = {
        "status": "healthy",
        "version": "2.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {}
    }

    # Check database
    try:
        pool = get_pool(load_db_config())
        with pool.connection() as conn:
            cur = _cursor(conn)
            cur.execute("SELECT 1")
        health["components"]["database"] = "healthy"
    except Exception as e:
        health["components"]["database"] = f"unhealthy: {e}"
        health["status"] = "degraded"

    # Check metrics
    try:
        from .metrics import PROMETHEUS_AVAILABLE
        health["components"]["metrics"] = "available" if PROMETHEUS_AVAILABLE else "disabled"
    except Exception:
        health["components"]["metrics"] = "error"

    return json_response(health)


async def get_stats(request: Request) -> JSONResponse:
    """Get overall statistics for dashboard."""
    from .db_mysql import MySQLDB, load_db_config

    db = MySQLDB(load_db_config())

    with db._pool.connection() as conn:
        cur = _cursor(conn)

        # Run counts by status
        cur.execute("""
            SELECT status, COUNT(*) as count
            FROM runs
            GROUP BY status
        """)
        run_counts = {row["status"]: row["count"] for row in cur.fetchall()}

        # Total runs
        total_runs = sum(run_counts.values())

        # Active runs
        active_runs = run_counts.get("running", 0) + run_counts.get("pending", 0)

        # Recent runs (last 24h)
        cur.execute("""
            SELECT COUNT(*) as count
            FROM runs
            WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        """)
        recent_runs = cur.fetchone()["count"]

        # Step stats
        cur.execute("""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(retry_count) as total_retries
            FROM steps
        """)
        step_stats = cur.fetchone()

        # Artifact stats
        cur.execute("""
            SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as total_bytes
            FROM artifacts
        """)
        artifact_stats = cur.fetchone()

        # Average run duration (completed runs)
        cur.execute("""
            SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as avg_duration
            FROM runs
            WHERE status = 'done' AND completed_at IS NOT NULL
        """)
        avg_duration = cur.fetchone()["avg_duration"] or 0

    return json_response({
        "runs": {
            "total": total_runs,
            "active": active_runs,
            "recent_24h": recent_runs,
            "by_status": run_counts,
        },
        "steps": {
            "total": step_stats["total"] or 0,
            "accepted": step_stats["accepted"] or 0,
            "rejected": step_stats["rejected"] or 0,
            "total_retries": step_stats["total_retries"] or 0,
        },
        "artifacts": {
            "count": artifact_stats["count"] or 0,
            "total_bytes": artifact_stats["total_bytes"] or 0,
        },
        "performance": {
            "avg_run_duration_seconds": round(avg_duration, 2),
        }
    })


async def list_runs(request: Request) -> JSONResponse:
    """List runs with pagination and filtering."""
    from .db_mysql import MySQLDB, load_db_config

    # Query params
    limit = int(request.query_params.get("limit", "50"))
    offset = int(request.query_params.get("offset", "0"))
    status = request.query_params.get("status")
    search = request.query_params.get("search")

    db = MySQLDB(load_db_config())

    with db._pool.connection() as conn:
        cur = _cursor(conn)

        # Build query
        where_clauses = []
        params = []

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        if search:
            where_clauses.append("task LIKE %s")
            params.append(f"%{search}%")

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        # Get total count
        cur.execute(f"SELECT COUNT(*) as total FROM runs WHERE {where_sql}", params)
        total = cur.fetchone()["total"]

        # Get runs
        cur.execute(f"""
            SELECT run_id, status, task, mode, total_steps, completed_steps,
                   created_at, updated_at, completed_at
            FROM runs
            WHERE {where_sql}
            ORDER BY updated_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        runs = []
        for row in cur.fetchall():
            runs.append({
                "run_id": row["run_id"],
                "status": row["status"],
                "task": row["task"][:200] + "..." if len(row["task"]) > 200 else row["task"],
                "mode": row["mode"],
                "total_steps": row["total_steps"],
                "completed_steps": row["completed_steps"],
                "progress": round(row["completed_steps"] / row["total_steps"] * 100, 1) if row["total_steps"] > 0 else 0,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                "completed_at": row["completed_at"].isoformat() if row["completed_at"] else None,
            })

    return json_response({
        "runs": runs,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < total,
        }
    })


async def get_run(request: Request) -> JSONResponse:
    """Get run details with steps and artifacts."""
    from .db_mysql import MySQLDB, load_db_config

    run_id = request.path_params["run_id"]
    db = MySQLDB(load_db_config())

    run = db.get_run(run_id)
    if not run:
        return error_response(f"Run not found: {run_id}", 404)

    steps = db.list_steps(run_id)
    artifacts = db.list_artifacts(run_id)

    return json_response({
        "run": {
            "run_id": run["run_id"],
            "status": run["status"],
            "task": run["task"],
            "mode": run["mode"],
            "total_steps": run["total_steps"],
            "completed_steps": run["completed_steps"],
            "error_message": run.get("error_message"),
            "created_at": run["created_at"].isoformat() if run["created_at"] else None,
            "updated_at": run["updated_at"].isoformat() if run["updated_at"] else None,
            "completed_at": run["completed_at"].isoformat() if run["completed_at"] else None,
        },
        "steps": [
            {
                "step_id": s["step_id"],
                "agent": s["agent"],
                "goal": s["goal"],
                "status": s["status"],
                "retry_count": s.get("retry_count", 0),
                "max_retries": s.get("max_retries", 3),
                "created_at": s["created_at"].isoformat() if s["created_at"] else None,
                "started_at": s["started_at"].isoformat() if s.get("started_at") else None,
                "completed_at": s["completed_at"].isoformat() if s.get("completed_at") else None,
            }
            for s in steps
        ],
        "artifacts": [
            {
                "name": a["name"],
                "step_id": a["step_id"],
                "content_type": a["content_type"],
                "size_bytes": a["size_bytes"],
                "sha256": a["sha256"],
            }
            for a in artifacts
        ],
    })


async def list_events(request: Request) -> JSONResponse:
    """List events with filtering."""
    from .db_mysql import MySQLDB, load_db_config

    run_id = request.query_params.get("run_id")
    event_type = request.query_params.get("type")
    limit = int(request.query_params.get("limit", "100"))

    db = MySQLDB(load_db_config())
    events = db.list_events(run_id=run_id, event_type=event_type, limit=limit)

    return json_response({
        "events": [
            {
                "event_id": e["event_id"],
                "run_id": e["run_id"],
                "step_id": e["step_id"],
                "event_type": e["event_type"],
                "event_data": json.loads(e["event_data"]) if e["event_data"] and isinstance(e["event_data"], str) else e["event_data"],
                "created_at": e["created_at"].isoformat() if e["created_at"] else None,
            }
            for e in events
        ],
        "count": len(events),
    })


async def get_artifact(request: Request) -> Response:
    """Download artifact content."""
    from .artifacts_fs import ArtifactStore
    from .config import get_config

    run_id = request.path_params["run_id"]
    artifact_name = request.path_params["name"]

    cfg = get_config()
    store = ArtifactStore(base_dir=cfg.artifacts.base_dir, repo_root=cfg.repo_root)

    # Find artifact path
    from .db_mysql import MySQLDB, load_db_config
    db = MySQLDB(load_db_config())

    artifacts = db.list_artifacts(run_id)
    artifact = next((a for a in artifacts if a["name"] == artifact_name), None)

    if not artifact:
        return error_response(f"Artifact not found: {artifact_name}", 404)

    try:
        content = store.read_artifact(artifact["path"])
        return Response(
            content=content,
            media_type=artifact["content_type"],
            headers={
                "Content-Disposition": f'attachment; filename="{artifact_name}"',
                "X-Artifact-SHA256": artifact["sha256"],
            }
        )
    except FileNotFoundError:
        return error_response("Artifact file not found", 404)


async def get_guidelines(request: Request) -> JSONResponse:
    """Get active guidelines."""
    from .parlant_adapter import ParlantEngine

    category = request.query_params.get("category")
    stack = request.query_params.get("stack")

    engine = ParlantEngine()
    context = {}
    if stack:
        context["stack"] = stack

    guidelines = engine.get_applicable_guidelines(context)

    if category:
        guidelines = [g for g in guidelines if g.category.value == category]

    return json_response({
        "guidelines": [
            {
                "id": g.id,
                "category": g.category.value,
                "name": g.name,
                "description": g.description,
                "priority": g.priority,
                "source": g.source.value,
                "source_path": g.source_path,
            }
            for g in guidelines
        ],
        "count": len(guidelines),
    })


async def get_time_series(request: Request) -> JSONResponse:
    """Get time series data for charts."""
    from .db_mysql import MySQLDB, load_db_config

    period = request.query_params.get("period", "24h")

    # Parse period to interval
    if period == "24h":
        interval_hours = 24
        bucket_minutes = 60  # 1 hour buckets
    elif period == "7d":
        interval_hours = 168
        bucket_minutes = 360  # 6 hour buckets
    elif period == "30d":
        interval_hours = 720
        bucket_minutes = 1440  # 1 day buckets
    else:
        interval_hours = 24
        bucket_minutes = 60

    db = MySQLDB(load_db_config())

    with db._pool.connection() as conn:
        cur = _cursor(conn)

        # Runs completed over time
        cur.execute(f"""
            SELECT
                DATE_FORMAT(completed_at, '%Y-%m-%dT%H:00:00') as timestamp,
                COUNT(*) as value
            FROM runs
            WHERE completed_at > DATE_SUB(NOW(), INTERVAL {interval_hours} HOUR)
                AND status = 'done'
            GROUP BY DATE_FORMAT(completed_at, '%Y-%m-%dT%H:00:00')
            ORDER BY timestamp
        """)
        completed = [{"timestamp": r["timestamp"], "value": r["value"]} for r in cur.fetchall()]

        # Runs failed over time
        cur.execute(f"""
            SELECT
                DATE_FORMAT(completed_at, '%Y-%m-%dT%H:00:00') as timestamp,
                COUNT(*) as value
            FROM runs
            WHERE completed_at > DATE_SUB(NOW(), INTERVAL {interval_hours} HOUR)
                AND status = 'failed'
            GROUP BY DATE_FORMAT(completed_at, '%Y-%m-%dT%H:00:00')
            ORDER BY timestamp
        """)
        failed = [{"timestamp": r["timestamp"], "value": r["value"]} for r in cur.fetchall()]

    return json_response({
        "runs_completed": completed,
        "runs_failed": failed,
        "period": period,
    })


async def get_detailed_stats(request: Request) -> JSONResponse:
    """Get detailed stats for dashboard including today's data."""
    from .db_mysql import MySQLDB, load_db_config

    db = MySQLDB(load_db_config())

    with db._pool.connection() as conn:
        cur = _cursor(conn)

        # Run counts by status
        cur.execute("""
            SELECT status, COUNT(*) as count
            FROM runs
            GROUP BY status
        """)
        runs_by_status = {row["status"]: row["count"] for row in cur.fetchall()}

        # Today's runs
        cur.execute("""
            SELECT COUNT(*) as count
            FROM runs
            WHERE DATE(created_at) = CURDATE()
        """)
        total_runs_today = cur.fetchone()["count"]

        # Active runs (running + pending)
        active_runs = runs_by_status.get("running", 0) + runs_by_status.get("pending", 0)

        # Total runs
        total_runs = sum(runs_by_status.values())

        # Success rate
        completed = runs_by_status.get("done", 0)
        failed = runs_by_status.get("failed", 0)
        success_rate = (completed / (completed + failed) * 100) if (completed + failed) > 0 else 100

        # Average duration
        cur.execute("""
            SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as avg_duration
            FROM runs
            WHERE status = 'done' AND completed_at IS NOT NULL
        """)
        avg_duration_raw = cur.fetchone()["avg_duration"]
        avg_duration = float(avg_duration_raw) if avg_duration_raw else 0.0

        # Today's steps
        cur.execute("""
            SELECT COUNT(*) as count
            FROM steps
            WHERE DATE(created_at) = CURDATE()
        """)
        total_steps_today = cur.fetchone()["count"]

        # Total steps
        cur.execute("SELECT COUNT(*) as count FROM steps")
        total_steps = cur.fetchone()["count"]

        # Retry rate
        cur.execute("""
            SELECT
                SUM(CASE WHEN retry_count > 0 THEN 1 ELSE 0 END) as retried,
                COUNT(*) as total
            FROM steps
        """)
        retry_data = cur.fetchone()
        retried = int(retry_data["retried"] or 0)
        total = int(retry_data["total"] or 0)
        retry_rate = float(retried / total * 100) if total > 0 else 0.0

        # Trend (vs yesterday)
        cur.execute("""
            SELECT COUNT(*) as count
            FROM runs
            WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        """)
        yesterday_runs = cur.fetchone()["count"]
        runs_trend = total_runs_today - yesterday_runs if yesterday_runs > 0 else 0

        # Tool usage
        cur.execute("""
            SELECT agent as tool, COUNT(*) as count
            FROM steps
            GROUP BY agent
            ORDER BY count DESC
            LIMIT 10
        """)
        tool_usage = {row["tool"]: row["count"] for row in cur.fetchall()}

    return json_response({
        "active_runs": active_runs,
        "total_runs": total_runs,
        "total_runs_today": total_runs_today,
        "runs_by_status": runs_by_status,
        "success_rate": round(success_rate, 1),
        "avg_duration_seconds": round(avg_duration, 2),
        "total_steps": total_steps,
        "total_steps_today": total_steps_today,
        "retry_rate": round(retry_rate, 1),
        "runs_trend": runs_trend,
        "tool_usage": tool_usage,
    })


async def get_detailed_health(request: Request) -> JSONResponse:
    """Get detailed system health for dashboard."""
    import psutil
    from .db_mysql import get_pool, load_db_config

    health = {
        "status": "healthy",
        "version": "2.1.0",
        "uptime_seconds": 0,
        "cpu_percent": 0,
        "memory_percent": 0,
        "memory_used": 0,
        "memory_total": 0,
        "disk_percent": 0,
        "disk_used": 0,
        "disk_total": 0,
        "active_connections": 0,
        "services": [],
        "database": None,
        "queue": None,
    }

    try:
        # System metrics
        health["cpu_percent"] = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        health["memory_percent"] = memory.percent
        health["memory_used"] = memory.used
        health["memory_total"] = memory.total
        disk = psutil.disk_usage("/")
        health["disk_percent"] = disk.percent
        health["disk_used"] = disk.used
        health["disk_total"] = disk.total
    except Exception:
        pass

    # Database check
    try:
        pool = get_pool(load_db_config())
        start = time.time()
        with pool.connection() as conn:
            cur = _cursor(conn)
            cur.execute("SELECT 1")
            cur.fetchone()  # Must consume result before next query
            latency_ms = (time.time() - start) * 1000

            # Get connection count
            cur.execute("SHOW STATUS LIKE 'Threads_connected'")
            row = cur.fetchone()
            # Consume any remaining results from SHOW STATUS
            try:
                cur._cursor.fetchall()
            except Exception:
                pass
            connections = int(row["Value"]) if row else 0

            # Get db size
            cur.execute("""
                SELECT
                    SUM(data_length + index_length) as size_bytes,
                    SUM(table_rows) as total_records
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
            """)
            db_info = cur.fetchone()

        health["services"].append({
            "name": "MySQL Database",
            "status": "healthy",
            "latency_ms": round(latency_ms, 2),
        })
        health["database"] = {
            "total_records": db_info["total_records"] or 0,
            "size_bytes": db_info["size_bytes"] or 0,
            "active_connections": connections,
            "avg_query_ms": latency_ms,
        }
        health["active_connections"] = connections
    except Exception as e:
        health["status"] = "degraded"
        health["services"].append({
            "name": "MySQL Database",
            "status": "unhealthy",
            "message": str(e),
        })

    # Metrics service
    try:
        from .metrics import PROMETHEUS_AVAILABLE
        health["services"].append({
            "name": "Prometheus Metrics",
            "status": "healthy" if PROMETHEUS_AVAILABLE else "disabled",
        })
    except Exception:
        pass

    # Queue stats (from runs table)
    try:
        pool = get_pool(load_db_config())
        with pool.connection() as conn:
            cur = _cursor(conn)
            cur.execute("""
                SELECT
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as processing,
                    SUM(CASE WHEN status = 'done' AND DATE(completed_at) = CURDATE() THEN 1 ELSE 0 END) as completed_24h,
                    SUM(CASE WHEN status = 'failed' AND DATE(completed_at) = CURDATE() THEN 1 ELSE 0 END) as failed_24h
                FROM runs
            """)
            queue = cur.fetchone()
            health["queue"] = {
                "pending": queue["pending"] or 0,
                "processing": queue["processing"] or 0,
                "completed_24h": queue["completed_24h"] or 0,
                "failed_24h": queue["failed_24h"] or 0,
            }
    except Exception:
        pass

    return json_response(health)


# =============================================================================
# WEBHOOKS API
# =============================================================================

async def list_webhooks(request: Request) -> JSONResponse:
    """List all webhooks."""
    from .db_mysql import MySQLDB, load_db_config

    db = MySQLDB(load_db_config())

    with db._pool.connection() as conn:
        cur = _cursor(conn)
        cur.execute("""
            SELECT webhook_id, name, url, secret, events, enabled,
                   created_at, last_triggered_at, failure_count
            FROM webhooks
            ORDER BY created_at DESC
        """)

        webhooks = []
        for row in cur.fetchall():
            webhooks.append({
                "webhook_id": row["webhook_id"],
                "name": row["name"],
                "url": row["url"],
                "secret": row["secret"][:4] + "****" if row["secret"] else None,
                "events": json.loads(row["events"]) if row["events"] else [],
                "enabled": bool(row["enabled"]),
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "last_triggered_at": row["last_triggered_at"].isoformat() if row["last_triggered_at"] else None,
                "failure_count": row["failure_count"] or 0,
            })

    return json_response(webhooks)


async def create_webhook(request: Request) -> JSONResponse:
    """Create a new webhook."""
    from .db_mysql import MySQLDB, load_db_config
    import uuid

    try:
        body = await request.json()
    except json.JSONDecodeError:
        return error_response("Invalid JSON body", 400)

    name = body.get("name")
    url = body.get("url")
    events = body.get("events", [])
    secret = body.get("secret")
    enabled = body.get("enabled", True)

    if not name or not url:
        return error_response("Missing required fields: name, url", 400)

    webhook_id = str(uuid.uuid4())

    db = MySQLDB(load_db_config())
    with db._pool.connection() as conn:
        cur = _cursor(conn)
        cur.execute("""
            INSERT INTO webhooks (webhook_id, name, url, secret, events, enabled)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (webhook_id, name, url, secret, json.dumps(events), enabled))
        conn.commit()

    return json_response({"webhook_id": webhook_id}, status=201)


async def update_webhook(request: Request) -> JSONResponse:
    """Update a webhook."""
    from .db_mysql import MySQLDB, load_db_config

    webhook_id = request.path_params["webhook_id"]

    try:
        body = await request.json()
    except json.JSONDecodeError:
        return error_response("Invalid JSON body", 400)

    db = MySQLDB(load_db_config())
    with db._pool.connection() as conn:
        cur = _cursor(conn)

        # Build update query dynamically
        updates = []
        params = []

        for field in ["name", "url", "secret", "enabled"]:
            if field in body:
                updates.append(f"{field} = %s")
                params.append(body[field])

        if "events" in body:
            updates.append("events = %s")
            params.append(json.dumps(body["events"]))

        if not updates:
            return error_response("No fields to update", 400)

        params.append(webhook_id)
        cur.execute(f"""
            UPDATE webhooks
            SET {", ".join(updates)}
            WHERE webhook_id = %s
        """, params)
        conn.commit()

        if cur.rowcount == 0:
            return error_response("Webhook not found", 404)

    return json_response({"updated": True})


async def delete_webhook(request: Request) -> JSONResponse:
    """Delete a webhook."""
    from .db_mysql import MySQLDB, load_db_config

    webhook_id = request.path_params["webhook_id"]

    db = MySQLDB(load_db_config())
    with db._pool.connection() as conn:
        cur = _cursor(conn)
        cur.execute("DELETE FROM webhooks WHERE webhook_id = %s", (webhook_id,))
        conn.commit()

        if cur.rowcount == 0:
            return error_response("Webhook not found", 404)

    return json_response({"deleted": True})


async def test_webhook(request: Request) -> JSONResponse:
    """Test a webhook by sending a test event."""
    import httpx

    webhook_id = request.path_params["webhook_id"]

    from .db_mysql import MySQLDB, load_db_config

    db = MySQLDB(load_db_config())
    with db._pool.connection() as conn:
        cur = _cursor(conn)
        cur.execute("SELECT url, secret FROM webhooks WHERE webhook_id = %s", (webhook_id,))
        row = cur.fetchone()

        if not row:
            return error_response("Webhook not found", 404)

    test_payload = {
        "event_type": "test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {"message": "This is a test webhook event"},
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                row["url"],
                json=test_payload,
                timeout=10,
            )
            return json_response({
                "success": resp.status_code < 400,
                "status_code": resp.status_code,
            })
    except Exception as e:
        return json_response({
            "success": False,
            "error": str(e),
        })


# =============================================================================
# ALERTS API
# =============================================================================

async def list_alerts(request: Request) -> JSONResponse:
    """List alerts with filtering."""
    from .db_mysql import MySQLDB, load_db_config

    severity = request.query_params.get("severity")
    acknowledged = request.query_params.get("acknowledged")

    db = MySQLDB(load_db_config())

    with db._pool.connection() as conn:
        cur = _cursor(conn)

        where_clauses = []
        params = []

        if severity:
            where_clauses.append("severity = %s")
            params.append(severity)

        if acknowledged is not None:
            where_clauses.append("acknowledged = %s")
            params.append(acknowledged.lower() == "true")

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        cur.execute(f"""
            SELECT alert_id, severity, title, message, source, run_id,
                   acknowledged, created_at
            FROM alerts
            WHERE {where_sql}
            ORDER BY created_at DESC
            LIMIT 100
        """, params)

        alerts = []
        for row in cur.fetchall():
            alerts.append({
                "alert_id": row["alert_id"],
                "severity": row["severity"],
                "title": row["title"],
                "message": row["message"],
                "source": row["source"],
                "run_id": row["run_id"],
                "acknowledged": bool(row["acknowledged"]),
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            })

    return json_response(alerts)


async def acknowledge_alert(request: Request) -> JSONResponse:
    """Acknowledge an alert."""
    from .db_mysql import MySQLDB, load_db_config

    alert_id = request.path_params["alert_id"]

    db = MySQLDB(load_db_config())
    with db._pool.connection() as conn:
        cur = _cursor(conn)
        cur.execute("""
            UPDATE alerts SET acknowledged = TRUE WHERE alert_id = %s
        """, (alert_id,))
        conn.commit()

        if cur.rowcount == 0:
            return error_response("Alert not found", 404)

    return json_response({"acknowledged": True})


async def delete_alert(request: Request) -> JSONResponse:
    """Delete an alert."""
    from .db_mysql import MySQLDB, load_db_config

    alert_id = request.path_params["alert_id"]

    db = MySQLDB(load_db_config())
    with db._pool.connection() as conn:
        cur = _cursor(conn)
        cur.execute("DELETE FROM alerts WHERE alert_id = %s", (alert_id,))
        conn.commit()

        if cur.rowcount == 0:
            return error_response("Alert not found", 404)

    return json_response({"deleted": True})


# =============================================================================
# SETTINGS API
# =============================================================================

async def get_settings(request: Request) -> JSONResponse:
    """Get dashboard settings."""
    from .db_mysql import MySQLDB, load_db_config

    db = MySQLDB(load_db_config())

    with db._pool.connection() as conn:
        cur = _cursor(conn)
        cur.execute("SELECT setting_key, setting_value FROM settings")

        settings = {}
        for row in cur.fetchall():
            try:
                settings[row["setting_key"]] = json.loads(row["setting_value"])
            except json.JSONDecodeError:
                settings[row["setting_key"]] = row["setting_value"]

    # Default settings
    defaults = {
        "retention_days": 30,
        "events_retention_days": 30,
        "alerts_retention_days": 30,
        "stats_refresh_seconds": 30,
        "events_refresh_seconds": 15,
        "health_refresh_seconds": 30,
        "discord_alerts_webhook": "",
        "discord_summary_webhook": "",
        "alert_failed_threshold": 5,
        "alert_error_rate_threshold": 10,
        "alert_queue_threshold": 100,
        "notify_on_failure": True,
        "notify_on_completion": False,
        "weekly_summary_enabled": True,
    }

    return json_response({**defaults, **settings})


async def update_settings(request: Request) -> JSONResponse:
    """Update dashboard settings."""
    from .db_mysql import MySQLDB, load_db_config

    try:
        body = await request.json()
    except json.JSONDecodeError:
        return error_response("Invalid JSON body", 400)

    db = MySQLDB(load_db_config())

    with db._pool.connection() as conn:
        cur = _cursor(conn)

        for key, value in body.items():
            cur.execute("""
                INSERT INTO settings (setting_key, setting_value)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE setting_value = %s
            """, (key, json.dumps(value), json.dumps(value)))

        conn.commit()

    return json_response({"updated": True})


# =============================================================================
# DISCORD API
# =============================================================================

async def test_discord_notification(request: Request) -> JSONResponse:
    """Test Discord notification webhook."""
    import httpx
    from .db_mysql import MySQLDB, load_db_config

    db = MySQLDB(load_db_config())

    with db._pool.connection() as conn:
        cur = _cursor(conn)
        cur.execute("SELECT setting_value FROM settings WHERE setting_key = 'discord_alerts_webhook'")
        row = cur.fetchone()

        if not row:
            return error_response("Discord alerts webhook not configured", 400)

        webhook_url = json.loads(row["setting_value"])

    if not webhook_url:
        return error_response("Discord alerts webhook not configured", 400)

    payload = {
        "embeds": [{
            "title": "Test Notification",
            "description": "This is a test message from AI Orchestrator Dashboard",
            "color": 3447003,  # Blue
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "footer": {"text": "AI Orchestrator"},
        }]
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(webhook_url, json=payload, timeout=10)
            return json_response({
                "success": resp.status_code < 400,
                "status_code": resp.status_code,
            })
    except Exception as e:
        return json_response({
            "success": False,
            "error": str(e),
        })


# =============================================================================
# RUN ACTIONS
# =============================================================================

async def cancel_run_api(request: Request) -> JSONResponse:
    """Cancel a running run."""
    from .db_mysql import MySQLDB, load_db_config

    run_id = request.path_params["run_id"]

    db = MySQLDB(load_db_config())
    with db._pool.connection() as conn:
        cur = _cursor(conn)

        # Check if run exists and is cancellable
        cur.execute("SELECT status FROM runs WHERE run_id = %s", (run_id,))
        row = cur.fetchone()

        if not row:
            return error_response("Run not found", 404)

        if row["status"] not in ("running", "pending"):
            return error_response(f"Run cannot be cancelled (status: {row['status']})", 400)

        # Cancel the run
        cur.execute("""
            UPDATE runs
            SET status = 'cancelled', completed_at = NOW()
            WHERE run_id = %s
        """, (run_id,))
        conn.commit()

    return json_response({"cancelled": True})


async def retry_run_api(request: Request) -> JSONResponse:
    """Retry a failed run."""
    from .db_mysql import MySQLDB, load_db_config
    import uuid

    run_id = request.path_params["run_id"]

    db = MySQLDB(load_db_config())
    with db._pool.connection() as conn:
        cur = _cursor(conn)

        # Get original run
        cur.execute("SELECT task, mode FROM runs WHERE run_id = %s", (run_id,))
        row = cur.fetchone()

        if not row:
            return error_response("Run not found", 404)

        # Create new run
        new_run_id = str(uuid.uuid4())
        cur.execute("""
            INSERT INTO runs (run_id, task, mode, status, total_steps, completed_steps)
            VALUES (%s, %s, %s, 'pending', 0, 0)
        """, (new_run_id, row["task"], row["mode"]))
        conn.commit()

    return json_response({"new_run_id": new_run_id})


# =============================================================================
# REAL-TIME EVENTS (SSE)
# =============================================================================

async def event_stream(request: Request) -> StreamingResponse:
    """Server-Sent Events stream for real-time updates."""
    run_id = request.query_params.get("run_id")

    async def generate() -> AsyncIterator[str]:
        from .db_mysql import MySQLDB, load_db_config

        db = MySQLDB(load_db_config())
        last_event_id = 0

        while True:
            # Poll for new events
            with db._pool.connection() as conn:
                cur = _cursor(conn)
                query = """
                    SELECT event_id, run_id, step_id, event_type, event_data, created_at
                    FROM events
                    WHERE event_id > %s
                """
                params = [last_event_id]

                if run_id:
                    query += " AND run_id = %s"
                    params.append(run_id)

                query += " ORDER BY event_id LIMIT 50"
                cur.execute(query, params)
                events = cur.fetchall()

            for event in events:
                last_event_id = event["event_id"]
                data = {
                    "event_id": event["event_id"],
                    "run_id": event["run_id"],
                    "step_id": event["step_id"],
                    "event_type": event["event_type"],
                    "event_data": json.loads(event["event_data"]) if event["event_data"] and isinstance(event["event_data"], str) else event["event_data"],
                    "created_at": event["created_at"].isoformat() if event["created_at"] else None,
                }
                yield f"data: {json.dumps(data)}\n\n"

            # Keep-alive ping
            yield f": ping {datetime.now(timezone.utc).isoformat()}\n\n"

            await asyncio.sleep(1)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# =============================================================================
# METRICS ENDPOINT
# =============================================================================

async def metrics(request: Request) -> Response:
    """Prometheus metrics endpoint."""
    from .metrics import get_metrics_text, get_metrics_content_type, PROMETHEUS_AVAILABLE

    if not PROMETHEUS_AVAILABLE:
        return Response(
            content="# Prometheus client not installed\n",
            media_type="text/plain"
        )

    return Response(
        content=get_metrics_text(),
        media_type=get_metrics_content_type()
    )


# =============================================================================
# MCP-OVER-HTTP (for Claude Code SSE transport)
# =============================================================================

async def mcp_invoke(request: Request) -> JSONResponse:
    """Invoke an MCP tool via HTTP POST.

    This allows Claude Code to use the orchestrator via HTTP instead of stdio.

    Request body:
        {
            "tool": "orchestrate",
            "arguments": {"task": "...", "mode": "safe"}
        }

    Response:
        {
            "success": true,
            "result": {...}
        }
    """
    from . import server as mcp_server

    try:
        body = await request.json()
    except json.JSONDecodeError:
        return error_response("Invalid JSON body", 400)

    tool_name = body.get("tool")
    arguments = body.get("arguments", {})

    if not tool_name:
        return error_response("Missing 'tool' field", 400)

    # Map tool names to functions
    tools = {
        "orchestrate": mcp_server.orchestrate,
        "start_step": mcp_server.start_step,
        "commit_step": mcp_server.commit_step,
        "finalize": mcp_server.finalize,
        "get_run": mcp_server.get_run,
        "list_runs": mcp_server.list_runs,
        "get_step": mcp_server.get_step,
        "list_events": mcp_server.list_events,
        "get_guidelines": mcp_server.get_guidelines,
        "cancel_run": mcp_server.cancel_run,
    }

    if tool_name not in tools:
        return error_response(f"Unknown tool: {tool_name}", 404)

    try:
        result = tools[tool_name](**arguments)
        return json_response({"result": result})
    except Exception as e:
        logger.exception(f"Tool {tool_name} failed")
        return error_response(str(e), 500)


# =============================================================================
# APPLICATION FACTORY
# =============================================================================

def create_app() -> "Starlette":
    """Create the Starlette application."""
    if not HTTP_AVAILABLE:
        raise RuntimeError("starlette and uvicorn not installed. Install with: pip install starlette uvicorn")

    # CORS middleware for dashboard
    cors_origins = os.environ.get("AI_ORCH_CORS_ORIGINS", "*").split(",")

    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    ]

    routes = [
        # Health & Metrics
        Route("/health", health_check, methods=["GET"]),
        Route("/metrics", metrics, methods=["GET"]),

        # Dashboard API - Stats
        Route("/api/stats", get_detailed_stats, methods=["GET"]),
        Route("/api/stats/timeseries", get_time_series, methods=["GET"]),
        Route("/api/health", get_detailed_health, methods=["GET"]),

        # Dashboard API - Runs
        Route("/api/runs", list_runs, methods=["GET"]),
        Route("/api/runs/{run_id}", get_run, methods=["GET"]),
        Route("/api/runs/{run_id}/cancel", cancel_run_api, methods=["POST"]),
        Route("/api/runs/{run_id}/retry", retry_run_api, methods=["POST"]),
        Route("/api/runs/{run_id}/artifacts/{name}", get_artifact, methods=["GET"]),

        # Dashboard API - Events
        Route("/api/events", list_events, methods=["GET"]),
        Route("/api/events/stream", event_stream, methods=["GET"]),

        # Dashboard API - Guidelines
        Route("/api/guidelines", get_guidelines, methods=["GET"]),

        # Dashboard API - Webhooks
        Route("/api/webhooks", list_webhooks, methods=["GET"]),
        Route("/api/webhooks", create_webhook, methods=["POST"]),
        Route("/api/webhooks/{webhook_id}", update_webhook, methods=["PUT"]),
        Route("/api/webhooks/{webhook_id}", delete_webhook, methods=["DELETE"]),
        Route("/api/webhooks/{webhook_id}/test", test_webhook, methods=["POST"]),

        # Dashboard API - Alerts
        Route("/api/alerts", list_alerts, methods=["GET"]),
        Route("/api/alerts/{alert_id}/acknowledge", acknowledge_alert, methods=["POST"]),
        Route("/api/alerts/{alert_id}", delete_alert, methods=["DELETE"]),

        # Dashboard API - Settings
        Route("/api/settings", get_settings, methods=["GET"]),
        Route("/api/settings", update_settings, methods=["PUT"]),

        # Dashboard API - Discord
        Route("/api/discord/test", test_discord_notification, methods=["POST"]),

        # MCP over HTTP
        Route("/mcp/invoke", mcp_invoke, methods=["POST"]),
    ]

    app = Starlette(
        debug=os.environ.get("AI_ORCH_DEBUG", "false").lower() == "true",
        routes=routes,
        middleware=middleware,
    )

    return app


def run_http_server(
    host: str = "0.0.0.0",
    port: int = 8080,
    reload: bool = False,
) -> None:
    """Run the HTTP server.

    Args:
        host: Host to bind to (default: 0.0.0.0)
        port: Port to bind to (default: 8080)
        reload: Enable auto-reload for development
    """
    if not HTTP_AVAILABLE:
        raise RuntimeError("starlette and uvicorn not installed")

    port = int(os.environ.get("AI_ORCH_HTTP_PORT", str(port)))
    host = os.environ.get("AI_ORCH_HTTP_HOST", host)

    logger.info(f"Starting HTTP server on {host}:{port}")

    uvicorn.run(
        "ai_orchestrator.http_server:create_app",
        host=host,
        port=port,
        reload=reload,
        factory=True,
    )


# CLI entry point
if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run_http_server(port=port)
