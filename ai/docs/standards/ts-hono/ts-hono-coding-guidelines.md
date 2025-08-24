# TypeScript Hono Enterprise Coding Guidelines

> **Extends**: `/docs/standards/global/coding-guidelines.md`
> 
> This document provides **TypeScript + Hono-specific** implementations of enterprise coding guidelines. Always follow global principles while applying these modern web API development patterns.

## Project Structure and Dependencies

### Recommended Stack
```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/zod-validator": "^0.2.0",
    "zod": "^3.22.0",
    "drizzle-orm": "^0.29.0",
    "@libsql/client": "^0.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@hono/vite-dev-server": "^0.12.0"
  }
}
```

### Enterprise Project Structure
```
src/
├── app.ts                    # Main app entry point
├── env.ts                   # Environment validation (NO process.env usage elsewhere)
├── database/
│   ├── client.ts           # Single database connection factory
│   ├── schema.ts           # Drizzle schema definitions
│   └── migrations/         # Database migrations
├── routes/
│   ├── index.ts           # Route registry
│   ├── users.ts           # User-specific routes
│   ├── auth.ts            # Authentication routes
│   └── health.ts          # Health check routes
├── handlers/
│   ├── users/             # User handlers grouped by feature
│   │   ├── create.ts      # Single handler per file
│   │   ├── update.ts      # Single handler per file
│   │   └── delete.ts      # Single handler per file
│   └── auth/
│       ├── login.ts
│       └── refresh.ts
├── middleware/
│   ├── auth.ts            # Authentication middleware
│   ├── validation.ts      # Validation middleware
│   ├── cors.ts           # CORS middleware
│   └── logger.ts         # Request logging
├── types/
│   ├── api.ts            # API request/response types
│   ├── database.ts       # Database types
│   └── auth.ts           # Authentication types
└── utils/
    ├── password.ts       # Password hashing utilities
    ├── jwt.ts           # JWT utilities
    └── validation.ts     # Common validation schemas
```

## Typed Environment Configuration (REQUIRED)

### Environment Validation with Zod
```typescript
// env.ts - Single source of environment variables
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  
  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // API Configuration
  API_VERSION: z.string().default('v1'),
  CORS_ORIGIN: z.string().url().optional(),
  
  // Feature Flags
  ENABLE_REGISTRATION: z.coerce.boolean().default(true),
  ENABLE_EMAIL_VERIFICATION: z.coerce.boolean().default(false),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

// Validate environment on app startup
export const env: Env = envSchema.parse(process.env);

// ❌ NEVER DO THIS - Direct process.env usage
// const dbUrl = process.env.DATABASE_URL; // NO!

// ✅ ALWAYS DO THIS - Use validated env
// import { env } from './env';
// const dbUrl = env.DATABASE_URL; // YES!
```

## Database Architecture

### Single Connection Factory (REQUIRED)
```typescript
// database/client.ts - Single database connection factory
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '../env';
import * as schema from './schema';

// ❌ BAD - Creating connection in constructor/per user
class BadUserService {
  private db;
  
  constructor(databaseUrl: string) {
    // NO! Creates new connection every time
    this.db = drizzle(createClient({ url: databaseUrl }));
  }
}

// ✅ GOOD - Single connection factory
const createDatabase = () => {
  const client = createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  });
  
  return drizzle(client, { schema });
};

// Export single database instance
export const db = createDatabase();

// ✅ GOOD - Services use shared connection
export class UserService {
  async createUser(userData: CreateUserData) {
    return await db.insert(schema.users).values(userData).returning();
  }
  
  async findUserById(id: string) {
    return await db.select().from(schema.users).where(eq(schema.users.id, id));
  }
}
```

### Database Schema with Types
```typescript
// database/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Generate Zod schemas from Drizzle schema
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  username: z.string().min(3).max(20),
  passwordHash: z.string(), // Internal use only
});

export const selectUserSchema = createSelectSchema(users);

// Public API schemas (without sensitive fields)
export const createUserSchema = insertUserSchema.omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(8),
});

export const userResponseSchema = selectUserSchema.omit({
  passwordHash: true,
});

// Type exports
export type User = z.infer<typeof selectUserSchema>;
export type CreateUserRequest = z.infer<typeof createUserSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
```

## Route Organization (Enterprise Pattern)

### Typed Route Registry
```typescript
// routes/index.ts - Central route registry
import { Hono } from 'hono';
import { authRoutes } from './auth';
import { userRoutes } from './users';
import { healthRoutes } from './health';

// Type-safe route context
export type AppContext = {
  Variables: {
    user?: { id: string; email: string };
    requestId: string;
  };
};

export const setupRoutes = (app: Hono<AppContext>) => {
  // Health check (no auth required)
  app.route('/health', healthRoutes);
  
  // API versioning
  app.route('/api/v1/auth', authRoutes);
  app.route('/api/v1/users', userRoutes);
  
  return app;
};
```

