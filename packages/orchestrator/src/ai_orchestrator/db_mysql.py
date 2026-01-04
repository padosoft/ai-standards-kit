"""MySQL database layer with connection pooling and enterprise features."""
from __future__ import annotations

import json
from contextlib import contextmanager
from datetime import datetime, timezone
from queue import Queue, Empty
from threading import Lock
from typing import Any, Dict, List, Optional, Iterator

import mysql.connector
from mysql.connector import Error as MySQLError

from .config import DBConfig


def now_utc() -> datetime:
    """Return current UTC datetime without timezone info (for MySQL)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class DictCursor:
    """Wrapper to provide dict-like cursor results."""

    def __init__(self, cursor):
        self._cursor = cursor
        self._columns = None

    def execute(self, query, params=None):
        result = self._cursor.execute(query, params)
        if self._cursor.description:
            self._columns = [col[0] for col in self._cursor.description]
        return result

    def fetchone(self):
        row = self._cursor.fetchone()
        if row is None or self._columns is None:
            return None
        return dict(zip(self._columns, row))

    def fetchall(self):
        rows = self._cursor.fetchall()
        if not rows or self._columns is None:
            return []
        return [dict(zip(self._columns, row)) for row in rows]

    @property
    def rowcount(self):
        return self._cursor.rowcount


class ConnectionPool:
    """Simple thread-safe MySQL connection pool."""

    def __init__(self, cfg: DBConfig) -> None:
        self.cfg = cfg
        self._pool: Queue = Queue(maxsize=cfg.pool_size)
        self._size = 0
        self._lock = Lock()

    def _create_connection(self):
        """Create a new MySQL connection."""
        return mysql.connector.connect(
            host=self.cfg.host,
            port=self.cfg.port,
            user=self.cfg.user,
            password=self.cfg.password,
            database=self.cfg.name,
            charset="utf8mb4",
            use_unicode=True,
            autocommit=False,
            buffered=True,  # Buffer results to avoid "Unread result found" errors
        )

    @contextmanager
    def connection(self) -> Iterator:
        """Get a connection from the pool."""
        conn = None
        try:
            conn = self._pool.get_nowait()
            # Test if connection is still alive
            conn.ping(reconnect=True)
        except Empty:
            with self._lock:
                if self._size < self.cfg.pool_size:
                    conn = self._create_connection()
                    self._size += 1
        except MySQLError:
            # Connection died, create new one
            conn = self._create_connection()

        if conn is None:
            # Pool exhausted, wait for one
            conn = self._pool.get(timeout=30)
            try:
                conn.ping(reconnect=True)
            except MySQLError:
                conn = self._create_connection()

        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            try:
                self._pool.put_nowait(conn)
            except:
                conn.close()

    def close_all(self) -> None:
        """Close all connections in the pool."""
        while True:
            try:
                conn = self._pool.get_nowait()
                conn.close()
            except Empty:
                break


# Global pool instance
_pool: Optional[ConnectionPool] = None


def get_pool(cfg: DBConfig) -> ConnectionPool:
    """Get or create the global connection pool."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool(cfg)
    return _pool


