# Database Standards

## Core Principles
1. **Performance First**: Every query must be optimized
2. **No N+1**: Use eager loading or batch queries
3. **Indexing Strategy**: Covered indexes for hot paths
4. **Pagination**: Keyset > OFFSET for large datasets
5. **Connection Pooling**: Reuse connections efficiently

## Query Optimization

### ✅ GOOD: Keyset Pagination
```sql
-- Efficient pagination using keyset (seek method)
SELECT id, name, created_at
FROM products
WHERE (created_at, id) > ('2024-01-15 10:00:00', 1234)
ORDER BY created_at, id
LIMIT 20;
```

### ❌ BAD: OFFSET Pagination
```sql
-- Inefficient for large offsets
SELECT id, name, created_at
FROM products
ORDER BY created_at
LIMIT 20 OFFSET 10000; -- Scans 10,000 rows!
```

## Indexing Strategies

### Covered Index
```sql
-- Query
SELECT user_id, status, created_at
FROM orders
WHERE status = 'pending' AND created_at > '2024-01-01';

-- Covered index (all columns in index)
CREATE INDEX idx_orders_status_created_covering
ON orders(status, created_at)
INCLUDE (user_id);
```

## N+1 Prevention

### ✅ GOOD: Eager Loading
```php
// Laravel - Load relationships upfront
$orders = Order::with(['user', 'products', 'payments'])
    ->where('status', 'pending')
    ->get();
```

### ❌ BAD: N+1 Query
```php
// Executes 1 + N queries
$orders = Order::all(); // Query 1
foreach ($orders as $order) {
    $user = $order->user; // Query N
    $products = $order->products; // Query N
}
```

## Connection Management
```typescript
// Node.js with pg
const pool = new Pool({
  max: 20,                  // Maximum connections
  min: 5,                   // Minimum connections
  idleTimeoutMillis: 30000, // Close idle connections
});

// Always release connections
try {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT ...');
    return result;
  } finally {
    client.release();
  }
} catch (err) {
  logger.error('Database error', err);
  throw err;
}
```

## Anti-Patterns to Avoid
- ❌ SELECT * (specify columns)
- ❌ OFFSET for pagination > 1000 rows
- ❌ Functions in WHERE clause
- ❌ Missing indexes on foreign keys
- ❌ Not using prepared statements
- ❌ Long-running transactions

## Quality Gates
- Max query time: 1 second
- Max OFFSET: 1000 rows
- Required: Indexes on all foreign keys
- Required: Connection pooling
- Blocked: Functions in WHERE clause
