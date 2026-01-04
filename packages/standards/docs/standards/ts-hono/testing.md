# TypeScript Hono Testing Standards

> **Extends**: `/docs/standards/global/testing.md`
> 
> This document provides **TypeScript/Hono-specific** testing implementations and patterns. Apply these TypeScript-specific testing strategies while following global testing principles.

## TypeScript Testing Environment Setup

### Test Configuration (Vitest)
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    setupFiles: ['./src/test/setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});
```

### Test Setup File
```typescript
// src/test/setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { testDb } from './test-db';

beforeAll(async () => {
  await testDb.migrate();
});

afterAll(async () => {
  await testDb.close();
});

beforeEach(async () => {
  await testDb.clean();
});

// Global test utilities
global.testUtils = {
  createMockRequest: (options: RequestInit & { path?: string } = {}) => {
    return new Request(`http://localhost${options.path || '/'}`, options);
  },
  
  createMockContext: (req: Request) => {
    return {
      req,
      env: { NODE_ENV: 'test' },
      var: new Map(),
      get: vi.fn(),
      set: vi.fn(),
      json: vi.fn(),
      text: vi.fn(),
      html: vi.fn(),
      redirect: vi.fn(),
      notFound: vi.fn(),
      status: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
    };
  }
};
```

## Unit Testing Patterns

### Service Class Testing
```typescript
// src/services/__tests__/payment-processor.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentProcessor } from '@/services/payment-processor';
import { PaymentGateway } from '@/types/payment';

// Mock the payment gateway
vi.mock('@/gateways/stripe-gateway');

describe('PaymentProcessor', () => {
  let processor: PaymentProcessor;
  let mockGateway: vi.Mocked<PaymentGateway>;
  
  beforeEach(() => {
    mockGateway = {
      charge: vi.fn(),
      refund: vi.fn(),
      getStatus: vi.fn(),
    };
    processor = new PaymentProcessor(mockGateway);
  });
  
  describe('processPayment', () => {
    it.each([
      { amount: 100, currency: 'USD', expected: 'success' },
      { amount: 0, currency: 'USD', expected: 'invalid' },
      { amount: -10, currency: 'USD', expected: 'invalid' },
      { amount: 999999, currency: 'USD', expected: 'limit_exceeded' },
    ])('handles $amount $currency payment', async ({ amount, currency, expected }) => {
      // Arrange
      mockGateway.charge.mockResolvedValue({ 
        status: expected,
        transactionId: 'txn_123',
        amount,
        currency 
      });
      
      // Act
      const result = await processor.processPayment(amount, currency);
      
      // Assert
      expect(result.status).toBe(expected);
      expect(mockGateway.charge).toHaveBeenCalledWith(amount, currency);
    });
    
    it('throws error when gateway fails', async () => {
      // Arrange
      mockGateway.charge.mockRejectedValue(new Error('Gateway error'));
      
      // Act & Assert
      await expect(processor.processPayment(100, 'USD'))
        .rejects.toThrow('Gateway error');
    });
  });
  
  describe('validateAmount', () => {
    it.each([
      { amount: 100, expected: true },
      { amount: 0, expected: false },
      { amount: -10, expected: false },
      { amount: 0.01, expected: true },
      { amount: 999999.99, expected: false },
    ])('validates amount $amount correctly', ({ amount, expected }) => {
      expect(processor.validateAmount(amount)).toBe(expected);
    });
  });
});
```

### Utility Function Testing
```typescript
// src/utils/__tests__/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, sanitizeInput } from '@/utils/validation';

describe('validation utils', () => {
  describe('validateEmail', () => {
    it.each([
      { email: 'test@example.com', expected: true },
      { email: 'user+tag@domain.co.uk', expected: true },
      { email: 'invalid-email', expected: false },
      { email: '@domain.com', expected: false },
      { email: 'test@', expected: false },
      { email: '', expected: false },
    ])('validates "$email" as $expected', ({ email, expected }) => {
      expect(validateEmail(email)).toBe(expected);
    });
  });
  
  describe('validatePassword', () => {
    const validPassword = 'StrongPass123!';
    const weakPasswords = [
      '123456',           // too short
      'password',         // no numbers/symbols
      'PASSWORD123',      // no lowercase
      'password123',      // no uppercase
      'Password',         // no numbers
    ];
    
    it('accepts strong password', () => {
      expect(validatePassword(validPassword)).toBe(true);
    });
    
    it.each(weakPasswords)('rejects weak password: %s', (password) => {
      expect(validatePassword(password)).toBe(false);
    });
  });
  
  describe('sanitizeInput', () => {
    it('removes dangerous HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello <b>world</b>';
      const result = sanitizeInput(input);
      
      expect(result).toBe('Hello <b>world</b>');
      expect(result).not.toContain('<script>');
    });
    
    it('handles empty and null inputs', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });
});
```

## Hono Route Testing

### API Route Testing
```typescript
// src/routes/__tests__/orders.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { ordersRouter } from '@/routes/orders';
import { testClient } from 'hono/testing';

describe('Orders API', () => {
  let app: Hono;
  let client: ReturnType<typeof testClient>;
  
  beforeEach(() => {
    app = new Hono();
    app.route('/orders', ordersRouter);
    client = testClient(app);
  });
  
  describe('POST /orders', () => {
    const validOrderData = {
      items: [
        { productId: 1, quantity: 2, price: 50.00 },
        { productId: 2, quantity: 1, price: 25.00 }
      ],
      shippingAddress: {
        line1: '123 Test St',
        city: 'Test City',
        postalCode: '12345',
        country: 'US'
      }
    };
    
    it('creates order with valid data', async () => {
      // Act
      const response = await client.orders.$post({
        json: validOrderData
      });
      
      // Assert
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        totalAmount: 125.00,
        status: 'pending',
        items: expect.any(Array)
      });
    });
    
    it('validates required fields', async () => {
      // Act
      const response = await client.orders.$post({
        json: {}
      });
      
      // Assert
      expect(response.status).toBe(400);
      
      const error = await response.json();
      expect(error.message).toContain('items');
    });
    
    it.each([
      { field: 'items', value: [], error: 'Items cannot be empty' },
      { field: 'items', value: [{ productId: 'invalid' }], error: 'Invalid product ID' },
      { field: 'shippingAddress', value: null, error: 'Shipping address required' },
    ])('validates $field field', async ({ field, value, error }) => {
      // Arrange
      const invalidData = { ...validOrderData, [field]: value };
      
      // Act
      const response = await client.orders.$post({
        json: invalidData
      });
      
      // Assert
      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.message).toContain(error);
    });
  });
  
  describe('GET /orders/:id', () => {
    it('returns order when found', async () => {
      // Arrange - create order first
      const createResponse = await client.orders.$post({
        json: validOrderData
      });
      const { id } = await createResponse.json();
      
      // Act
      const response = await client.orders[':id'].$get({
        param: { id }
      });
      
      // Assert
      expect(response.status).toBe(200);
      
      const order = await response.json();
      expect(order.id).toBe(id);
      expect(order.totalAmount).toBe(125.00);
    });
    
    it('returns 404 when order not found', async () => {
      // Act
      const response = await client.orders[':id'].$get({
        param: { id: 'non-existent' }
      });
      
      // Assert
      expect(response.status).toBe(404);
    });
  });
});
```

### Middleware Testing
```typescript
// src/middleware/__tests__/auth.test.ts
import { describe, it, expect, vi } from 'vitest';
import { authMiddleware } from '@/middleware/auth';
import { Context } from 'hono';

