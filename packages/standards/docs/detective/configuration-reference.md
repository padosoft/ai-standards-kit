# 🔧 Detective Configuration Reference

Complete reference for configuring the Debugging Detective system.

## 📁 Configuration Files

### Main Configuration Files
- `ai/.claude/config/detective-settings.json` - Core detective settings
- `ai/.claude/config/mcp-providers.json` - MCP server configurations
- `ai/.claude/providers/provider-registry.json` - Provider interface registry

## 🎛️ Detective Settings

### Basic Configuration
```json
{
  "detective": {
    "enabled": true,
    "mode": "analysis"
  }
}
```

### Operation Modes
```json
{
  "detective": {
    "operation_modes": {
      "analysis": {
        "description": "Read-only analysis mode - no fixes applied",
        "can_fix": false,
        "can_create_pr": false,
        "can_modify_code": false,
        "requires_approval": false
      },
      "stage": {
        "description": "Stage mode - can create PRs but requires approval",
        "can_fix": true,
        "can_create_pr": true,
        "can_modify_code": true,
        "requires_approval": true
      },
      "production": {
        "description": "Production mode - can auto-fix issues",
        "can_fix": true,
        "can_create_pr": true,
        "can_modify_code": true,
        "requires_approval": false,
        "auto_merge": false
      }
    }
  }
}
```

### Agent Configuration
```json
{
  "detective": {
    "agents": {
      "error-triage": {
        "enabled": true,
        "priority": 1,
        "max_concurrent": 2,
        "timeout_ms": 180000,
        "specializes_in": [
          "error_analysis",
          "exception_clustering",
          "stack_trace_analysis"
        ]
      },
      "perf-doctor": {
        "enabled": true,
        "priority": 2,
        "max_concurrent": 1,
        "timeout_ms": 300000,
        "specializes_in": [
          "api_latency",
          "memory_leaks",
          "caching_optimization",
          "query_optimization"
        ]
      },
      "sql-surgeon": {
        "enabled": true,
        "priority": 2,
        "max_concurrent": 1,
        "timeout_ms": 240000,
        "specializes_in": [
          "n_plus_one_detection",
          "index_optimization",
          "query_analysis",
          "database_performance"
        ]
      }
    }
  }
}
```

### Scheduling Configuration
```json
{
  "detective": {
    "scheduling": {
      "analysis_interval": "*/15 * * * *",
      "health_check_interval": "*/5 * * * *",
      "deep_analysis_interval": "0 2 * * *",
      "cleanup_interval": "0 3 * * 0"
    }
  }
}
```

**Interval Formats:**
- `*/15 * * * *` - Every 15 minutes
- `*/5 * * * *` - Every 5 minutes  
- `0 2 * * *` - Daily at 2:00 AM
- `0 3 * * 0` - Weekly on Sunday at 3:00 AM

### Notification Configuration
```json
{
  "detective": {
    "notifications": {
      "webhook_url": "${DETECTIVE_WEBHOOK_URL}",
      "slack_channel": "${DETECTIVE_SLACK_CHANNEL}",
      "email_recipients": [
        "dev-team@company.com",
        "ops-team@company.com"
      ],
      "severity_filter": "warning"
    }
  }
}
```

**Severity Levels:**
- `info` - All notifications
- `warning` - Warning and critical only
- `critical` - Critical issues only
- `none` - No notifications

### Performance Configuration
```json
{
  "detective": {
    "performance": {
      "max_memory_mb": 1024,
      "max_cpu_percent": 50,
      "parallel_analysis": 3,
      "batch_processing": true,
      "result_caching": true,
      "cache_ttl_minutes": 30
    }
  }
}
```

### Quality Gates
```json
{
  "detective": {
    "quality_gates": {
      "min_confidence_score": 0.8,
      "require_test_coverage": true,
      "max_fix_complexity": "medium",
      "require_rollback_plan": true
    }
  }
}
```

**Fix Complexity Levels:**
- `low` - Simple configuration changes, single-line fixes
- `medium` - Multi-line changes, logic modifications
- `high` - Structural changes, new dependencies
- `critical` - Architecture changes, breaking changes

