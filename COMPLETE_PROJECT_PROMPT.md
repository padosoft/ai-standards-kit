# COMPLETE PROJECT PROMPT - AI Enterprise Monorepo

```
▄▀█ █   █▀ ▀█▀ ▄▀█ █▄░█ █▀▄ ▄▀█ █▀█ █▀▄ █▀
█▀█ █   ▄█  █  █▀█ █░▀█ █▄▀ █▀█ █▀▄ █▄▀ ▄█

█▀▀ █▄░█ ▀█▀ █▀▀ █▀█ █▀█ █▀█ █ █▀ █▀▀
██▄ █░▀█ ░█░ ██▄ █▀▄ █▀▀ █▀▄ █ ▄█ ██▄
🤖 Enterprise AI Engineering Platform
   Standards + CLI + Parlant Orchestrator
   by Lorenzo Padovani - Padosoft
                     COMPLETE PROJECT RECREATION PROMPT v2.1
```

## PROJECT OVERVIEW

**@padosoft/ai-enterprise** is an enterprise monorepo containing:

1. **@padosoft/ai-standards** - Single Source of Truth (SSOT) for AI standards, agents, and quality gates
2. **@padosoft/ai-cli** - TypeScript CLI for syncing, harvesting, and exporting to multiple AI tools
3. **@padosoft/ai-orchestrator** - Python Parlant-style governance engine with MCP tools

---

## 📁 MONOREPO STRUCTURE

```
ai-enterprise/                              # Root monorepo
├── package.json                            # Workspace configuration (@padosoft/ai-enterprise)
├── tsconfig.json                           # TypeScript project references
├── .gitignore                              # Git ignores for all packages
├── LICENSE                                 # MIT License
├── README.md                               # Main documentation
├── COMPLETE_PROJECT_PROMPT.md              # This file - project recreation guide
│
├── packages/
│   ├── cli/                                # @padosoft/ai-cli - TypeScript CLI
│   │   ├── package.json                    # CLI package with bin entries
│   │   ├── tsconfig.json                   # CLI TypeScript config
│   │   ├── src/
│   │   │   ├── sync/
│   │   │   │   ├── cli.ts                  # Main CLI entry point
│   │   │   │   ├── build.ts                # Export builder for all targets
│   │   │   │   ├── harvest.ts              # Dependency scanner (npm/composer)
│   │   │   │   ├── validate.ts             # Configuration validator
│   │   │   │   └── utils.ts                # Utilities (paths, parsing, stack detection)
│   │   │   └── example-command.ts          # Example CLI built with node-command-builder
│   │   ├── dist/                           # Compiled JavaScript output
│   │   └── adapters/
│   │       ├── config/
│   │       │   └── targets.yml             # Export targets for AI tools
│   │       └── templates/                  # Headers/footers for each tool
│   │           ├── copilot_header.md
│   │           ├── cursor_header.md
│   │           ├── gemini_header.md
│   │           ├── windsurf_header.md
│   │           ├── augment_header.md
│   │           └── ...
│   │
│   ├── standards/                          # @padosoft/ai-standards - SSOT
│   │   ├── package.json                    # Standards package with exports
│   │   ├── index.js                        # API for loading standards programmatically
│   │   ├── agents/                         # Claude agents (SSOT)
│   │   │   ├── global/                     # Global agents
│   │   │   │   ├── task-router.md          # Multi-stack orchestrator
│   │   │   │   ├── docs-writer.md          # Documentation specialist
│   │   │   │   ├── test-writer.md          # Test strategy architect
│   │   │   │   ├── code-reviewer.md        # Security/performance auditor
│   │   │   │   ├── adapter-builder.md      # AI tool adapter specialist
│   │   │   │   ├── node-command-builder.md # CLI builder agent
│   │   │   │   ├── git-commit-expert.md    # Git commit specialist
│   │   │   │   └── ai-kit-debug-reporter.md # Debug visibility system
│   │   │   ├── detective/                  # Debugging detective agents
│   │   │   │   ├── debugging-detective.md  # Main orchestrator
│   │   │   │   ├── error-triage.md         # Error analysis
│   │   │   │   ├── perf-doctor.md          # Performance optimization
│   │   │   │   └── sql-surgeon.md          # Database optimization
│   │   │   └── cloudflare/                 # Cloudflare-specific agents
│   │   │       └── cf-workers-agent.md
│   │   ├── docs/                           # Standards documentation
│   │   │   ├── debug-mode.md               # Debug mode guide
│   │   │   ├── detective/                  # Detective documentation
│   │   │   │   ├── README.md
│   │   │   │   └── configuration-reference.md
│   │   │   └── standards/                  # Stack-specific standards
│   │   │       ├── global/                 # Universal rules
│   │   │       │   ├── cache.md
│   │   │       │   ├── ci.md
│   │   │       │   └── logging.md
│   │   │       ├── php-laravel/            # Laravel standards
│   │   │       ├── ts-hono/                # TypeScript/Hono standards
│   │   │       ├── cf-workers/             # Cloudflare Workers standards
│   │   │       ├── react-native/           # React Native standards
│   │   │       ├── bash/                   # Bash scripting standards
│   │   │       └── bat/                    # Windows batch standards
│   │   ├── config/                         # Configuration files
│   │   │   ├── settings.json               # Quality gates and policies
│   │   │   ├── detective-settings.json     # Detective operational settings
│   │   │   └── mcp-providers.json          # MCP server configurations
│   │   ├── providers/                      # Provider abstractions
│   │   │   ├── database-provider.md
│   │   │   └── search-provider.md
│   │   ├── adapters/                       # MCP adapters
│   │   │   ├── mysql-benborla-adapter.md
│   │   │   └── elastic-official-adapter.md
│   │   └── scripts/                        # Utility scripts
│   │
│   └── orchestrator/                       # Python Parlant orchestrator
│       ├── pyproject.toml                  # Python package config (v0.4.0)
│       ├── INTEGRATION_STRATEGY.md         # Integration documentation
│       ├── migrations/
│       │   ├── mysql_001_init.sql          # Base schema
│       │   └── mysql_002_parallel_steps.sql # Enterprise extensions (v0.4.0)
│       ├── tests/
│       │   └── test_integration.py         # Integration tests
│       └── src/
│           └── ai_orchestrator/
│               ├── __init__.py             # Package exports (v0.4.0)
│               ├── server.py               # MCP server with 11 tools
│               ├── config.py               # Centralized configuration
│               ├── contracts.py            # Step contracts with severity
│               ├── validators.py           # Security and artifact validators
│               ├── artifacts_fs.py         # Artifact storage with validation
│               ├── db_mysql.py             # MySQL with connection pooling
│               ├── parlant_adapter.py      # Full Parlant engine with parallel steps
│               ├── standards_loader.py     # Standards package integration
│               ├── stack_detector.py       # Python port of detectStacks()
│               ├── webhooks.py             # Webhook dispatcher with HMAC signing
│               ├── metrics.py              # Prometheus metrics collection
│               ├── locking.py              # MySQL advisory locks
│               └── http_server.py          # REST API and MCP-over-HTTP
│
├── .claude/                                # Claude Code project config
│   └── ...
│
├── detective-control.ps1                   # Windows detective control script
└── detective-control.sh                    # Unix detective control script
```

