# Enterprise Architecture Patterns

## Layered Architecture

### Standard Layers
```
┌─────────────────────────────────────┐
│      Presentation Layer             │ ← UI, API Controllers
├─────────────────────────────────────┤
│      Application Layer              │ ← Use Cases, Orchestration
├─────────────────────────────────────┤
│      Domain Layer                   │ ← Business Logic, Entities
├─────────────────────────────────────┤
│      Infrastructure Layer           │ ← Database, External Services
└─────────────────────────────────────┘
```

### Layer Rules
- **Dependencies flow downward only**
- **Domain layer has no external dependencies**
- **Infrastructure implements domain interfaces**
- **Application layer orchestrates domain operations**
- **Presentation layer handles only I/O transformation**

### Implementation Example
```typescript
// Domain Layer - Pure business logic
export class Order {
  constructor(
    private readonly id: OrderId,
    private items: OrderItem[],
    private status: OrderStatus
  ) {}
  
  addItem(item: OrderItem): void {
    if (this.status !== OrderStatus.DRAFT) {
      throw new DomainError('Cannot modify confirmed order');
    }
    this.items.push(item);
  }
  
  calculateTotal(): Money {
    return this.items.reduce(
      (sum, item) => sum.add(item.totalPrice()),
      Money.zero()
    );
  }
}

// Application Layer - Use case orchestration
export class CreateOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private inventoryService: InventoryService,
    private paymentService: PaymentService
  ) {}
  
  async execute(command: CreateOrderCommand): Promise<OrderId> {
    // Orchestrate domain operations
    const order = Order.create(command.customerId);
    
    for (const item of command.items) {
      await this.inventoryService.reserve(item.productId, item.quantity);
      order.addItem(item);
    }
    
    await this.paymentService.authorize(order.calculateTotal());
    await this.orderRepository.save(order);
    
    return order.id;
  }
}

// Infrastructure Layer - External integrations
export class PostgresOrderRepository implements OrderRepository {
  async save(order: Order): Promise<void> {
    // Database-specific implementation
    await this.db.query(
      'INSERT INTO orders ...',
      this.mapToDbModel(order)
    );
  }
}
```

## Hexagonal Architecture (Ports & Adapters)

### Core Concepts
```
         ┌─────────────────┐
         │   Primary Port  │ ← Use Cases
         │   (Driving)     │
         └────────┬────────┘
                  │
    ┌─────────────▼─────────────┐
    │                           │
    │      Domain Core          │
    │    (Business Logic)       │
    │                           │
    └─────────────┬─────────────┘
                  │
         ┌────────▼────────┐
         │ Secondary Port  │ ← Repository Interfaces
         │   (Driven)      │
         └─────────────────┘
```

### Port Definitions
```typescript
// Primary Port - What the application can do
export interface OrderService {
  createOrder(request: CreateOrderRequest): Promise<OrderResponse>;
  cancelOrder(orderId: string): Promise<void>;
  getOrder(orderId: string): Promise<OrderResponse>;
}

// Secondary Port - What the application needs
export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: OrderId): Promise<Order | null>;
  findByCustomer(customerId: CustomerId): Promise<Order[]>;
}

export interface NotificationService {
  sendOrderConfirmation(order: Order): Promise<void>;
  sendShippingUpdate(order: Order): Promise<void>;
}
```

### Adapter Examples
```typescript
// Primary Adapter - REST API
@Controller('/orders')
export class OrderController {
  constructor(private orderService: OrderService) {}
  
  @Post('/')
  async createOrder(@Body() dto: CreateOrderDto): Promise<OrderResponse> {
    const request = this.mapDtoToRequest(dto);
    return await this.orderService.createOrder(request);
  }
}

// Primary Adapter - GraphQL
@Resolver(() => Order)
export class OrderResolver {
  constructor(private orderService: OrderService) {}
  
  @Mutation(() => Order)
  async createOrder(@Args() args: CreateOrderArgs): Promise<Order> {
    return await this.orderService.createOrder(args);
  }
}

// Secondary Adapter - Database
export class MongoOrderRepository implements OrderRepository {
  async save(order: Order): Promise<void> {
    const document = this.mapToMongoDocument(order);
    await this.collection.insertOne(document);
  }
}

// Secondary Adapter - Email Service
export class SendGridNotificationService implements NotificationService {
  async sendOrderConfirmation(order: Order): Promise<void> {
    await this.sendGrid.send({
      to: order.customerEmail,
      template: 'order-confirmation',
      data: this.mapOrderToEmailData(order)
    });
  }
}
```

