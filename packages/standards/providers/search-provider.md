---
name: search-provider
type: interface
description: Abstract interface for log search and aggregation, supporting Elasticsearch/OpenSearch
---

# Search Provider Interface

## Purpose
This interface defines the contract for all search/logging MCP adapters. It enables detective agents to query logs and metrics from any search backend without knowing the specific implementation.

## Required Methods

### search(query: SearchQuery): Promise<SearchResult>
Execute a search query against log indices.

**Input:**
```typescript
interface SearchQuery {
  index: string | string[];
  query: object; // Elasticsearch DSL query
  size?: number;
  from?: number;
  sort?: object[];
  timeout?: string;
}
```

**Output:**
```typescript
interface SearchResult {
  hits: {
    total: number;
    hits: LogEntry[];
  };
  aggregations?: Record<string, any>;
  took: number; // ms
}

interface LogEntry {
  _id: string;
  _source: {
    timestamp: string;
    level: string;
    message: string;
    service: string;
    [key: string]: any;
  };
}
```

### aggregate(aggregation: AggregationQuery): Promise<AggregationResult>
Run aggregation queries for metrics and statistics.

**Input:**
```typescript
interface AggregationQuery {
  index: string | string[];
  aggs: object; // Elasticsearch aggregation DSL
  query?: object; // Optional filter
  size?: 0; // Usually 0 for pure aggregations
}
```

**Output:**
```typescript
interface AggregationResult {
  aggregations: Record<string, any>;
  took: number;
}
```

### getHealth(): Promise<ClusterHealth>
Get cluster health status.

**Output:**
```typescript
interface ClusterHealth {
  status: 'green' | 'yellow' | 'red';
  number_of_nodes: number;
  active_shards: number;
  unassigned_shards: number;
  indices: number;
}
```

### getIndices(pattern?: string): Promise<IndexInfo[]>
Get information about indices.

**Input:**
- `pattern`: Optional index pattern (e.g., 'logs-*')

**Output:**
```typescript
interface IndexInfo {
  index: string;
  health: 'green' | 'yellow' | 'red';
  docs_count: number;
  store_size: string;
  creation_date: Date;
}
```

### searchTemplate(template: string, params: object): Promise<SearchResult>
Execute a pre-defined search template.

**Input:**
- `template`: Template name (e.g., 'slow-queries', 'errors-by-service')
- `params`: Template parameters

**Output:** Same as `search()` method

## Common Query Templates

### Error Analysis Template
```json
{
  "name": "errors-by-service",
  "query": {
    "bool": {
      "filter": [
        {"range": {"@timestamp": {"gte": "{{start_time}}"}}},
        {"terms": {"level": ["ERROR", "FATAL"]}},
        {"term": {"service": "{{service}}"}}
      ]
    }
  },
  "aggs": {
    "by_error": {
      "terms": {
        "field": "error.type",
        "size": 20
      }
    }
  }
}
```

### Performance Analysis Template
```json
{
  "name": "slow-endpoints",
  "query": {
    "range": {
      "response_time_ms": {"gte": "{{threshold}}"}
    }
  },
  "aggs": {
    "by_endpoint": {
      "terms": {
        "field": "http.route",
        "size": 50
      },
      "aggs": {
        "p95": {
          "percentiles": {
            "field": "response_time_ms",
            "percents": [95]
          }
        }
      }
    }
  }
}
```

## Implementation Contract

All adapters implementing this interface MUST:

1. **Handle large result sets** - Implement pagination/scrolling
2. **Optimize queries** - Use filters instead of queries where possible
3. **Cache templates** - Cache compiled templates for performance
4. **Validate DSL** - Validate query DSL before execution
5. **Implement timeouts** - Default 30s timeout for searches

## Usage Example

```typescript
// In detective agent
async function analyzeLogs(provider: SearchProvider) {
  // Find errors in the last hour
  const errors = await provider.search({
    index: 'logs-*',
    query: {
      bool: {
        filter: [
          { range: { '@timestamp': { gte: 'now-1h' } } },
          { term: { level: 'ERROR' } }
        ]
      }
    },
    size: 100
  });
  
  // Get error statistics
  const stats = await provider.aggregate({
    index: 'logs-*',
    aggs: {
      errors_over_time: {
        date_histogram: {
          field: '@timestamp',
          interval: '5m'
        }
      }
    }
  });
}
```

## Available Implementations

- `@adapters/elastic-official-adapter` - For elastic/mcp-server-elasticsearch
- `@adapters/opensearch-adapter` - For OpenSearch servers
- `@adapters/splunk-adapter` - For Splunk servers
- `@adapters/datadog-adapter` - For Datadog Log Management

## Quality Requirements

- Queries must complete within 30 seconds
- Result sets larger than 10,000 docs must use scrolling
- Aggregations must be limited to prevent memory issues
- All queries must be logged for audit
- Index patterns must be validated before use