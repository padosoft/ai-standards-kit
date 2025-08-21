# PHP Laravel Coding Guidelines

> **Extends**: `/docs/standards/global/coding-guidelines.md`
> 
> This document provides **Laravel-specific** implementations of the enterprise coding guidelines. 
> Always follow the global principles while applying these PHP/Laravel-specific patterns.

## PHP 8+ Type System

### Strict Types and Declarations
```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Carbon\Carbon;

// ✅ Good - Full type declarations
final class OrderService
{
    public function __construct(
        private readonly PaymentService $paymentService,
        private readonly InventoryService $inventoryService,
        private readonly EmailService $emailService
    ) {}
    
    public function createOrder(
        User $user,
        array $items,
        ?string $couponCode = null
    ): Order {
        $this->validateItems($items);
        
        $order = Order::create([
            'user_id' => $user->id,
            'status' => OrderStatus::PENDING,
            'created_at' => Carbon::now(),
        ]);
        
        $this->attachItems($order, $items);
        
        if ($couponCode !== null) {
            $this->applyCoupon($order, $couponCode);
        }
        
        return $order;
    }
    
    /**
     * @param array<int, array{product_id: int, quantity: int, price: float}> $items
     */
    private function validateItems(array $items): void
    {
        foreach ($items as $item) {
            if (!isset($item['product_id'], $item['quantity'], $item['price'])) {
                throw new \InvalidArgumentException('Invalid item structure');
            }
            
            if ($item['quantity'] <= 0) {
                throw new \InvalidArgumentException('Quantity must be positive');
            }
        }
    }
}

// ❌ Bad - Missing types and not strict
class BadOrderService
{
    public function createOrder($user, $items, $coupon = null)  // No types
    {
        // No validation
        return Order::create(['user_id' => $user->id]);  // Unsafe
    }
}
```

### Modern PHP Features
```php
<?php

declare(strict_types=1);

// ✅ Good - Use enums for constants
enum OrderStatus: string
{
    case PENDING = 'pending';
    case CONFIRMED = 'confirmed';
    case SHIPPED = 'shipped';
    case DELIVERED = 'delivered';
    case CANCELLED = 'cancelled';
    
    public function canBeCancelled(): bool
    {
        return match($this) {
            self::PENDING, self::CONFIRMED => true,
            default => false,
        };
    }
    
    public function getLabel(): string
    {
        return match($this) {
            self::PENDING => 'Pending Payment',
            self::CONFIRMED => 'Order Confirmed',
            self::SHIPPED => 'Shipped',
            self::DELIVERED => 'Delivered',
            self::CANCELLED => 'Cancelled',
        };
    }
}

// ✅ Good - Use match expressions
class StatusHandler
{
    public function getNextStatus(OrderStatus $current): ?OrderStatus
    {
        return match($current) {
            OrderStatus::PENDING => OrderStatus::CONFIRMED,
            OrderStatus::CONFIRMED => OrderStatus::SHIPPED,
            OrderStatus::SHIPPED => OrderStatus::DELIVERED,
            OrderStatus::DELIVERED, OrderStatus::CANCELLED => null,
        };
    }
}

// ✅ Good - Use named arguments for clarity
final class UserFactory
{
    public static function create(
        string $name,
        string $email,
        ?Carbon $emailVerifiedAt = null,
        bool $isActive = true,
        array $roles = []
    ): User {
        return User::create([
            'name' => $name,
            'email' => $email,
            'email_verified_at' => $emailVerifiedAt,
            'is_active' => $isActive,
            'roles' => $roles,
        ]);
    }
}

// Usage with named arguments
$user = UserFactory::create(
    name: 'John Doe',
    email: 'john@example.com',
    isActive: true,
    roles: ['customer', 'newsletter']
);
```

## Laravel Model Best Practices