---

## 📋 IMPLEMENTATION PHASES

### Phase 1: Monorepo Foundation

- [x] **1.1** Create root `package.json` with npm workspaces
  ```json
  {
    "name": "@padosoft/ai-enterprise",
    "version": "2.0.0",
    "private": true,
    "workspaces": ["packages/*"],
    "scripts": {
      "build": "npm run build --workspaces",
      "build:cli": "npm run build --workspace=@padosoft/ai-cli"
    }
  }
  ```

- [x] **1.2** Create root `tsconfig.json` with project references
  ```json
  {
    "compilerOptions": { ... },
    "references": [{ "path": "./packages/cli" }],
    "files": []
  }
  ```

- [x] **1.3** Create `.gitignore` for monorepo

### Phase 2: Standards Package (@padosoft/ai-standards)

- [x] **2.1** Create `packages/standards/package.json`
  - Package name: `@padosoft/ai-standards`
  - Version: `2.0.0`
  - Type: `module`
  - Exports for agents, docs, config

- [x] **2.2** Create `packages/standards/index.js` with API
  - `getStandardsPath()` - Root path
  - `loadSettings()` - Quality gates
  - `loadAgent(category, name)` - Load agent content
  - `loadStandard(stack, name)` - Load standard content

- [x] **2.3** Migrate agents from `ai/.claude/agents/` to `packages/standards/agents/`

- [x] **2.4** Migrate docs from `ai/docs/` to `packages/standards/docs/`

- [x] **2.5** Migrate config from `ai/.claude/config/` to `packages/standards/config/`

### Phase 3: CLI Package (@padosoft/ai-cli)

- [x] **3.1** Create `packages/cli/package.json`
  - Package name: `@padosoft/ai-cli`
  - Version: `2.0.0`
  - Bin entries: `ai-standards`, `ai`
  - Dependencies: `@padosoft/ai-standards`, `fast-glob`, `js-yaml`, etc.

