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

logger = logging.getLogger(__name__)

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


def json_response(data: Any, status: int = 200) -> "JSONResponse":
    """Create a JSON response."""
    if isinstance(data, APIResponse):
        return JSONResponse(data.to_dict(), status_code=status)
    return JSONResponse(
        APIResponse(success=True, data=data).to_dict(),
        status_code=status
    )


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
            cur = conn.cursor()
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
        cur = conn.cursor()

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
        cur = conn.cursor()

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
            }
            for g in guidelines
        ],
        "count": len(guidelines),
    })


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
                cur = conn.cursor()
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

        # Dashboard API
        Route("/api/stats", get_stats, methods=["GET"]),
        Route("/api/runs", list_runs, methods=["GET"]),
        Route("/api/runs/{run_id}", get_run, methods=["GET"]),
        Route("/api/runs/{run_id}/artifacts/{name}", get_artifact, methods=["GET"]),
        Route("/api/events", list_events, methods=["GET"]),
        Route("/api/events/stream", event_stream, methods=["GET"]),
        Route("/api/guidelines", get_guidelines, methods=["GET"]),

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