## Event-Driven Architecture

### Event Types
```typescript
// Domain Events
export abstract class DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly occurredAt: Date = new Date(),
    public readonly version: number = 1
  ) {}
}

export class OrderCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly customerId: string,
    public readonly items: OrderItem[],
    public readonly total: Money
  ) {
    super(aggregateId);
  }
}

// Integration Events
export class OrderShippedIntegrationEvent {
  constructor(
    public readonly orderId: string,
    public readonly trackingNumber: string,
    public readonly carrier: string,
    public readonly estimatedDelivery: Date
  ) {}
}
```

### Event Bus Pattern
```typescript
export interface EventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: Constructor<T>,
    handler: EventHandler<T>
  ): void;
}

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, EventHandler<any>[]>();
  
  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const eventName = event.constructor.name;
    const handlers = this.handlers.get(eventName) || [];
    
    await Promise.all(
      handlers.map(handler => handler.handle(event))
    );
  }
  
  subscribe<T extends DomainEvent>(
    eventType: Constructor<T>,
    handler: EventHandler<T>
  ): void {
    const eventName = eventType.name;
    const handlers = this.handlers.get(eventName) || [];
    handlers.push(handler);
    this.handlers.set(eventName, handlers);
  }
}
```

### Event Sourcing
```typescript
export abstract class AggregateRoot {
  private uncommittedEvents: DomainEvent[] = [];
  private version: number = 0;
  
  protected applyEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
    this.apply(event);
    this.version++;
  }
  
  getUncommittedEvents(): DomainEvent[] {
    return this.uncommittedEvents;
  }
  
  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }
  
  abstract apply(event: DomainEvent): void;
}

export class Order extends AggregateRoot {
  private id: OrderId;
  private items: OrderItem[] = [];
  private status: OrderStatus;
  
  static create(customerId: CustomerId): Order {
    const order = new Order();
    const event = new OrderCreatedEvent(
      OrderId.generate().value,
      customerId.value
    );
    order.applyEvent(event);
    return order;
  }
  
  apply(event: DomainEvent): void {
    if (event instanceof OrderCreatedEvent) {
      this.id = new OrderId(event.aggregateId);
      this.status = OrderStatus.PENDING;
    } else if (event instanceof OrderItemAddedEvent) {
      this.items.push(event.item);
    }
  }
}
```

## CQRS (Command Query Responsibility Segregation)

### Command Side
```typescript
// Command
export class CreateProductCommand {
  constructor(
    public readonly name: string,
    public readonly price: Money,
    public readonly category: string
  ) {}
}

// Command Handler
export class CreateProductCommandHandler {
  constructor(
    private productRepository: ProductWriteRepository,
    private eventBus: EventBus
  ) {}
  
  async handle(command: CreateProductCommand): Promise<ProductId> {
    const product = Product.create(
      command.name,
      command.price,
      command.category
    );
    
    await this.productRepository.save(product);
    
    await this.eventBus.publish(
      new ProductCreatedEvent(product.id, command.name, command.price)
    );
    
    return product.id;
  }
}
```

### Query Side
```typescript
// Query
export class GetProductsByCategoryQuery {
  constructor(
    public readonly category: string,
    public readonly page: number = 1,
    public readonly limit: number = 20
  ) {}
}

// Query Handler
export class GetProductsByCategoryQueryHandler {
  constructor(private productReadRepository: ProductReadRepository) {}
  
  async handle(query: GetProductsByCategoryQuery): Promise<ProductDto[]> {
    // Read from optimized read model
    return await this.productReadRepository.findByCategory(
      query.category,
      query.page,
      query.limit
    );
  }
}

// Read Model Projection
export class ProductProjection {
  constructor(private readDb: ReadDatabase) {}
  
  @EventHandler(ProductCreatedEvent)
  async onProductCreated(event: ProductCreatedEvent): Promise<void> {
    await this.readDb.products.insert({
      id: event.productId,
      name: event.name,
      price: event.price,
      createdAt: event.occurredAt
    });
  }
  
  @EventHandler(ProductPriceChangedEvent)
  async onPriceChanged(event: ProductPriceChangedEvent): Promise<void> {
    await this.readDb.products.update(
      { id: event.productId },
      { price: event.newPrice, updatedAt: event.occurredAt }
    );
  }
}
```

