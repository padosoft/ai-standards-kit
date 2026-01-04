"""Prometheus metrics for the AI Orchestrator.

Exposes metrics at /metrics endpoint for scraping by Prometheus.
Metrics include run counts, step durations, retry rates, and more.
"""
from __future__ import annotations

import logging
import os
import time
from contextlib import contextmanager
from functools import wraps
from typing import Any, Callable, Optional, TypeVar, Iterator

logger = logging.getLogger(__name__)

# Type for decorated functions
F = TypeVar("F", bound=Callable[..., Any])

# Check if prometheus_client is available
try:
    from prometheus_client import (
        Counter,
        Gauge,
        Histogram,
        Info,
        start_http_server,
        REGISTRY,
        generate_latest,
        CONTENT_TYPE_LATEST,
    )
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.info("prometheus_client not installed. Metrics disabled. Install with: pip install prometheus-client")


# Metric definitions (only if prometheus is available)
if PROMETHEUS_AVAILABLE:
    # Info metric
    ORCHESTRATOR_INFO = Info(
        "orchestrator",
        "AI Orchestrator information",
    )

    # Counters
    RUNS_TOTAL = Counter(
        "orchestrator_runs_total",
        "Total number of orchestration runs",
        ["status"],  # pending, running, done, failed, cancelled
    )

    STEPS_TOTAL = Counter(
        "orchestrator_steps_total",
        "Total number of steps executed",
        ["agent", "status"],  # agent type, accepted/rejected
    )

    RETRIES_TOTAL = Counter(
        "orchestrator_retries_total",
        "Total number of step retries",
        ["agent"],
    )

    WEBHOOKS_TOTAL = Counter(
        "orchestrator_webhooks_total",
        "Total webhook deliveries",
        ["event_type", "success"],  # success: true/false
    )

    ARTIFACTS_TOTAL = Counter(
        "orchestrator_artifacts_total",
        "Total artifacts saved",
        ["content_type"],
    )

    ARTIFACTS_BYTES_TOTAL = Counter(
        "orchestrator_artifacts_bytes_total",
        "Total bytes of artifacts saved",
    )

    VALIDATION_FAILURES_TOTAL = Counter(
        "orchestrator_validation_failures_total",
        "Total validation failures",
        ["reason"],  # schema, security, contract, etc.
    )

    # Gauges
    ACTIVE_RUNS = Gauge(
        "orchestrator_active_runs",
        "Number of currently active runs",
    )

    ACTIVE_STEPS = Gauge(
        "orchestrator_active_steps",
        "Number of steps currently in progress",
    )

    # Histograms
    RUN_DURATION_SECONDS = Histogram(
        "orchestrator_run_duration_seconds",
        "Duration of complete runs",
        ["status"],
        buckets=[1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600],
    )

    STEP_DURATION_SECONDS = Histogram(
        "orchestrator_step_duration_seconds",
        "Duration of individual steps",
        ["agent"],
        buckets=[1, 5, 10, 30, 60, 120, 300, 600],
    )

    WEBHOOK_DURATION_SECONDS = Histogram(
        "orchestrator_webhook_duration_seconds",
        "Webhook delivery duration",
        buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    )

    TOOL_CALL_DURATION_SECONDS = Histogram(
        "orchestrator_tool_call_duration_seconds",
        "MCP tool call duration",
        ["tool"],
        buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    )