### Individual Route Files
```typescript
// routes/users.ts - User-specific routes
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import { createUserHandler, updateUserHandler, deleteUserHandler, getUserHandler } from '../handlers/users';
import { createUserSchema, updateUserSchema } from '../database/schema';
import type { AppContext } from './index';

export const userRoutes = new Hono<AppContext>();

// Middleware applied to all user routes
userRoutes.use('/*', authMiddleware);

// Typed routes with validation
userRoutes.post('/', 
  zValidator('json', createUserSchema),
  createUserHandler
);

userRoutes.get('/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  getUserHandler
);

userRoutes.put('/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  zValidator('json', updateUserSchema),
  updateUserHandler
);

userRoutes.delete('/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  deleteUserHandler
);
```

### Route Handlers (One Per File)
```typescript
// handlers/users/create.ts - Single responsibility
import type { Handler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { UserService } from '../../services/user-service';
import { hashPassword } from '../../utils/password';
import type { AppContext } from '../../routes';
import type { CreateUserRequest, UserResponse } from '../../database/schema';

export const createUserHandler: Handler<
  AppContext,
  '/api/v1/users',
  {
    in: { json: CreateUserRequest };
    out: { json: UserResponse };
  }
> = async (c) => {
  try {
    const userData = c.req.valid('json');
    
    // Hash password
    const passwordHash = await hashPassword(userData.password);
    
    // Create user
    const userService = new UserService();
    const [newUser] = await userService.createUser({
      ...userData,
      passwordHash,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Return user without password
    const { passwordHash: _, ...userResponse } = newUser;
    
    return c.json(userResponse, 201);
  } catch (error) {
    if (error.code === 'UNIQUE_CONSTRAINT_FAILED') {
      throw new HTTPException(409, { message: 'User already exists' });
    }
    throw new HTTPException(500, { message: 'Internal server error' });
  }
};
```

## Middleware Patterns

### Authentication Middleware with Types
```typescript
// middleware/auth.ts
import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { jwt } from 'hono/jwt';
import { env } from '../env';
import type { AppContext } from '../routes';

interface JWTPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export const authMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new HTTPException(401, { message: 'Authorization token required' });
  }
  
  try {
    const payload = await jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    
    // Set user in context
    c.set('user', {
      id: payload.sub,
      email: payload.email,
    });
    
    await next();
  } catch (error) {
    throw new HTTPException(401, { message: 'Invalid token' });
  }
};
```

### CORS Middleware
```typescript
// middleware/cors.ts
import { cors } from 'hono/cors';
import { env } from '../env';

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN ? [env.CORS_ORIGIN] : ['http://localhost:3000'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 hours
  credentials: true,
});
```

## Validation Patterns

### Comprehensive Zod Validation
```typescript
// utils/validation.ts
import { z } from 'zod';

// Common validation patterns
export const commonValidations = {
  id: z.string().uuid(),
  email: z.string().email().max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/(?=.*[a-z])/, 'Password must contain lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain number'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
};

// API response wrappers
export const apiResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    success: z.literal(true),
    timestamp: z.date(),
  });

export const apiError = z.object({
  error: z.string(),
  success: z.literal(false),
  timestamp: z.date(),
  code: z.string().optional(),
});

// Pagination wrapper
export const paginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
    success: z.literal(true),
  });
```

## Error Handling

### Centralized Error Handler
```typescript
// middleware/error-handler.ts
import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { env } from '../env';

export const errorHandler: ErrorHandler = (err, c) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return c.json({
      error: 'Validation failed',
      success: false,
      timestamp: new Date(),
      details: err.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    }, 400);
  }
  
  // HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json({
      error: err.message,
      success: false,
      timestamp: new Date(),
    }, err.status);
  }
  
  // Database errors
  if (err.code === 'UNIQUE_CONSTRAINT_FAILED') {
    return c.json({
      error: 'Resource already exists',
      success: false,
      timestamp: new Date(),
    }, 409);
  }
  
  // Log error in production
  if (env.LOG_LEVEL === 'debug') {
    console.error('Unhandled error:', err);
  }
  
  // Generic error response
  return c.json({
    error: 'Internal server error',
    success: false,
    timestamp: new Date(),
  }, 500);
};
```

## Service Layer Architecture

### Typed Service Classes
```typescript
// services/user-service.ts
import { eq, and, or } from 'drizzle-orm';
import { db } from '../database/client';
import { users } from '../database/schema';
import type { User, CreateUserRequest } from '../database/schema';

export class UserService {
  async createUser(userData: Omit<User, 'id'> & { id: string }): Promise<[User]> {
    return await db.insert(users).values(userData).returning();
  }
  
  async findUserById(id: string): Promise<User | null> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    return user || null;
  }
  
  async findUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    return user || null;
  }
  
  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const [updatedUser] = await db.update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser || null;
  }
  
  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users)
      .where(eq(users.id, id));
    
    return result.changes > 0;
  }
  
  async searchUsers(query: string, pagination: { page: number; limit: number }) {
    const offset = (pagination.page - 1) * pagination.limit;
    
    const searchResults = await db.select()
      .from(users)
      .where(
        or(
          users.email.like(`%${query}%`),
          users.username.like(`%${query}%`)
        )
      )
      .limit(pagination.limit)
      .offset(offset);
    
    return searchResults;
  }
}
```

