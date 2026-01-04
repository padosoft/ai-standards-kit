# AI-Enterprise

```
▄▀█ █   █▀ ▀█▀ ▄▀█ █▄░█ █▀▄ ▄▀█ █▀█ █▀▄ █▀
█▀█ █   ▄█  █  █▀█ █░▀█ █▄▀ █▀█ █▀▄ █▄▀ ▄█

█▀▀ █▄░█ ▀█▀ █▀▀ █▀█ █▀█ █▀█ █ █▀ █▀▀
██▄ █░▀█ ░█░ ██▄ █▀▄ █▀▀ █▀▄ █ ▄█ ██▄

🤖 Enterprise AI Engineering Platform
   Standards + CLI + Parlant Orchestrator
   by Lorenzo Padovani - Padosoft
```

**Enterprise AI Engineering Platform** - A monorepo containing:

- **@padosoft/ai-standards** - Single Source of Truth (SSOT) for agents, guides, and quality gates
- **@padosoft/ai-cli** - TypeScript CLI for syncing to Copilot, Cursor, Gemini, Windsurf, Augment, etc.
- **ai-orchestrator** - Python Parlant-style governance engine with MCP tools

---

## 📁 Monorepo Structure

```
ai-enterprise/
├── package.json                    # Root workspace (@padosoft/ai-enterprise)
├── packages/
│   ├── cli/                        # @padosoft/ai-cli - TypeScript CLI
│   │   ├── src/sync/               # CLI source code
│   │   ├── adapters/               # Templates and targets config
│   │   └── dist/                   # Compiled output
│   │
│   ├── standards/                  # @padosoft/ai-standards - SSOT
│   │   ├── agents/                 # Claude agents (global, detective, cloudflare)
│   │   ├── docs/                   # Standards documentation by stack
│   │   ├── config/                 # Settings, quality gates
│   │   └── index.js                # API for loading standards
│   │
│   └── orchestrator/               # Python Parlant orchestrator
│       ├── src/ai_orchestrator/    # Python source
│       ├── migrations/             # MySQL schemas
│       └── pyproject.toml          # Python package config
```

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/padosoft/ai-enterprise.git
cd ai-enterprise

# Install dependencies (builds CLI automatically)
npm install

# OR install globally from npm (when published)
npm i -g @padosoft/ai-enterprise
```

### Bootstrap Global Settings

```bash
# Install agents and settings to user home directory
ai bootstrap --user

# This installs:
# - Claude agents → ~/.claude/agents/
# - Claude config → ~/.claude/config/
# - Docs → ~/.ai-standards/docs/
# - Generated files → ~/.ai-standards/dist/
```

### Sync to Project

```bash
# Generate and sync to all AI tools
ai sync --cursor-here --copilot-here --gemini-here --windsurf-here --augment-here

# With split options
ai sync --cursor-here --cursor-split      # Split by category
ai sync --windsurf-here --windsurf-split  # Split by stack
ai sync --augment-here --augment-split    # Split by stack

# Auto-detect stack and generate project templates
ai sync --project-context
```

---

## 📋 CLI Commands

```bash
# Core commands
ai bootstrap --user          # Install global agents and settings
ai sync [options]            # Generate and export AI tool configurations
ai harvest [options]         # Import AI bundles from dependencies
ai update                    # Update global standards from source
ai validate                  # Check if configurations are up to date
ai check-updates             # Check for package updates
ai print --target=<target>   # Print generated rules for target

# Sync options
--with-harvest               # Run harvest before sync
--cursor-here                # Write to .cursor/rules/
--cursor-split               # Split Cursor rules by category
--copilot-here               # Write to .github/copilot-instructions.md
--gemini-here                # Write to .gemini/GEMINI.md
--opencode-here              # Write to .opencode/
--warp-here                  # Write to WARP.md
--windsurf-here              # Write to .windsurf/rules/
--windsurf-split             # Split Windsurf rules by stack
--augment-here               # Write to .augment-guidelines
--augment-split              # Split Augment rules by stack
--project-context            # Auto-detect stack templates

# Harvest options
--clean                      # Clean existing deps before import
--dry-run                    # Preview without making changes
--packages pkg1,pkg2         # Import only specific packages