class MySQLDB:
    """MySQL database operations with enterprise features."""

    def __init__(self, cfg: DBConfig) -> None:
        self.cfg = cfg
        self._pool = get_pool(cfg)

    def _cursor(self, conn) -> DictCursor:
        """Create a DictCursor wrapper for the connection."""
        return DictCursor(conn.cursor())

    # =========================================================================
    # RUN OPERATIONS
    # =========================================================================

    def create_run(
        self,
        run_id: str,
        task: str,
        mode: str,
        constraints: Dict[str, Any],
        total_steps: int = 0,
    ) -> None:
        """Create a new orchestration run."""
        t = now_utc()
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                """INSERT INTO runs(run_id, created_at, updated_at, status, task, mode,
                   total_steps, completed_steps, constraints_json)
                   VALUES(%s, %s, %s, 'pending', %s, %s, %s, 0, %s)""",
                (run_id, t, t, task, mode, total_steps,
                 json.dumps(constraints) if constraints else None),
            )
            # Log event
            self._log_event(cur, run_id, None, "run.created", {"task": task, "mode": mode})

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Get run by ID."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute("SELECT * FROM runs WHERE run_id=%s", (run_id,))
            return cur.fetchone()

    def list_runs(
        self,
        limit: int = 20,
        status: Optional[str] = None,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """List runs with optional filtering."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            if status:
                cur.execute(
                    """SELECT * FROM runs WHERE status=%s
                       ORDER BY updated_at DESC LIMIT %s OFFSET %s""",
                    (status, limit, offset),
                )
            else:
                cur.execute(
                    "SELECT * FROM runs ORDER BY updated_at DESC LIMIT %s OFFSET %s",
                    (limit, offset),
                )
            return list(cur.fetchall())

    def set_run_status(
        self,
        run_id: str,
        status: str,
        error_message: Optional[str] = None,
    ) -> None:
        """Update run status."""
        t = now_utc()
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            if status in ("done", "failed"):
                cur.execute(
                    """UPDATE runs SET status=%s, updated_at=%s, completed_at=%s,
                       error_message=%s WHERE run_id=%s""",
                    (status, t, t, error_message, run_id),
                )
            else:
                cur.execute(
                    "UPDATE runs SET status=%s, updated_at=%s WHERE run_id=%s",
                    (status, t, run_id),
                )
            self._log_event(cur, run_id, None, f"run.{status}",
                           {"error": error_message} if error_message else None)

    def touch_run(self, run_id: str) -> None:
        """Update run timestamp."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute("UPDATE runs SET updated_at=%s WHERE run_id=%s", (now_utc(), run_id))

    def increment_completed_steps(self, run_id: str) -> None:
        """Increment completed steps counter."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                "UPDATE runs SET completed_steps = completed_steps + 1, updated_at=%s WHERE run_id=%s",
                (now_utc(), run_id),
            )

    # =========================================================================
    # STEP OPERATIONS
    # =========================================================================

    def create_step(
        self,
        run_id: str,
        step_id: int,
        agent: str,
        goal: str,
        contract: Dict[str, Any],
        max_retries: int = 3,
        timeout_seconds: int = 300,
        dependencies: Optional[List[int]] = None,
        parallel_group: Optional[int] = None,
    ) -> None:
        """Create a new step.

        Args:
            run_id: The run ID
            step_id: Step number within the run
            agent: Agent type for this step
            goal: Goal/description for this step
            contract: Step contract (schema, requirements)
            max_retries: Maximum retry attempts
            timeout_seconds: Step timeout
            dependencies: List of step IDs this step depends on
            parallel_group: Group number for parallel execution
        """
        t = now_utc()
        deps_json = json.dumps(dependencies) if dependencies else None
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                """INSERT INTO steps(run_id, step_id, agent, goal, contract_json, status,
                   retry_count, max_retries, timeout_seconds, dependencies, parallel_group,
                   output_json, created_at, updated_at)
                   VALUES(%s, %s, %s, %s, %s, 'pending', 0, %s, %s, %s, %s, NULL, %s, %s)""",
                (run_id, step_id, agent, goal, json.dumps(contract), max_retries,
                 timeout_seconds, deps_json, parallel_group, t, t),
            )
            self._log_event(cur, run_id, step_id, "step.created",
                           {"agent": agent, "goal": goal, "parallel_group": parallel_group})

    def get_step(self, run_id: str, step_id: int) -> Optional[Dict[str, Any]]:
        """Get step by run_id and step_id."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                "SELECT * FROM steps WHERE run_id=%s AND step_id=%s",
                (run_id, step_id),
            )
            return cur.fetchone()

    def list_steps(self, run_id: str) -> List[Dict[str, Any]]:
        """List all steps for a run."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                "SELECT * FROM steps WHERE run_id=%s ORDER BY step_id",
                (run_id,),
            )
            return list(cur.fetchall())

    def start_step(self, run_id: str, step_id: int) -> None:
        """Mark step as started."""
        t = now_utc()
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                "UPDATE steps SET started_at=%s, updated_at=%s WHERE run_id=%s AND step_id=%s",
                (t, t, run_id, step_id),
            )
            self._log_event(cur, run_id, step_id, "step.started", None)

    def set_step(
        self,
        run_id: str,
        step_id: int,
        status: str,
        output: Dict[str, Any],
        increment_retry: bool = False,
    ) -> None:
        """Update step status and output."""
        t = now_utc()
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            if status == "accepted":
                cur.execute(
                    """UPDATE steps SET status=%s, output_json=%s, updated_at=%s,
                       completed_at=%s WHERE run_id=%s AND step_id=%s""",
                    (status, json.dumps(output), t, t, run_id, step_id),
                )
            elif increment_retry:
                cur.execute(
                    """UPDATE steps SET status=%s, output_json=%s, updated_at=%s,
                       retry_count = retry_count + 1 WHERE run_id=%s AND step_id=%s""",
                    (status, json.dumps(output), t, run_id, step_id),
                )
            else:
                cur.execute(
                    "UPDATE steps SET status=%s, output_json=%s, updated_at=%s WHERE run_id=%s AND step_id=%s",
                    (status, json.dumps(output), t, run_id, step_id),
                )
            self._log_event(cur, run_id, step_id, f"step.{status}",
                           {"has_output": bool(output)})

    def get_step_retry_count(self, run_id: str, step_id: int) -> int:
        """Get current retry count for a step."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                "SELECT retry_count, max_retries FROM steps WHERE run_id=%s AND step_id=%s",
                (run_id, step_id),
            )
            row = cur.fetchone()
            return row["retry_count"] if row else 0

    def can_retry_step(self, run_id: str, step_id: int) -> bool:
        """Check if step can be retried."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                "SELECT retry_count, max_retries FROM steps WHERE run_id=%s AND step_id=%s",
                (run_id, step_id),
            )
            row = cur.fetchone()
            if not row:
                return False
            return row["retry_count"] < row["max_retries"]

    def all_steps_accepted(self, run_id: str) -> bool:
        """Check if all steps are accepted."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                """SELECT COUNT(*) total,
                          SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) acc
                   FROM steps WHERE run_id=%s""",
                (run_id,),
            )
            row = cur.fetchone()
            if not row or row["total"] == 0:
                return False
            return int(row["total"]) == int(row["acc"])

    # =========================================================================
    # ARTIFACT OPERATIONS
    # =========================================================================

    def upsert_artifact_meta(
        self,
        run_id: str,
        step_id: int,
        name: str,
        path: str,
        content_type: str,
        size_bytes: int,
        sha256: str,
    ) -> None:
        """Insert or update artifact metadata."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                """INSERT INTO artifacts(run_id, step_id, name, path, content_type,
                   size_bytes, sha256, created_at)
                   VALUES(%s, %s, %s, %s, %s, %s, %s, %s)
                   ON DUPLICATE KEY UPDATE
                     path=VALUES(path),
                     content_type=VALUES(content_type),
                     size_bytes=VALUES(size_bytes),
                     sha256=VALUES(sha256)""",
                (run_id, step_id, name, path, content_type, size_bytes, sha256, now_utc()),
            )
            self._log_event(cur, run_id, step_id, "artifact.saved",
                           {"name": name, "size": size_bytes})

    def list_artifacts(self, run_id: str, step_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """List artifacts for a run or step."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            if step_id is not None:
                cur.execute(
                    "SELECT * FROM artifacts WHERE run_id=%s AND step_id=%s ORDER BY name",
                    (run_id, step_id),
                )
            else:
                cur.execute(
                    "SELECT * FROM artifacts WHERE run_id=%s ORDER BY step_id, name",
                    (run_id,),
                )
            return list(cur.fetchall())

    # =========================================================================
    # GUIDELINES OPERATIONS (Parlant-style)
    # =========================================================================

    def get_active_guidelines(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get active guidelines, optionally filtered by category."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            if category:
                cur.execute(
                    """SELECT * FROM guidelines WHERE is_active=TRUE AND category=%s
                       ORDER BY priority""",
                    (category,),
                )
            else:
                cur.execute(
                    "SELECT * FROM guidelines WHERE is_active=TRUE ORDER BY priority"
                )
            return list(cur.fetchall())

    def upsert_guideline(
        self,
        guideline_id: str,
        category: str,
        name: str,
        description: str,
        priority: int = 100,
        condition: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Insert or update a guideline."""
        t = now_utc()
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                """INSERT INTO guidelines(guideline_id, category, priority, name,
                   description, condition_json, is_active, created_at, updated_at)
                   VALUES(%s, %s, %s, %s, %s, %s, TRUE, %s, %s)
                   ON DUPLICATE KEY UPDATE
                     category=VALUES(category),
                     priority=VALUES(priority),
                     name=VALUES(name),
                     description=VALUES(description),
                     condition_json=VALUES(condition_json),
                     updated_at=VALUES(updated_at)""",
                (guideline_id, category, priority, name, description,
                 json.dumps(condition) if condition else None, t, t),
            )

    # =========================================================================
    # AGENT CONFIG OPERATIONS
    # =========================================================================

    def get_agent_config(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """Get agent configuration."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                "SELECT * FROM agent_configs WHERE agent_name=%s AND is_active=TRUE",
                (agent_name,),
            )
            return cur.fetchone()

    def list_agent_configs(self) -> List[Dict[str, Any]]:
        """List all active agent configurations."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            cur.execute(
                "SELECT * FROM agent_configs WHERE is_active=TRUE ORDER BY agent_name"
            )
            return list(cur.fetchall())

    # =========================================================================
    # POLICY OPERATIONS
    # =========================================================================

    def get_active_policies(self, policy_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get active policies, optionally filtered by type."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            if policy_type:
                cur.execute(
                    "SELECT * FROM policies WHERE is_active=TRUE AND policy_type=%s",
                    (policy_type,),
                )
            else:
                cur.execute("SELECT * FROM policies WHERE is_active=TRUE")
            return list(cur.fetchall())

    # =========================================================================
    # EVENTS OPERATIONS (Audit Trail)
    # =========================================================================

    def _log_event(
        self,
        cursor,
        run_id: Optional[str],
        step_id: Optional[int],
        event_type: str,
        event_data: Optional[Dict[str, Any]],
    ) -> None:
        """Internal: Log an event (called within existing transaction)."""
        try:
            cursor.execute(
                """INSERT INTO events(run_id, step_id, event_type, event_data, created_at)
                   VALUES(%s, %s, %s, %s, %s)""",
                (run_id, step_id, event_type,
                 json.dumps(event_data) if event_data else None, now_utc()),
            )
        except Exception:
            # Don't fail main operation if event logging fails
            pass

    def list_events(
        self,
        run_id: Optional[str] = None,
        event_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """List events with optional filtering."""
        with self._pool.connection() as conn:
            cur = self._cursor(conn)
            if run_id and event_type:
                cur.execute(
                    """SELECT * FROM events WHERE run_id=%s AND event_type=%s
                       ORDER BY created_at DESC LIMIT %s""",
                    (run_id, event_type, limit),
                )
            elif run_id:
                cur.execute(
                    """SELECT * FROM events WHERE run_id=%s
                       ORDER BY created_at DESC LIMIT %s""",
                    (run_id, limit),
                )
            elif event_type:
                cur.execute(
                    """SELECT * FROM events WHERE event_type=%s
                       ORDER BY created_at DESC LIMIT %s""",
                    (event_type, limit),
                )
            else:
                cur.execute(
                    "SELECT * FROM events ORDER BY created_at DESC LIMIT %s",
                    (limit,),
                )
            return list(cur.fetchall())


# Legacy compatibility
def load_db_config() -> DBConfig:
    """Legacy function for backward compatibility."""
    from .config import get_config
    return get_config().db
