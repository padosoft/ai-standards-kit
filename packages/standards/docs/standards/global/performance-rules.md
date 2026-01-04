# Enterprise Performance Rules

## Performance Targets

### Response Time SLAs
```yaml
API Endpoints:
  p50: < 100ms    # Median response time
  p95: < 200ms    # 95th percentile
  p99: < 500ms    # 99th percentile
  p99.9: < 1000ms # 99.9th percentile

Page Load Times:
  FCP: < 1.8s     # First Contentful Paint
  LCP: < 2.5s     # Largest Contentful Paint
  FID: < 100ms    # First Input Delay
  CLS: < 0.1      # Cumulative Layout Shift
  TTI: < 3.8s     # Time to Interactive

Background Jobs:
  quick: < 5s
  standard: < 30s
  long: < 5m
  batch: < 1h
```

### Throughput Requirements
```yaml
Minimum Throughput:
  API: 1000 req/s per instance
  Database: 5000 queries/s
  Cache: 10000 ops/s
  Queue: 1000 messages/s

Scalability:
  Horizontal: Linear up to 100 instances
  Vertical: Efficient up to 64 cores
  Database: Read replicas for 10x read scale
  Cache: Distributed for unlimited scale
```

## Database and query Optimization

**Primary source for Database and query Optimization:** use `@db.md`


### Database Connection Pooling
```typescript
export const DatabaseConfig = {
  pool: {
    min: 2,                    // Minimum connections
    max: 20,                   // Maximum connections
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Fail if can't connect in 2s
    maxUses: 7500,            // Close connection after 7500 uses
    
    // Connection retry logic
    retryAttempts: 3,
    retryDelay: 100,
    
    // Statement timeout per query
    statement_timeout: 30000,  // 30 seconds max query time
    
    // Idle in transaction timeout
    idle_in_transaction_session_timeout: 60000,
  }
};

// Connection pool monitoring
export class PoolMonitor {
  monitor(pool: Pool): void {
    setInterval(() => {
      const metrics = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      };
      
      if (metrics.waiting > 0) {
        logger.warn('Database pool has waiting connections', metrics);
      }
      
      if (metrics.idle < 2) {
        logger.warn('Database pool running low on idle connections', metrics);
      }
      
      this.metrics.record('db.pool.connections', metrics);
    }, 5000);
  }
}
```

## Caching Strategies

### Multi-Layer Caching
```typescript
export class CacheManager {
  constructor(
    private l1Cache: MemoryCache,    // In-process memory
    private l2Cache: RedisCache,     // Distributed Redis
    private l3Cache: CDNCache        // Edge CDN
  ) {}
  
  async get<T>(key: string): Promise<T | null> {
    // Check L1 (fastest)
    let value = await this.l1Cache.get<T>(key);
    if (value) {
      this.metrics.increment('cache.l1.hit');
      return value;
    }
    
    // Check L2
    value = await this.l2Cache.get<T>(key);
    if (value) {
      this.metrics.increment('cache.l2.hit');
      // Promote to L1
      await this.l1Cache.set(key, value, 60); // 1 minute in L1
      return value;
    }
    
    // Check L3
    value = await this.l3Cache.get<T>(key);
    if (value) {
      this.metrics.increment('cache.l3.hit');
      // Promote to L2 and L1
      await this.l2Cache.set(key, value, 3600); // 1 hour in L2
      await this.l1Cache.set(key, value, 60);
      return value;
    }
    
    this.metrics.increment('cache.miss');
    return null;
  }
  
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const ttl = options.ttl || 3600;
    
    // Write to all layers with different TTLs
    await Promise.all([
      this.l1Cache.set(key, value, Math.min(ttl, 300)), // Max 5 min in L1
      this.l2Cache.set(key, value, ttl),
      this.l3Cache.set(key, value, ttl * 24), // Longer in CDN
    ]);
  }
}
```

