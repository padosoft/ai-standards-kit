# 🕵️ The Debugging Detective

An intelligent log analysis and auto-fixing system that automatically detects, analyzes, and optionally fixes bugs and performance issues in your Laravel, Hono/Bun, and Elasticsearch applications.

## 🎯 What It Does

The Debugging Detective continuously monitors your application logs and can:

- **🔍 Error Analysis**: Automatically detect and cluster errors from Laravel and Hono/Bun applications
- **⚡ Performance Optimization**: Find slow queries, API bottlenecks, and caching issues  
- **🗄️ Database Tuning**: Detect N+1 queries, missing indexes, and optimize database performance
- **🤖 Auto-Fixing**: Automatically generate and apply fixes (with approval workflow)
- **📊 Intelligent Reporting**: Generate actionable reports with fix suggestions

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Debugging Detective                              │
├─────────────────────────────────────────────────────────────────────┤
│  Orchestrator (debugging-detective.md)                             │
│  ├─ Coordinates specialized agents                                  │
│  ├─ Manages analysis workflow                                       │
│  └─ Handles fix application                                         │
├─────────────────────────────────────────────────────────────────────┤
│  Specialized Agents                                                 │
│  ├─ Error Triage (error-triage.md)                                 │
│  ├─ Performance Doctor (perf-doctor.md)                            │
│  └─ SQL Surgeon (sql-surgeon.md)                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Provider Abstraction Layer                                        │
│  ├─ Database Provider (database-provider.md)                       │
│  ├─ Search Provider (search-provider.md)                           │
│  ├─ VCS Provider (vcs-provider.md)                                 │
│  └─ Cache Provider (cache-provider.md)                             │
├─────────────────────────────────────────────────────────────────────┤
│  MCP Adapters (Community Servers)                                  │
│  ├─ MySQL: benborla/mcp-server-mysql                              │
│  ├─ Elasticsearch: elastic/mcp-server-elasticsearch               │
│  ├─ GitHub: github/github-mcp-server                              │
│  └─ Redis: Custom MCP server adapters                             │
└─────────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Configuration

Set up your MCP providers:

```bash
# Copy and edit the configuration
cp ai/.claude/config/detective-settings.json.example ai/.claude/config/detective-settings.json
cp ai/.claude/config/mcp-providers.json.example ai/.claude/config/mcp-providers.json

# Set required environment variables
export DB_HOST="your-db-host"
export DB_USER="your-db-user" 
export DB_PASSWORD="your-db-password"
export DB_NAME="your-db-name"
export ELASTICSEARCH_URL="your-es-url"
export ELASTICSEARCH_API_KEY="your-es-key"
export GITHUB_TOKEN="your-github-token"
```

### 2. Start the Detective

```bash
# Linux/Mac
./detective-control.sh start

# Windows
.\detective-control.ps1 start
```

### 3. Check Status

```bash
# Linux/Mac
./detective-control.sh status

# Windows  
.\detective-control.ps1 status
```

## 🎮 Operation Modes

### 📊 Analysis Mode (Default)
- **Safe**: Read-only analysis, no modifications
- **Purpose**: Understand issues and get recommendations
- **Output**: Detailed reports with fix suggestions

```bash
./detective-control.sh set-mode analysis
```

### 🎭 Stage Mode  
- **Controlled**: Can create PRs but requires approval
- **Purpose**: Test fixes in a controlled environment
- **Safety**: All changes go through PR review process

```bash
./detective-control.sh set-mode stage
```

### 🚀 Production Mode
- **Automated**: Can auto-fix issues immediately
- **Purpose**: Continuous healing of production issues
- **Caution**: Use only after thorough testing in stage mode

```bash
./detective-control.sh set-mode production
```

## 🔧 Specialized Agents

### 🚨 Error Triage Agent
**Specializes in error analysis and clustering**

- Groups similar errors together
- Identifies error patterns and trends
- Analyzes stack traces for root causes
- Suggests fixes for common Laravel/Hono errors

### ⚡ Performance Doctor
**Focuses on performance optimization**

- Detects slow API endpoints
- Identifies memory leaks and bottlenecks
- Optimizes caching strategies
- Analyzes response time patterns

### 🗄️ SQL Surgeon  
**Database performance specialist**

- Detects N+1 query problems
- Suggests missing indexes
- Optimizes slow queries
- Analyzes database performance metrics

## 🎯 Supported Integrations

### Laravel Applications
- **Log Sources**: `storage/logs/laravel.log`, custom logs
- **Error Detection**: PHP Fatal errors, Exceptions, Queue failures
- **Performance**: Route performance, Database query analysis
- **Auto-Fixes**: Exception handling, Query optimization

