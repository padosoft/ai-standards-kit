---
name: database-provider
type: interface
description: Abstract interface for database operations, allowing swappable MCP implementations
---

# Database Provider Interface

## Purpose
This interface defines the contract that all database MCP adapters must implement. It allows the detective agents to work with any database MCP server without knowing the specific implementation.

## Required Methods

### executeQuery(sql: string, params?: any[]): Promise<QueryResult>
Execute a read-only SQL query and return results.

**Input:**
- `sql`: SQL query string
- `params`: Optional parameter array for prepared statements

**Output:**
```typescript
interface QueryResult {
  rows: any[];
  fields: string[];
  rowCount: number;
  executionTime: number;
}
```

### explainQuery(sql: string): Promise<ExplainResult>
Get the execution plan for a query.

**Input:**
- `sql`: SQL query to explain

**Output:**
```typescript
interface ExplainResult {
  plan: ExplainRow[];
  estimatedCost: number;
  estimatedRows: number;
}

interface ExplainRow {
  id: number;
  select_type: string;
  table: string;
  type: string;
  possible_keys: string;
  key: string;
  rows: number;
  Extra: string;
}
```

### getIndexes(table: string): Promise<IndexInfo[]>
Get all indexes for a table.

**Input:**
- `table`: Table name

**Output:**
```typescript
interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  type: 'BTREE' | 'HASH' | 'FULLTEXT';
  cardinality: number;
}
```

### analyzeTable(table: string): Promise<TableStats>
Get table statistics and health metrics.

**Input:**
- `table`: Table name

**Output:**
```typescript
interface TableStats {
  rowCount: number;
  dataSize: number;
  indexSize: number;
  fragmentation: number;
  lastAnalyzed: Date;
}
```

### getSlowQueries(options?: SlowQueryOptions): Promise<SlowQuery[]>
Retrieve slow queries from the database.

**Input:**
```typescript
interface SlowQueryOptions {
  minDuration?: number; // ms
  limit?: number;
  since?: Date;
}
```

**Output:**
```typescript
interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  rows_examined: number;
  rows_sent: number;
}
```

## Implementation Contract

All adapters implementing this interface MUST:

1. **Handle errors gracefully** - Return structured errors, not raw exceptions
2. **Enforce read-only mode** in stage mode - No DDL or DML operations
3. **Add timeouts** - Default 30s timeout for all operations
4. **Log operations** - Track all database calls for audit
5. **Validate inputs** - Sanitize and validate all SQL inputs

## Usage Example

```typescript
// In detective agent
async function analyzeDatabase(provider: DatabaseProvider) {
  // Agent doesn't know which MCP server is being used
  const slowQueries = await provider.getSlowQueries({ 
    minDuration: 1000 
  });
  
  for (const query of slowQueries) {
    const explain = await provider.explainQuery(query.query);
    // Analyze explain plan...
  }
}
```

## Available Implementations

- `@adapters/mysql-benborla-adapter` - For benborla/mcp-server-mysql
- `@adapters/mysql-google-adapter` - For googleapis/genai-toolbox
- `@adapters/postgres-adapter` - For PostgreSQL servers
- `@adapters/sqlite-adapter` - For SQLite servers

## Quality Requirements

- All methods must complete within 30 seconds
- Memory usage must not exceed 512MB per operation
- Connection pooling must be implemented
- All queries must be parameterized to prevent SQL injection
- Errors must include actionable recovery suggestions