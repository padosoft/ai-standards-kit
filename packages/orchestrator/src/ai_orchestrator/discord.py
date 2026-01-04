"""Discord notification service for AI Orchestrator.

Provides:
1. Critical alerts to a designated channel
2. Weekly summary reports to a separate channel
3. Rich embeds with run information
"""
from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Check if httpx is available
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False


@dataclass
class DiscordEmbed:
    """Discord embed structure."""
    title: str
    description: str = ""
    color: int = 3447003  # Blue
    fields: Optional[List[Dict[str, Any]]] = None
    footer: Optional[Dict[str, str]] = None
    timestamp: Optional[str] = None
    thumbnail: Optional[Dict[str, str]] = None
    url: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        embed = {
            "title": self.title,
            "description": self.description,
            "color": self.color,
        }
        if self.fields:
            embed["fields"] = self.fields
        if self.footer:
            embed["footer"] = self.footer
        if self.timestamp:
            embed["timestamp"] = self.timestamp
        if self.thumbnail:
            embed["thumbnail"] = self.thumbnail
        if self.url:
            embed["url"] = self.url
        return embed


# Color codes for different alert types
COLORS = {
    "critical": 15158332,  # Red
    "warning": 15105570,   # Orange
    "info": 3447003,       # Blue
    "success": 3066993,    # Green
    "error": 15158332,     # Red
}


