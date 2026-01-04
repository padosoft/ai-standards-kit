"""MCP Server for AI Orchestrator with Parlant-style governance.

This is the main entry point for the orchestrator, exposing MCP tools
for task orchestration, step management, and observability.

Features:
- Parlant-style governance with structured guidelines
- Step contracts with external validation
- Parallel step execution support
- Webhook notifications on events
- Prometheus metrics
- Transactional locking for concurrent access
"""
from __future__ import annotations

import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Literal, List, Set

from fastmcp import FastMCP
from pydantic import ValidationError

from .config import get_config, OrchestratorConfig
from .contracts import StepContract, StepOutput, TestResult, get_agent_contract
from .validators import (
    validate_output,
    validate_output_full,
    SecurityValidator,
    ArtifactValidator,
)
from .db_mysql import MySQLDB, load_db_config
from .parlant_adapter import ParlantEngine, ExecutionPlan
from .artifacts_fs import ArtifactStore, guess_content_type
from .webhooks import dispatch_webhook, WebhookEvent
from .metrics import get_metrics, timed_tool, start_metrics_server
from .locking import get_lock_manager, LockTimeout

logger = logging.getLogger(__name__)

# Type aliases
RunMode = Literal["safe", "fast"]
RunStatus = Literal["pending", "running", "done", "failed"]

# Initialize MCP server
mcp = FastMCP(name="ai-orchestrator")


def new_run_id() -> str:
    """Generate a unique run ID with timestamp prefix."""
    return f"{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:8]}"


def get_db() -> MySQLDB:
    """Get database instance."""
    return MySQLDB(load_db_config())


def get_engine(db: Optional[MySQLDB] = None) -> ParlantEngine:
    """Get Parlant engine, optionally loading guidelines from DB."""
    if db:
        return ParlantEngine(
            db_guidelines_loader=lambda: db.get_active_guidelines()
        )
    return ParlantEngine()


def get_artifact_store() -> ArtifactStore:
    """Get artifact store instance."""
    cfg = get_config()
    validator = ArtifactValidator(
        max_patch_bytes=cfg.artifacts.max_patch_bytes,
        max_log_bytes=cfg.artifacts.max_log_bytes,
        max_total_bytes=cfg.artifacts.max_total_bytes,
    )
    return ArtifactStore(
        base_dir=cfg.artifacts.base_dir,
        repo_root=cfg.repo_root,
        validator=validator,
    )


def get_security_validator() -> SecurityValidator:
    """Get security validator instance."""
    cfg = get_config()
    return SecurityValidator(
        allowed_path_prefixes=list(cfg.security.allowed_path_prefixes),
        blocked_path_patterns=list(cfg.security.blocked_path_patterns),
    )


# =============================================================================
# ORCHESTRATION TOOLS
# =============================================================================

