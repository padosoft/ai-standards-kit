# TypeScript Hono Coding Guidelines

> **Extends**: `/docs/standards/global/coding-guidelines.md`
> 
> This document provides **TypeScript + Hono-specific** implementations of the enterprise coding guidelines. Always follow the global principles while applying these modern web API development patterns.

## Core Programming Principles

### Return Early Pattern
```typescript
// ✅ Good - Return Early to avoid deep nesting
function processUser(user: User | null): Result {
  if (!user) return { error: 'User not found' };
  if (!user.isActive) return { error: 'User inactive' };
  if (!user.hasPermission) return { error: 'Unauthorized' };
  
  // Happy path with minimal nesting
  return { data: transformUser(user) };
}

// ❌ Bad - Nested conditions
function processUserBad(user: User | null): Result {
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

### Pure Functions and Immutability
```typescript
// ✅ Good - Pure function: same input always produces same output
const calculateDiscount = (price: number, percentage: number): number => {
  return price * (1 - percentage / 100);
};

const calculateOrderTotal = (items: readonly OrderItem[]): Money => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// ✅ Good - Immutable updates
const updateUserPreferences = (user: User, newPrefs: Partial<UserPreferences>): User => {
  return {
    ...user,
    preferences: {
      ...user.preferences,
      ...newPrefs,
    },
    updatedAt: new Date(),
  };
};

// ❌ Bad - Side effects and mutations
let globalDiscount = 0;
const calculateDiscountBad = (price: number): number => {
  globalDiscount += 10; // Side effect!
  console.log('Calculating...'); // Side effect!
  return price * (1 - globalDiscount / 100);
};
```

### SOLID Principles Implementation
```typescript
// ✅ Good - Single Responsibility Principle
class UserValidator {
  validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  validatePassword(password: string): boolean {
    return password.length >= 8 && /(?=.*[A-Za-z])(?=.*\d)/.test(password);
  }
}

// ✅ Good - Open/Closed Principle
interface NotificationSender {
  send(message: string, recipient: string): Promise<void>;
}

class EmailNotificationSender implements NotificationSender {
  async send(message: string, recipient: string): Promise<void> {
    // Email implementation
  }
}

class SMSNotificationSender implements NotificationSender {
  async send(message: string, recipient: string): Promise<void> {
    // SMS implementation
  }
}

// ✅ Good - Dependency Inversion
class NotificationService {
  constructor(private sender: NotificationSender) {}
  
  async notify(message: string, recipient: string): Promise<void> {
    await this.sender.send(message, recipient);
  }
}
```

### Naming Conventions
```typescript
// ✅ Good - Descriptive naming
// Variables & Functions: camelCase
const userId = '123';
const calculateTotalPrice = (items: Item[]) => { /* ... */ };
const isEmailValid = (email: string) => { /* ... */ };

// Classes & Interfaces: PascalCase
class UserService {}
interface PaymentGateway {}
type OrderStatus = 'pending' | 'completed';

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRIES = 3;
const API_TIMEOUT = 5000;
const DEFAULT_PAGE_SIZE = 20;

// Boolean naming with proper prefixes
const isActive = true;
const hasPermission = user.permissions.includes('admin');
const canEdit = user.role === 'editor';
const shouldRetry = attempt < MAX_RETRIES;

// ❌ Bad - Unclear naming
const data = fetchData(); // Too generic
const get = (id: string) => { /* ... */ }; // Unclear verb
const valid = checkEmail(email); // Missing 'is' prefix
```

### Performance Patterns
```typescript
// ✅ Good - Use Map for O(1) lookups
const createUserLookup = (users: User[]): Map<string, User> => {
  return new Map(users.map(user => [user.id, user]));
};

const userMap = createUserLookup(users);
const user = userMap.get(userId); // O(1) lookup

// ✅ Good - Process in batches for better performance
async function processItemsInBatches<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await processor(batch);
  }
}

// ❌ Bad - O(n²) operations and no batching
const findUserOrders = (orders: Order[], users: User[]) => {
  return orders.map(order => ({
    ...order,
    user: users.find(u => u.id === order.userId) // O(n) lookup in loop = O(n²)
  }));
};