## Microservices Patterns

### Service Boundaries
```yaml
# Service decomposition by business capability
services:
  order-service:
    responsibilities:
      - Order management
      - Order validation
      - Order state machine
    data:
      - Orders
      - OrderItems
      
  inventory-service:
    responsibilities:
      - Stock management
      - Reservation logic
      - Availability checking
    data:
      - Products
      - Stock levels
      - Reservations
      
  payment-service:
    responsibilities:
      - Payment processing
      - Refunds
      - Payment method management
    data:
      - Payments
      - Transactions
      - Payment methods
```

### API Gateway Pattern
```typescript
export class APIGateway {
  constructor(
    private orderService: OrderServiceClient,
    private inventoryService: InventoryServiceClient,
    private userService: UserServiceClient
  ) {}
  
  async createOrder(request: CreateOrderRequest): Promise<OrderResponse> {
    // Orchestrate multiple service calls
    const user = await this.userService.getUser(request.userId);
    
    // Check inventory for all items
    const availability = await Promise.all(
      request.items.map(item =>
        this.inventoryService.checkAvailability(item.productId, item.quantity)
      )
    );
    
    if (!availability.every(a => a.available)) {
      throw new BadRequestException('Some items are out of stock');
    }
    
    // Create order
    const order = await this.orderService.createOrder({
      ...request,
      userEmail: user.email,
      userName: user.name
    });
    
    return order;
  }
}
```

### Saga Pattern
```typescript
// Orchestration-based Saga
export class CreateOrderSaga {
  private steps: SagaStep[] = [
    new ReserveInventoryStep(),
    new ProcessPaymentStep(),
    new CreateOrderStep(),
    new SendNotificationStep()
  ];
  
  async execute(context: OrderContext): Promise<void> {
    const executedSteps: SagaStep[] = [];
    
    try {
      for (const step of this.steps) {
        await step.execute(context);
        executedSteps.push(step);
      }
    } catch (error) {
      // Compensate in reverse order
      for (const step of executedSteps.reverse()) {
        await step.compensate(context);
      }
      throw error;
    }
  }
}

// Choreography-based Saga
export class OrderService {
  @EventHandler(OrderCreatedEvent)
  async onOrderCreated(event: OrderCreatedEvent): Promise<void> {
    // Start the saga by publishing first event
    await this.eventBus.publish(
      new ReserveInventoryCommand(event.orderId, event.items)
    );
  }
  
  @EventHandler(InventoryReservedEvent)
  async onInventoryReserved(event: InventoryReservedEvent): Promise<void> {
    // Continue saga
    await this.eventBus.publish(
      new ProcessPaymentCommand(event.orderId, event.total)
    );
  }
  
  @EventHandler(PaymentFailedEvent)
  async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
    // Compensate
    await this.eventBus.publish(
      new ReleaseInventoryCommand(event.orderId)
    );
  }
}
```

## Repository Pattern

### Generic Repository
```typescript
export interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  delete(id: ID): Promise<void>;
}

export abstract class BaseRepository<T, ID> implements Repository<T, ID> {
  constructor(protected readonly db: Database) {}
  
  abstract get tableName(): string;
  abstract mapToEntity(row: any): T;
  abstract mapToDb(entity: T): any;
  
  async findById(id: ID): Promise<T | null> {
    const row = await this.db.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return row ? this.mapToEntity(row) : null;
  }
  
  async save(entity: T): Promise<void> {
    const data = this.mapToDb(entity);
    await this.db.upsert(this.tableName, data);
  }
}
```

### Specification Pattern
```typescript
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  and(other: Specification<T>): Specification<T>;
  or(other: Specification<T>): Specification<T>;
  not(): Specification<T>;
}

export abstract class CompositeSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;
  
  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }
  
  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }
  
  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

// Usage
export class PremiumCustomerSpecification extends CompositeSpecification<Customer> {
  isSatisfiedBy(customer: Customer): boolean {
    return customer.tier === 'premium' && customer.totalSpent > 10000;
  }
}

export class ActiveCustomerSpecification extends CompositeSpecification<Customer> {
  isSatisfiedBy(customer: Customer): boolean {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return customer.lastOrderDate > thirtyDaysAgo;
  }
}

// Combine specifications
const eligibleForOffer = new PremiumCustomerSpecification()
  .and(new ActiveCustomerSpecification());
```