describe('Auth Middleware', () => {
  const mockNext = vi.fn();
  
  beforeEach(() => {
    mockNext.mockClear();
  });
  
  it('allows requests with valid token', async () => {
    // Arrange
    const mockContext = {
      req: {
        header: vi.fn().mockReturnValue('Bearer valid-token-123')
      },
      set: vi.fn(),
      json: vi.fn()
    } as unknown as Context;
    
    // Mock token validation
    vi.mocked(validateToken).mockResolvedValue({ 
      userId: '123', 
      email: 'test@example.com' 
    });
    
    // Act
    await authMiddleware(mockContext, mockNext);
    
    // Assert
    expect(mockNext).toHaveBeenCalled();
    expect(mockContext.set).toHaveBeenCalledWith('user', {
      userId: '123',
      email: 'test@example.com'
    });
  });
  
  it('rejects requests without token', async () => {
    // Arrange
    const mockContext = {
      req: {
        header: vi.fn().mockReturnValue(null)
      },
      json: vi.fn().mockReturnValue(new Response())
    } as unknown as Context;
    
    // Act
    await authMiddleware(mockContext, mockNext);
    
    // Assert
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith(
      { error: 'Unauthorized' },
      401
    );
  });
  
  it('rejects requests with invalid token', async () => {
    // Arrange
    const mockContext = {
      req: {
        header: vi.fn().mockReturnValue('Bearer invalid-token')
      },
      json: vi.fn().mockReturnValue(new Response())
    } as unknown as Context;
    
    vi.mocked(validateToken).mockRejectedValue(new Error('Invalid token'));
    
    // Act
    await authMiddleware(mockContext, mockNext);
    
    // Assert
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockContext.json).toHaveBeenCalledWith(
      { error: 'Invalid token' },
      401
    );
  });
});
```

## Database Testing (with Drizzle)

### Repository Testing
```typescript
// src/repositories/__tests__/user-repository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { UserRepository } from '@/repositories/user-repository';
import { testDb } from '@/test/test-db';
import { users } from '@/db/schema';

