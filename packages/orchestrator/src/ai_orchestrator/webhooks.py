"""Webhook dispatcher for external event notifications.

Sends HTTP notifications to configured endpoints when orchestration events occur.
Supports retry with exponential backoff and HMAC signature verification.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Callable
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class WebhookEvent(str, Enum):
    """Supported webhook event types."""
    # Run events
    RUN_CREATED = "run.created"
    RUN_STARTED = "run.started"
    RUN_COMPLETED = "run.completed"
    RUN_FAILED = "run.failed"
    RUN_CANCELLED = "run.cancelled"

    # Step events
    STEP_STARTED = "step.started"
    STEP_COMPLETED = "step.completed"
    STEP_FAILED = "step.failed"
    STEP_RETRYING = "step.retrying"

    # Artifact events
    ARTIFACT_SAVED = "artifact.saved"

    # Special
    ALL = "all"


@dataclass
class WebhookConfig:
    """Configuration for a single webhook endpoint."""
    url: str
    events: List[str] = field(default_factory=lambda: ["all"])
    secret: Optional[str] = None  # For HMAC-SHA256 signature
    retry_count: int = 3
    retry_delay_seconds: float = 1.0
    timeout_seconds: float = 10.0
    headers: Dict[str, str] = field(default_factory=dict)
    enabled: bool = True

    def __post_init__(self):
        # Validate URL
        parsed = urlparse(self.url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Invalid webhook URL scheme: {self.url}")

    def matches_event(self, event_type: str) -> bool:
        """Check if this webhook should receive the given event type."""
        if not self.enabled:
            return False
        if "all" in self.events or WebhookEvent.ALL.value in self.events:
            return True
        return event_type in self.events


@dataclass
class WebhookPayload:
    """Payload sent to webhook endpoints."""
    event_type: str
    timestamp: str
    run_id: Optional[str] = None
    step_id: Optional[int] = None
    data: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_type": self.event_type,
            "timestamp": self.timestamp,
            "run_id": self.run_id,
            "step_id": self.step_id,
            "data": self.data,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), default=str)


@dataclass
class WebhookResult:
    """Result of a webhook delivery attempt."""
    url: str
    event_type: str
    success: bool
    status_code: Optional[int] = None
    error: Optional[str] = None
    attempts: int = 1
    duration_ms: float = 0.0


class WebhookDispatcher:
    """Dispatches events to configured webhook endpoints.

    Usage:
        dispatcher = WebhookDispatcher.from_env()
        await dispatcher.dispatch("run.completed", run_id="...", data={...})
    """

    def __init__(self, configs: List[WebhookConfig]):
        self._configs = [c for c in configs if c.enabled]
        self._http_client: Optional[Any] = None
        self._callbacks: List[Callable[[WebhookResult], None]] = []

    @classmethod
    def from_env(cls) -> "WebhookDispatcher":
        """Create dispatcher from AI_ORCH_WEBHOOKS environment variable.

        Format: JSON array of webhook configs
        Example:
            AI_ORCH_WEBHOOKS='[
                {"url": "https://slack.com/webhook/xxx", "events": ["run.failed"]},
                {"url": "https://ci.example.com/trigger", "events": ["run.completed"], "secret": "abc123"}
            ]'
        """
        webhooks_json = os.environ.get("AI_ORCH_WEBHOOKS", "[]")
        try:
            configs_raw = json.loads(webhooks_json)
            configs = [WebhookConfig(**c) for c in configs_raw]
            return cls(configs)
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"Failed to parse AI_ORCH_WEBHOOKS: {e}")
            return cls([])

    @property
    def has_webhooks(self) -> bool:
        """Check if any webhooks are configured."""
        return len(self._configs) > 0

    def add_callback(self, callback: Callable[[WebhookResult], None]) -> None:
        """Add a callback to be called after each webhook delivery."""
        self._callbacks.append(callback)

    def _sign_payload(self, payload: str, secret: str) -> str:
        """Generate HMAC-SHA256 signature for payload."""
        return hmac.new(
            secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

    async def _get_client(self):
        """Get or create HTTP client (lazy initialization)."""
        if self._http_client is None:
            try:
                import httpx
                self._http_client = httpx.AsyncClient()
            except ImportError:
                logger.warning("httpx not installed, webhooks disabled. Install with: pip install httpx")
                return None
        return self._http_client

    async def _send_webhook(
        self,
        config: WebhookConfig,
        payload: WebhookPayload,
    ) -> WebhookResult:
        """Send webhook with retry logic."""
        client = await self._get_client()
        if client is None:
            return WebhookResult(
                url=config.url,
                event_type=payload.event_type,
                success=False,
                error="httpx not installed",
            )

        payload_json = payload.to_json()
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "ai-orchestrator/1.0",
            "X-Webhook-Event": payload.event_type,
            **config.headers,
        }

        # Add signature if secret configured
        if config.secret:
            signature = self._sign_payload(payload_json, config.secret)
            headers["X-Webhook-Signature"] = f"sha256={signature}"

        last_error = None
        attempts = 0

        for attempt in range(config.retry_count):
            attempts = attempt + 1
            start_time = datetime.now(timezone.utc)

            try:
                response = await client.post(
                    config.url,
                    content=payload_json,
                    headers=headers,
                    timeout=config.timeout_seconds,
                )

                duration_ms = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

                if response.status_code < 300:
                    return WebhookResult(
                        url=config.url,
                        event_type=payload.event_type,
                        success=True,
                        status_code=response.status_code,
                        attempts=attempts,
                        duration_ms=duration_ms,
                    )
                else:
                    last_error = f"HTTP {response.status_code}"

            except Exception as e:
                last_error = str(e)

            # Exponential backoff before retry
            if attempt < config.retry_count - 1:
                delay = config.retry_delay_seconds * (2 ** attempt)
                await asyncio.sleep(delay)

        return WebhookResult(
            url=config.url,
            event_type=payload.event_type,
            success=False,
            error=last_error,
            attempts=attempts,
        )

    async def dispatch(
        self,
        event_type: str,
        run_id: Optional[str] = None,
        step_id: Optional[int] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> List[WebhookResult]:
        """Dispatch event to all matching webhooks.

        Args:
            event_type: Type of event (e.g., "run.completed", "step.failed")
            run_id: Optional run ID
            step_id: Optional step ID
            data: Optional additional data

        Returns:
            List of results for each webhook delivery
        """
        if not self._configs:
            return []

        payload = WebhookPayload(
            event_type=event_type,
            timestamp=datetime.now(timezone.utc).isoformat(),
            run_id=run_id,
            step_id=step_id,
            data=data or {},
        )

        # Find matching webhooks
        matching = [c for c in self._configs if c.matches_event(event_type)]
        if not matching:
            return []

        # Send to all matching webhooks concurrently
        tasks = [self._send_webhook(config, payload) for config in matching]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                result = WebhookResult(
                    url=matching[i].url,
                    event_type=event_type,
                    success=False,
                    error=str(result),
                )
            processed_results.append(result)

            # Call callbacks
            for callback in self._callbacks:
                try:
                    callback(result)
                except Exception as e:
                    logger.warning(f"Webhook callback failed: {e}")

        # Log results
        for result in processed_results:
            if result.success:
                logger.info(f"Webhook delivered: {result.event_type} -> {result.url}")
            else:
                logger.warning(f"Webhook failed: {result.event_type} -> {result.url}: {result.error}")

        return processed_results

    def dispatch_sync(
        self,
        event_type: str,
        run_id: Optional[str] = None,
        step_id: Optional[int] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> List[WebhookResult]:
        """Synchronous wrapper for dispatch (for use in non-async code)."""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(
            self.dispatch(event_type, run_id, step_id, data)
        )

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._http_client is not None:
            await self._http_client.aclose()
            self._http_client = None


# Global dispatcher instance
_dispatcher: Optional[WebhookDispatcher] = None


def get_webhook_dispatcher() -> WebhookDispatcher:
    """Get or create the global webhook dispatcher."""
    global _dispatcher
    if _dispatcher is None:
        _dispatcher = WebhookDispatcher.from_env()
    return _dispatcher


def dispatch_webhook(
    event_type: str,
    run_id: Optional[str] = None,
    step_id: Optional[int] = None,
    data: Optional[Dict[str, Any]] = None,
) -> None:
    """Fire-and-forget webhook dispatch (non-blocking in sync context).

    This is the main function to call from the orchestrator code.
    It dispatches the webhook asynchronously without blocking.
    """
    dispatcher = get_webhook_dispatcher()
    if not dispatcher.has_webhooks:
        return

    # Run in background without waiting
    try:
        loop = asyncio.get_running_loop()
        # We're in async context, schedule it
        asyncio.create_task(
            dispatcher.dispatch(event_type, run_id, step_id, data)
        )
    except RuntimeError:
        # No running loop, run synchronously in a thread
        import threading
        thread = threading.Thread(
            target=dispatcher.dispatch_sync,
            args=(event_type, run_id, step_id, data),
            daemon=True,
        )
        thread.start()