## Testing Patterns with Vitest

### Test Setup
```typescript
// tests/setup.ts
import { beforeEach } from 'vitest';
import { db } from '../src/database/client';
import { users } from '../src/database/schema';

beforeEach(async () => {
  // Clean database before each test
  await db.delete(users);
});
```

### Handler Testing
```typescript
// tests/handlers/users/create.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { setupRoutes } from '../../../src/routes';

describe('Create User Handler', () => {
  let app: Hono;
  let client: ReturnType<typeof testClient>;
  
  beforeEach(() => {
    app = new Hono();
    app = setupRoutes(app);
    client = testClient(app);
  });
  
  it('should create user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Password123!',
    };
    
    const response = await client.api.v1.users.$post({
      json: userData,
    });
    
    expect(response.status).toBe(201);
    
    const result = await response.json();
    expect(result.data.email).toBe(userData.email);
    expect(result.data.username).toBe(userData.username);
    expect(result.data.passwordHash).toBeUndefined(); // Should not be returned
  });
  
  it('should reject invalid email', async () => {
    const userData = {
      email: 'invalid-email',
      username: 'testuser',
      password: 'Password123!',
    };
    
    const response = await client.api.v1.users.$post({
      json: userData,
    });
    
    expect(response.status).toBe(400);
    
    const result = await response.json();
    expect(result.error).toBe('Validation failed');
    expect(result.details).toContainEqual({
      path: 'email',
      message: expect.stringContaining('email'),
    });
  });
});
```

## Performance Patterns

### Database Query Optimization
```typescript
// ✅ GOOD - Optimized queries
class OptimizedUserService {
  // Use indexes effectively
  async findActiveUsers(limit: number = 20) {
    return await db.select()
      .from(users)
      .where(eq(users.isActive, true)) // Indexed column
      .orderBy(desc(users.createdAt)) // Indexed for sorting
      .limit(limit);
  }
  
  // Select only needed columns
  async getUserSummary(id: string) {
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      email: users.email, // Don't select passwordHash
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
    
    return user;
  }
  
  // Use prepared statements for repeated queries
  private findUserByIdStmt = db.select()
    .from(users)
    .where(eq(users.id, placeholder('id')))
    .limit(1)
    .prepare();
  
  async findUserByIdOptimized(id: string) {
    const [user] = await this.findUserByIdStmt.execute({ id });
    return user;
  }
}
```

## Main Application Setup

### Enterprise App Configuration
```typescript
// app.ts
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { requestId } from 'hono/request-id';
import { setupRoutes } from './routes';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/error-handler';
import { env } from './env';

const app = new Hono();

// Global middleware
app.use('*', requestId());
app.use('*', logger());
app.use('*', corsMiddleware);

// Setup routes
setupRoutes(app);

// Error handling (must be last)
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Route not found',
    success: false,
    timestamp: new Date(),
  }, 404);
});

export default app;
```

## Quality Checklist

### Architecture Requirements
- [ ] Environment variables validated with Zod in single env.ts file
- [ ] Database connection created once in database/client.ts
- [ ] Routes organized by feature in separate files
- [ ] Handlers separated one per file in handlers/ directory
- [ ] All routes and handlers fully typed with proper context
- [ ] Middleware applied consistently with type safety

### Type Safety Requirements
- [ ] All API endpoints have input/output type definitions
- [ ] Zod schemas for all validation
- [ ] Database schema generates TypeScript types
- [ ] No any types used anywhere
- [ ] Context variables properly typed

### Validation Requirements
- [ ] All user inputs validated with Zod
- [ ] Custom validation messages for user errors
- [ ] Sanitization applied where needed
- [ ] File upload validation if applicable

### Error Handling Requirements
- [ ] Centralized error handler implemented
- [ ] HTTP status codes used correctly
- [ ] Validation errors return 400 with details
- [ ] Authentication errors return 401
- [ ] Authorization errors return 403
- [ ] Resource not found returns 404

### Performance Requirements
- [ ] Database queries use indexes
- [ ] Select only needed columns
- [ ] Prepared statements for repeated queries
- [ ] Pagination implemented for list endpoints
- [ ] Response caching where appropriate

### Testing Requirements
- [ ] Vitest configured for testing
- [ ] Handler tests cover success and error cases
- [ ] Database cleaned between tests
- [ ] Type-safe test client used
- [ ] Edge cases tested

Remember: Always use typed approaches, validate environment variables, and organize code by feature for maximum maintainability!