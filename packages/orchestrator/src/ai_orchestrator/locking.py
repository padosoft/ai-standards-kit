"""Distributed locking for concurrent step execution.

Provides MySQL advisory locks and row-level locking to prevent race conditions
when multiple agents attempt to modify the same run/step concurrently.
"""
from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from dataclasses import dataclass
from functools import wraps
from typing import Any, Callable, Iterator, Optional, TypeVar

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


@dataclass
class LockResult:
    """Result of a lock acquisition attempt."""
    acquired: bool
    lock_name: str
    holder: Optional[str] = None
    wait_time_seconds: float = 0.0
    error: Optional[str] = None


class LockTimeout(Exception):
    """Raised when lock acquisition times out."""
    pass


class LockManager:
    """Manages distributed locks using MySQL advisory locks.

    MySQL advisory locks are application-level locks that:
    - Are NOT tied to transactions (persist until explicitly released or session ends)
    - Are re-entrant within the same session
    - Have a timeout mechanism
    - Can be queried for status

    Usage:
        manager = LockManager(db_pool)
        with manager.acquire_step_lock("run-123", 1):
            # exclusive access to step 1 of run-123
            ...
    """

    def __init__(self, pool):
        """Initialize with a database connection pool.

        Args:
            pool: ConnectionPool instance from db_mysql
        """
        self._pool = pool

    def _lock_name(self, run_id: str, step_id: Optional[int] = None) -> str:
        """Generate a lock name for a run or step."""
        if step_id is not None:
            return f"orch_step_{run_id}_{step_id}"
        return f"orch_run_{run_id}"

    def try_acquire(
        self,
        lock_name: str,
        timeout_seconds: float = 0,
    ) -> LockResult:
        """Try to acquire a lock with optional timeout.

        Args:
            lock_name: Name of the lock to acquire
            timeout_seconds: How long to wait (0 = no wait, -1 = wait forever)

        Returns:
            LockResult with acquisition status
        """
        start_time = time.perf_counter()

        with self._pool.connection() as conn:
            cur = conn.cursor()

            # GET_LOCK returns:
            # - 1 if lock was acquired
            # - 0 if lock was not acquired (timeout)
            # - NULL if an error occurred
            timeout_arg = int(timeout_seconds) if timeout_seconds >= 0 else -1
            cur.execute("SELECT GET_LOCK(%s, %s) as result", (lock_name, timeout_arg))
            row = cur.fetchone()

            wait_time = time.perf_counter() - start_time

            if row is None or row["result"] is None:
                return LockResult(
                    acquired=False,
                    lock_name=lock_name,
                    wait_time_seconds=wait_time,
                    error="Lock acquisition error",
                )

            acquired = row["result"] == 1

            if not acquired:
                # Check who holds the lock
                cur.execute(
                    """SELECT PROCESSLIST_ID, OBJECT_NAME
                       FROM performance_schema.metadata_locks
                       WHERE OBJECT_TYPE = 'USER LEVEL LOCK'
                       AND OBJECT_NAME = %s""",
                    (lock_name,),
                )
                holder_row = cur.fetchone()
                holder = str(holder_row["PROCESSLIST_ID"]) if holder_row else None
            else:
                holder = None

            return LockResult(
                acquired=acquired,
                lock_name=lock_name,
                holder=holder,
                wait_time_seconds=wait_time,
            )

    def release(self, lock_name: str) -> bool:
        """Release a previously acquired lock.

        Args:
            lock_name: Name of the lock to release

        Returns:
            True if lock was released, False if not held
        """
        with self._pool.connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT RELEASE_LOCK(%s) as result", (lock_name,))
            row = cur.fetchone()
            return row is not None and row["result"] == 1

    def is_free(self, lock_name: str) -> bool:
        """Check if a lock is currently free.

        Args:
            lock_name: Name of the lock to check

        Returns:
            True if lock is free, False if held
        """
        with self._pool.connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT IS_FREE_LOCK(%s) as result", (lock_name,))
            row = cur.fetchone()
            return row is not None and row["result"] == 1

    def is_used(self, lock_name: str) -> bool:
        """Check if a lock is currently held by any session.

        Args:
            lock_name: Name of the lock to check

        Returns:
            True if lock is held, False if free
        """
        with self._pool.connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT IS_USED_LOCK(%s) as result", (lock_name,))
            row = cur.fetchone()
            # Returns connection ID if held, NULL if free
            return row is not None and row["result"] is not None

    @contextmanager
    def lock(
        self,
        lock_name: str,
        timeout_seconds: float = 5.0,
        raise_on_timeout: bool = True,
    ) -> Iterator[LockResult]:
        """Context manager for acquiring and releasing a lock.

        Args:
            lock_name: Name of the lock
            timeout_seconds: How long to wait for lock
            raise_on_timeout: If True, raise LockTimeout on failure

        Yields:
            LockResult

        Raises:
            LockTimeout: If lock cannot be acquired and raise_on_timeout=True
        """
        result = self.try_acquire(lock_name, timeout_seconds)

        if not result.acquired:
            if raise_on_timeout:
                raise LockTimeout(
                    f"Could not acquire lock '{lock_name}' after {timeout_seconds}s. "
                    f"Holder: {result.holder}"
                )
            yield result
            return

        try:
            yield result
        finally:
            self.release(lock_name)

    @contextmanager
    def acquire_step_lock(
        self,
        run_id: str,
        step_id: int,
        timeout_seconds: float = 5.0,
    ) -> Iterator[LockResult]:
        """Acquire exclusive lock for a step.

        Args:
            run_id: Run ID
            step_id: Step ID
            timeout_seconds: How long to wait

        Yields:
            LockResult
        """
        lock_name = self._lock_name(run_id, step_id)
        with self.lock(lock_name, timeout_seconds) as result:
            yield result

    @contextmanager
    def acquire_run_lock(
        self,
        run_id: str,
        timeout_seconds: float = 5.0,
    ) -> Iterator[LockResult]:
        """Acquire exclusive lock for an entire run.

        Args:
            run_id: Run ID
            timeout_seconds: How long to wait

        Yields:
            LockResult
        """
        lock_name = self._lock_name(run_id)
        with self.lock(lock_name, timeout_seconds) as result:
            yield result