## Factory Pattern

### Abstract Factory
```typescript
// Abstract Factory
export interface NotificationFactory {
  createEmailNotification(): EmailNotification;
  createSmsNotification(): SmsNotification;
  createPushNotification(): PushNotification;
}

// Concrete Factories
export class ProductionNotificationFactory implements NotificationFactory {
  createEmailNotification(): EmailNotification {
    return new SendGridEmailNotification();
  }
  
  createSmsNotification(): SmsNotification {
    return new TwilioSmsNotification();
  }
  
  createPushNotification(): PushNotification {
    return new FirebasePushNotification();
  }
}

export class TestNotificationFactory implements NotificationFactory {
  createEmailNotification(): EmailNotification {
    return new MockEmailNotification();
  }
  
  createSmsNotification(): SmsNotification {
    return new MockSmsNotification();
  }
  
  createPushNotification(): PushNotification {
    return new MockPushNotification();
  }
}
```

### Builder Pattern
```typescript
export class OrderBuilder {
  private order: Order;
  
  constructor() {
    this.order = new Order();
  }
  
  withCustomer(customerId: string, email: string): this {
    this.order.customerId = customerId;
    this.order.customerEmail = email;
    return this;
  }
  
  withShippingAddress(address: Address): this {
    this.order.shippingAddress = address;
    return this;
  }
  
  addItem(productId: string, quantity: number, price: Money): this {
    this.order.items.push(
      new OrderItem(productId, quantity, price)
    );
    return this;
  }
  
  withCoupon(code: string, discount: number): this {
    this.order.couponCode = code;
    this.order.discount = discount;
    return this;
  }
  
  build(): Order {
    this.validate();
    return this.order;
  }
  
  private validate(): void {
    if (!this.order.customerId) {
      throw new Error('Customer is required');
    }
    if (this.order.items.length === 0) {
      throw new Error('At least one item is required');
    }
  }
}

// Usage
const order = new OrderBuilder()
  .withCustomer('cust-123', 'customer@example.com')
  .withShippingAddress(address)
  .addItem('prod-1', 2, new Money(29.99))
  .addItem('prod-2', 1, new Money(49.99))
  .withCoupon('SAVE10', 0.10)
  .build();
```

## Strategy Pattern

### Payment Processing Example
```typescript
// Strategy Interface
export interface PaymentStrategy {
  processPayment(amount: Money): Promise<PaymentResult>;
  validatePaymentDetails(): boolean;
  calculateFees(amount: Money): Money;
}

// Concrete Strategies
export class CreditCardPaymentStrategy implements PaymentStrategy {
  constructor(
    private cardNumber: string,
    private cvv: string,
    private expiryDate: string
  ) {}
  
  async processPayment(amount: Money): Promise<PaymentResult> {
    // Credit card specific processing
    const gateway = new StripeGateway();
    return await gateway.charge(this.cardNumber, amount);
  }
  
  validatePaymentDetails(): boolean {
    return this.isValidCardNumber() && this.isValidCvv();
  }
  
  calculateFees(amount: Money): Money {
    return amount.multiply(0.029).add(new Money(0.30)); // 2.9% + $0.30
  }
}

export class PayPalPaymentStrategy implements PaymentStrategy {
  constructor(private email: string, private password: string) {}
  
  async processPayment(amount: Money): Promise<PaymentResult> {
    const paypal = new PayPalSDK();
    await paypal.authenticate(this.email, this.password);
    return await paypal.pay(amount);
  }
  
  validatePaymentDetails(): boolean {
    return this.isValidEmail(this.email);
  }
  
  calculateFees(amount: Money): Money {
    return amount.multiply(0.034).add(new Money(0.49)); // 3.4% + $0.49
  }
}

// Context
export class PaymentProcessor {
  constructor(private strategy: PaymentStrategy) {}
  
  async process(amount: Money): Promise<PaymentResult> {
    if (!this.strategy.validatePaymentDetails()) {
      throw new Error('Invalid payment details');
    }
    
    const fees = this.strategy.calculateFees(amount);
    const totalAmount = amount.add(fees);
    
    return await this.strategy.processPayment(totalAmount);
  }
  
  setStrategy(strategy: PaymentStrategy): void {
    this.strategy = strategy;
  }
}
```