### Cache Invalidation Patterns
```typescript
// Cache-aside pattern with tags
export class TaggedCache {
  async get<T>(key: string, tags: string[] = []): Promise<T | null> {
    const value = await this.cache.get<T>(key);
    
    if (value) {
      // Check if any tags have been invalidated
      const invalidated = await this.checkInvalidatedTags(tags);
      if (invalidated) {
        await this.cache.delete(key);
        return null;
      }
    }
    
    return value;
  }
  
  async set<T>(
    key: string,
    value: T,
    ttl: number,
    tags: string[] = []
  ): Promise<void> {
    await this.cache.set(key, value, ttl);
    
    // Track keys by tags for bulk invalidation
    for (const tag of tags) {
      await this.cache.sadd(`tag:${tag}`, key);
      await this.cache.expire(`tag:${tag}`, ttl);
    }
  }
  
  async invalidateTag(tag: string): Promise<void> {
    const keys = await this.cache.smembers(`tag:${tag}`);
    
    if (keys.length > 0) {
      await this.cache.del(...keys);
      await this.cache.del(`tag:${tag}`);
    }
    
    // Mark tag as invalidated for lazy invalidation
    await this.cache.set(`invalidated:${tag}`, Date.now(), 300);
  }
}

// Write-through cache
export class WriteThroughCache {
  async save<T>(key: string, value: T): Promise<void> {
    // Write to cache and database simultaneously
    await Promise.all([
      this.cache.set(key, value, 3600),
      this.database.save(key, value)
    ]);
  }
  
  async get<T>(key: string): Promise<T | null> {
    // Try cache first
    let value = await this.cache.get<T>(key);
    
    if (!value) {
      // Load from database
      value = await this.database.get<T>(key);
      
      if (value) {
        // Populate cache
        await this.cache.set(key, value, 3600);
      }
    }
    
    return value;
  }
}
```

### Cache Warming
```typescript
export class CacheWarmer {
  async warmCache(): Promise<void> {
    const startTime = Date.now();
    
    // Warm critical data
    await Promise.all([
      this.warmUserCache(),
      this.warmProductCache(),
      this.warmConfigCache(),
    ]);
    
    const duration = Date.now() - startTime;
    logger.info(`Cache warmed in ${duration}ms`);
  }
  
  private async warmUserCache(): Promise<void> {
    // Load most active users
    const activeUsers = await db.query(`
      SELECT * FROM users
      WHERE last_login > NOW() - INTERVAL '7 days'
      ORDER BY login_count DESC
      LIMIT 1000
    `);
    
    await Promise.all(
      activeUsers.map(user =>
        this.cache.set(`user:${user.id}`, user, 3600)
      )
    );
  }
  
  private async warmProductCache(): Promise<void> {
    // Load popular products
    const popularProducts = await db.query(`
      SELECT p.*, COUNT(oi.id) as order_count
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      WHERE p.active = true
      GROUP BY p.id
      ORDER BY order_count DESC
      LIMIT 100
    `);
    
    await Promise.all(
      popularProducts.map(product =>
        this.cache.set(`product:${product.id}`, product, 7200)
      )
    );
  }
}
```

## Memory Management

### Memory Leak Prevention
```typescript
export class MemoryManager {
  private subscriptions: Set<Subscription> = new Set();
  private timers: Set<NodeJS.Timer> = new Set();
  private listeners: Map<EventEmitter, Map<string, Function>> = new Map();
  
  // Track subscriptions
  subscribe(observable: Observable<any>): Subscription {
    const subscription = observable.subscribe();
    this.subscriptions.add(subscription);
    return subscription;
  }
  
  // Track timers
  setTimeout(callback: Function, delay: number): NodeJS.Timer {
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(timer);
    }, delay);
    this.timers.add(timer);
    return timer;
  }
  
  // Track event listeners
  addEventListener(
    emitter: EventEmitter,
    event: string,
    listener: Function
  ): void {
    emitter.on(event, listener);
    
    if (!this.listeners.has(emitter)) {
      this.listeners.set(emitter, new Map());
    }
    this.listeners.get(emitter)!.set(event, listener);
  }
  
  // Clean up everything
  cleanup(): void {
    // Unsubscribe all
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
    
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    // Remove all listeners
    this.listeners.forEach((events, emitter) => {
      events.forEach((listener, event) => {
        emitter.removeListener(event, listener);
      });
    });
    this.listeners.clear();
  }
}

// WeakMap for metadata to prevent memory leaks
export class MetadataStore {
  private metadata = new WeakMap<object, any>();
  
  setMetadata(obj: object, data: any): void {
    this.metadata.set(obj, data);
    // Object can be garbage collected when no longer referenced
    // WeakMap doesn't prevent GC
  }
  
  getMetadata(obj: object): any {
    return this.metadata.get(obj);
  }
}
```

