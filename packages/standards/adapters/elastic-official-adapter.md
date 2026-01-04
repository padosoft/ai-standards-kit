---
name: elastic-official-adapter
implements: search-provider
mcp-server: elastic/mcp-server-elasticsearch
description: Adapter for official Elasticsearch MCP server implementing search-provider interface
---

# Elasticsearch Official Adapter

## Purpose
This adapter translates search-provider interface calls to elastic/mcp-server-elasticsearch specific commands.

## MCP Server Configuration

```json
{
  "command": "npx",
  "args": ["-y", "@elastic/mcp-server-elasticsearch"],
  "env": {
    "ELASTICSEARCH_URL": "${ELASTICSEARCH_URL}",
    "ELASTICSEARCH_API_KEY": "${ELASTICSEARCH_API_KEY}",
    "ELASTICSEARCH_CLOUD_ID": "${ELASTICSEARCH_CLOUD_ID}",
    "ELASTICSEARCH_USERNAME": "${ELASTICSEARCH_USERNAME}",
    "ELASTICSEARCH_PASSWORD": "${ELASTICSEARCH_PASSWORD}"
  }
}
```

## Method Mappings

### search(query: SearchQuery)
Maps to MCP call:
```
mcp.call('es_search', {
  index: query.index,
  body: {
    query: query.query,
    size: query.size || 10,
    from: query.from || 0,
    sort: query.sort,
    timeout: query.timeout || '30s'
  }
})
```

**Response transformation:**
```typescript
function transformSearchResult(mcpResponse): SearchResult {
  return {
    hits: {
      total: mcpResponse.hits.total.value,
      hits: mcpResponse.hits.hits.map(hit => ({
        _id: hit._id,
        _source: hit._source
      }))
    },
    aggregations: mcpResponse.aggregations,
    took: mcpResponse.took
  };
}
```

### aggregate(aggregation: AggregationQuery)
Maps to MCP call:
```
mcp.call('es_search', {
  index: aggregation.index,
  body: {
    query: aggregation.query || { match_all: {} },
    aggs: aggregation.aggs,
    size: 0  // Pure aggregation
  }
})
```

**Response transformation:**
```typescript
function transformAggregationResult(mcpResponse): AggregationResult {
  return {
    aggregations: mcpResponse.aggregations,
    took: mcpResponse.took
  };
}
```

### getHealth()
Maps to MCP call:
```
mcp.call('es_cluster_health', {})
```

**Response transformation:**
```typescript
function transformHealthResult(mcpResponse): ClusterHealth {
  return {
    status: mcpResponse.status,
    number_of_nodes: mcpResponse.number_of_nodes,
    active_shards: mcpResponse.active_primary_shards,
    unassigned_shards: mcpResponse.unassigned_shards,
    indices: mcpResponse.number_of_indices
  };
}
```

### getIndices(pattern?: string)
Maps to MCP call:
```
mcp.call('es_cat_indices', {
  index: pattern || '*',
  format: 'json'
})
```

**Response transformation:**
```typescript
function transformIndicesResult(mcpResponse): IndexInfo[] {
  return mcpResponse.map(index => ({
    index: index.index,
    health: index.health,
    docs_count: parseInt(index['docs.count']),
    store_size: index['store.size'],
    creation_date: new Date(parseInt(index['creation.date.string']))
  }));
}
```

### searchTemplate(template: string, params: object)
Maps to MCP call:
```
mcp.call('es_search_template', {
  id: template,
  params: params
})
```

## Query Templates

### Pre-configured Templates

#### errors-analysis
```json
{
  "script": {
    "lang": "mustache",
    "source": {
      "query": {
        "bool": {
          "filter": [
            {"range": {"@timestamp": {"gte": "{{start_time}}"}}},
            {"terms": {"level": ["ERROR", "FATAL", "CRITICAL"]}},
            {{#service}}
            {"term": {"service.keyword": "{{service}}"}}
            {{/service}}
          ]
        }
      },
      "aggs": {
        "errors_by_type": {
          "terms": {
            "field": "error.type.keyword",
            "size": 20
          },
          "aggs": {
            "sample": {
              "top_hits": {
                "size": 1,
                "_source": ["message", "stack_trace"]
              }
            }
          }
        }
      }
    }
  }
}
```

#### performance-analysis
```json
{
  "script": {
    "lang": "mustache",
    "source": {
      "query": {
        "bool": {
          "filter": [
            {"range": {"@timestamp": {"gte": "{{start_time}}"}}},
            {"exists": {"field": "response_time_ms"}}
          ]
        }
      },
      "aggs": {
        "percentiles": {
          "percentiles": {
            "field": "response_time_ms",
            "percents": [50, 75, 90, 95, 99]
          }
        },
        "by_endpoint": {
          "terms": {
            "field": "http.route.keyword",
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
  }
}
```

## Optimization Strategies

### Query Optimization
```typescript
// Use filters instead of queries for better caching
function optimizeQuery(query: any): any {
  if (query.query && !query.query.bool) {
    return {
      bool: {
        filter: [query.query]
      }
    };
  }
  return query;
}
```

### Pagination Handling
```typescript
// Use search_after for deep pagination
async function* scrollResults(query: SearchQuery) {
  let searchAfter = null;
  
  while (true) {
    const result = await search({
      ...query,
      body: {
        ...query.body,
        search_after: searchAfter,
        sort: [{ '@timestamp': 'desc' }, { '_id': 'asc' }]
      }
    });
    
    if (result.hits.hits.length === 0) break;
    
    yield result;
    searchAfter = result.hits.hits[result.hits.hits.length - 1].sort;
  }
}
```

## Error Handling

### Connection Errors
```typescript
if (error.type === 'connection_error') {
  throw {
    type: 'CONNECTION_ERROR',
    message: 'Cannot connect to Elasticsearch cluster',
    suggestion: 'Verify cluster URL and network connectivity'
  };
}
```

### Query Errors
```typescript
if (error.type === 'parsing_exception') {
  throw {
    type: 'QUERY_ERROR',
    message: 'Invalid query syntax',
    suggestion: 'Review Elasticsearch query DSL',
    query: JSON.stringify(query, null, 2)
  };
}
```

### Index Errors
```typescript
if (error.type === 'index_not_found_exception') {
  throw {
    type: 'INDEX_ERROR',
    message: `Index ${index} not found`,
    suggestion: 'Verify index name or pattern'
  };
}
```

## Performance Monitoring

The adapter tracks:
- Query latency by type (search, aggregation)
- Cache hit rates
- Scroll/pagination performance
- Index response times
- Cluster health status

## Stage Mode Restrictions

When operating in stage mode:
- Read-only operations only
- No index modifications
- No cluster settings changes
- No document updates/deletes

## Index Patterns

Supported index patterns:
- `logs-*` - Application logs
- `metrics-*` - Performance metrics
- `traces-*` - Distributed traces
- `errors-*` - Error logs
- `slowlogs-*` - Slow query logs