# Print targets
copilot, cursor, gemini, opencode, warp, warp-global, augment
```

---

## 🧠 Hybrid Approach: Comprehensive + Micro-Guide

The system uses **dynamic granularity selection**:

### Comprehensive Guidelines (Full Features)
- One complete file per stack with all major patterns
- Coherent context - DTO, Repository, Factory, Action patterns together
- Ideal for: Complete features, new implementations, onboarding

### Specialized Micro-Guides (Specific Tasks)
- Focused files on specific aspects (routes, validation, migrations)
- Deep details and edge cases
- Ideal for: Specific fixes, targeted modifications, troubleshooting

### Automatic Granularity Selection
The **task-router** dynamically chooses:

```typescript
// Complex task → Comprehensive
"Implement order system with DTO, Repository, Actions"
→ Loads: php-laravel-coding-guidelines.md + global standards

// Specific task → Micro-Guide
"Fix this route validation"
→ Loads: validation.md + global essentials

// Hybrid task → Both
"Add payment with Laravel patterns"
→ Loads: comprehensive for context + payments.md for details
```

---

## 🔧 Orchestrator (Python) - Parlant-Style Governance

The Python orchestrator provides **Parlant-style governance** - a paradigm shift from prompt-based programming to **structured, enforceable contracts**.

> 📖 **[Full Architecture Documentation](packages/orchestrator/docs/PARLANT_ARCHITECTURE.md)** - Deep dive into the Parlant philosophy and implementation.

### Why Parlant-Style?

| Traditional Prompt-Based | Parlant-Style |
|--------------------------|---------------|
| Rules in prompt text | Structured `Guideline` objects |
| Hope the model follows | External enforcement & validation |
| No priority system | Explicit numerical priorities |
| No audit trail | Complete event logging |
| Retry = repeat prompt | Structured retry hints |

### Key Benefits

- **Deterministic Enforcement** - Rules are validated externally, not interpreted by the model
- **Priority Resolution** - When rules conflict, priority determines the winner
- **Context-Aware** - Guidelines apply conditionally based on project stack
- **Full Auditability** - Every step, decision, and artifact is logged
- **Structured Recovery** - Failed steps get actionable retry hints

### Quick Setup

```bash
# 1. Start MySQL (Docker)
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
cd packages/orchestrator
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .

# 4. Set environment variables
export AI_ORCH_DB_HOST=localhost
export AI_ORCH_DB_USER=ai_orch
export AI_ORCH_DB_PASS=super-secret
export AI_ORCH_DB_NAME=ai_orch
export AI_ORCH_REPO_ROOT=/path/to/your/project
export AI_ORCH_ARTIFACTS_DIR=/path/to/.ai/artifacts

# 5. Run MCP server
ai-orchestrator
```

### Register in Claude Code

```bash
# Add MCP server to Claude Code CLI
claude mcp add ai-orchestrator-local '{
  "type": "stdio",
  "command": "bash",
  "args": [
    "-lc",
    "cd /path/to/ai-enterprise/packages/orchestrator && source .venv/bin/activate && python -m ai_orchestrator.server"
  ]
}'
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `orchestrate` | Start new orchestration run |
| `start_step` | Begin step execution |
| `commit_step` | Record step completion with artifacts |
| `finalize` | Complete run with success/failure |
| `get_run` | Get run details |
| `list_runs` | List orchestration runs |
| `get_step` | Get step details |
| `list_events` | List run events |
| `get_guidelines` | Get applicable guidelines for context |
| `get_ready_steps` | Get steps ready for parallel execution |
| `cancel_run` | Cancel active run |

### Enterprise Features (v0.4.0)

| Feature | Description |
|---------|-------------|
| **Webhooks** | External event notifications with HMAC signing and retry logic |
| **Prometheus Metrics** | Full observability with counters, gauges, histograms |
| **Transactional Locking** | MySQL advisory locks for concurrent access |
| **Parallel Steps** | Execute independent steps concurrently |
| **HTTP Server** | REST API for dashboard and MCP-over-HTTP |