describe('UserRepository', () => {
  let repository: UserRepository;
  
  beforeEach(async () => {
    await testDb.clean();
    repository = new UserRepository(testDb.db);
  });
  
  describe('create', () => {
    it('creates user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword123'
      };
      
      // Act
      const user = await repository.create(userData);
      
      // Assert
      expect(user).toMatchObject({
        id: expect.any(String),
        email: userData.email,
        name: userData.name,
        createdAt: expect.any(Date)
      });
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });
    
    it('throws error for duplicate email', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword123'
      };
      
      await repository.create(userData);
      
      // Act & Assert
      await expect(repository.create(userData))
        .rejects.toThrow('Email already exists');
    });
  });
  
  describe('findByEmail', () => {
    it('returns user when found', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword123'
      };
      
      const createdUser = await repository.create(userData);
      
      // Act
      const foundUser = await repository.findByEmail(userData.email);
      
      // Assert
      expect(foundUser).toMatchObject({
        id: createdUser.id,
        email: userData.email,
        name: userData.name
      });
    });
    
    it('returns null when user not found', async () => {
      // Act
      const user = await repository.findByEmail('nonexistent@example.com');
      
      // Assert
      expect(user).toBeNull();
    });
  });
});
```

## Integration Testing

### End-to-End API Testing
```typescript
// src/__tests__/integration/order-flow.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { testClient } from 'hono/testing';
import { app } from '@/app';
import { testDb } from '@/test/test-db';

describe('Order Flow Integration', () => {
  let client: ReturnType<typeof testClient>;
  let authToken: string;
  
  beforeEach(async () => {
    await testDb.clean();
    client = testClient(app);
    
    // Create and authenticate user
    const userResponse = await client.auth.register.$post({
      json: {
        email: 'test@example.com',
        password: 'StrongPass123!',
        name: 'Test User'
      }
    });
    
    const { token } = await userResponse.json();
    authToken = token;
  });
  
  it('completes full order lifecycle', async () => {
    // 1. Create products
    const product1 = await client.products.$post({
      json: { name: 'Product 1', price: 50.00, stock: 10 },
      header: { Authorization: `Bearer ${authToken}` }
    });
    
    const product2 = await client.products.$post({
      json: { name: 'Product 2', price: 25.00, stock: 5 },
      header: { Authorization: `Bearer ${authToken}` }
    });
    
    const { id: productId1 } = await product1.json();
    const { id: productId2 } = await product2.json();
    
    // 2. Create order
    const orderResponse = await client.orders.$post({
      json: {
        items: [
          { productId: productId1, quantity: 2, price: 50.00 },
          { productId: productId2, quantity: 1, price: 25.00 }
        ],
        shippingAddress: {
          line1: '123 Test St',
          city: 'Test City',
          postalCode: '12345',
          country: 'US'
        }
      },
      header: { Authorization: `Bearer ${authToken}` }
    });
    
    expect(orderResponse.status).toBe(201);
    const { id: orderId } = await orderResponse.json();
    
    // 3. Process payment
    const paymentResponse = await client.orders[':id'].payment.$post({
      param: { id: orderId },
      json: {
        paymentMethodId: 'pm_card_visa',
        amount: 125.00
      },
      header: { Authorization: `Bearer ${authToken}` }
    });
    
    expect(paymentResponse.status).toBe(200);
    
    // 4. Verify order status
    const orderStatusResponse = await client.orders[':id'].$get({
      param: { id: orderId },
      header: { Authorization: `Bearer ${authToken}` }
    });
    
    const updatedOrder = await orderStatusResponse.json();
    expect(updatedOrder.status).toBe('paid');
    expect(updatedOrder.totalAmount).toBe(125.00);
    
    // 5. Verify inventory was decremented
    const product1Updated = await client.products[':id'].$get({
      param: { id: productId1 }
    });
    const product2Updated = await client.products[':id'].$get({
      param: { id: productId2 }
    });
    
    const p1 = await product1Updated.json();
    const p2 = await product2Updated.json();
    
    expect(p1.stock).toBe(8); // 10 - 2
    expect(p2.stock).toBe(4); // 5 - 1
  });
});
```

## Performance Testing

### Load Testing with Benchmark
```typescript
// src/__tests__/performance/api-performance.test.ts
import { describe, it, expect } from 'vitest';
import { app } from '@/app';