### Model Structure and Relationships
```php
<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

// ✅ Good - Well-structured model
final class Order extends Model
{
    use HasFactory, SoftDeletes;
    
    protected $fillable = [
        'user_id',
        'status',
        'total_amount',
        'currency',
        'notes',
        'shipped_at',
        'delivered_at',
    ];
    
    protected $casts = [
        'status' => OrderStatus::class,
        'total_amount' => 'decimal:2',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];
    
    // ✅ Good - Explicit return types for relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
    
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
    
    // ✅ Good - Business logic methods
    public function canBeCancelled(): bool
    {
        return $this->status->canBeCancelled();
    }
    
    public function cancel(string $reason): void
    {
        if (!$this->canBeCancelled()) {
            throw new \DomainException('Order cannot be cancelled in current status');
        }
        
        $this->update([
            'status' => OrderStatus::CANCELLED,
            'cancellation_reason' => $reason,
            'cancelled_at' => now(),
        ]);
        
        // Trigger events
        event(new OrderCancelled($this));
    }
    
    // ✅ Good - Scopes for common queries
    public function scopePending($query)
    {
        return $query->where('status', OrderStatus::PENDING);
    }
    
    public function scopeForUser($query, User $user)
    {
        return $query->where('user_id', $user->id);
    }
    
    public function scopeWithTotalGreaterThan($query, float $amount)
    {
        return $query->where('total_amount', '>', $amount);
    }
    
    // ✅ Good - Accessors and Mutators with new syntax
    protected function totalAmountFormatted(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value, array $attributes) => 
                number_format($attributes['total_amount'], 2) . ' ' . $attributes['currency']
        );
    }
}
```

### Eloquent Query Optimization
```php
<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

final class OrderRepository
{
    // ✅ Good - Explicit select to avoid SELECT *
    public function findUserOrders(User $user): Collection
    {
        return Order::select([
                'id',
                'status',
                'total_amount',
                'currency',
                'created_at'
            ])
            ->where('user_id', $user->id)
            ->with(['items:id,order_id,product_id,quantity,price'])  // Select specific columns
            ->orderBy('created_at', 'desc')
            ->get();
    }
    
    // ✅ Good - Pagination with cursor for large datasets
    public function getRecentOrdersPaginated(int $perPage = 20): LengthAwarePaginator
    {
        return Order::select(['id', 'user_id', 'status', 'total_amount', 'created_at'])
            ->with([
                'user:id,name,email',
                'items:id,order_id,product_id,quantity,price'
            ])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }
    
    // ✅ Good - Use chunk for large datasets
    public function processLargeDataset(\Closure $callback): void
    {
        Order::with(['user', 'items'])
            ->where('created_at', '>', now()->subYear())
            ->chunkById(1000, $callback);
    }
    
    // ✅ Good - Efficient counting
    public function getOrderStatistics(): array
    {
        return Order::selectRaw('
                status,
                COUNT(*) as count,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as avg_order_value
            ')
            ->groupBy('status')
            ->get()
            ->keyBy('status')
            ->toArray();
    }
    
    // ❌ Bad - N+1 query problem
    public function getUserOrdersBad(): Collection
    {
        $orders = Order::all();  // First query
        
        foreach ($orders as $order) {
            $order->user->name;  // N additional queries
            $order->items->count(); // N more queries
        }
        
        return $orders;
    }
    
    // ✅ Good - Prevent N+1 with eager loading
    public function getUserOrdersGood(): Collection
    {
        return Order::with(['user:id,name', 'items'])
            ->get();
    }
}
```

## Controller Design Patterns