```bash
# Install with all enterprise features
pip install -e "packages/orchestrator[enterprise]"

# Run with HTTP transport and metrics
python -m ai_orchestrator.server --transport http --port 8080 --metrics-port 9090
```

### REST API Endpoints (Dashboard)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /metrics` | Prometheus metrics |
| `GET /api/stats` | Overall statistics |
| `GET /api/runs` | Paginated runs list |
| `GET /api/runs/{id}` | Run details with steps |
| `GET /api/events` | Event list |
| `GET /api/events/stream` | SSE real-time events |
| `POST /mcp/invoke` | MCP tool invocation via HTTP |

### Python API

```python
from ai_orchestrator import (
    ParlantEngine,
    StackDetector,
    get_standards,
    detect_stacks,
    # Enterprise features
    get_metrics,
    dispatch_webhook,
    get_lock_manager,
    create_http_app,
    run_server,
)

# Stack detection
detector = StackDetector("/path/to/project")
stacks = detector.detect()
print(f"Primary: {detector.primary_stack}")

# Standards integration
standards = get_standards()
if standards.is_available:
    guidelines = standards.guidelines
    laravel_docs = standards.load_agent_content("global", "task-router")

# Parlant engine with auto-loaded guidelines
engine = ParlantEngine()  # Loads from settings.json + defaults
context = {"stack": "php-laravel"}
applicable = engine.get_applicable_guidelines(context)

# Metrics collection
metrics = get_metrics()
metrics.run_started()
with metrics.tool_call_timer("my_tool"):
    # ... tool execution
    pass
metrics.run_completed("done", duration_seconds=10.5)

# Webhook dispatch (fire-and-forget)
dispatch_webhook("custom.event", run_id="run-123", data={"key": "value"})

# Distributed locking
lock_manager = get_lock_manager()
with lock_manager.acquire_step_lock("run-123", step_id=1):
    # Exclusive access to this step
    pass
```

---

## ⚡ Quality Gates Enterprise

Quality gates defined in `packages/standards/config/settings.json`:

### Database
- ❌ OFFSET > 1000 rows (use keyset pagination)
- ❌ Query without covered index on hot paths
- ❌ N+1 patterns (use eager loading)

### PHP/Laravel
- ❌ Controller without FormRequest validation
- ❌ Resource controller without Policy authorization
- ❌ Route without required middleware

### TypeScript/Hono
- ❌ Handler without Zod schema validation
- ❌ Route without error boundary
- ❌ API route without CORS configuration

### Security
- ❌ PII in log statements
- ❌ Hardcoded secrets/credentials
- ❌ TODO without issue reference

---

## 🛠️ Supported AI Tools

| Tool | Global Location | Project Location | Split Support |
|------|-----------------|------------------|---------------|
| **Claude Code** | `~/.claude/agents/` | `.claude/agents/` | ✅ |
| **GitHub Copilot** | `~/.config/github-copilot/` | `.github/copilot-instructions.md` | ❌ |
| **Cursor IDE** | ❌ | `.cursor/rules/` | ✅ |
| **Google Gemini** | `~/.gemini/` | `.gemini/GEMINI.md` | ❌ |
| **OpenCode AI** | `~/.config/opencode/` | `.opencode/` | ✅ |
| **Warp Terminal** | ❌ | `WARP.md` | ❌ |
| **Windsurf IDE** | ❌ | `.windsurf/rules/` | ✅ |
| **Augment Code** | ❌ | `.augment-guidelines` | ✅ |

---

## 🕵️ Debugging Detective

The **Debugging Detective** system provides automatic analysis and auto-fixing:

### Features
- **Error Analysis** - Automatic error clustering for Laravel/Hono/Elasticsearch
- **Performance Doctor** - API optimization, caching, memory leak detection
- **SQL Surgeon** - N+1 detection, index optimization, slow query analysis
- **Auto-Fixing** - Automatic fixes with PR/approval workflow

### Control Scripts

```bash
# Windows PowerShell
.\detective-control.ps1 start
.\detective-control.ps1 set-mode analysis   # Read-only
.\detective-control.ps1 set-mode stage      # PR workflow
.\detective-control.ps1 set-mode production # Auto-fix
.\detective-control.ps1 status

# Linux/Mac
./detective-control.sh start
./detective-control.sh set-mode analysis
./detective-control.sh status
```

