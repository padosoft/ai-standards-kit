# Enterprise Coding Guidelines

## Naming Conventions

### Variables and Functions
```typescript
// ✅ Good - Descriptive and clear
const userAuthenticationToken = generateToken();
const isEmailValid = validateEmail(email);
const calculateTotalPrice = (items: Item[]) => {...}

// ❌ Bad - Unclear or abbreviated
const token = genTok();
const valid = checkEm(e);
const calc = (i) => {...}
```

### Classes and Interfaces
```typescript
// ✅ Good - PascalCase, descriptive
class UserAuthenticationService {}
interface PaymentGatewayResponse {}
type OrderStatus = 'pending' | 'completed';

// ❌ Bad - Wrong case or unclear
class user_auth {}
interface PGResp {}
type status = string;
```

### Constants and Enums
```typescript
// ✅ Good - SCREAMING_SNAKE_CASE for constants
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

enum HttpStatusCode {
  OK = 200,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

// ❌ Bad - Inconsistent naming
const maxRetries = 3;
const apiUrl = 'https://api.example.com';
```

### File and Directory Names
```bash
# ✅ Good - kebab-case for files, clear purpose
user-authentication.service.ts
payment-gateway.interface.ts
order-status.enum.ts
/user-management/
/payment-processing/

# ❌ Bad - Mixed cases or unclear
UserAuth.ts
paymentGW.ts
/UserMgmt/
```

## Code Organization

### File Structure
```typescript
// ✅ Good - Logical grouping
// 1. Imports (external → internal)
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

// 2. Constants
const MAX_LOGIN_ATTEMPTS = 5;

// 3. Interfaces/Types
interface UserConfig {
  maxSessions: number;
}

// 4. Main class/function
@Injectable()
export class UserService {
  // Class implementation
}

// 5. Helper functions (if needed)
function validateUserConfig(config: UserConfig): boolean {
  return config.maxSessions > 0;
}
```

### Function Organization
```typescript
// ✅ Good - Single responsibility, clear flow
async function processPayment(
  orderId: string,
  paymentMethod: PaymentMethod,
  amount: Money
): Promise<PaymentResult> {
  // 1. Validation
  validateOrderId(orderId);
  validateAmount(amount);
  
  // 2. Business logic
  const order = await fetchOrder(orderId);
  const payment = createPayment(order, paymentMethod, amount);
  
  // 3. External interaction
  const result = await paymentGateway.process(payment);
  
  // 4. Post-processing
  await updateOrderStatus(orderId, result.status);
  await sendConfirmationEmail(order.userEmail, result);
  
  return result;
}

// ❌ Bad - Multiple responsibilities, unclear flow
async function pay(o, m, a) {
  const order = await db.query(`SELECT * FROM orders WHERE id = ${o}`);
  // Mixed validation, business logic, and data access
  if (a > 0) {
    const res = await fetch('/pay', {
      body: JSON.stringify({ o, m, a })
    });
    db.query(`UPDATE orders SET status = 'paid'`);
    sendEmail();
    return res;
  }
}
```

## Comments and Documentation

### Function Documentation
```typescript
/**
 * Calculates compound interest for an investment
 * @param principal Initial investment amount in cents
 * @param rate Annual interest rate as decimal (e.g., 0.05 for 5%)
 * @param time Investment period in years
 * @param frequency Compounding frequency per year
 * @returns Final amount in cents after compound interest
 * @throws {InvalidAmountError} If principal is negative
 * @example
 * // Calculate interest for $1000 at 5% for 10 years, compounded monthly
 * const result = calculateCompoundInterest(100000, 0.05, 10, 12);
 */
function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  frequency: number
): number {
  if (principal < 0) {
    throw new InvalidAmountError('Principal cannot be negative');
  }
  return principal * Math.pow(1 + rate / frequency, frequency * time);
}
```

### Inline Comments
```typescript
// ✅ Good - Explains WHY, not WHAT
function processRefund(orderId: string): void {
  // We need to check fraud score first because high-risk
  // transactions require manual review per compliance policy
  const fraudScore = checkFraudScore(orderId);
  
  if (fraudScore > 0.7) {
    // Threshold determined by data science team analysis (ticket #4523)
    flagForManualReview(orderId);
    return;
  }
  
  // Process normally...
}

// ❌ Bad - States the obvious
function processRefund(orderId: string): void {
  // Get fraud score
  const fraudScore = checkFraudScore(orderId);
  
  // Check if score is greater than 0.7
  if (fraudScore > 0.7) {
    // Flag for review
    flagForManualReview(orderId);
    return;
  }
}
```

## Error Handling