def with_step_lock(timeout_seconds: float = 5.0) -> Callable[[F], F]:
    """Decorator to acquire step lock before executing function.

    The decorated function must have 'run_id' and 'step_id' parameters.

    Usage:
        @with_step_lock(timeout_seconds=10.0)
        def commit_step(run_id: str, step_id: int, ...):
            ...
    """
    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract run_id and step_id from args/kwargs
            run_id = kwargs.get("run_id")
            step_id = kwargs.get("step_id")

            if run_id is None or step_id is None:
                # Try to get from positional args based on common signatures
                # This is a fallback - kwargs is preferred
                if len(args) >= 2:
                    run_id = args[0]
                    step_id = args[1]

            if run_id is None or step_id is None:
                raise ValueError("with_step_lock requires run_id and step_id parameters")

            # Get lock manager (lazy import to avoid circular dependency)
            from .db_mysql import get_pool, load_db_config
            pool = get_pool(load_db_config())
            lock_manager = LockManager(pool)

            with lock_manager.acquire_step_lock(run_id, step_id, timeout_seconds):
                return func(*args, **kwargs)

        return wrapper  # type: ignore
    return decorator


def with_run_lock(timeout_seconds: float = 5.0) -> Callable[[F], F]:
    """Decorator to acquire run lock before executing function.

    The decorated function must have 'run_id' parameter.

    Usage:
        @with_run_lock(timeout_seconds=10.0)
        def finalize(run_id: str, ...):
            ...
    """
    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args, **kwargs):
            run_id = kwargs.get("run_id")
            if run_id is None and len(args) >= 1:
                run_id = args[0]

            if run_id is None:
                raise ValueError("with_run_lock requires run_id parameter")

            from .db_mysql import get_pool, load_db_config
            pool = get_pool(load_db_config())
            lock_manager = LockManager(pool)

            with lock_manager.acquire_run_lock(run_id, timeout_seconds):
                return func(*args, **kwargs)

        return wrapper  # type: ignore
    return decorator


# Global lock manager instance
_lock_manager: Optional[LockManager] = None


def get_lock_manager() -> LockManager:
    """Get or create the global lock manager."""
    global _lock_manager
    if _lock_manager is None:
        from .db_mysql import get_pool, load_db_config
        pool = get_pool(load_db_config())
        _lock_manager = LockManager(pool)
    return _lock_manager