describe('API Performance', () => {
  it('handles concurrent order creation', async () => {
    const concurrentRequests = 50;
    const startTime = Date.now();
    
    // Create concurrent requests
    const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
      const request = new Request('http://localhost/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          items: [{ productId: 1, quantity: 1, price: 50.00 }],
          shippingAddress: {
            line1: `${i} Test St`,
            city: 'Test City',
            postalCode: '12345',
            country: 'US'
          }
        })
      });
      
      return app.fetch(request);
    });
    
    // Execute all requests
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    
    // Verify all succeeded
    responses.forEach(response => {
      expect(response.status).toBe(201);
    });
    
    // Verify performance
    const totalTime = endTime - startTime;
    const averageTime = totalTime / concurrentRequests;
    
    expect(averageTime).toBeLessThan(100); // Average should be under 100ms
    expect(totalTime).toBeLessThan(5000);  // Total should be under 5 seconds
    
    console.log(`Processed ${concurrentRequests} requests in ${totalTime}ms (avg: ${averageTime}ms)`);
  });
});
```

## TypeScript Testing Best Practices

### Type Testing
```typescript
// src/types/__tests__/api-types.test.ts
import { describe, it, expectTypeOf } from 'vitest';
import type { CreateOrderRequest, OrderResponse } from '@/types/api';

describe('API Types', () => {
  it('enforces correct CreateOrderRequest structure', () => {
    expectTypeOf<CreateOrderRequest>().toEqualTypeOf<{
      items: Array<{
        productId: number;
        quantity: number;
        price: number;
      }>;
      shippingAddress: {
        line1: string;
        line2?: string;
        city: string;
        postalCode: string;
        country: string;
      };
      couponCode?: string;
    }>();
  });
  
  it('enforces correct OrderResponse structure', () => {
    expectTypeOf<OrderResponse>().toEqualTypeOf<{
      id: string;
      userId: string;
      status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
      totalAmount: number;
      items: Array<{
        productId: number;
        quantity: number;
        price: number;
        total: number;
      }>;
      createdAt: string;
      updatedAt: string;
    }>();
  });
});
```

### Mock Utilities
```typescript
// src/test/mocks.ts
import { vi } from 'vitest';

export const createMockDatabase = () => ({
  query: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
});

export const createMockContext = (overrides = {}) => ({
  req: new Request('http://localhost/'),
  env: { NODE_ENV: 'test' },
  var: new Map(),
  get: vi.fn(),
  set: vi.fn(),
  json: vi.fn(),
  text: vi.fn(),
  html: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
  status: vi.fn().mockReturnThis(),
  header: vi.fn().mockReturnThis(),
  ...overrides
});

export const createMockRequest = (url: string, options: RequestInit = {}) => {
  return new Request(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
};
```

## TypeScript Testing Checklist

### Unit Tests
- [ ] All service classes tested with proper mocking
- [ ] All utility functions tested with edge cases
- [ ] All type guards and validators tested
- [ ] All error classes and custom errors tested
- [ ] All transformers and mappers tested

### Integration Tests
- [ ] All API routes tested with Hono test client
- [ ] All middleware tested with mock contexts
- [ ] All database repositories tested with test database
- [ ] All external service integrations mocked and tested
- [ ] All background jobs and workers tested

### Type Safety Tests
- [ ] All API types tested with expectTypeOf
- [ ] All database schema types validated
- [ ] All configuration types verified
- [ ] All environment variable types checked

### Performance Tests
- [ ] Critical API endpoints load tested
- [ ] Database queries performance tested
- [ ] Memory usage monitored for large operations
- [ ] Concurrent request handling tested

Remember: TypeScript tests should leverage the type system for compile-time safety while providing comprehensive runtime validation and error handling coverage.