// Processing one by one without parallelization
for (const item of items) {
  await processItem(item); // No batching
}
```

## Hono Application Structure

### Application Setup and Configuration
```typescript
// ✅ Good - Well-structured Hono application
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { validator } from 'hono/validator';
import { jwt } from 'hono/jwt';

import { userRoutes } from './routes/users';
import { authRoutes } from './routes/auth';
import { orderRoutes } from './routes/orders';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { requestId } from './middleware/requestId';
import { metricsMiddleware } from './middleware/metrics';

// Define environment variables type
interface Environment {
  JWT_SECRET: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  API_VERSION: string;
}

// ✅ Good - Type-safe Hono app with proper middleware chain
const app = new Hono<{ Bindings: Environment }>();

// Global middleware (order matters)
app.use('*', requestId());
app.use('*', timing());
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: (origin) => {
    // Allow specific origins in production
    const allowedOrigins = ['https://myapp.com', 'https://api.myapp.com'];
    return allowedOrigins.includes(origin) ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-Request-ID'],
  maxAge: 86400,
  credentials: true,
}));

// Rate limiting
app.use('*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
}));

// Metrics collection
app.use('*', metricsMiddleware());

// Pretty JSON in development
if (process.env.NODE_ENV === 'development') {
  app.use('*', prettyJSON());
}

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: c.env.API_VERSION || '1.0.0',
  });
});

// API routes with versioning
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/orders', orderRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: `Route ${c.req.method} ${c.req.path} not found`,
    timestamp: new Date().toISOString(),
  }, 404);
});

// Global error handler (must be last)
app.onError(errorHandler);

export default app;
```

### Route Organization and Handlers
```typescript
// ✅ Good - Well-organized route handlers with proper typing
import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { jwt } from 'hono/jwt';
import { z } from 'zod';

import { UserService } from '../services/UserService';
import { requireAuth } from '../middleware/auth';
import { requirePermissions } from '../middleware/permissions';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

// Define schemas for validation
const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['user', 'admin']).default('user'),
});

const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update",
});

const UserQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.coerce.boolean().optional(),
});