class DiscordNotifier:
    """Discord notification service."""

    def __init__(self, alerts_webhook: Optional[str] = None, summary_webhook: Optional[str] = None):
        """Initialize Discord notifier.

        Args:
            alerts_webhook: Webhook URL for critical alerts
            summary_webhook: Webhook URL for weekly summaries
        """
        self.alerts_webhook = alerts_webhook
        self.summary_webhook = summary_webhook

    @classmethod
    def from_settings(cls) -> "DiscordNotifier":
        """Create notifier from database settings."""
        from .db_mysql import MySQLDB, load_db_config

        db = MySQLDB(load_db_config())

        alerts_webhook = None
        summary_webhook = None

        try:
            with db._pool.connection() as conn:
                cur = conn.cursor()
                cur.execute("""
                    SELECT setting_key, setting_value FROM settings
                    WHERE setting_key IN ('discord_alerts_webhook', 'discord_summary_webhook')
                """)
                for row in cur.fetchall():
                    value = json.loads(row["setting_value"]) if row["setting_value"] else None
                    if row["setting_key"] == "discord_alerts_webhook" and value:
                        alerts_webhook = value
                    elif row["setting_key"] == "discord_summary_webhook" and value:
                        summary_webhook = value
        except Exception as e:
            logger.warning(f"Failed to load Discord settings: {e}")

        return cls(alerts_webhook=alerts_webhook, summary_webhook=summary_webhook)

    async def send_webhook(self, webhook_url: str, embeds: List[DiscordEmbed], content: Optional[str] = None) -> bool:
        """Send a webhook message to Discord.

        Args:
            webhook_url: Discord webhook URL
            embeds: List of embeds to send
            content: Optional text content

        Returns:
            True if successful, False otherwise
        """
        if not HTTPX_AVAILABLE:
            logger.warning("httpx not installed, cannot send Discord notifications")
            return False

        if not webhook_url:
            logger.debug("No webhook URL configured")
            return False

        payload = {
            "embeds": [e.to_dict() for e in embeds],
        }
        if content:
            payload["content"] = content

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    timeout=10,
                )
                if response.status_code >= 400:
                    logger.error(f"Discord webhook failed: {response.status_code} - {response.text}")
                    return False
                return True
        except Exception as e:
            logger.error(f"Failed to send Discord notification: {e}")
            return False

    async def send_alert(
        self,
        title: str,
        message: str,
        severity: str = "info",
        run_id: Optional[str] = None,
        fields: Optional[List[Dict[str, Any]]] = None,
    ) -> bool:
        """Send an alert notification.

        Args:
            title: Alert title
            message: Alert message
            severity: One of 'critical', 'warning', 'info', 'success', 'error'
            run_id: Optional related run ID
            fields: Optional additional fields

        Returns:
            True if sent successfully
        """
        if not self.alerts_webhook:
            return False

        embed = DiscordEmbed(
            title=f"{'🚨' if severity == 'critical' else '⚠️' if severity == 'warning' else 'ℹ️'} {title}",
            description=message,
            color=COLORS.get(severity, COLORS["info"]),
            timestamp=datetime.now(timezone.utc).isoformat(),
            footer={"text": "AI Orchestrator"},
        )

        if fields:
            embed.fields = fields

        if run_id:
            embed.fields = embed.fields or []
            embed.fields.append({
                "name": "Run ID",
                "value": f"`{run_id}`",
                "inline": True,
            })

        return await self.send_webhook(self.alerts_webhook, [embed])

    async def send_run_failed_alert(self, run_id: str, task: str, error: Optional[str] = None) -> bool:
        """Send an alert when a run fails.

        Args:
            run_id: The failed run ID
            task: The task description
            error: Optional error message

        Returns:
            True if sent successfully
        """
        fields = [
            {"name": "Task", "value": task[:100] + "..." if len(task) > 100 else task, "inline": False},
        ]
        if error:
            fields.append({
                "name": "Error",
                "value": f"```{error[:500]}```" if len(error) > 500 else f"```{error}```",
                "inline": False,
            })

        return await self.send_alert(
            title="Run Failed",
            message=f"Run `{run_id}` has failed",
            severity="critical",
            run_id=run_id,
            fields=fields,
        )

    async def send_run_completed_alert(self, run_id: str, task: str, duration_seconds: float, steps_completed: int) -> bool:
        """Send an alert when a run completes.

        Args:
            run_id: The completed run ID
            task: The task description
            duration_seconds: How long the run took
            steps_completed: Number of steps completed

        Returns:
            True if sent successfully
        """
        fields = [
            {"name": "Task", "value": task[:100] + "..." if len(task) > 100 else task, "inline": False},
            {"name": "Duration", "value": f"{duration_seconds:.1f}s", "inline": True},
            {"name": "Steps", "value": str(steps_completed), "inline": True},
        ]

        return await self.send_alert(
            title="Run Completed",
            message=f"Run `{run_id}` completed successfully",
            severity="success",
            run_id=run_id,
            fields=fields,
        )

    async def send_weekly_summary(self) -> bool:
        """Send the weekly summary report.

        Returns:
            True if sent successfully
        """
        if not self.summary_webhook:
            return False

        from .db_mysql import MySQLDB, load_db_config

        db = MySQLDB(load_db_config())

        # Get stats for the past week
        with db._pool.connection() as conn:
            cur = conn.cursor()

            # Total runs this week
            cur.execute("""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as avg_duration
                FROM runs
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            """)
            run_stats = cur.fetchone()

            # Steps stats
            cur.execute("""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                    SUM(retry_count) as total_retries
                FROM steps
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            """)
            step_stats = cur.fetchone()

            # Top failing tasks
            cur.execute("""
                SELECT task, COUNT(*) as failures
                FROM runs
                WHERE status = 'failed'
                    AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY task
                ORDER BY failures DESC
                LIMIT 3
            """)
            top_failures = cur.fetchall()

        # Calculate success rate
        total = run_stats["total"] or 0
        completed = run_stats["completed"] or 0
        failed = run_stats["failed"] or 0
        success_rate = (completed / (completed + failed) * 100) if (completed + failed) > 0 else 100

        # Build the summary embed
        embed = DiscordEmbed(
            title="📊 Weekly Summary Report",
            description=f"AI Orchestrator activity for the past 7 days",
            color=COLORS["info"],
            timestamp=datetime.now(timezone.utc).isoformat(),
            footer={"text": "AI Orchestrator - Weekly Report"},
            fields=[
                {"name": "📈 Total Runs", "value": str(total), "inline": True},
                {"name": "✅ Completed", "value": str(completed), "inline": True},
                {"name": "❌ Failed", "value": str(failed), "inline": True},
                {"name": "📊 Success Rate", "value": f"{success_rate:.1f}%", "inline": True},
                {"name": "⏱️ Avg Duration", "value": f"{(run_stats['avg_duration'] or 0):.1f}s", "inline": True},
                {"name": "🔄 Total Retries", "value": str(step_stats["total_retries"] or 0), "inline": True},
            ],
        )

        # Add top failures if any
        if top_failures:
            failure_list = "\n".join([
                f"• {row['task'][:40]}... ({row['failures']} failures)"
                for row in top_failures
            ])
            embed.fields.append({
                "name": "⚠️ Top Failing Tasks",
                "value": failure_list,
                "inline": False,
            })

        return await self.send_webhook(self.summary_webhook, [embed])