### Resource Controllers
```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateOrderRequest;
use App\Http\Requests\UpdateOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

// ✅ Good - Slim controller with proper separation
final class OrderController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService
    ) {
        $this->middleware('auth');
        $this->authorizeResource(Order::class, 'order');
    }
    
    public function index(): AnonymousResourceCollection
    {
        $orders = $this->orderService->getUserOrders(auth()->user());
        
        return OrderResource::collection($orders);
    }
    
    public function show(Order $order): OrderResource
    {
        // Authorization handled by middleware
        return new OrderResource($order->load(['items', 'payments']));
    }
    
    public function store(CreateOrderRequest $request): JsonResponse
    {
        // Request validation handled by FormRequest
        $order = $this->orderService->createOrder(
            user: auth()->user(),
            items: $request->validated('items'),
            couponCode: $request->validated('coupon_code')
        );
        
        return (new OrderResource($order))
            ->response()
            ->setStatusCode(201);
    }
    
    public function update(UpdateOrderRequest $request, Order $order): OrderResource
    {
        $updatedOrder = $this->orderService->updateOrder(
            order: $order,
            data: $request->validated()
        );
        
        return new OrderResource($updatedOrder);
    }
    
    public function destroy(Order $order): JsonResponse
    {
        $this->orderService->cancelOrder($order, 'Cancelled by user');
        
        return response()->json([], 204);
    }
}

// ❌ Bad - Fat controller with business logic
final class BadOrderController extends Controller
{
    public function store(Request $request)
    {
        // Manual validation (should be in FormRequest)
        if (!$request->has('items') || empty($request->items)) {
            return response()->json(['error' => 'Items required'], 400);
        }
        
        // Business logic in controller (should be in service)
        $order = Order::create([
            'user_id' => auth()->id(),
            'status' => 'pending',
            'total_amount' => 0,
        ]);
        
        $totalAmount = 0;
        foreach ($request->items as $item) {
            // More business logic
            $orderItem = $order->items()->create($item);
            $totalAmount += $orderItem->price * $orderItem->quantity;
        }
        
        $order->update(['total_amount' => $totalAmount]);
        
        // Direct model return (should use Resource)
        return $order;
    }
}
```

### Form Request Validation
```php
<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\OrderStatus;
use App\Rules\ValidProductIds;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// ✅ Good - Comprehensive form request
final class CreateOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }
    
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100'],
            'items.*.price' => ['required', 'numeric', 'min:0', 'max:99999.99'],
            
            'shipping_address' => ['required', 'array'],
            'shipping_address.line1' => ['required', 'string', 'max:255'],
            'shipping_address.line2' => ['nullable', 'string', 'max:255'],
            'shipping_address.city' => ['required', 'string', 'max:100'],
            'shipping_address.postal_code' => ['required', 'string', 'max:20'],
            'shipping_address.country' => ['required', 'string', 'size:2'],
            
            'coupon_code' => ['nullable', 'string', 'exists:coupons,code'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
    
    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => 'At least one item is required',
            'items.*.product_id.exists' => 'Selected product does not exist',
            'items.*.quantity.min' => 'Quantity must be at least 1',
            'items.*.quantity.max' => 'Maximum quantity is 100 per item',
            'shipping_address.country.size' => 'Country must be 2-letter code',
        ];
    }
    
    /**
     * @return array<string, mixed>
     */
    public function validated($key = null, $default = null): array
    {
        $validated = parent::validated();
        
        // Additional processing
        if (isset($validated['coupon_code'])) {
            $validated['coupon_code'] = strtoupper($validated['coupon_code']);
        }
        
        return $validated;
    }
    
    protected function prepareForValidation(): void
    {
        // Clean data before validation
        if ($this->has('notes')) {
            $this->merge([
                'notes' => trim($this->input('notes')),
            ]);
        }
    }
}
```

## Service Layer Architecture

