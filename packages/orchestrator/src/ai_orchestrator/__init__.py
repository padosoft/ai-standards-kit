"""AI Orchestrator - Parlant-style governance for Claude Code.

This package provides an MCP server that implements structured governance
for LLM-based agents, following the Parlant philosophy:

1. Guidelines as structured behavioral rules (not prompt text)
2. Task decomposition into governed steps
3. Contract enforcement external to the model
4. Audit trail and observability

The orchestrator integrates with @padosoft/ai-standards to load:
- Quality gates from settings.json → converted to Guidelines
- Stack detection for context-aware governance
- Agent and standard document loading

Enterprise features:
- Webhook notifications for external integrations
- Prometheus metrics for observability
- MySQL advisory locks for concurrent access
- Parallel step execution with dependency resolution
- HTTP/REST API for dashboard and remote deployment
"""

__version__ = "0.4.0"

from .config import get_config, OrchestratorConfig
from .contracts import (
    StepContract,
    StepOutput,
    TestResult,
    AgentConfig,
    get_agent_contract,
)
from .parlant_adapter import (
    ParlantEngine,
    Guideline,
    GuidelineCategory,
    ExecutionPlan,
    PlanStep,
)
from .validators import (
    validate_output,
    validate_output_full,
    SecurityValidator,
    ArtifactValidator,
    ValidationResult,
)
from .artifacts_fs import ArtifactStore, ArtifactMeta
from .db_mysql import MySQLDB
from .standards_loader import (
    StandardsIntegration,
    get_standards,
    find_standards_path,
    load_settings,
    quality_gates_to_guidelines,
)
from .stack_detector import (
    Stack,
    StackInfo,
    StackDetector,
    detect_stacks,
    detect_stacks_detailed,
)
from .webhooks import (
    WebhookConfig,
    WebhookEvent,
    WebhookDispatcher,
    dispatch_webhook,
    get_webhook_dispatcher,
)
from .metrics import (
    MetricsCollector,
    get_metrics,
    start_metrics_server,
    get_metrics_text,
    timed_tool,
)
from .locking import (
    LockManager,
    LockResult,
    LockTimeout,
    get_lock_manager,
    with_step_lock,
    with_run_lock,
)
# HTTP Server - lazy import to avoid circular dependency
def create_http_app():
    from .http_server import create_app
    return create_app()

# MCP Server - lazy import to avoid fastmcp dependency at load time
def run_server(*args, **kwargs):
    from .server import run_server as _run_server
    return _run_server(*args, **kwargs)

__all__ = [
    # Config
    "get_config",
    "OrchestratorConfig",
    # Contracts
    "StepContract",
    "StepOutput",
    "TestResult",
    "AgentConfig",
    "get_agent_contract",
    # Parlant
    "ParlantEngine",
    "Guideline",
    "GuidelineCategory",
    "ExecutionPlan",
    "PlanStep",
    # Validators
    "validate_output",
    "validate_output_full",
    "SecurityValidator",
    "ArtifactValidator",
    "ValidationResult",
    # Artifacts
    "ArtifactStore",
    "ArtifactMeta",
    # Database
    "MySQLDB",
    # Standards Integration
    "StandardsIntegration",
    "get_standards",
    "find_standards_path",
    "load_settings",
    "quality_gates_to_guidelines",
    # Stack Detection
    "Stack",
    "StackInfo",
    "StackDetector",
    "detect_stacks",
    "detect_stacks_detailed",
    # Webhooks
    "WebhookConfig",
    "WebhookEvent",
    "WebhookDispatcher",
    "dispatch_webhook",
    "get_webhook_dispatcher",
    # Metrics
    "MetricsCollector",
    "get_metrics",
    "start_metrics_server",
    "get_metrics_text",
    "timed_tool",
    # Locking
    "LockManager",
    "LockResult",
    "LockTimeout",
    "get_lock_manager",
    "with_step_lock",
    "with_run_lock",
    # HTTP Server
    "create_http_app",
    "run_server",
]