# =============================================================================
# EVENT HOOKS
# =============================================================================

async def on_run_failed(run_id: str, task: str, error: Optional[str] = None) -> None:
    """Called when a run fails. Sends Discord notification if enabled."""
    try:
        from .db_mysql import MySQLDB, load_db_config
        import uuid

        db = MySQLDB(load_db_config())

        # Check if notifications are enabled
        with db._pool.connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT setting_value FROM settings WHERE setting_key = 'notify_on_failure'")
            row = cur.fetchone()
            if not row or not json.loads(row["setting_value"]):
                return

            # Create alert in database
            alert_id = str(uuid.uuid4())
            cur.execute("""
                INSERT INTO alerts (alert_id, severity, title, message, source, run_id)
                VALUES (%s, 'critical', 'Run Failed', %s, 'orchestrator', %s)
            """, (alert_id, error or "Run failed without error message", run_id))
            conn.commit()

        # Send Discord notification
        notifier = DiscordNotifier.from_settings()
        await notifier.send_run_failed_alert(run_id, task, error)

    except Exception as e:
        logger.error(f"Failed to process run failure notification: {e}")


async def on_run_completed(run_id: str, task: str, duration_seconds: float, steps_completed: int) -> None:
    """Called when a run completes. Sends Discord notification if enabled."""
    try:
        from .db_mysql import MySQLDB, load_db_config

        db = MySQLDB(load_db_config())

        # Check if notifications are enabled
        with db._pool.connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT setting_value FROM settings WHERE setting_key = 'notify_on_completion'")
            row = cur.fetchone()
            if not row or not json.loads(row["setting_value"]):
                return

        # Send Discord notification
        notifier = DiscordNotifier.from_settings()
        await notifier.send_run_completed_alert(run_id, task, duration_seconds, steps_completed)

    except Exception as e:
        logger.error(f"Failed to process run completion notification: {e}")


# =============================================================================
# SCHEDULED TASKS
# =============================================================================

async def send_weekly_summary_task() -> None:
    """Scheduled task to send weekly summary. Run this every Sunday."""
    try:
        notifier = DiscordNotifier.from_settings()
        await notifier.send_weekly_summary()
        logger.info("Weekly summary sent successfully")
    except Exception as e:
        logger.error(f"Failed to send weekly summary: {e}")


def schedule_weekly_summary(loop: asyncio.AbstractEventLoop = None) -> None:
    """Schedule the weekly summary task.

    This should be called when the application starts. It calculates the
    time until next Sunday at 9:00 AM and schedules the task.
    """
    if loop is None:
        loop = asyncio.get_event_loop()

    async def weekly_loop():
        while True:
            # Calculate time until next Sunday 9:00 AM
            now = datetime.now(timezone.utc)
            days_until_sunday = (6 - now.weekday()) % 7
            if days_until_sunday == 0 and now.hour >= 9:
                days_until_sunday = 7

            next_sunday = now.replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=days_until_sunday)
            wait_seconds = (next_sunday - now).total_seconds()

            logger.info(f"Next weekly summary scheduled in {wait_seconds / 3600:.1f} hours")
            await asyncio.sleep(wait_seconds)

            await send_weekly_summary_task()

    loop.create_task(weekly_loop())