### Business Logic Services
```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\OrderCreated;
use App\Events\OrderCancelled;
use App\Exceptions\InsufficientInventoryException;
use App\Exceptions\InvalidCouponException;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

// ✅ Good - Service with clear responsibilities
final class OrderService
{
    public function __construct(
        private readonly PaymentService $paymentService,
        private readonly InventoryService $inventoryService,
        private readonly CouponService $couponService,
        private readonly EmailService $emailService
    ) {}
    
    public function createOrder(User $user, array $items, ?string $couponCode = null): Order
    {
        return DB::transaction(function () use ($user, $items, $couponCode) {
            // Validate inventory
            $this->validateInventoryAvailability($items);
            
            // Create order
            $order = Order::create([
                'user_id' => $user->id,
                'status' => OrderStatus::PENDING,
                'currency' => 'USD',
                'total_amount' => 0,
            ]);
            
            // Add items
            $totalAmount = $this->addItemsToOrder($order, $items);
            
            // Apply coupon if provided
            if ($couponCode !== null) {
                $discount = $this->couponService->applyCoupon($order, $couponCode);
                $totalAmount -= $discount;
            }
            
            // Update total
            $order->update(['total_amount' => max(0, $totalAmount)]);
            
            // Reserve inventory
            $this->inventoryService->reserveItems($items);
            
            // Fire events
            event(new OrderCreated($order));
            
            return $order->fresh(['items', 'user']);
        });
    }
    
    public function cancelOrder(Order $order, string $reason): void
    {
        if (!$order->canBeCancelled()) {
            throw new \DomainException("Order {$order->id} cannot be cancelled");
        }
        
        DB::transaction(function () use ($order, $reason) {
            // Update order status
            $order->cancel($reason);
            
            // Release inventory
            $this->inventoryService->releaseReservedItems($order);
            
            // Refund if payment was processed
            if ($order->payments()->where('status', 'completed')->exists()) {
                $this->paymentService->refund($order);
            }
            
            // Send notification
            $this->emailService->sendOrderCancellationEmail($order);
            
            // Fire event
            event(new OrderCancelled($order));
        });
    }
    
    public function getUserOrders(User $user): Collection
    {
        return Order::where('user_id', $user->id)
            ->with(['items.product:id,name,price'])
            ->orderBy('created_at', 'desc')
            ->get();
    }
    
    private function validateInventoryAvailability(array $items): void
    {
        foreach ($items as $item) {
            if (!$this->inventoryService->hasStock($item['product_id'], $item['quantity'])) {
                throw new InsufficientInventoryException(
                    "Insufficient stock for product {$item['product_id']}"
                );
            }
        }
    }
    
    private function addItemsToOrder(Order $order, array $items): float
    {
        $totalAmount = 0;
        
        foreach ($items as $item) {
            $order->items()->create([
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
                'total' => $item['quantity'] * $item['price'],
            ]);
            
            $totalAmount += $item['quantity'] * $item['price'];
        }
        
        return $totalAmount;
    }
}
```

## Testing Patterns

### Feature and Unit Tests
```php
<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Models\Product;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// ✅ Good - Comprehensive feature test
final class OrderCreationTest extends TestCase
{
    use RefreshDatabase;
    
    private User $user;
    private Product $product;
    private OrderService $orderService;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        $this->user = User::factory()->create();
        $this->product = Product::factory()->create(['price' => 29.99, 'stock' => 100]);
        $this->orderService = app(OrderService::class);
    }
    
    public function test_authenticated_user_can_create_order(): void
    {
        // Arrange
        $this->actingAs($this->user);
        $orderData = [
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 2,
                    'price' => $this->product->price,
                ]
            ],
            'shipping_address' => [
                'line1' => '123 Test St',
                'city' => 'Test City',
                'postal_code' => '12345',
                'country' => 'US',
            ]
        ];
        
        // Act
        $response = $this->postJson('/api/orders', $orderData);
        
        // Assert
        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'status',
                    'total_amount',
                    'items' => [
                        '*' => ['product_id', 'quantity', 'price']
                    ]
                ]
            ]);
        
        $this->assertDatabaseHas('orders', [
            'user_id' => $this->user->id,
            'status' => 'pending',
        ]);
        
        $this->assertDatabaseHas('order_items', [
            'product_id' => $this->product->id,
            'quantity' => 2,
        ]);
    }
    
    public function test_order_creation_fails_with_invalid_data(): void
    {
        $this->actingAs($this->user);
        
        $response = $this->postJson('/api/orders', [
            'items' => [], // Empty items array
        ]);
        
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items']);
    }
    
    public function test_guest_cannot_create_order(): void
    {
        $response = $this->postJson('/api/orders', [
            'items' => [['product_id' => 1, 'quantity' => 1, 'price' => 29.99]]
        ]);
        
        $response->assertStatus(401);
    }
}

// ✅ Good - Unit test for service
final class OrderServiceTest extends TestCase
{
    use RefreshDatabase;
    
    private OrderService $orderService;
    
    protected function setUp(): void
    {
        parent::setUp();
        $this->orderService = app(OrderService::class);
    }
    
    public function test_create_order_calculates_total_correctly(): void
    {
        // Arrange
        $user = User::factory()->create();
        $product = Product::factory()->create(['price' => 25.00]);
        
        $items = [
            [
                'product_id' => $product->id,
                'quantity' => 3,
                'price' => 25.00,
            ]
        ];
        
        // Act
        $order = $this->orderService->createOrder($user, $items);
        
        // Assert
        $this->assertEquals(75.00, $order->total_amount);
        $this->assertEquals(1, $order->items->count());
        $this->assertEquals(3, $order->items->first()->quantity);
    }
}
```

