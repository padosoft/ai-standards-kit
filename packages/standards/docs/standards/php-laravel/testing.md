# PHP Laravel Testing Standards

> **Extends**: `/docs/standards/global/testing.md`
> 
> This document provides **Laravel-specific** testing implementations and patterns. Apply these PHP/Laravel-specific testing strategies while following global testing principles.

## Laravel Testing Environment Setup

### Test Configuration
```php
<?php
// tests/TestCase.php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        // Set test environment
        config(['app.env' => 'testing']);
        
        // Configure test database
        config(['database.default' => 'testing']);
        
        // Disable external services in tests
        config(['services.payment_gateway.enabled' => false]);
        config(['queue.default' => 'sync']);
    }
}
```

### Database Testing Setup
```php
<?php
// tests/Feature/TestCase.php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

abstract class FeatureTestCase extends TestCase
{
    use RefreshDatabase;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        // Seed essential data for tests
        $this->artisan('db:seed', ['--class' => 'TestDatabaseSeeder']);
    }
}
```

## Unit Testing Patterns

### Service Class Testing
```php
<?php

namespace Tests\Unit\Services;

use App\Services\OrderService;
use App\Models\User;
use App\Models\Product;
use App\DTOs\CreateOrderDTO;
use App\Repositories\OrderRepository;
use Tests\TestCase;
use Mockery;

class OrderServiceTest extends TestCase
{
    private OrderService $orderService;
    private $mockOrderRepository;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        $this->mockOrderRepository = Mockery::mock(OrderRepository::class);
        $this->orderService = new OrderService($this->mockOrderRepository);
    }
    
    /**
     * @test
     * @dataProvider validOrderData
     */
    public function it_creates_order_with_valid_data(array $data, array $expected): void
    {
        // Arrange
        $dto = CreateOrderDTO::fromRequest($data);
        $expectedOrder = new Order($expected);
        
        $this->mockOrderRepository
            ->shouldReceive('create')
            ->once()
            ->with(Mockery::subset($expected))
            ->andReturn($expectedOrder);
        
        // Act
        $result = $this->orderService->createOrder($dto);
        
        // Assert
        $this->assertInstanceOf(Order::class, $result);
        $this->assertEquals($expected['total_amount'], $result->total_amount);
    }
    
    public function validOrderData(): array
    {
        return [
            'minimal order' => [
                ['user_id' => 1, 'items' => [['product_id' => 1, 'quantity' => 1, 'price' => 99.99]]],
                ['user_id' => 1, 'total_amount' => 99.99, 'status' => 'pending']
            ],
            'multiple items' => [
                ['user_id' => 1, 'items' => [
                    ['product_id' => 1, 'quantity' => 2, 'price' => 50.00],
                    ['product_id' => 2, 'quantity' => 1, 'price' => 25.00]
                ]],
                ['user_id' => 1, 'total_amount' => 125.00, 'status' => 'pending']
            ],
        ];
    }
    
    /** @test */
    public function it_throws_exception_for_invalid_user(): void
    {
        // Arrange
        $dto = CreateOrderDTO::fromRequest(['user_id' => 999, 'items' => []]);
        
        $this->mockOrderRepository
            ->shouldReceive('create')
            ->never();
        
        // Act & Assert
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('User not found');
        
        $this->orderService->createOrder($dto);
    }
}
```

### Repository Testing
```php
<?php

namespace Tests\Unit\Repositories;

use App\Repositories\OrderRepository;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderRepositoryTest extends TestCase
{
    use RefreshDatabase;
    
    private OrderRepository $repository;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = new OrderRepository();
    }
    
    /** @test */
    public function it_finds_orders_by_user(): void
    {
        // Arrange
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        
        $userOrders = Order::factory()->count(3)->create(['user_id' => $user->id]);
        Order::factory()->count(2)->create(['user_id' => $otherUser->id]);
        
        // Act
        $result = $this->repository->findByUser($user);
        
        // Assert
        $this->assertCount(3, $result);
        $this->assertTrue($result->every(fn($order) => $order->user_id === $user->id));
    }
    
    /** @test */
    public function it_applies_eager_loading_when_finding_by_user(): void
    {
        // Arrange
        $user = User::factory()->create();
        Order::factory()->hasItems(2)->create(['user_id' => $user->id]);
        
        // Act
        $result = $this->repository->findByUser($user);
        
        // Assert - Check that relationships are loaded
        $this->assertTrue($result->first()->relationLoaded('items'));
    }
}
```

## Feature Testing Patterns