## Observer Pattern

### Event Emitter Implementation
```typescript
export class EventEmitter<T = any> {
  private listeners = new Map<string, Set<(data: T) => void>>();
  
  on(event: string, listener: (data: T) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }
  
  off(event: string, listener: (data: T) => void): void {
    this.listeners.get(event)?.delete(listener);
  }
  
  emit(event: string, data: T): void {
    this.listeners.get(event)?.forEach(listener => listener(data));
  }
}

// Domain Events Observer
export class DomainEventPublisher {
  private static instance: DomainEventPublisher;
  private subscribers = new Map<string, Set<DomainEventSubscriber>>();
  
  static getInstance(): DomainEventPublisher {
    if (!this.instance) {
      this.instance = new DomainEventPublisher();
    }
    return this.instance;
  }
  
  subscribe(eventType: string, subscriber: DomainEventSubscriber): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(subscriber);
  }
  
  publish(event: DomainEvent): void {
    const eventType = event.constructor.name;
    this.subscribers.get(eventType)?.forEach(subscriber => 
      subscriber.handle(event)
    );
  }
}
```

## Decorator Pattern

### Caching Decorator
```typescript
export interface DataService {
  getData(id: string): Promise<Data>;
}

export class DatabaseDataService implements DataService {
  async getData(id: string): Promise<Data> {
    return await db.query('SELECT * FROM data WHERE id = $1', [id]);
  }
}

export class CachedDataService implements DataService {
  constructor(
    private wrapped: DataService,
    private cache: Cache
  ) {}
  
  async getData(id: string): Promise<Data> {
    const cacheKey = `data:${id}`;
    
    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from wrapped service
    const data = await this.wrapped.getData(id);
    
    // Store in cache
    await this.cache.set(cacheKey, data, 3600); // 1 hour TTL
    
    return data;
  }
}

// Usage with multiple decorators
const dataService = new LoggingDataService(
  new CachedDataService(
    new RetryableDataService(
      new DatabaseDataService(),
      3 // max retries
    ),
    new RedisCache()
  ),
  logger
);
```

## Anti-Patterns to Avoid

### Anemic Domain Model
```typescript
// ❌ Bad - Anemic model with no behavior
export class Order {
  id: string;
  items: OrderItem[];
  status: string;
  total: number;
}

export class OrderService {
  calculateTotal(order: Order): number {
    // Business logic in service instead of model
    return order.items.reduce((sum, item) => sum + item.price, 0);
  }
}

// ✅ Good - Rich domain model
export class Order {
  constructor(
    private id: OrderId,
    private items: OrderItem[],
    private status: OrderStatus
  ) {}
  
  calculateTotal(): Money {
    // Business logic in the model
    return this.items.reduce(
      (sum, item) => sum.add(item.totalPrice()),
      Money.zero()
    );
  }
  
  canBeCancelled(): boolean {
    return this.status === OrderStatus.PENDING;
  }
  
  cancel(): void {
    if (!this.canBeCancelled()) {
      throw new DomainError('Order cannot be cancelled');
    }
    this.status = OrderStatus.CANCELLED;
  }
}
```

### God Object
```typescript
// ❌ Bad - Class doing everything
export class ApplicationManager {
  authenticateUser() {}
  createOrder() {}
  processPayment() {}
  sendEmail() {}
  generateReport() {}
  backupDatabase() {}
  validateInput() {}
  logActivity() {}
}

// ✅ Good - Separated responsibilities
export class AuthenticationService {}
export class OrderService {}
export class PaymentService {}
export class EmailService {}
export class ReportService {}
```

### Circular Dependencies
```typescript
// ❌ Bad - Circular dependency
// user.service.ts
import { OrderService } from './order.service';
export class UserService {
  constructor(private orderService: OrderService) {}
}

// order.service.ts
import { UserService } from './user.service';
export class OrderService {
  constructor(private userService: UserService) {}
}

// ✅ Good - Break cycle with events or interfaces
export interface UserProvider {
  getUser(id: string): Promise<User>;
}

export class OrderService {
  constructor(private userProvider: UserProvider) {}
}

export class UserService implements UserProvider {
  async getUser(id: string): Promise<User> {
    // Implementation
  }
}
```