### Exception Handling
```typescript
// ✅ Good - Specific error handling with context
class UserService {
  async createUser(dto: CreateUserDto): Promise<User> {
    try {
      const existingUser = await this.userRepo.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictException(
          `User with email ${dto.email} already exists`
        );
      }
      
      return await this.userRepo.create(dto);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error; // Re-throw business errors
      }
      
      // Log unexpected errors with context
      this.logger.error('Failed to create user', {
        email: dto.email,
        error: error.message,
        stack: error.stack,
      });
      
      throw new InternalServerErrorException(
        'Failed to create user. Please try again later.'
      );
    }
  }
}

// ❌ Bad - Generic error handling, no context
class UserService {
  async createUser(dto: CreateUserDto): Promise<User> {
    try {
      return await this.userRepo.create(dto);
    } catch (error) {
      console.log(error);
      throw new Error('Failed');
    }
  }
}
```

### Error Messages
```typescript
// ✅ Good - Informative error messages
throw new ValidationError(
  `Invalid email format: ${email}. Expected format: user@domain.com`
);

throw new AuthorizationError(
  `User ${userId} lacks permission 'products.write' to perform this action`
);

// ❌ Bad - Vague error messages
throw new Error('Invalid input');
throw new Error('Not allowed');
```

## Async Code Patterns

### Promise Handling
```typescript
// ✅ Good - Proper async/await with error handling
async function fetchUserData(userId: string): Promise<UserData> {
  const [profile, preferences, permissions] = await Promise.all([
    fetchProfile(userId),
    fetchPreferences(userId),
    fetchPermissions(userId),
  ]);
  
  return {
    profile,
    preferences,
    permissions,
  };
}

// ❌ Bad - Sequential when could be parallel
async function fetchUserData(userId: string): Promise<UserData> {
  const profile = await fetchProfile(userId);
  const preferences = await fetchPreferences(userId);
  const permissions = await fetchPermissions(userId);
  
  return { profile, preferences, permissions };
}
```

### Stream Processing
```typescript
// ✅ Good - Memory-efficient streaming
import { pipeline } from 'stream/promises';

async function processLargeFile(inputPath: string, outputPath: string) {
  await pipeline(
    fs.createReadStream(inputPath),
    csv.parse({ columns: true }),
    new Transform({
      objectMode: true,
      transform(record, encoding, callback) {
        const processed = processRecord(record);
        callback(null, processed);
      }
    }),
    csv.stringify({ header: true }),
    fs.createWriteStream(outputPath)
  );
}

// ❌ Bad - Loading everything into memory
async function processLargeFile(inputPath: string, outputPath: string) {
  const content = await fs.readFile(inputPath, 'utf-8');
  const records = csv.parse(content);
  const processed = records.map(processRecord);
  await fs.writeFile(outputPath, csv.stringify(processed));
}
```

## State Management

### Immutability
```typescript
// ✅ Good - Immutable updates
function updateUser(user: User, updates: Partial<User>): User {
  return {
    ...user,
    ...updates,
    updatedAt: new Date(),
  };
}

function addItemToCart(cart: Cart, item: Item): Cart {
  return {
    ...cart,
    items: [...cart.items, item],
    total: cart.total + item.price,
  };
}

// ❌ Bad - Mutating objects
function updateUser(user: User, updates: Partial<User>): User {
  Object.assign(user, updates);
  user.updatedAt = new Date();
  return user;
}

function addItemToCart(cart: Cart, item: Item): Cart {
  cart.items.push(item);
  cart.total += item.price;
  return cart;
}
```

## Testing Patterns

### Unit Test Structure
```typescript
// ✅ Good - AAA pattern, descriptive names
describe('PaymentService', () => {
  describe('processPayment', () => {
    it('should successfully process valid payment', async () => {
      // Arrange
      const payment = createMockPayment({ amount: 100 });
      const gateway = createMockGateway();
      gateway.charge.mockResolvedValue({ success: true });
      
      // Act
      const result = await paymentService.processPayment(payment);
      
      // Assert
      expect(result.success).toBe(true);
      expect(gateway.charge).toHaveBeenCalledWith(payment);
    });
    
    it('should retry on temporary gateway failure', async () => {
      // Test implementation
    });
    
    it('should throw error on invalid payment amount', async () => {
      // Test implementation
    });
  });
});
```

### Test Data Builders
```typescript
// ✅ Good - Reusable test data builders
class UserBuilder {
  private user: User = {
    id: 'test-id',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
  };
  
  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }
  
  withName(name: string): this {
    this.user.name = name;
    return this;
  }
  
  build(): User {
    return { ...this.user };
  }
}

// Usage in tests
const user = new UserBuilder()
  .withEmail('admin@example.com')
  .withName('Admin User')
  .build();
```

## Performance Patterns

