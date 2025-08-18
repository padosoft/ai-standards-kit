# Laravel Controller Standards

## Core Principles
1. **Slim Controllers**: Business logic in services, not controllers
2. **FormRequest**: Always validate with FormRequest classes
3. **Authorization**: Use Policies for access control
4. **DTOs**: Return structured data via DTOs
5. **HTTP Semantics**: Proper status codes and responses

## Controller Structure

### ✅ GOOD: Slim Controller
```php
<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Products\{StoreProductRequest, UpdateProductRequest};
use App\Services\ProductService;
use App\DTOs\ProductDTO;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function __construct(
        private readonly ProductService $productService
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Product::class);

        $products = $this->productService->getAllProducts();
        
        return response()->json([
            'data' => $products->toArray(),
            'meta' => $products->meta()
        ]);
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $this->authorize('create', Product::class);

        $productDTO = $this->productService->createProduct($request->toDTO());
        
        return response()->json([
            'data' => $productDTO->toArray(),
            'message' => 'Product created successfully'
        ], 201);
    }

    public function show(Product $product): JsonResponse
    {
        $this->authorize('view', $product);

        $productDTO = ProductDTO::fromModel($product);
        
        return response()->json([
            'data' => $productDTO->toArray()
        ]);
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);

        $productDTO = $this->productService->updateProduct($product, $request->toDTO());
        
        return response()->json([
            'data' => $productDTO->toArray(),
            'message' => 'Product updated successfully'
        ]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('delete', $product);

        $this->productService->deleteProduct($product);
        
        return response()->json([
            'message' => 'Product deleted successfully'
        ], 204);
    }
}
```

### ❌ BAD: Fat Controller
```php
class ProductController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        // BAD: Validation in controller
        $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
        ]);

        // BAD: No authorization check
        
        // BAD: Business logic in controller
        $product = new Product();
        $product->name = $request->name;
        $product->price = $request->price;
        $product->slug = Str::slug($request->name);
        
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products');
            $product->image_path = $path;
        }
        
        $product->save();
        
        // BAD: Direct model return
        return response()->json($product, 201);
    }
}
```

## FormRequest Best Practices

### ✅ GOOD: Complete FormRequest
```php
<?php

namespace App\Http\Requests\Products;

use Illuminate\Foundation\Http\FormRequest;
use App\DTOs\ProductDTO;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization handled in controller
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:255', 'unique:products,name'],
            'price' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['string', 'max:50'],
            'is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Product name is required.',
            'name.unique' => 'A product with this name already exists.',
            'price.min' => 'Price must be at least $0.01.',
            'category_id.exists' => 'Selected category does not exist.',
        ];
    }

    public function attributes(): array
    {
        return [
            'category_id' => 'category',
        ];
    }

    public function toDTO(): ProductDTO
    {
        return new ProductDTO(
            name: $this->validated('name'),
            price: (float) $this->validated('price'),
            description: $this->validated('description'),
            categoryId: $this->validated('category_id'),
            tags: $this->validated('tags', []),
            isActive: $this->validated('is_active', true),
        );
    }
}
```

## Policy Integration

### ✅ GOOD: Policy Usage
```php
<?php

namespace App\Policies;

use App\Models\{User, Product};
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view products');
    }

    public function view(User $user, Product $product): bool
    {
        return $user->hasPermissionTo('view products') || 
               $product->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('create products');
    }

    public function update(User $user, Product $product): bool
    {
        return $user->hasPermissionTo('update products') ||
               ($product->user_id === $user->id && $user->hasPermissionTo('update own products'));
    }

    public function delete(User $user, Product $product): bool
    {
        return $user->hasPermissionTo('delete products') ||
               ($product->user_id === $user->id && $user->hasPermissionTo('delete own products'));
    }
}
```

## Response Standards

### ✅ GOOD: Consistent API Responses
```php
// Success responses
return response()->json([
    'data' => $data,
    'message' => 'Operation completed successfully'
], 200);

// Created response
return response()->json([
    'data' => $resource,
    'message' => 'Resource created successfully'
], 201);

// Validation errors (automatic with FormRequest)
return response()->json([
    'message' => 'The given data was invalid.',
    'errors' => [
        'field' => ['Error message']
    ]
], 422);

// Not found
return response()->json([
    'message' => 'Resource not found'
], 404);

// Forbidden
return response()->json([
    'message' => 'This action is unauthorized'
], 403);
```

## Resource Controllers

### Route Model Binding
```php
// In RouteServiceProvider or route file
Route::apiResource('products', ProductController::class);

// Automatic model binding
public function show(Product $product): JsonResponse
{
    // $product is automatically loaded
    $this->authorize('view', $product);
    
    return response()->json([
        'data' => ProductDTO::fromModel($product)->toArray()
    ]);
}
```

### Custom Route Keys
```php
// In Product model
public function getRouteKeyName(): string
{
    return 'slug';
}

// Now routes use slug instead of ID
// GET /api/products/my-awesome-product
```

## Error Handling

### ✅ GOOD: Exception Handling
```php
use App\Exceptions\ProductNotFoundException;
use Illuminate\Database\Eloquent\ModelNotFoundException;

public function show(Product $product): JsonResponse
{
    try {
        $this->authorize('view', $product);
        
        $productDTO = $this->productService->getProductDetails($product);
        
        return response()->json([
            'data' => $productDTO->toArray()
        ]);
        
    } catch (AuthorizationException $e) {
        return response()->json([
            'message' => 'Unauthorized access'
        ], 403);
        
    } catch (ProductNotFoundException $e) {
        return response()->json([
            'message' => $e->getMessage()
        ], 404);
    }
}
```

## Middleware Usage

### Controller Middleware
```php
class ProductController extends Controller
{
    public function __construct(
        private readonly ProductService $productService
    ) {
        $this->middleware('auth:sanctum');
        $this->middleware('throttle:api')->only(['store', 'update']);
        $this->middleware('can:admin')->only(['index']);
    }
}
```

## Anti-Patterns to Avoid
- ❌ Business logic in controllers
- ❌ Direct Eloquent queries in controllers
- ❌ No authorization checks
- ❌ Manual validation instead of FormRequest
- ❌ Returning models directly
- ❌ No error handling
- ❌ Inconsistent response format
- ❌ No middleware for protection

## Quality Gates
- Required: FormRequest for validation
- Required: Policy authorization
- Required: DTO for responses
- Required: Service layer for business logic
- Blocked: Direct model return
- Blocked: Business logic in controller
- Blocked: Manual validation