### Hono/Bun Applications  
- **Log Sources**: Application logs, API logs
- **Error Detection**: Unhandled promises, Runtime errors
- **Performance**: API latency, Memory usage
- **Auto-Fixes**: Error handling, Caching improvements

### Elasticsearch
- **Log Analysis**: Structured log search and aggregation
- **Metrics**: Error rates, Response times, System health
- **Dashboards**: Automated reporting and alerting

## 📊 Configuration Examples

### Error Analysis Configuration
```json
{
  "detective": {
    "agents": {
      "error-triage": {
        "enabled": true,
        "priority": 1,
        "specializes_in": [
          "error_analysis",
          "exception_clustering", 
          "stack_trace_analysis"
        ]
      }
    }
  }
}
```

### Threshold Configuration
```json
{
  "thresholds": {
    "error_rate": {
      "warning": 0.01,
      "critical": 0.05
    },
    "response_time_p95": {
      "warning": 1000,
      "critical": 3000  
    },
    "database_query_time": {
      "warning": 100,
      "critical": 500
    }
  }
}
```

## 🛠️ Control Commands

### Basic Operations
```bash
./detective-control.sh start          # Start detective
./detective-control.sh stop           # Stop detective  
./detective-control.sh status         # Show status
./detective-control.sh analyze        # Run immediate analysis
```

### Mode Management
```bash
./detective-control.sh set-mode analysis     # Read-only mode
./detective-control.sh set-mode stage        # PR creation mode
./detective-control.sh set-mode production   # Auto-fix mode
```

### Monitoring
```bash
./detective-control.sh health         # Health check
./detective-control.sh logs           # Show recent logs
./detective-control.sh logs 200       # Show last 200 lines
```

## 🔍 How Analysis Works

### 1. **Log Collection**
- Continuously monitors configured log sources
- Parses structured logs from Laravel and Hono applications
- Indexes logs in Elasticsearch for fast searching

### 2. **Pattern Detection**  
- Groups similar errors using ML clustering
- Identifies performance degradation trends
- Detects anomalies in application behavior

### 3. **Root Cause Analysis**
- Correlates errors across different services
- Analyzes database query patterns
- Examines stack traces and error contexts

### 4. **Fix Generation**
- Generates code fixes based on error patterns
- Optimizes database queries and indexes
- Improves error handling and logging

### 5. **Fix Application**
- Creates branches and pull requests
- Runs tests to verify fixes
- Applies fixes with proper rollback plans

## 🚨 Safety Features

### Stage Mode Protections
- All fixes require PR approval
- Automated testing before merge
- Rollback plans for all changes
- Quality gates and confidence scoring

### Production Mode Safeguards  
- Conservative fix application
- Immediate rollback capability
- Real-time monitoring of fix impact
- Alert system for fix failures

### Quality Gates
- Minimum confidence score: 80%
- Test coverage requirements  
- Code complexity limits
- Manual approval for high-risk fixes

## 📈 Monitoring and Alerts

### Built-in Metrics
- Analysis success rates
- Fix application rates  
- Error detection accuracy
- Performance improvement metrics

### Alert Channels
- Slack notifications
- Webhook integrations
- Email alerts for critical issues
- Dashboard integration

### Reporting
- Daily analysis summaries
- Weekly performance reports
- Monthly trend analysis
- Custom report generation

## 🔧 Troubleshooting

### Common Issues

**Detective won't start**
```bash
# Check configuration
./detective-control.sh health

# Verify environment variables
echo $DB_HOST $ELASTICSEARCH_URL
```

**No analysis results**
```bash
# Check log paths in configuration
# Verify MCP server connectivity
# Review detective logs
./detective-control.sh logs
```

**Fixes not applying**
```bash
# Verify mode settings
./detective-control.sh status

# Check GitHub token permissions
# Review PR creation logs
```

### Debug Mode
```bash
# Enable verbose logging
export DEBUG=detective:*
./detective-control.sh start
```

## 🤝 Contributing

The Detective system is designed to be extensible:

1. **Add New Agents**: Create specialized agents for specific technologies
2. **Add Providers**: Support new MCP servers and data sources  
3. **Improve Analysis**: Enhance pattern detection and fix generation
4. **Add Integrations**: Support new frameworks and tools

## 📚 Further Reading

- [Agent Development Guide](agent-development.md)
- [Provider Interface Specification](../providers/README.md)
- [MCP Adapter Development](../adapters/README.md)
- [Configuration Reference](configuration-reference.md)
- [API Documentation](api-reference.md)