### Object Pooling
```typescript
export class ObjectPool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;
  
  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }
  
  acquire(): T {
    let obj: T;
    
    if (this.available.length > 0) {
      obj = this.available.pop()!;
    } else if (this.inUse.size < this.maxSize) {
      obj = this.factory();
    } else {
      throw new Error('Object pool exhausted');
    }
    
    this.inUse.add(obj);
    return obj;
  }
  
  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      throw new Error('Object not from this pool');
    }
    
    this.reset(obj);
    this.inUse.delete(obj);
    
    if (this.available.length < this.maxSize) {
      this.available.push(obj);
    }
  }
  
  get stats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
    };
  }
}

// Usage example: Database connection pool
const dbPool = new ObjectPool(
  () => new DatabaseConnection(),
  (conn) => conn.reset(),
  5,  // Initial size
  20  // Max size
);
```

## Async Performance

### Concurrent Processing
```typescript
// ✅ Good - Parallel processing with concurrency limit
export class ConcurrentProcessor {
  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number = 10
  ): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];
    
    for (const item of items) {
      const promise = processor(item).then(result => {
        results.push(result);
      });
      
      executing.push(promise);
      
      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex(p => p === promise),
          1
        );
      }
    }
    
    await Promise.all(executing);
    return results;
  }
}

// ✅ Good - Batch processing with p-limit
import pLimit from 'p-limit';

export class BatchProcessor {
  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 100
  ): Promise<R[]> {
    const limit = pLimit(batchSize);
    
    return Promise.all(
      items.map(item =>
        limit(() => processor(item))
      )
    );
  }
}

// ❌ Bad - Sequential processing
export class SequentialProcessor {
  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (const item of items) {
      const result = await processor(item); // Blocks on each item
      results.push(result);
    }
    
    return results;
  }
}
```

### Stream Processing
```typescript
export class StreamProcessor {
  async processLargeFile(
    inputPath: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(inputPath, {
        highWaterMark: 16 * 1024, // 16KB chunks
      });
      
      const writeStream = fs.createWriteStream(outputPath);
      
      const transform = new Transform({
        transform(chunk, encoding, callback) {
          // Process chunk without loading entire file
          const processed = this.processChunk(chunk);
          callback(null, processed);
        },
        
        // Control backpressure
        highWaterMark: 16 * 1024,
      });
      
      pipeline(readStream, transform, writeStream, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Async iterators for memory-efficient processing
export class AsyncIteratorProcessor {
  async *readLargeDataset(query: string): AsyncGenerator<any> {
    const pageSize = 1000;
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const results = await db.query(
        `${query} LIMIT ${pageSize} OFFSET ${offset}`
      );
      
      for (const row of results.rows) {
        yield row;
      }
      
      hasMore = results.rows.length === pageSize;
      offset += pageSize;
    }
  }
  
  async processDataset(): Promise<void> {
    for await (const record of this.readLargeDataset('SELECT * FROM logs')) {
      await this.processRecord(record);
      // Memory efficient - only one page in memory at a time
    }
  }
}
```

## Frontend Performance

### Bundle Optimization
```javascript
// Webpack configuration for optimal bundles
export const webpackConfig = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
    
    // Tree shaking
    usedExports: true,
    sideEffects: false,
    
    // Minification
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          compress: {
            drop_console: true,
          },
        },
      }),
    ],
  },
  
  // Code splitting
  entry: {
    main: './src/index.js',
    admin: './src/admin.js',
  },
  
  // Lazy loading
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
  },
};
```

### React Performance
```typescript
// ✅ Good - Memoization and lazy loading
import React, { memo, useMemo, useCallback, lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export const OptimizedComponent = memo(({ data, onUpdate }) => {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      computed: expensiveComputation(item),
    }));
  }, [data]);
  
  // Memoize callbacks
  const handleClick = useCallback((id: string) => {
    onUpdate(id);
  }, [onUpdate]);
  
  return (
    <div>
      {processedData.map(item => (
        <div key={item.id} onClick={() => handleClick(item.id)}>
          {item.computed}
        </div>
      ))}
      
      <Suspense fallback={<div>Loading...</div>}>
        <HeavyComponent />
      </Suspense>
    </div>
  );
});

// Virtual scrolling for large lists
import { FixedSizeList } from 'react-window';

export const VirtualList = ({ items }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={35}
      width='100%'
    >
      {Row}
    </FixedSizeList>
  );
};
```