- [x] **3.2** Create `packages/cli/tsconfig.json`
  - Composite: true for project references
  - OutDir: `dist`

- [x] **3.3** Update `packages/cli/src/sync/utils.ts`
  - Add `getStandardsPath()` - Resolves standards package location
  - Add `getCliPath()` - Resolves CLI package location
  - Works in both monorepo and installed package scenarios

- [x] **3.4** Update `packages/cli/src/sync/build.ts`
  - Use `STANDARDS_PATH` for resolving includes
  - Use `CLI_PATH` for templates
  - Map old `ai/` paths to new package structure

- [x] **3.5** Update `packages/cli/src/sync/cli.ts`
  - Remove JSON import (use dynamic loading)
  - Update `bootstrapUser()` to use standards package
  - Update all path references

- [x] **3.6** Migrate adapters to `packages/cli/adapters/`

### Phase 4: Orchestrator Package (Python)

- [x] **4.1** Create `packages/orchestrator/pyproject.toml`
  - Name: `ai-orchestrator`
  - Version: `2.1.0`
  - Dependencies: `fastmcp`, `pydantic`, `mysqlclient`

- [x] **4.2** Migrate Python source to `packages/orchestrator/src/ai_orchestrator/`

- [x] **4.3** Create enterprise migrations in `packages/orchestrator/migrations/`

- [x] **4.4** Implement full Parlant engine in `parlant_adapter.py`
  - Guidelines as structured entities (not prompt text)
  - Retry hints with context
  - Execution plans with step contracts

- [x] **4.5** Implement MCP server with 11 tools in `server.py`
  - `orchestrate` - Start new orchestration run
  - `commit_step` - Record step completion
  - `finalize` - Complete run with success/failure
  - `start_step` - Begin step execution
  - `get_run` - Get run details
  - `list_runs` - List orchestration runs
  - `get_step` - Get step details
  - `list_events` - List run events
  - `get_guidelines` - Get applicable guidelines
  - `get_ready_steps` - Get steps ready for parallel execution
  - `cancel_run` - Cancel active run

### Phase 5: Standards Integration (v2.1)

- [x] **5.1** Create `standards_loader.py`
  - `find_standards_path()` - Locate standards package in monorepo
  - `load_settings()` - Load settings.json from standards
  - `quality_gates_to_guidelines()` - Convert quality gates to Parlant Guidelines
  - `StandardsIntegration` class with caching and lazy loading
  - `get_standards()` singleton accessor

- [x] **5.2** Create `stack_detector.py` (Python port of TypeScript)
  - `Stack` enum with all supported stacks
  - `StackInfo` dataclass with confidence scores
  - `StackDetector` class with detection rules
  - `detect_stacks()` compatible with TypeScript CLI signature
  - `detect_stacks_detailed()` for full detection info

- [x] **5.3** Update `parlant_adapter.py`
  - Auto-load guidelines from standards package
  - Merge with default built-in guidelines
  - Sort by priority after loading

- [x] **5.4** Create integration tests in `tests/test_integration.py`
  - Standards integration tests
  - Stack detector tests
  - Parlant engine integration tests

### Phase 6: Enterprise Features (v0.4.0)

- [x] **6.1** Implement `webhooks.py` - External event notifications
  - `WebhookConfig` - URL, events, secret, retry settings
  - `WebhookDispatcher` - Async dispatch with HMAC-SHA256 signing
  - `dispatch_webhook()` - Fire-and-forget webhook dispatch
  - Exponential backoff retry logic

- [x] **6.2** Implement `metrics.py` - Prometheus metrics
  - `MetricsCollector` - Run/step/webhook metrics
  - Counters: runs_total, steps_total, retries_total, webhooks_total
  - Gauges: active_runs, active_steps
  - Histograms: run_duration, step_duration, tool_call_duration
  - `@timed_tool` decorator for automatic timing

- [x] **6.3** Implement `locking.py` - Distributed locking
  - `LockManager` - MySQL advisory locks (GET_LOCK/RELEASE_LOCK)
  - `acquire_step_lock()` - Exclusive lock for step operations
  - `acquire_run_lock()` - Exclusive lock for run operations
  - `@with_step_lock` and `@with_run_lock` decorators

- [x] **6.4** Implement `http_server.py` - REST API and MCP-over-HTTP
  - Dashboard API: /api/stats, /api/runs, /api/events
  - SSE endpoint: /api/events/stream for real-time updates
  - MCP-over-HTTP: /mcp/invoke for remote tool invocation
  - Starlette-based with uvicorn

