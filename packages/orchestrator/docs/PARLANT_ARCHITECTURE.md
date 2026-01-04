# Parlant-Style MCP Orchestrator Architecture

```
█▀█ ▄▀█ █▀█ █   ▄▀█ █▄░█ ▀█▀
█▀▀ █▀█ █▀▄ █▄▄ █▀█ █░▀█ ░█░

█▀█ █▀█ █▀▀ █░█ █▀▀ █▀ ▀█▀ █▀█ ▄▀█ ▀█▀ █▀█ █▀█
█▄█ █▀▄ █▄▄ █▀█ ██▄ ▄█ ░█░ █▀▄ █▀█ ░█░ █▄█ █▀▄

🎯 Structured Governance for LLM Agents
   Beyond Prompt Engineering
```

## Table of Contents

1. [Introduction](#introduction)
2. [The Problem with Prompt-Based Programming](#the-problem-with-prompt-based-programming)
3. [Parlant Philosophy](#parlant-philosophy)
4. [Architecture Overview](#architecture-overview)
5. [Core Components](#core-components)
6. [Guidelines System](#guidelines-system)
7. [Step Contracts](#step-contracts)
8. [MCP Integration](#mcp-integration)
9. [Standards Integration](#standards-integration)
10. [Enterprise Features](#enterprise-features)
11. [Benefits](#benefits)
12. [Comparison](#comparison)

---

## Introduction

The **AI Orchestrator** is a Python-based governance engine that implements **Parlant-style structured control** for LLM agents. Instead of relying on prompt engineering alone, it provides:

- **Behavioral guidelines** as structured, prioritized entities
- **Step contracts** that define required inputs/outputs for each phase
- **External enforcement** independent of the model
- **Audit trails** for observability and debugging

This approach fundamentally changes how we control AI agents - from "hoping the prompt works" to "enforcing contracts programmatically".

---

## The Problem with Prompt-Based Programming

### Traditional Approach: Prompt Engineering

```
┌─────────────────────────────────────────────┐
│              SYSTEM PROMPT                  │
│                                             │
│  "You are a helpful assistant that..."     │
│  "Always follow security best practices"   │
│  "Never execute dangerous commands"        │
│  "Format output as JSON when asked"        │
│  ...                                        │
│  (thousands of tokens of instructions)      │
│                                             │
└─────────────────────────────────────────────┘
                    │
                    ▼
            ┌───────────────┐
            │   LLM Model   │
            │  (Black Box)  │
            └───────────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  Unpredictable      │
         │  Output             │
         │  (Hope it works!)   │
         └─────────────────────┘
```

### Problems with This Approach

| Problem | Description |
|---------|-------------|
| **No Enforcement** | Instructions in prompts are suggestions, not rules. The model can ignore them. |
| **Context Dilution** | Long prompts waste tokens and dilute important instructions. |
| **No Verification** | No way to verify the model followed instructions before acting. |
| **Inconsistency** | Same prompt can produce different results on different runs. |
| **No Audit Trail** | Impossible to trace why the model made specific decisions. |
| **Scaling Issues** | Adding more rules to prompts creates diminishing returns. |
| **Priority Conflicts** | When rules conflict, the model decides arbitrarily. |

### Real-World Failures

```python
# Example: Security prompt that failed
SYSTEM_PROMPT = """
You are a helpful coding assistant.
NEVER execute rm -rf or any destructive commands.
NEVER expose API keys in output.
"""

# User asks: "Clean up temp files and show me the API config"
# Model outputs: rm -rf /tmp/* && cat .env
# Why? Because "helpful" sometimes overrides "safe"
```

---

## Parlant Philosophy

### Core Principle: External Enforcement

Parlant separates **what the model produces** from **what gets executed**:

```
┌─────────────────────────────────────────────────────────────┐
│                    PARLANT ARCHITECTURE                      │
│                                                              │
│  ┌──────────────┐     ┌──────────────┐    ┌──────────────┐ │
│  │  Guidelines  │     │   Model      │    │  Validators  │ │
│  │  (Structured)│────▶│   Output     │───▶│  (External)  │ │
│  └──────────────┘     └──────────────┘    └──────────────┘ │
│         │                                        │          │
│         │              ┌──────────────┐          │          │
│         └─────────────▶│   Contract   │◀─────────┘          │
│                        │   Checker    │                     │
│                        └──────────────┘                     │
│                               │                              │
│                               ▼                              │
│                    ┌─────────────────────┐                  │
│                    │  PASS: Execute      │                  │
│                    │  FAIL: Retry/Block  │                  │
│                    └─────────────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Differences

| Aspect | Prompt-Based | Parlant-Style |
|--------|--------------|---------------|
| Rules | Embedded in prompts | Structured entities |
| Enforcement | Model's discretion | External validators |
| Priority | Implicit/unclear | Explicit numerical |
| Audit | None | Full event log |
| Recovery | Hope for the best | Structured retry hints |
| Testing | Manual verification | Automated contract checks |

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI ORCHESTRATOR v0.4.0                           │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Standards   │  │   Parlant    │  │     MCP      │  │    HTTP      │ │
│  │   Loader     │  │   Engine     │  │   Server     │  │   Server     │ │
│  │              │  │              │  │              │  │              │ │
│  │ • settings   │  │ • Guidelines │  │ • 11 Tools   │  │ • REST API   │ │
│  │ • Quality    │  │ • Contracts  │  │ • stdio      │  │ • Dashboard  │ │
│  │ • Stack Det  │  │ • Parallel   │  │ • HTTP/SSE   │  │ • SSE Stream │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │                  │       │
│         └──────────────────┼──────────────────┼──────────────────┘       │
│                            │                  │                          │
│  ┌──────────────┐  ┌───────┴───────┐  ┌──────┴───────┐  ┌──────────────┐│
│  │   Webhooks   │  │   MySQL DB    │  │   Locking    │  │   Metrics    ││
│  │              │  │               │  │              │  │              ││
│  │ • HMAC Sign  │  │ • Runs/Steps  │  │ • Advisory   │  │ • Prometheus ││
│  │ • Retry      │  │ • Events      │  │ • Step Lock  │  │ • Counters   ││
│  │ • Async      │  │ • Artifacts   │  │ • Run Lock   │  │ • Histograms ││
│  └──────────────┘  └───────────────┘  └──────────────┘  └──────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Request
     │
     ▼
┌─────────────────┐
│  orchestrate()  │ ◀── Creates run, loads guidelines
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  start_step()   │ ◀── Validates dependencies, sets contract
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Agent Work     │ ◀── Model executes with guidelines context
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  commit_step()  │ ◀── Validates output against contract
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 PASS      FAIL
    │         │
    │    ┌────┴────────┐
    │    │ Retry Hint  │
    │    │ Generated   │
    │    └─────────────┘
    │
    ▼
┌─────────────────┐
│   finalize()    │ ◀── Marks run complete, logs summary
└─────────────────┘
```

---

## Core Components

### 1. ParlantEngine

The central governance engine that manages guidelines and plans:

```python
from ai_orchestrator import ParlantEngine, Guideline, GuidelineCategory

# Initialize with auto-loaded guidelines from settings.json
engine = ParlantEngine()

# Or with custom guidelines
engine = ParlantEngine(guidelines=[
    Guideline(
        id="g-security-001",
        category=GuidelineCategory.SECURITY,
        name="no_destructive_commands",
        description="Never execute rm -rf, DROP DATABASE, or similar",
        priority=1,  # Highest priority
    )
])
```

### 2. StackDetector

Detects project technology stack for context-aware governance:

```python
from ai_orchestrator import StackDetector, Stack

detector = StackDetector("/path/to/project")
stacks = detector.detect()

# Returns list of StackInfo with confidence scores
# [StackInfo(stack=Stack.PHP_LARAVEL, confidence=0.95, indicators=[...])]

if detector.has_stack(Stack.PHP_LARAVEL):
    # Apply Laravel-specific guidelines
    pass
```

### 3. StandardsIntegration

Bridges the TypeScript standards package with Python orchestrator:

```python
from ai_orchestrator import get_standards

standards = get_standards()

# Check availability
if standards.is_available:
    # Load quality gates as guidelines
    guidelines = standards.guidelines  # List[Guideline]

    # Load agent content
    task_router = standards.load_agent_content("global", "task-router")

    # Get stack-specific guidelines
    laravel_guides = standards.get_guidelines_for_stack("php-laravel")
```

### 4. Validators

External enforcement of security and artifact rules:

```python
from ai_orchestrator import SecurityValidator, ArtifactValidator

# Security validation
security = SecurityValidator()
result = security.validate_command("rm -rf /")
# ValidationResult(valid=False, error="Blocked: destructive command")

# Artifact validation
artifacts = ArtifactValidator(repo_root="/project")
result = artifacts.validate_path("../../etc/passwd")
# ValidationResult(valid=False, error="Path escapes repository")
```

---

## Guidelines System

### Structure

Guidelines are **structured entities**, not prose:

```python
@dataclass
class Guideline:
    id: str                           # Unique identifier
    category: GuidelineCategory       # BEHAVIOR, SECURITY, QUALITY, CUSTOM
    name: str                         # Short identifier
    description: str                  # What to do
    priority: int = 100               # Lower = higher priority
    condition: Optional[Dict] = None  # When to apply
    is_active: bool = True            # Can be disabled
```

### Categories

| Category | Priority Range | Purpose |
|----------|---------------|---------|
| SECURITY | 1-20 | Command safety, secret protection |
| QUALITY | 21-60 | Code standards, test requirements |
| BEHAVIOR | 61-80 | Agent behavior, context management |
| CUSTOM | 81-100 | Project-specific rules |

### Conditional Application

Guidelines can be conditionally applied based on context:

```python
Guideline(
    id="g-laravel-001",
    category=GuidelineCategory.QUALITY,
    name="formrequest_validation",
    description="All controllers must use FormRequest for validation",
    priority=45,
    condition={"stack": ["php-laravel", "laravel"]},  # Only for Laravel
)
```

### Priority Resolution

When guidelines conflict, priority determines order:

```python
# Get applicable guidelines sorted by priority
context = {"stack": "php-laravel", "task_type": "api"}
guidelines = engine.get_applicable_guidelines(context)

# Returns: [security(1), security(2), quality(45), behavior(70), ...]
```

---

## Step Contracts

### Definition

Contracts define **required inputs and outputs** for each step:

```python
@dataclass
class StepContract:
    required_input: List[str]      # Required context keys
    required_output: List[str]     # Required result keys
    optional_output: List[str]     # Optional result keys
    severity: Literal["blocker", "warning", "info"]
    max_retries: int = 3
```

### Agent Contracts

Each agent type has predefined contracts:

```python
AGENT_CONTRACTS = {
    "researcher": StepContract(
        required_input=["task"],
        required_output=["findings", "recommendations"],
        optional_output=["files_examined"],
        severity="warning",
    ),
    "coder": StepContract(
        required_input=["task", "context"],
        required_output=["patch", "files_modified"],
        optional_output=["tests_added"],
        severity="blocker",  # Must produce valid patch
    ),
    "reviewer": StepContract(
        required_input=["patch"],
        required_output=["approved", "feedback"],
        optional_output=["suggestions"],
        severity="blocker",
    ),
}
```

### Validation

Contracts are validated **externally**, not by the model:

```python
def validate_step_output(step: PlanStep, output: Dict) -> ValidationResult:
    contract = step.contract

    # Check required fields
    for field in contract.required_output:
        if field not in output:
            return ValidationResult(
                valid=False,
                error=f"Missing required field: {field}",
                retry_hint=f"Ensure output includes '{field}' key",
            )

    return ValidationResult(valid=True)
```

---

## MCP Integration

### Protocol

The orchestrator exposes tools via Model Context Protocol (MCP):

```
┌─────────────────────────────────────────────┐
│              Claude Code CLI                │
│                                             │
│  claude mcp add ai-orchestrator-local ...   │
│                                             │
└─────────────────┬───────────────────────────┘
                  │ stdio/JSON-RPC
                  ▼
┌─────────────────────────────────────────────┐
│           MCP Server (FastMCP)              │
│                                             │
│  @mcp.tool()                                │
│  def orchestrate(task, constraints): ...    │
│                                             │
│  @mcp.tool()                                │
│  def commit_step(run_id, result): ...       │
│                                             │
└─────────────────────────────────────────────┘
```

### Available Tools

| Tool | Purpose | Returns |
|------|---------|---------|
| `orchestrate` | Start new run | run_id, plan, guidelines |
| `start_step` | Begin step execution | step context, contract |
| `commit_step` | Complete step | validation result |
| `finalize` | End run | summary, artifacts |
| `get_run` | Query run state | full run details |
| `list_runs` | List runs | paginated list |
| `get_step` | Query step | step details |
| `list_events` | Audit log | event stream |
| `get_guidelines` | Get applicable rules | filtered guidelines |
| `get_ready_steps` | Parallel execution | steps ready to run |
| `cancel_run` | Abort run | cancellation status |

### Setup in Claude Code

```bash
# 1. Start MySQL
docker run --name ai-orch-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=ai_orch \
  -e MYSQL_USER=ai_orch \
  -e MYSQL_PASSWORD=super-secret \
  -p 3306:3306 \
  -d mysql:8.0

# 2. Apply migrations
docker exec -i ai-orch-mysql mysql -uai_orch -psuper-secret ai_orch \
  < packages/orchestrator/migrations/mysql_001_init.sql

# 3. Install Python package
pip install -e packages/orchestrator

# 4. Set environment
export AI_ORCH_DB_HOST=localhost
export AI_ORCH_DB_USER=ai_orch
export AI_ORCH_DB_PASS=super-secret
export AI_ORCH_DB_NAME=ai_orch
export AI_ORCH_REPO_ROOT=/path/to/your/project
export AI_ORCH_ARTIFACTS_DIR=/path/to/.ai/artifacts

# 5. Register MCP server
claude mcp add ai-orchestrator-local '{
  "type": "stdio",
  "command": "python",
  "args": ["-m", "ai_orchestrator.server"]
}'
```

---

## Standards Integration

### Data Flow

```
packages/standards/config/settings.json
                │
                ▼
┌───────────────────────────────────┐
│       standards_loader.py         │
│                                   │
│  find_standards_path()            │
│  load_settings()                  │
│  quality_gates_to_guidelines()    │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│        List[Guideline]            │
│                                   │
│  qg-database-no_offset_1000       │
│  qg-php_laravel-formrequest       │
│  qg-security-no_pii_logs          │
│  ...                              │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│         ParlantEngine             │
│                                   │
│  self._guidelines = [             │
│    standards_guidelines +          │
│    default_guidelines             │
│  ]                                │
└───────────────────────────────────┘
```

### Quality Gate Mapping

```python
# settings.json structure
{
  "quality_gates": {
    "database": {
      "no_offset_over_1000": {
        "enabled": true,
        "message": "BLOCKED: Use keyset pagination instead of OFFSET > 1000"
      }
    },
    "php_laravel": {
      "formrequest_required": {
        "enabled": true,
        "message": "Controllers must use FormRequest for validation"
      }
    }
  }
}

# Converted to Guidelines
Guideline(
    id="qg-database-no_offset_over_1000",
    category=GuidelineCategory.QUALITY,
    name="no_offset_over_1000",
    description="BLOCKED: Use keyset pagination instead of OFFSET > 1000",
    priority=21,  # database priority range
    condition=None,  # applies to all
)

Guideline(
    id="qg-php_laravel-formrequest_required",
    category=GuidelineCategory.QUALITY,
    name="formrequest_required",
    description="Controllers must use FormRequest for validation",
    priority=41,  # php_laravel priority range
    condition={"stack": ["php-laravel", "laravel", "php"]},
)
```

---

## Enterprise Features

Version 0.4.0 introduces enterprise-grade capabilities for production deployments.

### 1. Webhooks

External event notifications with security and reliability:

```python
from ai_orchestrator import dispatch_webhook, WebhookConfig

# Events automatically dispatched:
# - run.created    → When orchestrate() is called
# - run.completed  → When finalize() succeeds
# - run.cancelled  → When cancel_run() is called
# - step.started   → When start_step() is called
# - step.accepted  → When commit_step() passes validation
# - step.rejected  → When commit_step() fails validation

# Custom webhook dispatch
dispatch_webhook(
    "custom.event",
    run_id="run-123",
    data={"key": "value"}
)
```

Features:
- **HMAC-SHA256 signing** for payload verification
- **Exponential backoff** retry logic (up to 3 retries)
- **Async dispatch** (non-blocking, fire-and-forget)
- **Event filtering** per webhook configuration

### 2. Prometheus Metrics

Full observability for monitoring and alerting:

```python
from ai_orchestrator import get_metrics, start_metrics_server

# Start metrics endpoint
start_metrics_server(port=9090)

# Metrics automatically collected:
metrics = get_metrics()

# Manual recording
metrics.run_started()
metrics.run_completed("done", duration_seconds=10.5)
metrics.step_completed("coder", "accepted", duration_seconds=5.2)
```

Available metrics:
| Metric | Type | Labels |
|--------|------|--------|
| `orchestrator_runs_total` | Counter | status |
| `orchestrator_steps_total` | Counter | agent, status |
| `orchestrator_retries_total` | Counter | agent |
| `orchestrator_active_runs` | Gauge | - |
| `orchestrator_active_steps` | Gauge | - |
| `orchestrator_run_duration_seconds` | Histogram | status |
| `orchestrator_step_duration_seconds` | Histogram | agent |
| `orchestrator_tool_call_duration_seconds` | Histogram | tool |

### 3. Transactional Locking

MySQL advisory locks prevent race conditions in concurrent environments:

```python
from ai_orchestrator import get_lock_manager, LockTimeout

lock_manager = get_lock_manager()

# Step-level lock (for commit_step)
try:
    with lock_manager.acquire_step_lock("run-123", step_id=1, timeout_seconds=10):
        # Exclusive access to this step
        process_step()
except LockTimeout:
    print("Step is being processed by another worker")

# Run-level lock (for finalize)
with lock_manager.acquire_run_lock("run-123", timeout_seconds=10):
    # Exclusive access to entire run
    finalize_run()
```

Features:
- **Non-blocking** with configurable timeout
- **Session-based** (released on disconnect)
- **Re-entrant** within same session
- **Decorators** `@with_step_lock` and `@with_run_lock`

### 4. Parallel Step Execution

Execute independent steps concurrently:

```python
# Steps with parallel_group can run simultaneously
plan = engine.propose_plan(
    task="Build feature",
    constraints={"parallel": True}
)

# Returns steps like:
# Step 1: Research (no dependencies)
# Step 2: Frontend code (depends on 1, parallel_group=2)
# Step 3: Backend code (depends on 1, parallel_group=2)
# Step 4: Integration (depends on 2, 3)

# Query ready steps
ready = get_ready_steps(run_id)
# Returns steps whose dependencies are all satisfied
```

### 5. HTTP Server / REST API

Starlette-based server for dashboard and remote access:

```bash
# Start with HTTP transport
python -m ai_orchestrator.server \
    --transport http \
    --port 8080 \
    --metrics-port 9090
```

REST API endpoints:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/metrics` | GET | Prometheus metrics |
| `/api/stats` | GET | Overall statistics |
| `/api/runs` | GET | Paginated runs list |
| `/api/runs/{id}` | GET | Run details with steps |
| `/api/events` | GET | Event list |
| `/api/events/stream` | GET | SSE real-time events |
| `/api/guidelines` | GET | Active guidelines |
| `/mcp/invoke` | POST | MCP tool invocation |

### Installation

```bash
# Core only
pip install ai-orchestrator

# With specific features
pip install "ai-orchestrator[webhooks]"    # httpx
pip install "ai-orchestrator[metrics]"     # prometheus-client
pip install "ai-orchestrator[http]"        # starlette, uvicorn, sse-starlette

# All enterprise features
pip install "ai-orchestrator[enterprise]"

# Everything including dev tools
pip install "ai-orchestrator[all]"
```

---

## Benefits

### 1. Deterministic Enforcement

```python
# Before: Hope the model follows the rule
prompt = "Never use SELECT *"

# After: Enforce externally
def validate_sql(query: str) -> ValidationResult:
    if "SELECT *" in query.upper():
        return ValidationResult(
            valid=False,
            error="SELECT * is not allowed",
            suggestion="Specify explicit columns"
        )
    return ValidationResult(valid=True)
```

### 2. Prioritized Rules

```
Priority 1:  [SECURITY] Never execute destructive commands
Priority 5:  [SECURITY] Never expose secrets
Priority 20: [QUALITY]  Use prepared statements for SQL
Priority 45: [QUALITY]  Laravel: Use FormRequest
Priority 70: [BEHAVIOR] Keep responses concise
```

When conflicts arise, higher priority wins deterministically.

### 3. Context-Aware Application

```python
# Only applies to Laravel projects
if detector.has_stack(Stack.PHP_LARAVEL):
    guidelines.extend(standards.get_guidelines_for_stack("php-laravel"))

# Only applies to API tasks
if context.get("task_type") == "api":
    guidelines.append(api_versioning_guideline)
```

### 4. Structured Recovery

```python
# When step fails, get actionable hint
hint = engine.generate_retry_hint(
    step_id=2,
    error="Missing required field: patch",
    attempt=1,
    context={"task": "fix bug"}
)

# Returns:
# "Retry step 2 (attempt 2).
#  Previous error: Missing required field: patch
#
#  Recovery instructions:
#  - Ensure you generate a .patch or .diff file
#  - Run: git diff > ./.ai/tmp/diff.patch
#
#  Governance guidelines to follow:
#  - Always follow step contracts strictly
#  - Keep each step focused on its specific goal"
```

### 5. Complete Audit Trail

```sql
SELECT event_type, step_id, payload, created_at
FROM orch_events
WHERE run_id = 'run-123'
ORDER BY created_at;

-- Results:
-- run_started     NULL  {"task": "implement auth"}        2024-01-01 10:00:00
-- step_started    1     {"agent": "researcher"}           2024-01-01 10:00:01
-- step_completed  1     {"findings": [...]}               2024-01-01 10:00:15
-- step_started    2     {"agent": "coder"}                2024-01-01 10:00:16
-- step_failed     2     {"error": "missing patch"}        2024-01-01 10:00:30
-- step_retried    2     {"attempt": 2}                    2024-01-01 10:00:31
-- step_completed  2     {"patch": "..."}                  2024-01-01 10:00:45
-- run_completed   NULL  {"success": true}                 2024-01-01 10:01:00
```

---

## Comparison

### Prompt-Based vs Parlant-Style

| Feature | Prompt-Based | Parlant-Style |
|---------|--------------|---------------|
| Rule definition | Natural language in prompt | Structured Guideline objects |
| Enforcement | Model's interpretation | External validators |
| Priority | Implicit (order in prompt) | Explicit (numerical) |
| Conditions | Embedded in prose | Structured conditions |
| Conflict resolution | Unpredictable | Deterministic by priority |
| Audit trail | None | Full event logging |
| Recovery | Repeat prompt | Structured retry hints |
| Testing | Manual | Automated contract validation |
| Scaling | Diminishing returns | Linear addition |
| Token usage | High (repeated rules) | Low (structured reference) |

### When to Use Each

**Use Prompt-Based when:**
- Simple, one-shot tasks
- No security concerns
- No need for audit trail
- Prototyping/experimentation

**Use Parlant-Style when:**
- Enterprise/production systems
- Security-critical operations
- Multi-step workflows
- Compliance requirements
- Need for auditability
- Team environments with shared standards

---

## Conclusion

The Parlant-style orchestrator transforms LLM agent governance from:

> "Write instructions and hope the model follows them"

To:

> "Define contracts, enforce them externally, audit everything"

This approach is essential for enterprise AI systems where reliability, security, and auditability are non-negotiable requirements.

---

## Further Reading

- [Parlant Project](https://github.com/parlant-ai/parlant)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [FastMCP Documentation](https://github.com/jlowin/fastmcp)
- [AI Enterprise Monorepo](../README.md)

---

*Document Version: 2.0.0*
*Last Updated: January 2025*
*Orchestrator Version: 0.4.0 (Enterprise Features)*