## 🔌 MCP Provider Configuration

### Database Providers

#### MySQL (benborla)
```json
{
  "mcp_servers": {
    "database": {
      "mysql_benborla": {
        "command": "npx",
        "args": ["-y", "@benborla/mcp-server-mysql"],
        "env": {
          "MYSQL_HOST": "${DB_HOST}",
          "MYSQL_USER": "${DB_USER}",
          "MYSQL_PASSWORD": "${DB_PASSWORD}",
          "MYSQL_DATABASE": "${DB_NAME}",
          "MYSQL_PORT": "${DB_PORT:-3306}"
        },
        "adapter": "@adapters/mysql-benborla-adapter",
        "provider_type": "database"
      }
    }
  }
}
```

#### PostgreSQL
```json
{
  "postgresql": {
    "command": "npx",
    "args": ["-y", "@postgres/mcp-server"],
    "env": {
      "POSTGRES_HOST": "${PG_HOST}",
      "POSTGRES_USER": "${PG_USER}",
      "POSTGRES_PASSWORD": "${PG_PASSWORD}",
      "POSTGRES_DATABASE": "${PG_NAME}",
      "POSTGRES_PORT": "${PG_PORT:-5432}"
    },
    "adapter": "@adapters/postgres-adapter",
    "provider_type": "database"
  }
}
```

### Search Providers

#### Elasticsearch
```json
{
  "search": {
    "elasticsearch_official": {
      "command": "npx",
      "args": ["-y", "@elastic/mcp-server-elasticsearch"],
      "env": {
        "ELASTICSEARCH_URL": "${ELASTICSEARCH_URL}",
        "ELASTICSEARCH_API_KEY": "${ELASTICSEARCH_API_KEY}",
        "ELASTICSEARCH_CLOUD_ID": "${ELASTICSEARCH_CLOUD_ID}",
        "ELASTICSEARCH_USERNAME": "${ELASTICSEARCH_USERNAME}",
        "ELASTICSEARCH_PASSWORD": "${ELASTICSEARCH_PASSWORD}"
      },
      "adapter": "@adapters/elastic-official-adapter",
      "provider_type": "search"
    }
  }
}
```

#### OpenSearch
```json
{
  "opensearch": {
    "command": "npx",
    "args": ["-y", "@opensearch/mcp-server"],
    "env": {
      "OPENSEARCH_URL": "${OPENSEARCH_URL}",
      "OPENSEARCH_USERNAME": "${OPENSEARCH_USERNAME}",
      "OPENSEARCH_PASSWORD": "${OPENSEARCH_PASSWORD}"
    },
    "adapter": "@adapters/opensearch-adapter",
    "provider_type": "search"
  }
}
```

### VCS Providers

#### GitHub
```json
{
  "vcs": {
    "github_official": {
      "command": "npx",
      "args": ["-y", "@github/github-mcp-server"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}",
        "GITHUB_REPO": "${GITHUB_REPO}"
      },
      "adapter": "@adapters/github-official-adapter",
      "provider_type": "vcs"
    }
  }
}
```

### Cache Providers

#### Redis
```json
{
  "cache": {
    "redis": {
      "command": "npx",
      "args": ["-y", "@mcp/redis-server"],
      "env": {
        "REDIS_URL": "${REDIS_URL}",
        "REDIS_PASSWORD": "${REDIS_PASSWORD}"
      },
      "adapter": "@adapters/redis-adapter",
      "provider_type": "cache"
    }
  }
}
```

## 📊 Threshold Configuration

### Error Rate Thresholds
```json
{
  "thresholds": {
    "error_rate": {
      "warning": 0.01,
      "critical": 0.05
    }
  }
}
```

### Performance Thresholds
```json
{
  "thresholds": {
    "response_time_p95": {
      "warning": 1000,
      "critical": 3000
    },
    "response_time_p99": {
      "warning": 2000,
      "critical": 5000
    }
  }
}
```

### Database Thresholds
```json
{
  "thresholds": {
    "database_query_time": {
      "warning": 100,
      "critical": 500
    },
    "database_connections": {
      "warning": 80,
      "critical": 95
    }
  }
}
```