- [x] **6.5** Update `parlant_adapter.py` - Parallel step support
  - `parallel_group` field in PlanStep
  - `get_ready_steps()` for dependency-aware execution
  - Parallel decomposition templates

- [x] **6.6** Update `server.py` - Integrate enterprise features
  - Webhook dispatch on run/step events
  - Metrics recording on all operations
  - Transactional locking on commit_step/finalize
  - New `get_ready_steps` MCP tool
  - CLI entry point with --transport and --metrics-port

- [x] **6.7** Update `pyproject.toml` - Optional dependencies
  - `[webhooks]` - httpx
  - `[metrics]` - prometheus-client
  - `[http]` - starlette, uvicorn, sse-starlette
  - `[enterprise]` - all enterprise features
  - `[all]` - complete installation

### Phase 7: Integration and Testing

- [x] **7.1** Install dependencies with `npm install`

- [x] **7.2** Build CLI with `npm run build:cli`

- [x] **7.3** Test CLI commands
  - `node packages/cli/dist/sync/cli.js help` ✓
  - `node packages/cli/dist/sync/cli.js sync` ✓
  - `node packages/cli/dist/sync/cli.js bootstrap --user` ✓

- [x] **7.4** Verify generated files in `~/.ai-standards/dist/`

- [x] **7.5** Test Python orchestrator
  - `pip install -e "packages/orchestrator[enterprise]"` ✓
  - `pytest packages/orchestrator/tests/` ✓
  - `python -m ai_orchestrator.server --help` ✓

---

## 🎯 CLI COMMANDS

All original CLI commands work as before:

```bash
# Global installation
npm i -g @padosoft/ai-enterprise

# Bootstrap global settings
ai bootstrap --user

# Sync to project
ai sync --cursor-here --copilot-here --gemini-here --windsurf-here --augment-here

# With options
ai sync --cursor-here --cursor-split    # Split by category
ai sync --windsurf-here --windsurf-split
ai sync --augment-here --augment-split
ai sync --project-context               # Auto-detect stack templates

# Harvest dependencies
ai harvest
ai harvest --clean --dry-run

# Validate configuration
ai validate

# Check for updates
ai check-updates

# Print generated rules
ai print --target=copilot
ai print --target=cursor
```

---

## 🔧 ORCHESTRATOR MCP TOOLS

The Python orchestrator provides 11 MCP tools for governance:

```python
# Start orchestration
orchestrate(task="implement auth", constraints={"stack": "laravel"})

# Step lifecycle
start_step(run_id="...", step_id=1)
commit_step(run_id="...", step_id=1, result="completed", artifacts=[...])
finalize(run_id="...", success=True)

# Parallel execution
get_ready_steps(run_id="...")  # Returns steps whose dependencies are satisfied

# Queries
get_run(run_id="...")
list_runs(status="active", limit=10)
get_step(run_id="...", step_id=1)
list_events(run_id="...", event_type="step_completed")

# Guidelines
get_guidelines(context={"stack": "laravel", "task_type": "api"})

# Control
cancel_run(run_id="...", reason="user request")
```

## 🏢 ENTERPRISE FEATURES (v0.4.0)

### Webhooks
```python
from ai_orchestrator import dispatch_webhook, WebhookConfig

# Configure webhooks via environment or DB
# Events: run.created, run.completed, step.started, step.accepted, step.rejected

# Fire-and-forget dispatch
dispatch_webhook("custom.event", run_id="run-123", data={"key": "value"})
```

### Prometheus Metrics
```python
from ai_orchestrator import get_metrics, start_metrics_server

# Start metrics endpoint
start_metrics_server(port=9090)

# Available metrics:
# - orchestrator_runs_total{status}
# - orchestrator_steps_total{agent,status}
# - orchestrator_run_duration_seconds{status}
# - orchestrator_step_duration_seconds{agent}
# - orchestrator_active_runs
# - orchestrator_active_steps
```

### Transactional Locking
```python
from ai_orchestrator import get_lock_manager, LockTimeout

lock_manager = get_lock_manager()
try:
    with lock_manager.acquire_step_lock("run-123", step_id=1, timeout_seconds=10):
        # Exclusive access to this step
        pass
except LockTimeout:
    print("Step is being processed by another worker")
```

### HTTP Server / REST API
```bash
# Start HTTP server for dashboard and remote MCP
python -m ai_orchestrator.server --transport http --port 8080 --metrics-port 9090

# REST API endpoints:
# GET  /health           - Health check
# GET  /metrics          - Prometheus metrics
# GET  /api/stats        - Overall statistics
# GET  /api/runs         - Paginated runs list
# GET  /api/runs/{id}    - Run details
# GET  /api/events       - Event list
# GET  /api/events/stream - SSE real-time events
# POST /mcp/invoke       - MCP tool invocation
```

