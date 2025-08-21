# Stack Detection Standards

## Purpose
Provide robust and accurate project stack detection for intelligent task routing and tool selection.

## Detection Priority Order
Detection follows a hierarchical approach, checking from most specific to most general indicators:

1. **Configuration Files** (highest priority)
2. **Lock Files** (package managers)
3. **Directory Structure** (framework conventions)
4. **File Extensions** (language indicators)
5. **File Content Patterns** (fallback detection)

## Stack Detection Matrix

### PHP/Laravel
**Primary Indicators:**
- `composer.json` AND `artisan` file in root

**Secondary Indicators:**
- `.env` or `.env.example` with Laravel-specific vars (APP_KEY, DB_CONNECTION)
- `bootstrap/app.php` exists
- `config/app.php` with Laravel providers

**Version Detection:**
```bash
php artisan --version  # Laravel version
composer show laravel/framework  # Exact package version
```

### TypeScript/Node.js Variants

#### Hono Framework
**Primary Indicators:**
- `package.json` with `"hono"` dependency
- `wrangler.toml` (if Cloudflare Workers)
- `src/index.ts` with Hono imports

#### Express.js
**Primary Indicators:**
- `package.json` with `"express"` dependency
- `app.js` or `server.js` with Express setup
- `routes/` directory with Express routers

#### Next.js
**Primary Indicators:**
- `next.config.js` or `next.config.mjs`
- `pages/` or `app/` directory
- `package.json` with `"next"` dependency

#### NestJS
**Primary Indicators:**
- `nest-cli.json` in root
- `@nestjs/core` in dependencies
- `src/main.ts` with NestFactory

### Cloudflare Workers
**Primary Indicators:**
- `wrangler.toml` in root OR any subfolder
- `worker-configuration.d.ts` file
- `src/index.ts` with `export default` handler

**Environment Detection:**
```bash
# Check if using Node.js or Bun
test -f "bun.lockb" && echo "bun" || echo "node"
```

### React Native
**Primary Indicators:**
- `app.json` with `"expo"` or `"react-native"`
- `ios/` AND `android/` directories
- `metro.config.js` file

**Platform Detection:**
- Expo: `expo.json` or `app.json` with `"expo"` key
- Bare: `react-native.config.js` without Expo

### Python
**Primary Indicators:**
- `requirements.txt` or `Pipfile`
- `setup.py` or `pyproject.toml`
- `venv/` or `.venv/` directory

**Framework Detection:**
- Django: `manage.py` with Django imports
- Flask: `app.py` with Flask imports
- FastAPI: `main.py` with FastAPI imports

### Ruby/Rails
**Primary Indicators:**
- `Gemfile` AND `Rakefile`
- `config/application.rb` with Rails
- `app/controllers/` directory

### Go
**Primary Indicators:**
- `go.mod` file
- `go.sum` file
- `main.go` in root

**Framework Detection:**
- Gin: imports `github.com/gin-gonic/gin`
- Echo: imports `github.com/labstack/echo`
- Fiber: imports `github.com/gofiber/fiber`

### Rust
**Primary Indicators:**
- `Cargo.toml` file
- `src/main.rs` or `src/lib.rs`
- `target/` directory (build output)

### Java/Spring
**Primary Indicators:**
- `pom.xml` (Maven) or `build.gradle` (Gradle)
- `src/main/java/` directory structure
- `application.properties` or `application.yml`

### .NET/C#
**Primary Indicators:**
- `*.csproj` or `*.sln` files
- `Program.cs` file
- `appsettings.json` for configuration

## Multi-Stack Detection

### Monorepo Indicators
- `lerna.json` (Lerna)
- `pnpm-workspace.yaml` (pnpm)
- `nx.json` (Nx)
- Multiple `package.json` in subdirectories
- `packages/` or `apps/` directories

### Microservices Pattern
- Multiple service directories with different stacks
- `docker-compose.yml` with multiple services
- API Gateway configuration files
- Service mesh configs (Istio, Linkerd)

## Detection Implementation

### Recommended Detection Flow
```typescript
interface StackDetectionResult {
  primary: string;           // Main stack (e.g., "laravel", "hono", "rails")
  language: string;          // Programming language
  framework?: string;        // Specific framework
  version?: string;          // Framework/language version
  packageManager?: string;   // npm, yarn, pnpm, composer, pip, etc.
  runtime?: string;          // node, bun, deno, php, python
  additional?: string[];     // Additional tools/frameworks detected
}
```

### Detection Script Pattern
```bash
# Example detection script
detect_stack() {
  # Check for Laravel
  if [[ -f "composer.json" && -f "artisan" ]]; then
    echo "laravel"
    return
  fi
  
  # Check for Node.js variants
  if [[ -f "package.json" ]]; then
    if grep -q '"hono"' package.json; then
      echo "typescript-hono"
    elif grep -q '"express"' package.json; then
      echo "typescript-express"
    elif grep -q '"next"' package.json; then
      echo "typescript-nextjs"
    fi
    return
  fi
  
  # Check for Cloudflare Workers
  if find . -name "wrangler.toml" -maxdepth 3 | grep -q .; then
    echo "cloudflare-workers"
    return
  fi
  
  # Continue with other stacks...
}
```

## Edge Cases and Gotchas

### Common Misdetections
1. **Template Projects**: May have multiple framework files but only one active
2. **Migration Projects**: Old and new stack files coexist
3. **Build Outputs**: Don't confuse build artifacts with source indicators
4. **Documentation Examples**: Example code shouldn't trigger detection

### Resolution Strategies
1. **Priority Rules**: Configuration files > Lock files > Source code
2. **Recency Check**: Use git history or file timestamps for active stack
3. **Ask User**: When ambiguous, prompt for clarification
4. **Default Fallback**: Use most common/safe assumption

## Performance Optimization

### Caching Strategy
- Cache detection results for session duration
- Invalidate on configuration file changes
- Store in `.claude/cache/stack-detection.json`

### Fast Path Checks
1. Check most common stacks first
2. Use file existence before file content parsing
3. Leverage OS file system commands efficiently
4. Stop at first definitive match

## Integration Points

### Tool Selection
Based on detected stack, automatically configure:
- Linters (ESLint, RuboCop, Flake8, etc.)
- Formatters (Prettier, Black, gofmt, etc.)
- Test runners (Jest, PHPUnit, pytest, etc.)
- Build tools (Webpack, Vite, Gradle, etc.)

### Quality Gates
Apply stack-specific quality gates:
- PHP: PSR standards, type hints
- TypeScript: Strict mode, no-any
- Python: PEP 8, type annotations
- Go: gofmt, go vet

## Validation Checklist

- [ ] Detection completes in <100ms
- [ ] Handles missing files gracefully
- [ ] Returns consistent results across runs
- [ ] Detects version when possible
- [ ] Identifies package manager correctly
- [ ] Handles monorepos appropriately
- [ ] Provides confidence score for ambiguous cases
- [ ] Caches results appropriately
- [ ] Updates on file system changes

## Example Output Format
```json
{
  "detected": {
    "primary": "laravel",
    "language": "php",
    "framework": "laravel",
    "version": "10.x",
    "packageManager": "composer",
    "runtime": "php",
    "additional": ["mysql", "redis", "docker"]
  },
  "confidence": 0.95,
  "detection_time_ms": 45,
  "cache_hit": false
}