### API Endpoint Testing
```php
<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\FeatureTestCase;

class OrderControllerTest extends FeatureTestCase
{
    use RefreshDatabase;
    
    /** @test */
    public function authenticated_user_can_create_order(): void
    {
        // Arrange
        $user = User::factory()->create();
        $product = Product::factory()->create(['price' => 99.99]);
        
        Sanctum::actingAs($user);
        
        $orderData = [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'price' => $product->price
                ]
            ],
            'shipping_address' => [
                'line1' => '123 Test St',
                'city' => 'Test City',
                'postal_code' => '12345',
                'country' => 'US'
            ]
        ];
        
        // Act
        $response = $this->postJson('/api/v1/orders', $orderData);
        
        // Assert
        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'user_id',
                    'total_amount',
                    'status',
                    'items' => [
                        '*' => ['product_id', 'quantity', 'price', 'total']
                    ],
                    'created_at'
                ]
            ]);
        
        $this->assertDatabaseHas('orders', [
            'user_id' => $user->id,
            'total_amount' => 199.98
        ]);
    }
    
    /** @test */
    public function unauthenticated_user_cannot_create_order(): void
    {
        // Act
        $response = $this->postJson('/api/v1/orders', []);
        
        // Assert
        $response->assertStatus(401);
    }
    
    /**
     * @test
     * @dataProvider invalidOrderData
     */
    public function it_validates_order_creation_data(array $data, string $expectedError): void
    {
        // Arrange
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        
        // Act
        $response = $this->postJson('/api/v1/orders', $data);
        
        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors($expectedError);
    }
    
    public function invalidOrderData(): array
    {
        return [
            'missing items' => [
                [],
                'items'
            ],
            'empty items array' => [
                ['items' => []],
                'items'
            ],
            'invalid item structure' => [
                ['items' => [['product_id' => 'invalid']]],
                'items.0.product_id'
            ],
            'missing shipping address' => [
                ['items' => [['product_id' => 1, 'quantity' => 1, 'price' => 99.99]]],
                'shipping_address'
            ],
        ];
    }
}
```

### Command Testing
```php
<?php

namespace Tests\Feature\Commands;

use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\FeatureTestCase;

class ProcessPendingOrdersCommandTest extends FeatureTestCase
{
    use RefreshDatabase;
    
    /** @test */
    public function it_processes_pending_orders_older_than_30_minutes(): void
    {
        // Arrange
        $oldPendingOrder = Order::factory()->create([
            'status' => 'pending',
            'created_at' => Carbon::now()->subMinutes(35)
        ]);
        
        $recentPendingOrder = Order::factory()->create([
            'status' => 'pending',
            'created_at' => Carbon::now()->subMinutes(15)
        ]);
        
        $completedOrder = Order::factory()->create([
            'status' => 'completed',
            'created_at' => Carbon::now()->subMinutes(45)
        ]);
        
        // Act
        $this->artisan('orders:process-pending')
            ->expectsOutput('Processing 1 pending orders...')
            ->expectsOutput('Processed 1 orders successfully.')
            ->assertExitCode(0);
        
        // Assert
        $oldPendingOrder->refresh();
        $recentPendingOrder->refresh();
        $completedOrder->refresh();
        
        $this->assertEquals('processing', $oldPendingOrder->status);
        $this->assertEquals('pending', $recentPendingOrder->status);
        $this->assertEquals('completed', $completedOrder->status);
    }
}
```

## Database Testing Patterns

### Migration Testing
```php
<?php

namespace Tests\Feature\Database;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CreateOrdersTableTest extends TestCase
{
    use RefreshDatabase;
    
    /** @test */
    public function orders_table_has_expected_columns(): void
    {
        // Act & Assert
        $this->assertTrue(Schema::hasTable('orders'));
        
        $expectedColumns = [
            'id', 'user_id', 'status', 'total_amount',
            'shipping_address', 'created_at', 'updated_at'
        ];
        
        foreach ($expectedColumns as $column) {
            $this->assertTrue(
                Schema::hasColumn('orders', $column),
                "Column {$column} not found in orders table"
            );
        }
    }
    
    /** @test */
    public function orders_table_has_correct_indexes(): void
    {
        // Act & Assert
        $indexes = Schema::getConnection()
            ->getDoctrineSchemaManager()
            ->listTableIndexes('orders');
        
        $indexNames = array_keys($indexes);
        
        $this->assertContains('orders_user_id_index', $indexNames);
        $this->assertContains('orders_status_index', $indexNames);
        $this->assertContains('orders_created_at_index', $indexNames);
    }
}
```