---

## 📦 PACKAGE RELATIONSHIPS

```
@padosoft/ai-enterprise (root)
├── @padosoft/ai-cli
│   └── depends on @padosoft/ai-standards (workspace:*)
├── @padosoft/ai-standards
│   └── standalone SSOT package
└── ai-orchestrator (Python)
    ├── standards_loader.py → reads packages/standards/config/settings.json
    ├── stack_detector.py → Python port of CLI detectStacks()
    └── parlant_adapter.py → loads guidelines from standards + defaults
```

### Data Flow

```
settings.json (quality_gates)
       ↓
standards_loader.py
       ↓
quality_gates_to_guidelines()
       ↓
List[Guideline] (Parlant format)
       ↓
ParlantEngine._guidelines
       ↓
get_applicable_guidelines(context)
```

---

## 🔗 KEY FILES REFERENCE

### Root Configuration
- `package.json` - Workspace definition
- `tsconfig.json` - Project references

### CLI Package
- `packages/cli/src/sync/cli.ts` - Main CLI (608 lines)
- `packages/cli/src/sync/build.ts` - Build system
- `packages/cli/src/sync/utils.ts` - Path resolution and utilities
- `packages/cli/adapters/config/targets.yml` - Export targets

### Standards Package
- `packages/standards/index.js` - Programmatic API
- `packages/standards/agents/global/task-router.md` - Main orchestrator
- `packages/standards/config/settings.json` - Quality gates

### Orchestrator Package
- `packages/orchestrator/src/ai_orchestrator/server.py` - MCP server
- `packages/orchestrator/src/ai_orchestrator/parlant_adapter.py` - Parlant engine
- `packages/orchestrator/src/ai_orchestrator/standards_loader.py` - Standards integration
- `packages/orchestrator/src/ai_orchestrator/stack_detector.py` - Stack detection
- `packages/orchestrator/migrations/mysql_002_enterprise.sql` - DB schema
- `packages/orchestrator/tests/test_integration.py` - Integration tests

---

## ✅ SUCCESS CRITERIA

1. **Monorepo Structure**: All packages in `packages/` with proper workspace configuration
2. **CLI Functionality**: All original commands work (`sync`, `bootstrap`, `harvest`, `validate`)
3. **Standards SSOT**: Single source of truth for agents, docs, config
4. **Orchestrator Integration**: Python package installable and MCP tools functional
5. **Path Resolution**: CLI correctly finds standards package in both dev and installed scenarios
6. **Build System**: `npm run build` compiles all TypeScript packages
7. **No Duplication**: Standards not duplicated between packages
8. **Standards → Orchestrator**: Python reads quality gates from settings.json
9. **Stack Detection**: Python StackDetector matches TypeScript detectStacks()
10. **Integration Tests**: All tests pass with `pytest packages/orchestrator/tests/`

---

## 🚀 QUICK START

```bash
# Clone and install
cd ai-enterprise
npm install

# Build CLI
npm run build:cli

# Test CLI
node packages/cli/dist/sync/cli.js help
node packages/cli/dist/sync/cli.js sync

# Install orchestrator (Python)
pip install -e packages/orchestrator

# Run orchestrator tests
pytest packages/orchestrator/tests/ -v

# Run orchestrator MCP server
ai-orchestrator  # Starts MCP server
```

### Python Usage Example

```python
from ai_orchestrator import (
    ParlantEngine,
    StackDetector,
    get_standards,
    detect_stacks,
)

# Detect project stacks
detector = StackDetector("/path/to/project")
stacks = detector.detect()
if detector.primary_stack:
    print(f"Primary: {detector.primary_stack.stack.value}")
    print(f"Confidence: {detector.primary_stack.confidence}")

# Load standards
standards = get_standards()
if standards.is_available:
    print(f"Standards path: {standards.standards_path}")
    print(f"Guidelines loaded: {len(standards.guidelines)}")

# Parlant engine with auto-loaded guidelines
engine = ParlantEngine()
context = {"stack": "php-laravel", "task_type": "api"}
applicable = engine.get_applicable_guidelines(context)
print(f"Applicable guidelines: {len(applicable)}")
```

---

**Version**: 2.1.0
**Architecture**: Monorepo with npm workspaces
**Packages**: cli, standards, orchestrator
**Python Version**: 0.4.0 (ai-orchestrator with enterprise features)