## Performance Optimization Patterns

### Query Optimization
```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

final class OrderReportService
{
    // ✅ Good - Efficient aggregation queries
    public function getOrderStatsByDateRange(\DateTimeInterface $start, \DateTimeInterface $end): array
    {
        return Cache::tags(['order-stats'])->remember(
            "order-stats-{$start->format('Y-m-d')}-{$end->format('Y-m-d')}",
            now()->addMinutes(15),
            function () use ($start, $end) {
                return DB::table('orders')
                    ->selectRaw('
                        DATE(created_at) as date,
                        COUNT(*) as total_orders,
                        SUM(total_amount) as total_revenue,
                        AVG(total_amount) as avg_order_value,
                        COUNT(DISTINCT user_id) as unique_customers
                    ')
                    ->whereBetween('created_at', [$start, $end])
                    ->where('status', '!=', 'cancelled')
                    ->groupBy(DB::raw('DATE(created_at)'))
                    ->orderBy('date')
                    ->get()
                    ->toArray();
            }
        );
    }
    
    // ✅ Good - Cursor pagination for large datasets
    public function getOrdersWithCursorPagination(?string $cursor = null, int $limit = 20): array
    {
        $query = Order::select(['id', 'user_id', 'status', 'total_amount', 'created_at'])
            ->with(['user:id,name,email'])
            ->orderBy('id', 'desc');
        
        if ($cursor) {
            $query->where('id', '<', $cursor);
        }
        
        $orders = $query->limit($limit + 1)->get();
        
        $hasMore = $orders->count() > $limit;
        if ($hasMore) {
            $orders->pop();
        }
        
        return [
            'data' => $orders,
            'next_cursor' => $hasMore ? $orders->last()->id : null,
            'has_more' => $hasMore,
        ];
    }
}
```

## Data Transfer Object (DTO) Patterns

### DTO Structure and Implementation
```php
<?php

declare(strict_types=1);

namespace App\DTOs;

use Carbon\Carbon;

// ✅ Good - Immutable DTO with typed properties
final readonly class CreateOrderDTO
{
    /**
     * @param array<int, OrderItemDTO> $items
     * @param array<string, mixed> $shippingAddress
     */
    public function __construct(
        public int $userId,
        public array $items,
        public array $shippingAddress,
        public ?string $couponCode = null,
        public ?string $notes = null,
        public Carbon $createdAt = new Carbon()
    ) {}
    
    public static function fromRequest(array $data): self
    {
        $items = array_map(
            fn(array $item) => OrderItemDTO::fromArray($item),
            $data['items']
        );
        
        return new self(
            userId: $data['user_id'],
            items: $items,
            shippingAddress: $data['shipping_address'],
            couponCode: $data['coupon_code'] ?? null,
            notes: $data['notes'] ?? null,
            createdAt: isset($data['created_at']) 
                ? Carbon::parse($data['created_at'])
                : now()
        );
    }
    
    public function toArray(): array
    {
        return [
            'user_id' => $this->userId,
            'items' => array_map(fn(OrderItemDTO $item) => $item->toArray(), $this->items),
            'shipping_address' => $this->shippingAddress,
            'coupon_code' => $this->couponCode,
            'notes' => $this->notes,
            'created_at' => $this->createdAt->toISOString(),
        ];
    }
    
    public function getTotalAmount(): float
    {
        return array_sum(
            array_map(fn(OrderItemDTO $item) => $item->getTotal(), $this->items)
        );
    }
}

final readonly class OrderItemDTO
{
    public function __construct(
        public int $productId,
        public int $quantity,
        public float $price
    ) {}
    
    public static function fromArray(array $data): self
    {
        return new self(
            productId: $data['product_id'],
            quantity: $data['quantity'],
            price: (float) $data['price']
        );
    }
    
    public function toArray(): array
    {
        return [
            'product_id' => $this->productId,
            'quantity' => $this->quantity,
            'price' => $this->price,
            'total' => $this->getTotal(),
        ];
    }
    
    public function getTotal(): float
    {
        return $this->quantity * $this->price;
    }
}
```