### Memoization
```typescript
// ✅ Good - Cache expensive computations
class ExpensiveCalculator {
  private cache = new Map<string, number>();
  
  calculateFibonacci(n: number): number {
    const key = `fib-${n}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    const result = n <= 1 ? n : 
      this.calculateFibonacci(n - 1) + this.calculateFibonacci(n - 2);
    
    this.cache.set(key, result);
    return result;
  }
}
```

### Debouncing and Throttling
```typescript
// ✅ Good - Prevent excessive API calls
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Usage
const debouncedSearch = debounce(searchAPI, 300);
```

## Security Patterns

### Input Validation
```typescript
// ✅ Good - Validate and sanitize all inputs
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d)/),
  age: z.number().int().min(18).max(120),
  role: z.enum(['user', 'admin', 'moderator']),
});

function createUser(input: unknown): User {
  const validated = CreateUserSchema.parse(input);
  // Validated data is now type-safe
  return userRepository.create(validated);
}

// ❌ Bad - No validation
function createUser(input: any): User {
  return userRepository.create(input);
}
```

### SQL Injection Prevention
```typescript
// ✅ Good - Parameterized queries
async function getUserByEmail(email: string): Promise<User> {
  return await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
}

// ❌ Bad - String concatenation
async function getUserByEmail(email: string): Promise<User> {
  return await db.query(
    `SELECT * FROM users WHERE email = '${email}'`
  );
}
```

## Code Smells to Avoid

### Long Parameter Lists
```typescript
// ❌ Bad - Too many parameters
function createOrder(
  userId: string,
  productId: string,
  quantity: number,
  price: number,
  discount: number,
  tax: number,
  shippingAddress: string,
  billingAddress: string,
  paymentMethod: string,
  notes: string
) { /* ... */ }

// ✅ Good - Use objects for multiple related parameters
interface CreateOrderParams {
  userId: string;
  items: OrderItem[];
  addresses: {
    shipping: Address;
    billing: Address;
  };
  payment: PaymentDetails;
  notes?: string;
}

function createOrder(params: CreateOrderParams) { /* ... */ }
```

### God Objects
```typescript
// ❌ Bad - Class doing too much
class UserManager {
  createUser() { /* ... */ }
  deleteUser() { /* ... */ }
  authenticateUser() { /* ... */ }
  sendEmail() { /* ... */ }
  generateReport() { /* ... */ }
  backupDatabase() { /* ... */ }
}

// ✅ Good - Separated concerns
class UserService {
  createUser() { /* ... */ }
  deleteUser() { /* ... */ }
}

class AuthenticationService {
  authenticate() { /* ... */ }
}

class EmailService {
  sendEmail() { /* ... */ }
}
```

### Magic Numbers
```typescript
// ❌ Bad - Unexplained numbers
if (user.failedAttempts > 5) {
  lockAccount(user, 3600);
}

// ✅ Good - Named constants
const MAX_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_DURATION_SECONDS = 3600;

if (user.failedAttempts > MAX_LOGIN_ATTEMPTS) {
  lockAccount(user, ACCOUNT_LOCK_DURATION_SECONDS);
}
```

## Refactoring Guidelines

### When to Refactor
1. **Before adding new features** - Clean the working area
2. **After getting tests to pass** - Red-Green-Refactor
3. **When fixing bugs** - Improve code while you're there
4. **During code review** - If reviewers struggle to understand

### Safe Refactoring Steps
1. **Ensure test coverage** - Never refactor without tests
2. **Small incremental changes** - One refactoring at a time
3. **Commit frequently** - Easy rollback if needed
4. **Run tests after each change** - Catch breaks immediately
5. **Review with team** - Get feedback on significant changes

## Language-Specific Guidelines

### TypeScript
- Use `strict` mode always
- Prefer `interface` over `type` for objects
- Use `unknown` instead of `any`
- Enable all strict compiler options
- Use discriminated unions for state

### JavaScript
- Use ESNext features appropriately
- Prefer `const` over `let`, never `var`
- Use optional chaining `?.` and nullish coalescing `??`
- Destructure objects and arrays
- Use template literals for string interpolation

### PHP
- Use strict types declaration
- Follow PSR-12 coding standard
- Use type hints for parameters and returns
- Prefer composition over inheritance
- Use value objects for domain concepts

### Python
- Follow PEP 8 style guide
- Use type hints (Python 3.5+)
- Prefer f-strings for formatting
- Use context managers for resources
- Follow the Zen of Python

## Final Checklist

Before committing code, ensure:
- [ ] All tests pass
- [ ] Code is self-documenting
- [ ] No commented-out code
- [ ] No console.log/print statements
- [ ] Error handling is comprehensive
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] Documentation updated if needed
- [ ] Follows team conventions
- [ ] Would you be happy maintaining this code?