---

## 🔍 Debug Mode

Enable debug mode for complete routing visibility:

```bash
# Via script
./packages/standards/scripts/debug-control.sh enable
./packages/standards/scripts/debug-control.sh verbose
./packages/standards/scripts/debug-control.sh full

# Via prompt
ai "create controller --debug"
ai "implementa auth con debug verboso"
```

### Debug Output
```markdown
## 🔍 AI Kit Debug Report
**Stack Detected**: php-laravel (confidence: high)
**Agents Used**: @laravel-controller-builder, @test-writer
**Guides Loaded**: php-laravel-coding-guidelines.md (2.1k tokens)
**Quality Gates**: 4 passed, 1 warning
**Performance**: 850ms execution, 2.1k/200k context tokens
```

---

## 📦 Package Details

### @padosoft/ai-standards
```javascript
import { loadSettings, loadAgent, loadStandard } from '@padosoft/ai-standards';

// Load quality gates
const settings = loadSettings();

// Load an agent
const taskRouter = loadAgent('global', 'task-router');

// Load a standard
const laravelRoutes = loadStandard('php-laravel', 'routes');
```

### @padosoft/ai-cli
```bash
# Binary entries
ai-standards  # Full name
ai            # Short alias

# Both point to: dist/sync/cli.js
```

### ai-orchestrator (Python)
```python
from ai_orchestrator import (
    ParlantEngine,
    StackDetector,
    get_standards,
    detect_stacks,
    detect_stacks_detailed,
)

# Detect project stacks
stacks = detect_stacks("/path/to/project")  # ["php-laravel", "node"]

# Full detection with confidence scores
details = detect_stacks_detailed("/path/to/project")
# {"stacks": [{"name": "php-laravel", "confidence": 0.95, ...}], "primary_stack": "php-laravel"}

# Standards integration
standards = get_standards()
guidelines = standards.guidelines  # Quality gates as Parlant Guidelines

# Run the MCP server
from ai_orchestrator.server import mcp
mcp.run()
```

---

## 🔗 Documentation Links

### Internal Documentation
- **[Parlant Architecture](packages/orchestrator/docs/PARLANT_ARCHITECTURE.md)** - Complete guide to the orchestrator architecture and philosophy
- **[Debug Mode Guide](packages/standards/docs/debug-mode.md)** - How to enable and use debug mode
- **[Detective System](packages/standards/docs/detective/README.md)** - Debugging detective documentation

### External References
- **GitHub Copilot**: [Repository Instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions)
- **Cursor IDE**: [Rules Documentation](https://docs.cursor.com/en/context/rules)
- **Gemini CLI**: [Configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/configuration.md)
- **OpenCode AI**: [Rules](https://opencode.ai/docs/rules/) | [Agents](https://opencode.ai/docs/agents/)
- **Claude Code**: [Documentation](https://docs.anthropic.com/en/docs/claude-code)
- **Parlant Project**: [GitHub](https://github.com/parlant-ai/parlant)
- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io/)

---

## 📈 Extension and Customization

### Add New Stack
1. Create folder `packages/standards/docs/standards/new-stack/`
2. Add stack-specific guides
3. Create agents in `packages/standards/agents/new-stack/`
4. Update `task-router.md` with routing rules
5. Update `packages/cli/adapters/config/targets.yml`

### Project Override
1. Create `.claude/agents/` in your project
2. Files with same name override global agents
3. Create `.claude/settings.json` for project-specific quality gates

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create branch** for feature (`git checkout -b feature/amazing-feature`)
3. **Update guides and agents** as needed
4. **Test** with `ai validate`
5. **Commit** with meaningful message
6. **Push** and create **Pull Request**

---

## 📄 License

MIT License - Copyright Padosoft 2025

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/padosoft/ai-enterprise/issues)
- **Discussions**: [GitHub Discussions](https://github.com/padosoft/ai-enterprise/discussions)
- **Email**: helpdesk AT padosoft.com

---

*Developed with ❤️ by Lorenzo Padovani [Padosoft](https://www.padosoft.com) for accelerating enterprise development with AI tools.*