### Factory Testing
```php
<?php

namespace Tests\Unit\Factories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderFactoryTest extends TestCase
{
    use RefreshDatabase;
    
    /** @test */
    public function it_creates_order_with_default_values(): void
    {
        // Act
        $order = Order::factory()->create();
        
        // Assert
        $this->assertInstanceOf(Order::class, $order);
        $this->assertNotNull($order->user_id);
        $this->assertEquals('pending', $order->status);
        $this->assertGreaterThan(0, $order->total_amount);
    }
    
    /** @test */
    public function it_creates_order_with_items(): void
    {
        // Act
        $order = Order::factory()->hasItems(3)->create();
        
        // Assert
        $this->assertCount(3, $order->items);
        $this->assertTrue($order->items->every(fn($item) => $item->order_id === $order->id));
    }
    
    /** @test */
    public function it_creates_order_with_specific_user(): void
    {
        // Arrange
        $user = User::factory()->create();
        
        // Act
        $order = Order::factory()->for($user)->create();
        
        // Assert
        $this->assertEquals($user->id, $order->user_id);
    }
}
```

## Job Testing Patterns

### Queue Job Testing
```php
<?php

namespace Tests\Unit\Jobs;

use App\Jobs\ProcessOrderPayment;
use App\Models\Order;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class ProcessOrderPaymentTest extends TestCase
{
    use RefreshDatabase;
    
    /** @test */
    public function it_processes_payment_for_order(): void
    {
        // Arrange
        $order = Order::factory()->create(['status' => 'pending']);
        $mockPaymentService = Mockery::mock(PaymentService::class);
        
        $mockPaymentService
            ->shouldReceive('processPayment')
            ->once()
            ->with($order)
            ->andReturn(['status' => 'success', 'transaction_id' => 'txn_123']);
        
        $this->app->instance(PaymentService::class, $mockPaymentService);
        
        // Act
        $job = new ProcessOrderPayment($order);
        $job->handle();
        
        // Assert
        $order->refresh();
        $this->assertEquals('paid', $order->status);
        $this->assertEquals('txn_123', $order->transaction_id);
    }
    
    /** @test */
    public function it_handles_payment_failure(): void
    {
        // Arrange
        $order = Order::factory()->create(['status' => 'pending']);
        $mockPaymentService = Mockery::mock(PaymentService::class);
        
        $mockPaymentService
            ->shouldReceive('processPayment')
            ->once()
            ->with($order)
            ->andThrow(new \Exception('Payment failed'));
        
        $this->app->instance(PaymentService::class, $mockPaymentService);
        
        // Act
        $job = new ProcessOrderPayment($order);
        
        $this->expectException(\Exception::class);
        $job->handle();
        
        // Assert
        $order->refresh();
        $this->assertEquals('pending', $order->status);
    }
}
```

## Laravel Testing Best Practices

### Database Assertions
```php
// ✅ Good - Specific database assertions
$this->assertDatabaseHas('orders', [
    'user_id' => $user->id,
    'status' => 'completed',
    'total_amount' => 99.99
]);

$this->assertDatabaseMissing('orders', [
    'user_id' => $user->id,
    'status' => 'cancelled'
]);

$this->assertDatabaseCount('orders', 3);
```

### HTTP Testing
```php
// ✅ Good - Comprehensive HTTP assertions
$response = $this->postJson('/api/orders', $data);

$response->assertStatus(201)
    ->assertJson(['data' => ['status' => 'created']])
    ->assertJsonStructure([
        'data' => ['id', 'user_id', 'status', 'created_at']
    ])
    ->assertJsonPath('data.user_id', $user->id);
```

### Event Testing
```php
// ✅ Good - Event testing
use Illuminate\Support\Facades\Event;

Event::fake();

// Trigger the event
$this->orderService->createOrder($dto);

// Assert the event was dispatched
Event::assertDispatched(OrderCreated::class, function ($event) use ($order) {
    return $event->order->id === $order->id;
});
```

### Mail Testing
```php
// ✅ Good - Mail testing
use Illuminate\Support\Facades\Mail;

Mail::fake();

// Trigger the mail
$this->orderService->sendConfirmation($order);

// Assert the mail was sent
Mail::assertSent(OrderConfirmation::class, function ($mail) use ($order) {
    return $mail->order->id === $order->id;
});
```

## Laravel Testing Checklist

### Unit Tests
- [ ] All service classes have corresponding tests
- [ ] All repository methods tested with database assertions
- [ ] All DTOs tested for creation and transformation
- [ ] All custom validation rules tested
- [ ] All helper functions and utilities tested

### Feature Tests  
- [ ] All API endpoints tested (success and error cases)
- [ ] All web routes tested with authentication
- [ ] All form requests tested for validation
- [ ] All commands tested with different scenarios
- [ ] All jobs tested with success and failure cases

### Integration Tests
- [ ] Database relationships tested
- [ ] External service integrations mocked and tested
- [ ] Event listeners tested
- [ ] Mail and notification sending tested
- [ ] File upload and processing tested

### Performance Tests
- [ ] Database queries optimized (no N+1 problems)
- [ ] Heavy operations tested for memory usage
- [ ] API endpoints tested for response time
- [ ] Batch operations tested with large datasets

Remember: Laravel tests should cover both the happy path and edge cases, with proper mocking of external dependencies and comprehensive assertions.