@mcp.tool
@timed_tool("orchestrate")
def orchestrate(
    task: str,
    mode: RunMode = "safe",
    constraints: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Create a new orchestration run with Parlant-style governance.

    Args:
        task: The task to accomplish
        mode: Execution mode - "safe" (full validation) or "fast" (minimal steps)
        constraints: Optional constraints (complexity, max_steps, etc.)

    Returns:
        Run details with steps to execute
    """
    metrics = get_metrics()
    db = get_db()
    run_id = new_run_id()
    constraints = constraints or {}
    constraints["mode"] = mode

    # Get Parlant engine with DB guidelines
    engine = get_engine(db)

    # Generate execution plan
    plan = engine.propose_plan(task=task, constraints=constraints)

    # Store run
    db.create_run(
        run_id=run_id,
        task=task,
        mode=mode,
        constraints=constraints,
        total_steps=len(plan.steps),
    )

    # Record metrics
    metrics.run_started()

    # Store steps with parallel group info
    steps_out: List[Dict[str, Any]] = []
    for step in plan.steps:
        agent_config = db.get_agent_config(step.agent)
        max_retries = agent_config["max_retries"] if agent_config else step.contract.max_retries
        timeout = agent_config["timeout_seconds"] if agent_config else step.contract.timeout_seconds

        db.create_step(
            run_id=run_id,
            step_id=step.step_id,
            agent=step.agent,
            goal=step.goal,
            contract=step.contract.model_dump(),
            max_retries=max_retries,
            timeout_seconds=timeout,
            dependencies=step.dependencies,
            parallel_group=step.parallel_group,
        )
        steps_out.append({
            "step_id": step.step_id,
            "agent": step.agent,
            "goal": step.goal,
            "contract": step.contract.model_dump(),
            "dependencies": step.dependencies,
            "parallel_group": step.parallel_group,
            "status": "pending",
        })

    # Format guidelines for the agent
    guidelines_text = engine.format_guidelines_for_agent({"task": task, **constraints})

    # Dispatch webhook
    dispatch_webhook(
        "run.created",
        run_id=run_id,
        data={
            "task": task,
            "mode": mode,
            "total_steps": len(plan.steps),
        },
    )

    # Check for parallel steps
    has_parallel = any(s.parallel_group is not None for s in plan.steps)
    instructions = (
        "Execute steps respecting dependencies. Use get_ready_steps(run_id) to get "
        "steps that can run in parallel. After each step, call commit_step(run_id, step_id, payload). "
        "If rejected, retry using the provided retry_hint. "
        "When all steps are accepted, call finalize(run_id)."
    ) if has_parallel else (
        "Execute steps sequentially with the specified sub-agent. "
        "After each step, call commit_step(run_id, step_id, payload). "
        "If rejected, retry using the provided retry_hint. "
        "When all steps are accepted, call finalize(run_id)."
    )

    return {
        "run_id": run_id,
        "status": "pending",
        "task": task,
        "mode": mode,
        "total_steps": len(plan.steps),
        "has_parallel_steps": has_parallel,
        "steps": steps_out,
        "guidelines": guidelines_text,
        "instructions": instructions,
    }


@mcp.tool
@timed_tool("start_step")
def start_step(run_id: str, step_id: int) -> Dict[str, Any]:
    """Mark a step as started.

    Call this before beginning work on a step.

    Args:
        run_id: The run ID
        step_id: The step ID to start

    Returns:
        Step details and applicable guidelines
    """
    metrics = get_metrics()
    db = get_db()
    step = db.get_step(run_id, step_id)
    if not step:
        raise ValueError(f"Unknown step: {run_id} #{step_id}")

    if step["status"] != "pending":
        return {
            "started": False,
            "error": f"Step is already {step['status']}",
            "step_id": step_id,
        }

    # Check dependencies from step record or contract
    all_steps = db.list_steps(run_id)
    dependencies = step.get("dependencies") or []
    if not dependencies:
        # Fallback to contract
        contract_raw = step["contract_json"]
        contract_dict = contract_raw if isinstance(contract_raw, dict) else json.loads(contract_raw)
        contract = StepContract.model_validate(contract_dict)
        dependencies = contract.dependencies

    for dep_id in dependencies:
        dep_step = next((s for s in all_steps if s["step_id"] == dep_id), None)
        if not dep_step or dep_step["status"] != "accepted":
            return {
                "started": False,
                "error": f"Dependency step {dep_id} not completed",
                "step_id": step_id,
            }

    # Mark as started
    db.start_step(run_id, step_id)
    db.set_run_status(run_id, "running")

    # Record metric
    metrics.step_started(step["agent"])

    # Dispatch webhook
    dispatch_webhook(
        "step.started",
        run_id=run_id,
        step_id=step_id,
        data={"agent": step["agent"], "goal": step["goal"]},
    )

    # Get guidelines
    engine = get_engine()
    guidelines = engine.format_guidelines_for_agent({"agent": step["agent"]})

    contract_raw = step["contract_json"]
    contract_dict = contract_raw if isinstance(contract_raw, dict) else json.loads(contract_raw)

    return {
        "started": True,
        "step_id": step_id,
        "agent": step["agent"],
        "goal": step["goal"],
        "contract": contract_dict,
        "guidelines": guidelines,
    }


@mcp.tool
@timed_tool("commit_step")
def commit_step(
    run_id: str,
    step_id: int,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Commit step output for validation.

    Uses transactional locking to prevent race conditions when
    multiple agents commit steps concurrently.

    Args:
        run_id: The run ID
        step_id: The step ID
        payload: Step output payload (must match StepOutput schema)

    Returns:
        Acceptance status with details or retry_hint if rejected
    """
    metrics = get_metrics()
    start_time = time.perf_counter()
    db = get_db()
    cfg = get_config()

    # Acquire lock for this step to prevent concurrent commits
    lock_manager = get_lock_manager()
    try:
        with lock_manager.acquire_step_lock(run_id, step_id, timeout_seconds=10.0):
            return _commit_step_locked(
                db, cfg, metrics, start_time, run_id, step_id, payload
            )
    except LockTimeout as e:
        logger.warning(f"Lock timeout for step {run_id}#{step_id}: {e}")
        return {
            "accepted": False,
            "error": "Step is being committed by another process. Please retry.",
            "retry_hint": "Wait a moment and retry the commit.",
            "can_retry": True,
        }


def _commit_step_locked(
    db: MySQLDB,
    cfg: OrchestratorConfig,
    metrics,
    start_time: float,
    run_id: str,
    step_id: int,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Internal commit logic (called while holding step lock)."""
    step = db.get_step(run_id, step_id)
    if not step:
        raise ValueError(f"Unknown step: {run_id} #{step_id}")

    # Parse contract
    contract_raw = step["contract_json"]
    contract_dict = contract_raw if isinstance(contract_raw, dict) else json.loads(contract_raw)
    contract = StepContract.model_validate(contract_dict)

    # Check retry limit
    if not db.can_retry_step(run_id, step_id):
        db.set_step(run_id, step_id, "rejected", {"error": "Max retries exceeded", "payload": payload})
        return {
            "accepted": False,
            "error": "Maximum retry attempts exceeded",
            "retry_hint": None,
            "can_retry": False,
        }

    # Validate payload schema
    try:
        output = StepOutput.model_validate(payload)
    except ValidationError as e:
        retry_count = db.get_step_retry_count(run_id, step_id)
        engine = get_engine()
        hint = engine.generate_retry_hint(
            step_id=step_id,
            error=f"Schema validation failed: {e.errors()}",
            attempt=retry_count,
            context={"agent": step["agent"]},
        )
        db.set_step(run_id, step_id, "rejected", {"error": e.errors(), "payload": payload}, increment_retry=True)
        return {
            "accepted": False,
            "error": "Payload does not match StepOutput schema",
            "details": e.errors(),
            "retry_hint": hint,
            "can_retry": db.can_retry_step(run_id, step_id),
        }

    # Full validation with security checks
    security_validator = get_security_validator()
    validation_result = validate_output_full(contract, output, security_validator)

    if not validation_result.valid:
        retry_count = db.get_step_retry_count(run_id, step_id)
        engine = get_engine()
        hint = engine.generate_retry_hint(
            step_id=step_id,
            error=validation_result.error or "Validation failed",
            attempt=retry_count,
            context={"agent": step["agent"]},
        )
        db.set_step(run_id, step_id, "rejected", {"error": validation_result.error, "payload": payload}, increment_retry=True)
        return {
            "accepted": False,
            "error": validation_result.error,
            "retry_hint": hint,
            "can_retry": db.can_retry_step(run_id, step_id),
        }

    # Process artifacts
    saved = []
    if output.artifact_paths:
        artifact_store = get_artifact_store()
        for name, rel_path in output.artifact_paths.items():
            try:
                meta = artifact_store.copy_artifact(
                    run_id=run_id,
                    step_id=step_id,
                    name=name,
                    rel_path=rel_path,
                )
                db.upsert_artifact_meta(
                    run_id=run_id,
                    step_id=step_id,
                    name=name,
                    path=meta.path,
                    content_type=meta.content_type,
                    size_bytes=meta.size_bytes,
                    sha256=meta.sha256,
                )
                saved.append({
                    "name": name,
                    "path": meta.path,
                    "sha256": meta.sha256,
                    "size": meta.size_bytes,
                })
            except (ValueError, FileNotFoundError) as e:
                db.set_step(run_id, step_id, "rejected", {"error": str(e), "payload": payload}, increment_retry=True)
                engine = get_engine()
                hint = engine.generate_retry_hint(
                    step_id=step_id,
                    error=str(e),
                    attempt=db.get_step_retry_count(run_id, step_id),
                    context={"agent": step["agent"]},
                )
                return {
                    "accepted": False,
                    "error": str(e),
                    "retry_hint": hint,
                    "can_retry": db.can_retry_step(run_id, step_id),
                }

        # Validate total artifact size
        total_validation = artifact_store.validate_total_size()
        if not total_validation.valid:
            db.set_step(run_id, step_id, "rejected", {"error": total_validation.error, "payload": payload}, increment_retry=True)
            return {
                "accepted": False,
                "error": total_validation.error,
                "retry_hint": "Reduce total artifact size",
                "can_retry": db.can_retry_step(run_id, step_id),
            }

    # Accept step
    db.set_step(run_id, step_id, "accepted", payload)
    db.increment_completed_steps(run_id)
    db.touch_run(run_id)

    # Record metrics
    duration = time.perf_counter() - start_time
    metrics.step_completed(step["agent"], "accepted", duration)

    # Record artifact metrics
    for artifact in saved:
        content_type = artifact.get("content_type", "application/octet-stream")
        metrics.artifact_saved(content_type, artifact["size"])

    # Check if all steps complete
    all_complete = db.all_steps_accepted(run_id)

    # Dispatch webhook
    dispatch_webhook(
        "step.accepted",
        run_id=run_id,
        step_id=step_id,
        data={
            "agent": step["agent"],
            "duration_seconds": duration,
            "artifacts_count": len(saved),
            "all_complete": all_complete,
        },
    )

    # Determine next action
    if all_complete:
        next_action = "call finalize(run_id)"
    else:
        # Get ready steps for parallel execution
        ready = _get_ready_step_ids(db, run_id)
        if len(ready) > 1:
            next_action = f"parallel steps ready: {ready}"
        elif ready:
            next_action = f"proceed to step {ready[0]}"
        else:
            next_action = f"proceed to step {step_id + 1}"

    return {
        "accepted": True,
        "message": "Step accepted",
        "saved_artifacts": saved,
        "warnings": validation_result.warnings,
        "all_steps_complete": all_complete,
        "next_action": next_action,
    }


@mcp.tool
@timed_tool("finalize")
def finalize(run_id: str) -> Dict[str, Any]:
    """Finalize a run after all steps are complete.

    Uses run-level lock to prevent concurrent finalization.

    Args:
        run_id: The run ID to finalize

    Returns:
        Final summary and completion status
    """
    metrics = get_metrics()
    db = get_db()

    # Acquire run lock
    lock_manager = get_lock_manager()
    try:
        with lock_manager.acquire_run_lock(run_id, timeout_seconds=10.0):
            return _finalize_locked(db, metrics, run_id)
    except LockTimeout as e:
        logger.warning(f"Lock timeout for finalize {run_id}: {e}")
        return {
            "done": False,
            "error": "Run is being finalized by another process",
        }


def _finalize_locked(db: MySQLDB, metrics, run_id: str) -> Dict[str, Any]:
    """Internal finalize logic (called while holding run lock)."""
    run = db.get_run(run_id)
    if not run:
        raise ValueError(f"Unknown run_id: {run_id}")

    # Calculate duration
    created_at = run.get("created_at")
    duration = None
    if created_at:
        if hasattr(created_at, 'timestamp'):
            duration = time.time() - created_at.timestamp()

    steps = db.list_steps(run_id)

    # Check all steps accepted
    non_accepted = [s for s in steps if s["status"] != "accepted"]
    if non_accepted:
        return {
            "done": False,
            "error": "Not all steps are accepted",
            "pending_steps": [
                {"step_id": s["step_id"], "status": s["status"]}
                for s in non_accepted
            ],
        }

    # Build final summary
    lines = [f"Task: {run['task']}", "", "Completed steps:"]
    for s in steps:
        out_raw = s.get("output_json")
        out = out_raw if isinstance(out_raw, dict) else (json.loads(out_raw) if out_raw else {})
        summary = out.get("summary", "No summary")
        lines.append(f"  {s['step_id']}. [{s['agent']}] {summary}")

    # Get artifacts
    artifacts = db.list_artifacts(run_id)
    if artifacts:
        lines.append("")
        lines.append("Artifacts:")
        for a in artifacts:
            lines.append(f"  - {a['name']} ({a['size_bytes']} bytes)")

    final_answer = "\n".join(lines)

    # Mark run as done
    db.set_run_status(run_id, "done")

    # Record metrics
    metrics.run_completed("done", duration)

    # Dispatch webhook
    dispatch_webhook(
        "run.completed",
        run_id=run_id,
        data={
            "status": "done",
            "total_steps": len(steps),
            "artifacts_count": len(artifacts),
            "duration_seconds": duration,
        },
    )

    return {
        "done": True,
        "run_id": run_id,
        "final_answer": final_answer,
        "total_steps": len(steps),
        "artifacts_count": len(artifacts),
        "duration_seconds": duration,
    }


# =============================================================================
# PARALLEL EXECUTION HELPERS
# =============================================================================

def _get_ready_step_ids(db: MySQLDB, run_id: str) -> List[int]:
    """Get step IDs that are ready to execute (dependencies satisfied)."""
    steps = db.list_steps(run_id)
    completed: Set[int] = set()
    ready: List[int] = []

    for step in steps:
        if step["status"] == "accepted":
            completed.add(step["step_id"])

    for step in steps:
        if step["status"] != "pending":
            continue

        # Get dependencies
        dependencies = step.get("dependencies") or []
        if not dependencies:
            contract_raw = step.get("contract_json")
            if contract_raw:
                contract_dict = contract_raw if isinstance(contract_raw, dict) else json.loads(contract_raw)
                dependencies = contract_dict.get("dependencies", [])

        # Check if all dependencies satisfied
        if all(dep_id in completed for dep_id in dependencies):
            ready.append(step["step_id"])

    return ready


@mcp.tool
@timed_tool("get_ready_steps")
def get_ready_steps(run_id: str) -> Dict[str, Any]:
    """Get steps that are ready for execution.

    Returns pending steps whose dependencies are all satisfied.
    Use this for parallel step execution.

    Args:
        run_id: The run ID

    Returns:
        List of ready steps with their details
    """
    db = get_db()
    run = db.get_run(run_id)
    if not run:
        raise ValueError(f"Unknown run_id: {run_id}")

    steps = db.list_steps(run_id)
    ready_ids = _get_ready_step_ids(db, run_id)

    ready_steps = []
    for step in steps:
        if step["step_id"] in ready_ids:
            contract_raw = step["contract_json"]
            contract_dict = contract_raw if isinstance(contract_raw, dict) else json.loads(contract_raw)
            ready_steps.append({
                "step_id": step["step_id"],
                "agent": step["agent"],
                "goal": step["goal"],
                "contract": contract_dict,
                "parallel_group": step.get("parallel_group"),
            })

    # Group by parallel_group
    parallel_groups: Dict[int, List[int]] = {}
    for step in ready_steps:
        pg = step.get("parallel_group")
        if pg is not None:
            if pg not in parallel_groups:
                parallel_groups[pg] = []
            parallel_groups[pg].append(step["step_id"])

    return {
        "run_id": run_id,
        "ready_count": len(ready_steps),
        "ready_steps": ready_steps,
        "parallel_groups": parallel_groups,
        "can_parallelize": len(ready_steps) > 1,
        "instructions": (
            "Execute these steps. Steps in the same parallel_group can run concurrently. "
            "Call start_step() before each, then commit_step() with results."
        ) if ready_steps else "No steps ready. Check dependencies.",
    }


# =============================================================================
# QUERY/DEBUG TOOLS
# =============================================================================

@mcp.tool
def get_run(run_id: str) -> Dict[str, Any]:
    """Get details of a specific run.

    Args:
        run_id: The run ID to query

    Returns:
        Run details including steps and artifacts
    """
    db = get_db()
    run = db.get_run(run_id)
    if not run:
        raise ValueError(f"Unknown run_id: {run_id}")

    steps = db.list_steps(run_id)
    artifacts = db.list_artifacts(run_id)

    return {
        "run_id": run["run_id"],
        "status": run["status"],
        "task": run["task"],
        "mode": run["mode"],
        "created_at": str(run["created_at"]),
        "updated_at": str(run["updated_at"]),
        "completed_at": str(run.get("completed_at")) if run.get("completed_at") else None,
        "total_steps": run.get("total_steps", len(steps)),
        "completed_steps": run.get("completed_steps", 0),
        "steps": [
            {
                "step_id": s["step_id"],
                "agent": s["agent"],
                "goal": s["goal"],
                "status": s["status"],
                "retry_count": s.get("retry_count", 0),
            }
            for s in steps
        ],
        "artifacts": [
            {
                "name": a["name"],
                "step_id": a["step_id"],
                "size_bytes": a["size_bytes"],
                "sha256": a["sha256"],
            }
            for a in artifacts
        ],
    }


@mcp.tool
def list_runs(
    limit: int = 20,
    status: Optional[str] = None,
) -> Dict[str, Any]:
    """List recent runs.

    Args:
        limit: Maximum number of runs to return (default 20)
        status: Optional filter by status (pending, running, done, failed)

    Returns:
        List of runs with summary info
    """
    db = get_db()
    runs = db.list_runs(limit=limit, status=status)

    return {
        "count": len(runs),
        "runs": [
            {
                "run_id": r["run_id"],
                "status": r["status"],
                "task": r["task"][:100] + "..." if len(r["task"]) > 100 else r["task"],
                "mode": r["mode"],
                "total_steps": r.get("total_steps", 0),
                "completed_steps": r.get("completed_steps", 0),
                "created_at": str(r["created_at"]),
                "updated_at": str(r["updated_at"]),
            }
            for r in runs
        ],
    }


@mcp.tool
def get_step(run_id: str, step_id: int) -> Dict[str, Any]:
    """Get details of a specific step.

    Args:
        run_id: The run ID
        step_id: The step ID

    Returns:
        Full step details including output
    """
    db = get_db()
    step = db.get_step(run_id, step_id)
    if not step:
        raise ValueError(f"Unknown step: {run_id} #{step_id}")

    artifacts = db.list_artifacts(run_id, step_id)

    output_raw = step.get("output_json")
    output = output_raw if isinstance(output_raw, dict) else (json.loads(output_raw) if output_raw else None)

    return {
        "run_id": run_id,
        "step_id": step_id,
        "agent": step["agent"],
        "goal": step["goal"],
        "status": step["status"],
        "retry_count": step.get("retry_count", 0),
        "max_retries": step.get("max_retries", 3),
        "contract": step["contract_json"] if isinstance(step["contract_json"], dict) else json.loads(step["contract_json"]),
        "output": output,
        "artifacts": [
            {
                "name": a["name"],
                "size_bytes": a["size_bytes"],
                "sha256": a["sha256"],
                "path": a["path"],
            }
            for a in artifacts
        ],
        "created_at": str(step["created_at"]),
        "updated_at": str(step["updated_at"]),
        "started_at": str(step.get("started_at")) if step.get("started_at") else None,
        "completed_at": str(step.get("completed_at")) if step.get("completed_at") else None,
    }


@mcp.tool
def list_events(
    run_id: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 50,
) -> Dict[str, Any]:
    """List audit events.

    Args:
        run_id: Optional filter by run ID
        event_type: Optional filter by event type (run.created, step.accepted, etc.)
        limit: Maximum events to return (default 50)

    Returns:
        List of events
    """
    db = get_db()
    events = db.list_events(run_id=run_id, event_type=event_type, limit=limit)

    return {
        "count": len(events),
        "events": [
            {
                "event_id": e["event_id"],
                "run_id": e["run_id"],
                "step_id": e["step_id"],
                "event_type": e["event_type"],
                "event_data": e["event_data"] if isinstance(e["event_data"], dict) else (json.loads(e["event_data"]) if e["event_data"] else None),
                "created_at": str(e["created_at"]),
            }
            for e in events
        ],
    }


@mcp.tool
def get_guidelines(category: Optional[str] = None) -> Dict[str, Any]:
    """Get active governance guidelines.

    Args:
        category: Optional filter by category (behavior, security, quality, custom)

    Returns:
        List of active guidelines
    """
    db = get_db()
    guidelines = db.get_active_guidelines(category)

    return {
        "count": len(guidelines),
        "guidelines": [
            {
                "id": g["guideline_id"],
                "category": g["category"],
                "name": g["name"],
                "description": g["description"],
                "priority": g["priority"],
            }
            for g in guidelines
        ],
    }


@mcp.tool
@timed_tool("cancel_run")
def cancel_run(run_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
    """Cancel a running orchestration.

    Args:
        run_id: The run ID to cancel
        reason: Optional cancellation reason

    Returns:
        Cancellation confirmation
    """
    metrics = get_metrics()
    db = get_db()
    run = db.get_run(run_id)
    if not run:
        raise ValueError(f"Unknown run_id: {run_id}")

    if run["status"] in ("done", "failed"):
        return {
            "cancelled": False,
            "error": f"Run is already {run['status']}",
        }

    db.set_run_status(run_id, "failed", error_message=reason or "Cancelled by user")

    # Record metrics
    metrics.run_completed("cancelled", None)

    # Dispatch webhook
    dispatch_webhook(
        "run.cancelled",
        run_id=run_id,
        data={
            "reason": reason or "Cancelled by user",
            "previous_status": run["status"],
        },
    )

    return {
        "cancelled": True,
        "run_id": run_id,
        "previous_status": run["status"],
    }


# =============================================================================
# ENTRY POINT
# =============================================================================

def run_server(
    transport: str = "stdio",
    host: str = "0.0.0.0",
    port: int = 8080,
    metrics_port: Optional[int] = None,
) -> None:
    """Run the MCP server.

    Args:
        transport: Transport type - "stdio" or "http"
        host: Host for HTTP transport
        port: Port for HTTP transport
        metrics_port: Port for Prometheus metrics (None to disable)
    """
    # Start metrics server if requested
    if metrics_port:
        start_metrics_server(metrics_port)
        logger.info(f"Metrics available at http://localhost:{metrics_port}/metrics")

    if transport == "http":
        # Use HTTP server for remote deployment
        from .http_server import create_app
        import uvicorn

        app = create_app()
        logger.info(f"Starting HTTP server on {host}:{port}")
        uvicorn.run(app, host=host, port=port)
    else:
        # Default stdio transport
        mcp.run()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="AI Orchestrator MCP Server")
    parser.add_argument(
        "--transport",
        choices=["stdio", "http"],
        default="stdio",
        help="Transport type (default: stdio)",
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host for HTTP transport (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8080,
        help="Port for HTTP transport (default: 8080)",
    )
    parser.add_argument(
        "--metrics-port",
        type=int,
        default=None,
        help="Port for Prometheus metrics (default: disabled)",
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    run_server(
        transport=args.transport,
        host=args.host,
        port=args.port,
        metrics_port=args.metrics_port,
    )
