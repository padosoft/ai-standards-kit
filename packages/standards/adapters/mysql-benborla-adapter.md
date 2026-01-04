---
name: mysql-benborla-adapter
implements: database-provider
mcp-server: benborla/mcp-server-mysql
description: Adapter for benborla MySQL MCP server implementing database-provider interface
---

# MySQL Benborla Adapter

## Purpose
This adapter translates database-provider interface calls to benborla/mcp-server-mysql specific commands.

## MCP Server Configuration

```json
{
  "command": "npx",
  "args": ["-y", "@benborla/mcp-server-mysql"],
  "env": {
    "MYSQL_HOST": "${DB_HOST}",
    "MYSQL_USER": "${DB_USER}",
    "MYSQL_PASSWORD": "${DB_PASSWORD}",
    "MYSQL_DATABASE": "${DB_NAME}",
    "MYSQL_PORT": "${DB_PORT:-3306}"
  }
}
```

## Method Mappings

### executeQuery(sql: string, params?: any[])
Maps to MCP call:
```
mcp.call('mysql_query', {
  query: sql,
  params: params || [],
  database: env.DB_NAME
})
```

**Response transformation:**
```typescript
function transformQueryResult(mcpResponse): QueryResult {
  return {
    rows: mcpResponse.data.rows,
    fields: mcpResponse.data.fields.map(f => f.name),
    rowCount: mcpResponse.data.rows.length,
    executionTime: mcpResponse.data.execution_time_ms
  };
}
```

### explainQuery(sql: string)
Maps to MCP call:
```
mcp.call('mysql_query', {
  query: `EXPLAIN FORMAT=JSON ${sql}`,
  database: env.DB_NAME
})
```

**Response transformation:**
```typescript
function transformExplainResult(mcpResponse): ExplainResult {
  const explainJson = JSON.parse(mcpResponse.data.rows[0].EXPLAIN);
  
  return {
    plan: parseExplainPlan(explainJson.query_block),
    estimatedCost: explainJson.query_block.cost_info.query_cost,
    estimatedRows: explainJson.query_block.rows_produced
  };
}
```

### getIndexes(table: string)
Maps to MCP call:
```
mcp.call('mysql_query', {
  query: `SHOW INDEXES FROM ${table}`,
  database: env.DB_NAME
})
```

**Response transformation:**
```typescript
function transformIndexResult(mcpResponse): IndexInfo[] {
  const grouped = {};
  
  for (const row of mcpResponse.data.rows) {
    if (!grouped[row.Key_name]) {
      grouped[row.Key_name] = {
        name: row.Key_name,
        columns: [],
        unique: !row.Non_unique,
        type: row.Index_type,
        cardinality: row.Cardinality
      };
    }
    grouped[row.Key_name].columns.push(row.Column_name);
  }
  
  return Object.values(grouped);
}
```

### analyzeTable(table: string)
Maps to MCP calls:
```
// Get table stats
mcp.call('mysql_query', {
  query: `
    SELECT 
      table_rows,
      data_length,
      index_length,
      data_free
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
    AND table_name = ?
  `,
  params: [table]
})

// Run ANALYZE
mcp.call('mysql_query', {
  query: `ANALYZE TABLE ${table}`
})
```

### getSlowQueries(options?: SlowQueryOptions)
Maps to MCP call:
```
mcp.call('mysql_query', {
  query: `
    SELECT 
      digest_text as query,
      count_star as executions,
      avg_timer_wait/1000000000 as duration,
      first_seen as timestamp,
      sum_rows_examined/count_star as rows_examined,
      sum_rows_sent/count_star as rows_sent
    FROM performance_schema.events_statements_summary_by_digest
    WHERE avg_timer_wait/1000000000 > ?
    ORDER BY avg_timer_wait DESC
    LIMIT ?
  `,
  params: [
    options?.minDuration || 100,
    options?.limit || 50
  ]
})
```

## Error Handling

### Connection Errors
```typescript
if (error.code === 'ECONNREFUSED') {
  throw {
    type: 'CONNECTION_ERROR',
    message: 'Cannot connect to MySQL server',
    suggestion: 'Check database host and port configuration'
  };
}
```

### Permission Errors
```typescript
if (error.code === 'ER_ACCESS_DENIED_ERROR') {
  throw {
    type: 'AUTH_ERROR',
    message: 'Access denied to database',
    suggestion: 'Verify database credentials and permissions'
  };
}
```

### Query Errors
```typescript
if (error.code === 'ER_PARSE_ERROR') {
  throw {
    type: 'QUERY_ERROR',
    message: 'Invalid SQL syntax',
    suggestion: 'Review query syntax',
    query: sql
  };
}
```

## Performance Optimizations

1. **Connection Pooling**: The adapter maintains a connection pool with min=2, max=10 connections
2. **Query Caching**: EXPLAIN results are cached for 5 minutes
3. **Prepared Statements**: All parameterized queries use prepared statements
4. **Timeout Handling**: 30-second timeout on all queries

## Stage Mode Restrictions

When operating in stage mode:
- Only SELECT queries allowed
- No DDL operations (CREATE, ALTER, DROP)
- No DML operations (INSERT, UPDATE, DELETE)
- Read replicas preferred when available

## Monitoring

The adapter tracks:
- Query execution times
- Connection pool utilization
- Error rates by type
- Slow query frequency

These metrics are exposed for the detective orchestrator to analyze adapter performance.