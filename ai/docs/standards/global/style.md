# Global Style & Patterns

## Core Principles
1. **Return Early**: Avoid deep nesting with early returns
2. **Single Responsibility**: Each function/class does ONE thing well
3. **Pure Functions**: Prefer functions without side effects
4. **Immutability**: Use const/readonly/final where possible
5. **Explicit Types**: No implicit any or mixed types

## Code Style

### ✅ GOOD: Return Early
```typescript
function processUser(user: User | null): Result {
  if (!user) return { error: 'User not found' };
  if (!user.isActive) return { error: 'User inactive' };
  if (!user.hasPermission) return { error: 'Unauthorized' };
  
  // Happy path with minimal nesting
  return { data: transformUser(user) };
}
```

### ❌ BAD: Nested Conditions
```typescript
function processUser(user: User | null): Result {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission) {
        return { data: transformUser(user) };
      } else {
        return { error: 'Unauthorized' };
      }
    } else {
      return { error: 'User inactive' };
    }
  } else {
    return { error: 'User not found' };
  }
}
```

### ✅ GOOD: Pure Function
```typescript
// Pure: same input always produces same output
const calculateDiscount = (price: number, percentage: number): number => {
  return price * (1 - percentage / 100);
};
```

### ❌ BAD: Side Effects
```typescript
let globalDiscount = 0;

const calculateDiscount = (price: number): number => {
  globalDiscount += 10; // Side effect!
  console.log('Calculating...'); // Side effect!
  return price * (1 - globalDiscount / 100);
};
```

## Naming Conventions

### Variables & Functions
- **camelCase**: `userId`, `calculateTotal`, `isValid`
- **PascalCase**: `UserService`, `ProductDTO`, `DatabaseConnection`
- **SCREAMING_SNAKE_CASE**: `MAX_RETRIES`, `API_KEY`, `DEFAULT_TIMEOUT`
- **Descriptive**: `getUserById` not `get`, `isEmailValid` not `check`

### Boolean Naming
- Prefix with `is`, `has`, `can`, `should`
- Examples: `isActive`, `hasPermission`, `canEdit`, `shouldRetry`

## Error Handling

### ✅ GOOD: Explicit Error Handling
```typescript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    context: { userId, operation: 'riskyOperation' }
  });
  
  return { 
    success: false, 
    error: 'Operation failed. Please try again.'
  };
}
```

### ❌ BAD: Silent Failures
```typescript
try {
  return await riskyOperation();
} catch (error) {
  // Silent failure - DON'T DO THIS
  return null;
}
```

## Comments

### ✅ GOOD: Why, Not What
```typescript
// Use exponential backoff to avoid overwhelming the service
const delay = Math.min(1000 * Math.pow(2, attempt), MAX_DELAY);
```

### ❌ BAD: Obvious Comments
```typescript
// Increment counter by 1
counter++;

// Return the user
return user;
```

## Security First

1. **Never hardcode secrets**
2. **Validate all inputs**
3. **Sanitize all outputs**
4. **Use parameterized queries**
5. **Implement rate limiting**
6. **Log security events**
7. **Fail securely (closed)**

## Performance Patterns

### ✅ GOOD: Efficient Operations
```typescript
// Use Map for O(1) lookups
const userMap = new Map(users.map(u => [u.id, u]));
const user = userMap.get(userId);

// Process in batches
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
}
```

### ❌ BAD: Inefficient Operations
```typescript
// O(n) lookup in loop = O(n²)
for (const order of orders) {
  const user = users.find(u => u.id === order.userId); // Bad!
}

// Processing one by one
for (const item of items) {
  await processItem(item); // No parallelization
}
```

## SOLID Principles

1. **Single Responsibility**: One reason to change
2. **Open/Closed**: Open for extension, closed for modification
3. **Liskov Substitution**: Subtypes must be substitutable
4. **Interface Segregation**: Many specific interfaces
5. **Dependency Inversion**: Depend on abstractions

## Quality Gates
- No `any` types (TypeScript)
- No `@ts-ignore` or `@ts-nocheck`
- No commented-out code
- No console.log in production
- No hardcoded credentials
- No TODO without issue reference