### Image Optimization
```typescript
export class ImageOptimizer {
  // Responsive images with srcset
  generateSrcSet(imagePath: string): string {
    const widths = [320, 640, 960, 1280, 1920];
    
    return widths
      .map(w => `${this.getOptimizedUrl(imagePath, w)} ${w}w`)
      .join(', ');
  }
  
  // Lazy loading with Intersection Observer
  setupLazyLoading(): void {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src!;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px', // Start loading 50px before visible
    });
    
    images.forEach(img => imageObserver.observe(img));
  }
  
  // WebP with fallback
  getPictureElement(imagePath: string, alt: string): string {
    return `
      <picture>
        <source type="image/webp" srcset="${imagePath}.webp">
        <source type="image/jpeg" srcset="${imagePath}.jpg">
        <img src="${imagePath}.jpg" alt="${alt}" loading="lazy">
      </picture>
    `;
  }
}
```

## Network Performance

### HTTP/2 and HTTP/3 Optimization
```typescript
export const Http2Config = {
  // Server push critical resources
  serverPush: [
    '/css/critical.css',
    '/js/app.js',
    '/fonts/main.woff2',
  ],
  
  // Prioritization hints
  priorities: {
    '/api/critical': 'high',
    '/api/analytics': 'low',
    '/images/*': 'low',
  },
  
  // Connection settings
  maxConcurrentStreams: 100,
  initialWindowSize: 65535,
  maxFrameSize: 16384,
};

// Early hints (103 status)
export class EarlyHints {
  sendHints(res: Response): void {
    res.writeEarlyHints({
      link: [
        '</css/style.css>; rel=preload; as=style',
        '</js/app.js>; rel=preload; as=script',
        '</api/user>; rel=preconnect',
      ],
    });
  }
}
```

### API Response Compression
```typescript
export class CompressionMiddleware {
  compress(req: Request, res: Response, next: NextFunction): void {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    // Choose best compression
    if (acceptEncoding.includes('br')) {
      res.setHeader('Content-Encoding', 'br');
      const stream = zlib.createBrotliCompress({
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
        },
      });
      pipeline(stream, res, (err) => {
        if (err) next(err);
      });
      res = stream;
    } else if (acceptEncoding.includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip');
      const stream = zlib.createGzip({ level: 6 });
      pipeline(stream, res, (err) => {
        if (err) next(err);
      });
      res = stream;
    }
    
    next();
  }
}
```

## Monitoring and Profiling

### Performance Metrics Collection
```typescript
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  
  startTimer(operation: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
    };
  }
  
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
  }
  
  getStats(name: string): PerformanceStats {
    const values = this.metrics.get(name) || [];
    
    if (values.length === 0) {
      return { count: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
}

// Distributed tracing
export class TracingService {
  startSpan(name: string, parent?: Span): Span {
    const span = {
      traceId: parent?.traceId || this.generateTraceId(),
      spanId: this.generateSpanId(),
      parentSpanId: parent?.spanId,
      name,
      startTime: Date.now(),
      tags: new Map<string, any>(),
      logs: [],
    };
    
    return {
      ...span,
      
      setTag(key: string, value: any): void {
        span.tags.set(key, value);
      },
      
      log(message: string): void {
        span.logs.push({
          timestamp: Date.now(),
          message,
        });
      },
      
      finish(): void {
        span.endTime = Date.now();
        span.duration = span.endTime - span.startTime;
        this.sendToCollector(span);
      },
    };
  }
}
```

## Performance Checklist

### Backend Performance
- [ ] For Database and queries optimization use `@db.md`
- [ ] Caching strategy implemented
- [ ] Async operations optimized
- [ ] Memory leaks prevented
- [ ] CPU-intensive tasks offloaded
- [ ] Response compression enabled

### Frontend Performance
- [ ] Bundle size < 200KB (gzipped)
- [ ] Code splitting implemented
- [ ] Lazy loading for routes
- [ ] Images optimized and lazy loaded
- [ ] Critical CSS inlined
- [ ] Fonts preloaded
- [ ] Service worker for caching
- [ ] Virtual scrolling for long lists

### Network Performance
- [ ] HTTP/2 or HTTP/3 enabled
- [ ] CDN configured
- [ ] GZIP/Brotli compression
- [ ] Keep-alive connections
- [ ] DNS prefetch for external domains
- [ ] Resource hints (preconnect, prefetch)

### Monitoring
- [ ] APM tool integrated
- [ ] Custom metrics tracked
- [ ] Performance budgets set
- [ ] Alerts configured
- [ ] Regular performance audits
- [ ] Load testing performed