### DTO Transformation Patterns
```php
<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\CreateOrderDTO;
use App\DTOs\OrderResponseDTO;
use App\Models\Order;

// ✅ Good - DTO transformer service
final class OrderTransformer
{
    public function toModel(CreateOrderDTO $dto): array
    {
        return [
            'user_id' => $dto->userId,
            'total_amount' => $dto->getTotalAmount(),
            'shipping_address' => json_encode($dto->shippingAddress),
            'coupon_code' => $dto->couponCode,
            'notes' => $dto->notes,
            'status' => OrderStatus::PENDING,
            'currency' => 'USD',
        ];
    }
    
    public function fromModel(Order $order): OrderResponseDTO
    {
        return new OrderResponseDTO(
            id: $order->id,
            userId: $order->user_id,
            status: $order->status,
            totalAmount: $order->total_amount,
            currency: $order->currency,
            items: $order->items->map(fn($item) => OrderItemResponseDTO::fromModel($item))->toArray(),
            createdAt: $order->created_at,
            updatedAt: $order->updated_at
        );
    }
}
```

## Repository Pattern Implementation

### Repository Interface and Implementation
```php
<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface OrderRepositoryInterface
{
    public function findById(int $id): ?Order;
    public function findByIdWithItems(int $id): ?Order;
    public function findByUser(User $user): Collection;
    public function create(array $data): Order;
    public function update(Order $order, array $data): Order;
    public function delete(Order $order): bool;
    public function getPaginated(int $perPage = 20): LengthAwarePaginator;
}

// ✅ Good - Repository implementation with query optimization
final class OrderRepository implements OrderRepositoryInterface
{
    public function findById(int $id): ?Order
    {
        return Order::find($id);
    }
    
    public function findByIdWithItems(int $id): ?Order
    {
        return Order::with(['items.product:id,name,price'])
            ->find($id);
    }
    
    public function findByUser(User $user): Collection
    {
        return Order::where('user_id', $user->id)
            ->with(['items:id,order_id,product_id,quantity,price'])
            ->orderBy('created_at', 'desc')
            ->get();
    }
    
    public function create(array $data): Order
    {
        return Order::create($data);
    }
    
    public function update(Order $order, array $data): Order
    {
        $order->update($data);
        return $order->fresh();
    }
    
    public function delete(Order $order): bool
    {
        return $order->delete();
    }
    
    public function getPaginated(int $perPage = 20): LengthAwarePaginator
    {
        return Order::with(['user:id,name,email'])
            ->select(['id', 'user_id', 'status', 'total_amount', 'created_at'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }
    
    public function findPendingOrders(): Collection
    {
        return Order::where('status', OrderStatus::PENDING)
            ->where('created_at', '<', now()->subMinutes(30))
            ->with(['user:id,email'])
            ->get();
    }
}
```

## Factory Pattern Implementation