// Route parameter schema
const UserParamsSchema = z.object({
  id: z.string().uuid(),
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;
type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
type UserQuery = z.infer<typeof UserQuerySchema>;
type UserParams = z.infer<typeof UserParamsSchema>;

// ✅ Good - Type-safe route definitions
const userRoutes = new Hono();

// Get all users with filtering and pagination
userRoutes.get(
  '/',
  requireAuth(),
  requirePermissions(['users:read']),
  validator('query', (value, c) => {
    const parsed = UserQuerySchema.safeParse(value);
    if (!parsed.success) {
      return c.json(createErrorResponse('Invalid query parameters', parsed.error.errors), 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const query = c.req.valid('query') as UserQuery;
      const userService = new UserService(c.env.DATABASE_URL);
      
      const result = await userService.findUsers({
        page: query.page,
        limit: query.limit,
        search: query.search,
        role: query.role,
        isActive: query.isActive,
      });
      
      return c.json(createSuccessResponse(result, {
        pagination: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / query.limit),
        }
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      return c.json(createErrorResponse('Failed to fetch users'), 500);
    }
  }
);

// Get single user by ID
userRoutes.get(
  '/:id',
  requireAuth(),
  validator('param', (value, c) => {
    const parsed = UserParamsSchema.safeParse(value);
    if (!parsed.success) {
      return c.json(createErrorResponse('Invalid user ID'), 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const { id } = c.req.valid('param') as UserParams;
      const userService = new UserService(c.env.DATABASE_URL);
      
      const user = await userService.findById(id);
      if (!user) {
        return c.json(createErrorResponse('User not found'), 404);
      }
      
      // Check if user can access this resource
      const currentUser = c.get('user');
      if (currentUser.id !== id && !currentUser.permissions.includes('users:read:all')) {
        return c.json(createErrorResponse('Access denied'), 403);
      }
      
      return c.json(createSuccessResponse(user));
    } catch (error) {
      console.error('Error fetching user:', error);
      return c.json(createErrorResponse('Failed to fetch user'), 500);
    }
  }
);

// Create new user
userRoutes.post(
  '/',
  requireAuth(),
  requirePermissions(['users:create']),
  validator('json', (value, c) => {
    const parsed = CreateUserSchema.safeParse(value);
    if (!parsed.success) {
      return c.json(createErrorResponse('Validation failed', parsed.error.errors), 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const userData = c.req.valid('json') as CreateUserInput;
      const userService = new UserService(c.env.DATABASE_URL);
      
      // Check if email already exists
      const existingUser = await userService.findByEmail(userData.email);
      if (existingUser) {
        return c.json(createErrorResponse('Email already exists'), 409);
      }
      
      const newUser = await userService.create(userData);
      
      // Log user creation
      console.log(`User created: ${newUser.id} by ${c.get('user').id}`);
      
      return c.json(createSuccessResponse(newUser), 201);
    } catch (error) {
      console.error('Error creating user:', error);
      return c.json(createErrorResponse('Failed to create user'), 500);
    }
  }
);

// Update user
userRoutes.put(
  '/:id',
  requireAuth(),
  validator('param', (value, c) => {
    const parsed = UserParamsSchema.safeParse(value);
    if (!parsed.success) {
      return c.json(createErrorResponse('Invalid user ID'), 400);
    }
    return parsed.data;
  }),
  validator('json', (value, c) => {
    const parsed = UpdateUserSchema.safeParse(value);
    if (!parsed.success) {
      return c.json(createErrorResponse('Validation failed', parsed.error.errors), 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const { id } = c.req.valid('param') as UserParams;
      const updateData = c.req.valid('json') as UpdateUserInput;
      const userService = new UserService(c.env.DATABASE_URL);
      
      // Check if user exists
      const existingUser = await userService.findById(id);
      if (!existingUser) {
        return c.json(createErrorResponse('User not found'), 404);
      }
      
      // Authorization check
      const currentUser = c.get('user');
      if (currentUser.id !== id && !currentUser.permissions.includes('users:update:all')) {
        return c.json(createErrorResponse('Access denied'), 403);
      }
      
      // Check email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await userService.findByEmail(updateData.email);
        if (emailExists) {
          return c.json(createErrorResponse('Email already exists'), 409);
        }
      }
      
      const updatedUser = await userService.update(id, updateData);
      
      return c.json(createSuccessResponse(updatedUser));
    } catch (error) {
      console.error('Error updating user:', error);
      return c.json(createErrorResponse('Failed to update user'), 500);
    }
  }
);

// Delete user (soft delete)
userRoutes.delete(
  '/:id',
  requireAuth(),
  requirePermissions(['users:delete']),
  validator('param', (value, c) => {
    const parsed = UserParamsSchema.safeParse(value);
    if (!parsed.success) {
      return c.json(createErrorResponse('Invalid user ID'), 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const { id } = c.req.valid('param') as UserParams;
      const userService = new UserService(c.env.DATABASE_URL);
      
      const user = await userService.findById(id);
      if (!user) {
        return c.json(createErrorResponse('User not found'), 404);
      }
      
      // Prevent self-deletion
      const currentUser = c.get('user');
      if (currentUser.id === id) {
        return c.json(createErrorResponse('Cannot delete your own account'), 400);
      }
      
      await userService.softDelete(id);
      
      // Log user deletion
      console.log(`User deleted: ${id} by ${currentUser.id}`);
      
      return c.json(createSuccessResponse({ message: 'User deleted successfully' }));
    } catch (error) {
      console.error('Error deleting user:', error);
      return c.json(createErrorResponse('Failed to delete user'), 500);
    }
  }
);

export { userRoutes };
```

## Middleware Patterns

### Custom Middleware Implementation
```typescript
// ✅ Good - Authentication middleware
import { Context, Next } from 'hono';
import { jwt } from 'hono/jwt';
import { createErrorResponse } from '../utils/response';

interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AuthContext extends Context {
  get(key: 'user'): User;
  set(key: 'user', value: User): void;
}

export const requireAuth = () => {
  return async (c: Context, next: Next) => {
    try {
      // First check JWT validity
      const jwtMiddleware = jwt({ secret: c.env.JWT_SECRET });
      await jwtMiddleware(c, async () => {});
      
      const payload = c.get('jwtPayload');
      if (!payload || !payload.sub) {
        return c.json(createErrorResponse('Invalid token'), 401);
      }
      
      // Fetch user details (could be cached)
      const userService = new UserService(c.env.DATABASE_URL);
      const user = await userService.findById(payload.sub);
      
      if (!user || !user.isActive) {
        return c.json(createErrorResponse('User not found or inactive'), 401);
      }
      
      // Add user to context
      c.set('user', user);
      
      await next();
    } catch (error) {
      console.error('Authentication error:', error);
      return c.json(createErrorResponse('Authentication failed'), 401);
    }
  };
};

// ✅ Good - Permission-based authorization
export const requirePermissions = (requiredPermissions: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as User;
    
    if (!user) {
      return c.json(createErrorResponse('Authentication required'), 401);
    }
    
    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission =>
      user.permissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return c.json(createErrorResponse('Insufficient permissions'), 403);
    }
    
    await next();
  };
};

// ✅ Good - Rate limiting middleware
interface RateLimitOptions {
  windowMs: number;
  max: number;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  keyGen?: (c: Context) => string;
}

export const rateLimiter = (options: RateLimitOptions) => {
  const { windowMs, max, standardHeaders = true, legacyHeaders = false, keyGen } = options;
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return async (c: Context, next: Next) => {
    const key = keyGen ? keyGen(c) : c.req.header('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean up old entries
    for (const [k, v] of requests.entries()) {
      if (v.resetTime < windowStart) {
        requests.delete(k);
      }
    }
    
    // Get current request count
    const current = requests.get(key);
    let count = 1;
    let resetTime = now + windowMs;
    
    if (current && current.resetTime > now) {
      count = current.count + 1;
      resetTime = current.resetTime;
    }
    
    requests.set(key, { count, resetTime });
    
    // Set rate limit headers
    if (standardHeaders) {
      c.res.headers.set('RateLimit-Limit', max.toString());
      c.res.headers.set('RateLimit-Remaining', Math.max(0, max - count).toString());
      c.res.headers.set('RateLimit-Reset', new Date(resetTime).toISOString());
    }
    
    if (legacyHeaders) {
      c.res.headers.set('X-RateLimit-Limit', max.toString());
      c.res.headers.set('X-RateLimit-Remaining', Math.max(0, max - count).toString());
      c.res.headers.set('X-RateLimit-Reset', Math.floor(resetTime / 1000).toString());
    }
    
    if (count > max) {
      return c.json(createErrorResponse('Too many requests'), 429);
    }
    
    await next();
  };
};

// ✅ Good - Request ID middleware
export const requestId = () => {
  return async (c: Context, next: Next) => {
    const requestId = c.req.header('x-request-id') || crypto.randomUUID();
    
    c.set('requestId', requestId);
    c.res.headers.set('X-Request-ID', requestId);
    
    await next();
  };
};

// ✅ Good - Error handling middleware
export const errorHandler = (error: Error, c: Context) => {
  console.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header('user-agent'),
  });
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const message = isDevelopment ? error.message : 'Internal server error';
  
  return c.json(createErrorResponse(message, isDevelopment ? error.stack : undefined), 500);
};
```

## Service Layer Architecture

### Business Logic Services
```typescript
// ✅ Good - Well-structured service with proper separation
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { Database } from '../database/Database';
import { User, CreateUserData, UpdateUserData, UserFilters } from '../types/User';
import { PaginatedResult } from '../types/Common';

export class UserService {
  private db: Database;
  
  constructor(databaseUrl: string) {
    this.db = new Database(databaseUrl);
  }
  
  async findUsers(filters: UserFilters): Promise<PaginatedResult<User>> {
    const { page, limit, search, role, isActive } = filters;
    const offset = (page - 1) * limit;
    
    // Build dynamic query
    let query = this.db.users.select();
    let countQuery = this.db.users.count();
    
    if (search) {
      const searchPattern = `%${search}%`;
      query = query.where(db => 
        db.or(
          db.name.like(searchPattern),
          db.email.like(searchPattern)
        )
      );
      countQuery = countQuery.where(db => 
        db.or(
          db.name.like(searchPattern),
          db.email.like(searchPattern)
        )
      );
    }
    
    if (role) {
      query = query.where(db => db.role.equals(role));
      countQuery = countQuery.where(db => db.role.equals(role));
    }
    
    if (isActive !== undefined) {
      query = query.where(db => db.isActive.equals(isActive));
      countQuery = countQuery.where(db => db.isActive.equals(isActive));
    }
    
    // Execute queries
    const [users, totalCount] = await Promise.all([
      query
        .orderBy(db => db.createdAt, 'desc')
        .limit(limit)
        .offset(offset)
        .execute(),
      countQuery.execute(),
    ]);
    
    return {
      data: users.map(this.mapToUser),
      total: totalCount,
      page,
      limit,
    };
  }
  
  async findById(id: string): Promise<User | null> {
    const user = await this.db.users
      .select()
      .where(db => db.id.equals(id))
      .where(db => db.deletedAt.isNull())
      .first();
    
    return user ? this.mapToUser(user) : null;
  }
  
  async findByEmail(email: string): Promise<User | null> {
    const user = await this.db.users
      .select()
      .where(db => db.email.equals(email))
      .where(db => db.deletedAt.isNull())
      .first();
    
    return user ? this.mapToUser(user) : null;
  }
  
  async create(userData: CreateUserData): Promise<User> {
    // Validate input
    const validatedData = this.validateCreateUserData(userData);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);
    
    // Create user with transaction
    const user = await this.db.transaction(async (tx) => {
      const newUser = await tx.users.insert({
        id: crypto.randomUUID(),
        name: validatedData.name,
        email: validatedData.email.toLowerCase(),
        passwordHash: hashedPassword,
        role: validatedData.role,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Create default permissions based on role
      await this.createDefaultPermissions(tx, newUser.id, validatedData.role);
      
      return newUser;
    });
    
    return this.mapToUser(user);
  }
  
  async update(id: string, updateData: UpdateUserData): Promise<User> {
    const validatedData = this.validateUpdateUserData(updateData);
    
    const updatedUser = await this.db.users
      .update({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(db => db.id.equals(id))
      .where(db => db.deletedAt.isNull())
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return this.mapToUser(updatedUser);
  }
  
  async softDelete(id: string): Promise<void> {
    await this.db.users
      .update({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(db => db.id.equals(id))
      .execute();
  }
  
  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.db.users
      .select()
      .where(db => db.email.equals(email.toLowerCase()))
      .where(db => db.isActive.equals(true))
      .where(db => db.deletedAt.isNull())
      .first();
    
    if (!user) {
      return null;
    }
    
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }
    
    // Update last login
    await this.db.users
      .update({ lastLoginAt: new Date() })
      .where(db => db.id.equals(user.id))
      .execute();
    
    return this.mapToUser(user);
  }
  
  private validateCreateUserData(data: CreateUserData): CreateUserData {
    const schema = z.object({
      name: z.string().min(2).max(100),
      email: z.string().email().max(255),
      password: z.string().min(8).max(100),
      role: z.enum(['user', 'admin']),
    });
    
    return schema.parse(data);
  }
  
  private validateUpdateUserData(data: UpdateUserData): UpdateUserData {
    const schema = z.object({
      name: z.string().min(2).max(100).optional(),
      email: z.string().email().max(255).optional(),
      isActive: z.boolean().optional(),
    }).refine(data => Object.keys(data).length > 0);
    
    return schema.parse(data);
  }
  
  private mapToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      isActive: dbUser.isActive,
      emailVerified: dbUser.emailVerified,
      lastLoginAt: dbUser.lastLoginAt,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
      permissions: [], // Load separately if needed
    };
  }
  
  private async createDefaultPermissions(tx: any, userId: string, role: string): Promise<void> {
    const defaultPermissions = {
      user: ['profile:read', 'profile:update'],
      admin: ['*'],
    };
    
    const permissions = defaultPermissions[role as keyof typeof defaultPermissions] || [];
    
    for (const permission of permissions) {
      await tx.userPermissions.insert({
        id: crypto.randomUUID(),
        userId,
        permission,
        createdAt: new Date(),
      });
    }
  }
}
```

## Error Handling Patterns

### Structured Error Handling
```typescript
// ✅ Good - Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;
  public isOperational = true;
  
  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

// ✅ Good - Error response utilities
interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: unknown;
    requestId?: string;
  };
  timestamp: string;
}

interface SuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export function createErrorResponse(
  message: string,
  details?: unknown,
  code: string = 'ERROR'
): ErrorResponse {
  return {
    error: {
      message,
      code,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): SuccessResponse<T> {
  return {
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
}

// ✅ Good - Global error handler with proper logging
export const errorHandler = (error: Error, c: Context) => {
  const requestId = c.get('requestId');
  
  // Log error with context
  const errorLog = {
    message: error.message,
    stack: error.stack,
    requestId,
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('x-forwarded-for') || 'unknown',
    timestamp: new Date().toISOString(),
  };
  
  if (error instanceof AppError) {
    // Operational errors - log as info/warn
    if (error.statusCode >= 500) {
      console.error('Operational error:', errorLog);
    } else {
      console.warn('Client error:', errorLog);
    }
    
    const response = createErrorResponse(
      error.message,
      error.details,
      error.code
    );
    response.error.requestId = requestId;
    
    return c.json(response, error.statusCode);
  } else {
    // Programming errors - log as error
    console.error('Programming error:', errorLog);
    
    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const message = isDevelopment ? error.message : 'Internal server error';
    const details = isDevelopment ? error.stack : undefined;
    
    const response = createErrorResponse(message, details, 'INTERNAL_ERROR');
    response.error.requestId = requestId;
    
    return c.json(response, 500);
  }
};
```

## Testing Patterns

### API Testing with Hono
```typescript
// ✅ Good - Comprehensive API testing
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testClient } from 'hono/testing';

import app from '../app';
import { Database } from '../database/Database';
import { UserService } from '../services/UserService';

// Test client setup
const client = testClient(app);

describe('User API', () => {
  let database: Database;
  let userService: UserService;
  let testUser: any;
  let authToken: string;
  
  beforeEach(async () => {
    // Setup test database
    database = new Database(process.env.TEST_DATABASE_URL!);
    await database.migrate();
    
    userService = new UserService(process.env.TEST_DATABASE_URL!);
    
    // Create test user
    testUser = await userService.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user',
    });
    
    // Generate auth token for testing
    authToken = await generateTestToken(testUser.id);
  });
  
  afterEach(async () => {
    await database.truncate();
    await database.close();
  });
  
  describe('GET /api/v1/users', () => {
    it('should return paginated users list', async () => {
      const response = await client.api.v1.users.$get(
        {
          query: {
            page: '1',
            limit: '10',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('meta.pagination');
      expect(Array.isArray(data.data)).toBe(true);
    });
    
    it('should filter users by search query', async () => {
      await userService.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'user',
      });
      
      const response = await client.api.v1.users.$get(
        {
          query: {
            search: 'john',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('John Doe');
    });
    
    it('should return 401 without authentication', async () => {
      const response = await client.api.v1.users.$get();
      
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });
  
  describe('POST /api/v1/users', () => {
    it('should create new user with valid data', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'user' as const,
      };
      
      const response = await client.api.v1.users.$post(
        {
          json: userData,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe(userData.name);
      expect(data.data.email).toBe(userData.email);
      expect(data.data).not.toHaveProperty('passwordHash');
    });
    
    it('should return 400 with invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
        role: 'user' as const,
      };
      
      const response = await client.api.v1.users.$post(
        {
          json: userData,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should return 409 with duplicate email', async () => {
      const userData = {
        name: 'Test User 2',
        email: testUser.email, // Same email as existing user
        password: 'password123',
        role: 'user' as const,
      };
      
      const response = await client.api.v1.users.$post(
        {
          json: userData,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      expect(response.status).toBe(409);
      
      const data = await response.json();
      expect(data.error.message).toBe('Email already exists');
    });
  });
  
  describe('GET /api/v1/users/:id', () => {
    it('should return user by id', async () => {
      const response = await client.api.v1.users[':id'].$get(
        {
          param: {
            id: testUser.id,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.data.id).toBe(testUser.id);
      expect(data.data.name).toBe(testUser.name);
    });
    
    it('should return 404 for non-existent user', async () => {
      const response = await client.api.v1.users[':id'].$get(
        {
          param: {
            id: '00000000-0000-0000-0000-000000000000',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      expect(response.status).toBe(404);
    });
    
    it('should return 400 for invalid UUID', async () => {
      const response = await client.api.v1.users[':id'].$get(
        {
          param: {
            id: 'invalid-uuid',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      expect(response.status).toBe(400);
    });
  });
});

// Test utilities
async function generateTestToken(userId: string): Promise<string> {
  // Implementation depends on your JWT setup
  return 'test-jwt-token';
}
```

## Comments and Documentation

### Meaningful Comments
```typescript
// ✅ Good - Explain WHY, not WHAT
// Use exponential backoff to avoid overwhelming the service
const delay = Math.min(1000 * Math.pow(2, attempt), MAX_DELAY);

// Complex business rules need explanation
// Per company policy, premium users get 30-day refund window,
// while standard users only get 14 days
const refundWindowDays = user.isPremium ? 30 : 14;

// ❌ Bad - Obvious comments that add no value
// Increment counter by 1
counter++;

// Return the user
return user;

// Get user ID from request
const userId = req.params.id;
```

### JSDoc for Public APIs
```typescript
/**
 * Processes a payment with retry logic and fraud detection
 * @param paymentData - The payment information
 * @param options - Configuration options for processing
 * @returns Promise that resolves to payment result
 * @throws PaymentError when payment fails after all retries
 * @throws FraudDetectedError when suspicious activity is detected
 * 
 * @example
 * ```typescript
 * const result = await processPayment(
 *   { amount: 100, currency: 'USD' },
 *   { maxRetries: 3, enableFraudCheck: true }
 * );
 * ```
 */
async function processPayment(
  paymentData: PaymentData,
  options: PaymentOptions = {}
): Promise<PaymentResult> {
  // Implementation
}
```

## Security Best Practices

### Input Validation and Sanitization
```typescript
// ✅ Good - Comprehensive input validation
const validateAndSanitizeUserInput = (input: unknown): SanitizedInput => {
  // Validate structure with Zod
  const schema = z.object({
    name: z.string().min(1).max(100).trim(),
    email: z.string().email().toLowerCase(),
    bio: z.string().max(500).optional(),
  });
  
  const validated = schema.parse(input);
  
  // Sanitize HTML content
  const sanitized = {
    ...validated,
    bio: validated.bio ? DOMPurify.sanitize(validated.bio) : undefined,
  };
  
  return sanitized;
};

// ✅ Good - Rate limiting implementation
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (clientId: string, limit: number, windowMs: number): boolean => {
  const now = Date.now();
  const clientLimit = rateLimitMap.get(clientId);
  
  if (!clientLimit || now > clientLimit.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (clientLimit.count >= limit) {
    return false;
  }
  
  clientLimit.count++;
  return true;
};
```

### Security Headers and CORS
```typescript
// ✅ Good - Secure CORS configuration
const corsOptions = {
  origin: (origin: string | undefined) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    return !origin || allowedOrigins.includes(origin) ? origin : null;
  },
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 hours
};

// ✅ Good - Security headers
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
  },
  crossOriginEmbedderPolicy: false, // Adjust based on requirements
}));
```

## Quality Gates and Standards

### TypeScript Configuration
```json
// tsconfig.json - Strict configuration
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Code Quality Standards
- ❌ No `any` types allowed
- ❌ No `@ts-ignore` or `@ts-nocheck` comments
- ❌ No commented-out code in commits
- ❌ No `console.log` statements in production builds
- ❌ No hardcoded credentials or secrets
- ❌ No TODO comments without issue references
- ✅ All functions must have explicit return types
- ✅ All async operations must handle errors
- ✅ All user inputs must be validated
- ✅ All database queries must be parameterized
- ✅ All API endpoints must have rate limiting
- ✅ All sensitive operations must be logged

## Final Checklist

### TypeScript Hono Code Quality Checklist
- [ ] Strict TypeScript configuration enabled
- [ ] All routes properly typed with Zod validation
- [ ] Middleware chain properly ordered and implemented
- [ ] Error handling with custom error classes
- [ ] Authentication and authorization middleware
- [ ] Rate limiting implemented
- [ ] Request/response logging
- [ ] CORS properly configured
- [ ] Security headers applied
- [ ] Input validation on all endpoints
- [ ] Proper HTTP status codes used
- [ ] API responses follow consistent format
- [ ] Database queries optimized and safe
- [ ] Environment variables properly typed
- [ ] Comprehensive test coverage
- [ ] Performance monitoring middleware
- [ ] Request ID tracking for debugging
- [ ] Graceful error responses in production