class MetricsCollector:
    """Collector for orchestrator metrics.

    Usage:
        metrics = MetricsCollector()
        metrics.run_started()
        metrics.run_completed("done")
        metrics.step_completed("coder", "accepted", duration=10.5)
    """

    def __init__(self, enabled: bool = True):
        self._enabled = enabled and PROMETHEUS_AVAILABLE
        if self._enabled:
            # Set info metric
            ORCHESTRATOR_INFO.info({
                "version": "2.1.0",
                "python_version": os.sys.version.split()[0],
            })

    @property
    def enabled(self) -> bool:
        return self._enabled

    # Run metrics
    def run_started(self) -> None:
        if not self._enabled:
            return
        RUNS_TOTAL.labels(status="pending").inc()
        ACTIVE_RUNS.inc()

    def run_completed(self, status: str, duration_seconds: Optional[float] = None) -> None:
        if not self._enabled:
            return
        RUNS_TOTAL.labels(status=status).inc()
        ACTIVE_RUNS.dec()
        if duration_seconds is not None:
            RUN_DURATION_SECONDS.labels(status=status).observe(duration_seconds)

    # Step metrics
    def step_started(self, agent: str) -> None:
        if not self._enabled:
            return
        ACTIVE_STEPS.inc()

    def step_completed(
        self,
        agent: str,
        status: str,
        duration_seconds: Optional[float] = None,
    ) -> None:
        if not self._enabled:
            return
        STEPS_TOTAL.labels(agent=agent, status=status).inc()
        ACTIVE_STEPS.dec()
        if duration_seconds is not None:
            STEP_DURATION_SECONDS.labels(agent=agent).observe(duration_seconds)

    def step_retried(self, agent: str) -> None:
        if not self._enabled:
            return
        RETRIES_TOTAL.labels(agent=agent).inc()

    # Webhook metrics
    def webhook_sent(
        self,
        event_type: str,
        success: bool,
        duration_seconds: Optional[float] = None,
    ) -> None:
        if not self._enabled:
            return
        WEBHOOKS_TOTAL.labels(
            event_type=event_type,
            success=str(success).lower(),
        ).inc()
        if duration_seconds is not None:
            WEBHOOK_DURATION_SECONDS.observe(duration_seconds)

    # Artifact metrics
    def artifact_saved(self, content_type: str, size_bytes: int) -> None:
        if not self._enabled:
            return
        ARTIFACTS_TOTAL.labels(content_type=content_type).inc()
        ARTIFACTS_BYTES_TOTAL.inc(size_bytes)

    # Validation metrics
    def validation_failed(self, reason: str) -> None:
        if not self._enabled:
            return
        VALIDATION_FAILURES_TOTAL.labels(reason=reason).inc()

    # Tool call metrics
    @contextmanager
    def tool_call_timer(self, tool_name: str) -> Iterator[None]:
        """Context manager to time tool calls."""
        if not self._enabled:
            yield
            return

        start = time.perf_counter()
        try:
            yield
        finally:
            duration = time.perf_counter() - start
            TOOL_CALL_DURATION_SECONDS.labels(tool=tool_name).observe(duration)


def timed_tool(tool_name: str) -> Callable[[F], F]:
    """Decorator to time tool execution.

    Usage:
        @timed_tool("orchestrate")
        def orchestrate(task: str, ...):
            ...
    """
    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args, **kwargs):
            metrics = get_metrics()
            with metrics.tool_call_timer(tool_name):
                return func(*args, **kwargs)
        return wrapper  # type: ignore
    return decorator


# Global metrics instance
_metrics: Optional[MetricsCollector] = None


def get_metrics() -> MetricsCollector:
    """Get or create the global metrics collector."""
    global _metrics
    if _metrics is None:
        enabled = os.environ.get("AI_ORCH_METRICS_ENABLED", "true").lower() == "true"
        _metrics = MetricsCollector(enabled=enabled)
    return _metrics


def start_metrics_server(port: Optional[int] = None) -> bool:
    """Start the Prometheus metrics HTTP server.

    Args:
        port: Port to listen on (default: AI_ORCH_METRICS_PORT or 9090)

    Returns:
        True if server started, False if prometheus not available
    """
    if not PROMETHEUS_AVAILABLE:
        logger.warning("Cannot start metrics server: prometheus_client not installed")
        return False

    if port is None:
        port = int(os.environ.get("AI_ORCH_METRICS_PORT", "9090"))

    try:
        start_http_server(port)
        logger.info(f"Metrics server started on port {port}")
        return True
    except Exception as e:
        logger.error(f"Failed to start metrics server: {e}")
        return False


def get_metrics_text() -> Optional[str]:
    """Get current metrics as text (for embedding in other HTTP endpoints)."""
    if not PROMETHEUS_AVAILABLE:
        return None
    return generate_latest(REGISTRY).decode("utf-8")


def get_metrics_content_type() -> str:
    """Get the content type for metrics response."""
    if not PROMETHEUS_AVAILABLE:
        return "text/plain"
    return CONTENT_TYPE_LATEST