### Model Factories and Data Builders
```php
<?php

declare(strict_types=1);

namespace App\Factories;

use App\DTOs\CreateOrderDTO;
use App\DTOs\OrderItemDTO;
use App\Enums\OrderStatus;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;

// ✅ Good - DTO Factory for test data
final class OrderDTOFactory
{
    public static function create(array $overrides = []): CreateOrderDTO
    {
        $defaults = [
            'user_id' => User::factory()->create()->id,
            'items' => [
                [
                    'product_id' => Product::factory()->create()->id,
                    'quantity' => 2,
                    'price' => 29.99,
                ]
            ],
            'shipping_address' => [
                'line1' => '123 Test Street',
                'city' => 'Test City',
                'postal_code' => '12345',
                'country' => 'US',
            ],
            'coupon_code' => null,
            'notes' => null,
        ];
        
        $data = array_merge($defaults, $overrides);
        return CreateOrderDTO::fromRequest($data);
    }
    
    public static function withItems(array $items): CreateOrderDTO
    {
        return self::create(['items' => $items]);
    }
    
    public static function withCoupon(string $couponCode): CreateOrderDTO
    {
        return self::create(['coupon_code' => $couponCode]);
    }
}

// ✅ Good - Domain object factory
final class OrderFactory
{
    public function __construct(
        private readonly OrderRepository $orderRepository,
        private readonly ProductRepository $productRepository
    ) {}
    
    public function createFromDTO(CreateOrderDTO $dto): Order
    {
        // Validate products exist and are available
        $this->validateProducts($dto->items);
        
        // Create order with items
        $orderData = [
            'user_id' => $dto->userId,
            'total_amount' => $dto->getTotalAmount(),
            'status' => OrderStatus::PENDING,
            'shipping_address' => json_encode($dto->shippingAddress),
            'coupon_code' => $dto->couponCode,
            'notes' => $dto->notes,
        ];
        
        $order = $this->orderRepository->create($orderData);
        
        // Add items
        foreach ($dto->items as $itemDTO) {
            $order->items()->create([
                'product_id' => $itemDTO->productId,
                'quantity' => $itemDTO->quantity,
                'price' => $itemDTO->price,
                'total' => $itemDTO->getTotal(),
            ]);
        }
        
        return $order->fresh(['items']);
    }
    
    private function validateProducts(array $items): void
    {
        $productIds = array_map(fn(OrderItemDTO $item) => $item->productId, $items);
        $existingProducts = $this->productRepository->findByIds($productIds);
        
        if ($existingProducts->count() !== count($productIds)) {
            throw new \InvalidArgumentException('Some products do not exist');
        }
    }
}
```

## Action Pattern Implementation

### Single Responsibility Actions
```php
<?php

declare(strict_types=1);

namespace App\Actions;

use App\DTOs\CreateOrderDTO;
use App\Events\OrderCreated;
use App\Models\Order;
use App\Services\InventoryService;
use App\Services\PaymentService;
use Illuminate\Support\Facades\DB;

// ✅ Good - Single responsibility action
final class CreateOrderAction
{
    public function __construct(
        private readonly OrderFactory $orderFactory,
        private readonly InventoryService $inventoryService,
        private readonly PaymentService $paymentService
    ) {}
    
    public function execute(CreateOrderDTO $dto): Order
    {
        return DB::transaction(function () use ($dto) {
            // Check inventory availability
            $this->inventoryService->validateAvailability($dto->items);
            
            // Create the order
            $order = $this->orderFactory->createFromDTO($dto);
            
            // Reserve inventory
            $this->inventoryService->reserveItems($dto->items);
            
            // Initialize payment if needed
            if ($dto->couponCode === null || $order->total_amount > 0) {
                $this->paymentService->initializePayment($order);
            }
            
            // Fire domain event
            event(new OrderCreated($order));
            
            return $order;
        });
    }
}

final class CancelOrderAction
{
    public function __construct(
        private readonly InventoryService $inventoryService,
        private readonly PaymentService $paymentService
    ) {}
    
    public function execute(Order $order, string $reason): void
    {
        if (!$order->canBeCancelled()) {
            throw new \DomainException("Order {$order->id} cannot be cancelled");
        }
        
        DB::transaction(function () use ($order, $reason) {
            // Update order status
            $order->cancel($reason);
            
            // Release inventory
            $this->inventoryService->releaseReservation($order);
            
            // Process refunds
            if ($order->hasCompletedPayments()) {
                $this->paymentService->processRefund($order);
            }
            
            // Fire event
            event(new OrderCancelled($order));
        });
    }
}
```

## Final Checklist

### Laravel Code Quality Checklist
- [ ] Strict types declared in all PHP files
- [ ] All public methods have explicit return types
- [ ] Controllers are slim with business logic in services
- [ ] FormRequests used for all validation
- [ ] Models use proper relationships with return types
- [ ] Eloquent queries select specific columns
- [ ] N+1 queries prevented with eager loading
- [ ] Database transactions for multi-step operations
- [ ] Events used for cross-cutting concerns
- [ ] Resources used for API responses
- [ ] Proper exception handling with custom exceptions
- [ ] Tests cover both happy and error paths
- [ ] Caching implemented for expensive operations
- [ ] Queues used for time-consuming tasks
- [ ] Middleware used for cross-cutting concerns