### Cache Thresholds
```json
{
  "thresholds": {
    "cache_hit_rate": {
      "warning": 0.8,
      "critical": 0.6
    },
    "cache_memory_usage": {
      "warning": 0.85,
      "critical": 0.95
    }
  }
}
```

### System Thresholds
```json
{
  "thresholds": {
    "memory_usage": {
      "warning": 0.8,
      "critical": 0.95
    },
    "cpu_usage": {
      "warning": 0.7,
      "critical": 0.9
    },
    "disk_usage": {
      "warning": 0.85,
      "critical": 0.95
    }
  }
}
```

## 🚨 Integration Configuration

### Laravel Integration
```json
{
  "detective": {
    "integrations": {
      "laravel": {
        "log_paths": [
          "storage/logs/laravel.log",
          "storage/logs/custom.log"
        ],
        "error_patterns": [
          "\\[ERROR\\]",
          "\\[CRITICAL\\]",
          "PHP Fatal error",
          "Uncaught exception"
        ],
        "performance_patterns": [
          "Slow query:",
          "Memory usage:",
          "Execution time:"
        ]
      }
    }
  }
}
```

### Hono/Bun Integration
```json
{
  "detective": {
    "integrations": {
      "hono_bun": {
        "log_paths": [
          "logs/app.log",
          "logs/api.log",
          "logs/worker.log"
        ],
        "error_patterns": [
          "ERROR:",
          "FATAL:",
          "UnhandledPromiseRejection",
          "TypeError:",
          "ReferenceError:"
        ],
        "performance_patterns": [
          "Response time:",
          "Memory:",
          "GC:"
        ]
      }
    }
  }
}
```

### Elasticsearch Integration
```json
{
  "detective": {
    "integrations": {
      "elasticsearch": {
        "indices": [
          "logs-*",
          "metrics-*",
          "errors-*",
          "performance-*"
        ],
        "retention_days": 30,
        "shard_size": "30gb",
        "replica_count": 1
      }
    }
  }
}
```

## 🔐 Environment Variables

### Required Variables
```bash
# Database
DB_HOST=localhost
DB_USER=detective
DB_PASSWORD=secret
DB_NAME=application_db
DB_PORT=3306

# Elasticsearch  
ELASTICSEARCH_URL=https://localhost:9200
ELASTICSEARCH_API_KEY=your-api-key
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=secret

# GitHub
GITHUB_TOKEN=ghp_xxxxx
GITHUB_REPO=owner/repository

# Notifications
DETECTIVE_WEBHOOK_URL=https://hooks.slack.com/services/xxx
DETECTIVE_SLACK_CHANNEL=#detective-alerts
```

### Optional Variables
```bash
# Redis Cache
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=secret

# Monitoring
DD_API_KEY=your-datadog-key
DD_APP_KEY=your-datadog-app-key
DD_SITE=datadoghq.com

# Advanced
DETECTIVE_LOG_LEVEL=info
DETECTIVE_MAX_WORKERS=3
DETECTIVE_ANALYSIS_DEPTH=deep
```

## 🎯 Use Case Examples

### High-Traffic Application
```json
{
  "detective": {
    "performance": {
      "max_memory_mb": 2048,
      "parallel_analysis": 5,
      "batch_processing": true
    },
    "thresholds": {
      "response_time_p95": {
        "warning": 500,
        "critical": 1000
      }
    }
  }
}
```

### Development Environment
```json
{
  "detective": {
    "mode": "analysis",
    "scheduling": {
      "analysis_interval": "*/30 * * * *"
    },
    "notifications": {
      "severity_filter": "critical"
    }
  }
}
```

### Production Environment  
```json
{
  "detective": {
    "mode": "stage",
    "quality_gates": {
      "min_confidence_score": 0.9,
      "require_test_coverage": true,
      "require_rollback_plan": true
    }
  }
}
```

## 🛠️ Configuration Validation

Use the health check command to validate your configuration:

```bash
./detective-control.sh health
```

This will check:
- Configuration file syntax
- Required environment variables
- MCP server connectivity
- Agent file availability
- Provider interface compliance