# COMPLETE PROJECT PROMPT - AI Standards Kit

```
▄▀█ █   █▀ ▀█▀ ▄▀█ █▄░█ █▀▄ ▄▀█ █▀█ █▀▄ █▀
█▀█ █   ▄█  █  █▀█ █░▀█ █▄▀ █▀█ █▀▄ █▄▀ ▄█

▀█▀ ▄▀█ █▄░█ █▀▄ ▄▀█ █▀█ █▀▄   █▄▀ █ ▀█▀
░█░ █▀█ █░▀█ █▄▀ █▀█ █▀▄ █▄▀   █░█ █ ░█░
🤖 Enterprise AI Engineering Standards & Agents toolkit
   by Lorenzo Padovani - Surface SRL
                     COMPLETE PROJECT RECREATION PROMPT
```

## PROJECT OVERVIEW

Create a **complete enterprise AI standards toolkit** named `@padosoft/ai-standards` that serves as:
- **Single Source of Truth (SSOT)** for development standards across multiple stacks
- **Multi-AI tool adapter** that generates configurations for Claude Code, GitHub Copilot, Cursor IDE, Google Gemini, OpenCode AI, Warp, Windsurf IDE, and Augment Code
- **Quality gates enforcer** with enterprise-level validation rules
- **Dependency harvester** that imports standards from npm/composer packages

---

## 📋 COMPLETE IMPLEMENTATION CHECKLIST

### Phase 1: Project Foundation
- [ ] **1.1** Create package.json with correct configuration
  - Package name: `@padosoft/ai-standards`
  - Version: `1.0.0`
  - Type: `module` (ES modules)
  - Bin entries: `ai-standards` and `ai` pointing to `dist/sync/cli.js`
  - Dependencies: `fast-glob@^3.3.2`, `js-yaml@^4.1.0`
  - DevDependencies: `@types/js-yaml@^4.0.9`, `@types/node@^20.10.0`, `typescript@^5.3.3`
  - Scripts: `build: tsc -p tsconfig.json`, `postinstall: npm run build`

- [ ] **1.2** Create TypeScript configuration
  - Target: ES2020, Module: NodeNext, ModuleResolution: NodeNext
  - OutDir: `dist`, RootDir: `src`
  - Strict mode enabled, skipLibCheck: true

- [ ] **1.3** Create project structure with all directories
  ```
  ai-standards-kit/
  ├─ src/sync/        # TypeScript source
  ├─ dist/sync/       # Compiled JavaScript
  ├─ ai/              # SSOT for guides and agents
  ├─ adapters/        # Export configurations
  └─ [other files]
  ```

### Phase 2: Core TypeScript Implementation
- [ ] **2.1** Implement `src/sync/utils.ts`
  - Export: `ROOT`, `HOME`, `read`, `write`, `exists`, `mkdirp`
  - Function: `parseArgv()` for command line parsing
  - Function: `detectStacks()` for auto-detecting project stacks

- [ ] **2.2** Implement `src/sync/build.ts`
  - Function: `resolveIncludes()` with fast-glob support
  - Function: `buildOutput()` with header/footer template support  
  - Support for `~` home directory expansion
  - Integration with `targets.yml` and `targets.deps.yml`

- [ ] **2.3** Implement `src/sync/harvest.ts`
  - Function: `findAiBundles()` to scan `node_modules/**/ai` and `vendor/**/ai`
  - Function: `loadManifest()` to read `manifest.json` from packages
  - Function: `copyBundleContent()` with namespace isolation in `_deps/`
  - Support for `--clean`, `--dry-run`, `--packages` options
  - Cache management with `.ai-standards-cache.json`

- [ ] **2.4** Implement `src/sync/validate.ts`
  - Function: `validateGlobalFiles()` checking `~/.ai-standards/dist/`
  - Function: `validateProjectFiles()` checking project-specific files
  - Timestamp comparison for outdated file detection
  - Exit codes: 0 for success, 1 for issues found
  - Actionable recommendations output

- [ ] **2.5** Implement `src/sync/cli.ts` (MAIN FILE)
  - Command: `bootstrap --user` installs global agents and files
  - Command: `sync` with all flags (--cursor-here, --cursor-split, etc.)
  - Command: `harvest` with full options support
  - Command: `update` for updating global standards
  - Command: `print --target=<target>` for displaying generated rules
  - Command: `validate` for configuration checking
  - Command: `check-updates` for npm registry version checking
  - ASCII art banner with version display
  - Integration with all other modules
  - Auto-update notifications during bootstrap and sync commands

### Phase 3: AI Standards (SSOT)
- [ ] **3.1** Create `ai/.claude/settings.json`
  - Complete quality gates for all stacks (database, PHP/Laravel, TypeScript/Hono, Cloudflare Workers, React Native)
  - Security policies (PII blocking, secret detection)
  - Performance rules (query optimization, N+1 prevention)
  - Testing requirements (80% coverage minimum)
  - Tool permissions and delegation settings

- [ ] **3.2** Create Global Agents (`ai/.claude/agents/global/`)
  - **task-router.md**: Enterprise orchestrator with stack detection and routing matrix
  - **docs-writer.md**: Documentation specialist (README, ADR, RFC, API docs)  
  - **test-writer.md**: Test architect with 80%+ coverage strategy
  - **dto-builder.md**: DTO and mapper specialist with versioning
  - **code-reviewer.md**: Security, performance, and maintainability auditor
  - **adapter-builder.md**: AI tool adapter specialist for new integrations
  - **node-command-builder.md**: Node.js/TypeScript CLI builder with enterprise features
  - Each agent with proper YAML frontmatter and comprehensive implementation

- [ ] **3.3** Create Global Standards (`ai/docs/standards/global/`)
  - **style.md**: Code style, naming conventions, SOLID principles
  - **db.md**: Database optimization, indexing, pagination patterns
  - **logging.md**: Structured logging, correlation IDs, security
  - **testing.md**: Testing pyramid, coverage requirements
  - **dto.md**: Data transfer object patterns
  - **comments.md**: Comment standards and TODO policies
  - **cache.md**: Caching strategies and invalidation
  - **ci.md**: CI/CD pipeline standards
  - **shell-snippets.md**: Common shell patterns

- [ ] **3.4** Create Stack-Specific Standards
  - **php-laravel/** folder with: routes.md, controllers.md, errors.md, validation.md, queries.md, eloquent.md, commands.md, migrations.md, api-doc.md
  - **ts-hono/** folder with: routing.md, handlers.md, errors.md, testing.md, api-doc.md, perf.md
  - **cf-workers/** folder with: security.md, caching.md, limits.md, observability.md
  - **react-native/** folder with: architecture.md, performance.md, accessibility.md, testing.md
  - Each file with comprehensive enterprise patterns, good/bad examples, anti-patterns

### Phase 3.5: Stack-Specific Consolidated Guidelines (NEW APPROACH)
- [ ] **3.5.1** Create Comprehensive Bash Guidelines
  - **bash-coding-guidelines.md**: Complete Bash scripting standards including:
    - Error handling patterns (`set -euo pipefail`)
    - Security best practices (input validation, safe file operations)
    - Performance optimization (built-ins vs external commands)
    - Script organization and modularity
    - Shell-specific patterns and anti-patterns
  - **bash-security-standards.md**: Shell-specific security practices
  - **bash-performance-rules.md**: Shell performance optimization patterns

- [ ] **3.5.2** Create Comprehensive PHP/Laravel Guidelines  
  - **php-laravel-coding-guidelines.md**: Complete Laravel enterprise patterns including:
    - DTO (Data Transfer Object) patterns with readonly classes
    - Repository pattern implementation with interfaces
    - Factory pattern for complex object creation
    - Action pattern for business logic encapsulation
    - Service pattern with dependency injection
    - Laravel-specific best practices (FormRequest, Policies, Eloquent)
    - Security patterns and validation
    - Performance optimization patterns
    - Complete examples for each pattern with good/bad comparisons

- [ ] **3.5.3** Create Comprehensive TypeScript/Hono Guidelines
  - **ts-hono-coding-guidelines.md**: Complete TypeScript/Hono patterns including:
    - Core programming principles (return early pattern, pure functions)
    - SOLID principles implementation with TypeScript
    - Hono application structure and middleware chains
    - Type-safe routing with Zod validation
    - Error handling and logging patterns
    - Performance optimization techniques
    - Security best practices
    - Testing patterns with comprehensive examples

- [ ] **3.5.4** Create Comprehensive React Native Guidelines
  - **react-native-coding-guidelines.md**: Complete React Native patterns including:
    - Component architecture and organization
    - State management patterns (Context, Zustand, Redux)
    - Navigation best practices
    - Performance optimization (memoization, FlatList, animations)
    - Accessibility implementation
    - Platform-specific code organization
    - Testing strategies
    - Security considerations for mobile apps

- [ ] **3.5.5** Integration and Reference Architecture
  - Remove/consolidate duplicate ts-hono/style.md content into main coding guidelines
  - Update task-router.md to reference comprehensive guidelines instead of micro-guides
  - Ensure all agents reference the consolidated approach
  - Update global standards to work with stack-specific comprehensive guidelines

### Phase 4: Export Configuration
- [ ] **4.1** Create `adapters/config/targets.yml`
  - Target configurations for: copilot, cursor, gemini, opencode, warp, warp-global, windsurf, augment
  - Each target with correct path, includes, and template references
  - Support for all stacks: global, php-laravel, ts-hono, cf-workers, react-native
  - Windsurf-specific configurations with split support (windsurf-global, windsurf-laravel, windsurf-typescript)
  - Augment Code configurations with split support (augment-global, augment-laravel, augment-typescript)

- [ ] **4.2** Create Template Files (`adapters/templates/`)
  - copilot_header.md, copilot_footer.md
  - cursor_header.md, cursor_footer.md  
  - gemini_header.md
  - warp_header.md, warp_footer.md, warp_global_header.md
  - windsurf_header.md, windsurf_footer.md (with Cascade-specific instructions)
  - augment_header.md, augment_footer.md (with guidelines-specific instructions)
  - Each template with appropriate instructions for the target AI tool

### Phase 5: Advanced Features Implementation
- [ ] **5.1** Implement Cursor Split Support (`--cursor-split`)
  - Generate multiple MDC files by category in `.cursor/rules/`
  - Files: `ai-standards-global.mdc`, `ai-standards-php-laravel.mdc`, etc.
  - Each with proper frontmatter (description, alwaysApply, globs)

- [ ] **5.2** Implement OpenCode Dynamic Agent Generation
  - Read Claude agents from `~/.claude/agents/`
  - Synthesize OpenCode equivalents in `.opencode/agent/`
  - Generate: docs-writer.md, test-writer.md, dto-builder.md, code-reviewer.md
  - Each with OpenCode-specific frontmatter (mode: subagent, temperature: 0.1)

- [ ] **5.3** Implement Global Tool Integration
  - Copilot global: `~/.config/github-copilot/intellij/global-copilot-instructions.md`
  - Gemini global: `~/.gemini/GEMINI.md` 
  - OpenCode global: `~/.config/opencode/AGENTS.md`
  - All automatically installed via `bootstrap --user`

- [ ] **5.4** Implement Harvest Dependency Management
  - Support for `ai/manifest.json` in packages with namespace and priority
  - Import to `docs/standards/_deps/<namespace>/` and `.claude/agents/_deps/<namespace>/`
  - Merge with `targets.deps.yml` for export inclusion
  - Cache management with staleness detection

- [ ] **5.5** Implement Auto-Update System
  - Version checking against npm registry with semantic versioning
  - `checkForUpdates()` function with graceful fallback
  - Auto-notification during `bootstrap --user` and `sync` commands
  - Manual `ai check-updates` command for on-demand checking
  - Silent failure mode to prevent blocking if registry unavailable

- [ ] **5.6** Implement Project-Specific Templates
  - Stack detection system for Laravel, TypeScript/Hono, Cloudflare Workers, React Native
  - Conditional template generation in `targets.yml` with `condition` field
  - `--project-context` flag for `sync` command
  - Template variables support (`{{timestamp}}`, `{{stacks_detected}}`)
  - Project context files in `.ai-standards/PROJECT_*.md`
  - Auto-detection conditions: `composer.json`, `package.json && tsconfig.json`, `wrangler.toml`, `ios || android`

### Phase 6: Documentation and Polish
- [ ] **6.1** Create Complete README.md
  - ASCII art banner with package info
  - Complete folder structure with comments
  - Installation and setup instructions (global and project)
  - All CLI commands with options and examples
  - Usage examples for each supported AI tool
  - Architecture explanation and design decisions
  - Quality gates documentation
  - Contribution guidelines and support information
  - Links to all official AI tool documentations

- [ ] **6.2** Create Supporting Files
  - LICENSE file (MIT)
  - .gitignore with appropriate exclusions
  - Basic package configuration files

### Phase 7: Quality Assurance and Testing
- [ ] **7.1** Manual Testing Checklist
  - [ ] `npm run build` compiles without errors
  - [ ] `ai --help` shows complete help with all commands including `check-updates`
  - [ ] `ai bootstrap --user` creates all global files + shows update notifications
  - [ ] `ai check-updates` works correctly (shows/hides update notifications)
  - [ ] `ai sync` includes auto-update check at end
  - [ ] `ai sync --cursor-here` creates .cursor/rules/ai-standards.mdc
  - [ ] `ai sync --project-context` creates project-specific templates with stack detection
  - [ ] `ai sync --cursor-here --cursor-split` creates multiple MDC files
  - [ ] `ai sync --copilot-here` creates .github/copilot-instructions.md
  - [ ] `ai sync --windsurf-here` creates .windsurf/rules/ai-standards.md
  - [ ] `ai sync --windsurf-here --windsurf-split` creates stack-specific Windsurf files
  - [ ] `ai sync --augment-here` creates .augment-guidelines
  - [ ] `ai sync --augment-here --augment-split` creates stack-specific Augment files
  - [ ] `ai sync --gemini-here` creates .gemini/GEMINI.md
  - [ ] `ai sync --opencode-here` creates .opencode/AGENTS.md + dynamic agents
  - [ ] `ai harvest` works with mock packages
  - [ ] `ai validate` correctly identifies missing/outdated files
  - [ ] `ai print --target=copilot` outputs generated rules
  - [ ] `ai update` updates global files
  - [ ] CLI banner shows new ASCII art with color (rosa/magenta)
  - [ ] Example command works: `node dist/example-command.js help`
  - [ ] Example command test mode: `node dist/example-command.js process --test --verbose`
  - [ ] Example command shows proper logging with icons and timestamps

- [ ] **7.1.5** Hybrid Approach Testing
  - [ ] **Reference Integration**: Comprehensive guidelines contain `@stack/file.md` references
  - [ ] **Task-Router Granularity**: Verify task-router selects appropriate granularity
    - [ ] Complex tasks load comprehensive guidelines + global standards
    - [ ] Simple tasks load specific micro-guides only
    - [ ] Hybrid tasks load comprehensive + specific micro-guides
  - [ ] **Export Integration**: Generated files include both comprehensive + micro-guides when relevant
  - [ ] **Backward Compatibility**: All existing micro-guides still work independently
  - [ ] **Evolution Tracking**: System tracks which micro-guides are used together (for future consolidation)

- [ ] **7.2** Edge Case Testing
  - [ ] Handle missing home directories gracefully
  - [ ] Handle permission errors appropriately
  - [ ] Handle corrupted cache files
  - [ ] Handle invalid YAML in targets.yml
  - [ ] Handle missing dependencies gracefully

### Phase 8: Node Command Builder Features
- [ ] **8.1** Implement Node Command Builder Agent
  - [ ] Create `ai/.claude/agents/global/node-command-builder.md`
  - [ ] ASCII art banner with purple color (\x1b[95m)
  - [ ] Professional Logger class with verbose mode
  - [ ] Help system with global/local/npx examples
  - [ ] Test mode (--test) for safe execution
  - [ ] Verbose mode (--verbose) with HTTP logging
  - [ ] DateTime tracking (start/end/duration)
  - [ ] Configuration management (JSON + env)
  - [ ] Module detection for both global and local execution
  - [ ] Short alias support in package.json bin entries

- [ ] **8.2** Test Example Command
  - [ ] Create `src/example-command.ts` demonstrating all features
  - [ ] Banner displays correctly with color
  - [ ] Help command shows installation methods
  - [ ] Test mode prevents destructive operations
  - [ ] Verbose mode shows HTTP requests/responses with timing
  - [ ] Configuration loads from environment variables
  - [ ] Both global and local execution work correctly

- [ ] **8.3** Documentation Updates
  - [ ] Update README.md with node-command-builder section
  - [ ] Add agent to list of global agents
  - [ ] Include example usage and output
  - [ ] Document all automatic features

### Phase 9: Final Integration and Polish
- [ ] **9.1** Complete Code Review
  - [ ] All TypeScript strict mode compliance
  - [ ] Proper error handling in all functions
  - [ ] Consistent code style and patterns
  - [ ] All imports and exports correct
  - [ ] No hardcoded paths (use HOME, ROOT constants)

- [ ] **9.2** Documentation Review
  - [ ] README.md matches actual implementation
  - [ ] All commands documented with correct syntax
  - [ ] Examples work as written
  - [ ] File paths in documentation are accurate
  - [ ] All supported AI tools mentioned and linked

- [ ] **9.3** Package Preparation
  - [ ] package.json version set to 1.0.0
  - [ ] All dependencies with correct versions
  - [ ] Files field excludes src/ and includes dist/
  - [ ] Keywords array for npm discoverability
  - [ ] Repository and author information correct

---

## 🎯 CRITICAL SUCCESS CRITERIA

### Core Requirements (Must Have)
1. **Single Command Installation**: `npm i -g @padosoft/ai-standards && ai bootstrap --user` must work flawlessly
2. **Multi-Tool Support**: Must generate correct configurations for Claude, Copilot, Cursor, Gemini, OpenCode, Warp
3. **Stack Detection**: Must auto-detect Laravel, TypeScript/Hono, Cloudflare Workers, React Native projects
4. **Quality Gates**: Must enforce enterprise-level validation rules with blocking capabilities
5. **Harvest System**: Must import standards from npm/composer packages automatically
6. **Validation**: Must detect outdated configurations and provide actionable recommendations

### Advanced Features (Should Have)
1. **Cursor Split**: `--cursor-split` generates category-specific MDC files
2. **Dynamic Generation**: OpenCode agents synthesized from Claude SSOT
3. **Cache Management**: Efficient handling of dependency imports with staleness detection
4. **Global Integration**: Tool-specific global file installation and management

### Enterprise Standards (Must Have)
1. **Comprehensive Coverage**: Standards for all major patterns in each stack
2. **Best Practice Examples**: Good/bad code examples for every pattern
3. **Security First**: PII detection, secret blocking, input validation enforcement
4. **Performance Optimization**: Database query optimization, N+1 prevention, caching strategies

---

## 🚀 IMPLEMENTATION NOTES

### Architecture Decisions
- **TypeScript**: Full strict mode for type safety
- **ES Modules**: Modern module system with proper imports/exports  
- **Single Binary**: One CLI handles all operations with subcommands
- **Home Directory**: Global configs in `~/.claude/`, `~/.ai-standards/`, etc.
- **Namespace Isolation**: Harvested dependencies in `_deps/<namespace>/`
- **Consolidated Approach**: Comprehensive stack-specific guidelines instead of fragmented micro-guides

### Architectural Evolution: Consolidated vs Micro-Guide Approach
**CRITICAL CHANGE**: The system has evolved from a micro-guide fragmented approach to a **consolidated comprehensive approach**:

#### Original Micro-Guide Approach (Deprecated)
- ❌ 1000+ micro-files per stack (routes.md, controllers.md, validation.md, etc.)
- ❌ Fragmented context across multiple small files
- ❌ Maintenance complexity with inter-file dependencies
- ❌ Difficult navigation for developers

#### New Consolidated Approach (Current)
- ✅ **One comprehensive coding-guidelines.md per stack** (bash, php-laravel, ts-hono, react-native)
- ✅ **Complete patterns in context** (DTO + Repository + Factory + Action patterns in one place)
- ✅ **Coherent documentation** with internal references and examples
- ✅ **Maintainable architecture** with clear separation between global and stack-specific
- ✅ **Claude-friendly** file sizes that provide complete context without being overwhelming

#### Hybrid Strategy Implementation Requirements
1. **Dynamic Granularity Selection**: Task-router must choose between comprehensive, specific, or hybrid approach
2. **Reference Architecture**: Comprehensive guidelines reference micro-guides with `@stack/file.md` syntax  
3. **Backward Compatibility**: All existing micro-guides maintained and enhanced for specialized use cases
4. **Content Integration**: Existing content integrated into comprehensive with proper references
5. **Evolution Strategy**: Monitor usage patterns to guide future consolidation/extraction decisions

#### Task-Router Granularity Logic
The system must implement intelligent granularity selection:

```typescript
// High complexity or multiple areas → COMPREHENSIVE
- "Implement complete order management system with DTO, Repository, Actions"
- "Create user authentication with all security patterns"
→ Load: engineering-principles.md + coding-guidelines.md + {stack}-coding-guidelines.md

// Low complexity, single area → SPECIFIC  
- "Fix this route validation issue"
- "Add migration for user table"
→ Load: global essentials + specific micro-guide only

// Medium complexity, context needed → HYBRID
- "Implement payment processing with Laravel patterns"  
- "Add complex validation with custom rules"
→ Load: comprehensive for context + specific micro-guides for implementation
```

#### Reference Integration Patterns
All comprehensive guidelines must include reference sections:

```markdown
## Laravel-Specific Areas (References to Specialized Guides)

### Routes and Routing
> **📋 Complete Reference**: `@php-laravel/routes.md`
>
> **Quick Patterns:**
> - Essential patterns and examples
> - Most common use cases
> [Quick implementation examples]

### [Other sections with same pattern...]
```

### Key Patterns
- **SSOT (Single Source of Truth)**: All standards maintained in `ai/` folder
- **Template System**: Configurable headers/footers for different tools
- **Quality Gates**: Automatic enforcement via `.claude/settings.json`
- **Stack Detection**: Automatic via project file presence (composer.json, package.json, etc.)

### Error Handling Strategy
- **Graceful Degradation**: Missing files/permissions don't crash the CLI
- **Informative Messages**: Clear error messages with suggested fixes
- **Exit Codes**: 0 for success, 1 for errors, proper CI/CD integration
- **Validation**: Comprehensive checking with actionable recommendations

### Performance Considerations
- **Fast Glob**: Efficient file pattern matching
- **Selective Loading**: Only load necessary templates and guides
- **Caching**: Harvest results cached with timestamp validation
- **Parallel Processing**: Where possible without complexity overhead

---

## ✅ DELIVERY CHECKLIST

Before considering the project complete, verify:

### Functional Testing
- [ ] Package builds without errors (`npm run build`)
- [ ] All CLI commands execute successfully
- [ ] Generated files have correct content and format
- [ ] Harvest system imports dependencies correctly
- [ ] Validation system catches all defined issue types

### Integration Testing  
- [ ] Works with real Laravel projects (detects via composer.json)
- [ ] Works with real TypeScript projects (detects via package.json + tsconfig.json)
- [ ] Generated Cursor rules load correctly in Cursor IDE
- [ ] Generated Copilot instructions work in GitHub Copilot
- [ ] Claude agents load correctly in Claude Code

### Documentation Testing
- [ ] README.md examples work when followed exactly
- [ ] Installation instructions result in working setup
- [ ] All command syntax documented correctly
- [ ] Links to official documentation are valid and current

### Enterprise Readiness
- [ ] Quality gates prevent common anti-patterns
- [ ] Security rules block hardcoded secrets and PII
- [ ] Performance rules enforce database best practices
- [ ] Test coverage requirements are properly validated

---

**FINAL NOTE**: This is an enterprise-grade toolkit with a **hybrid architecture** that evolved from lessons learned in production usage. Every component must be production-ready, thoroughly tested, and properly documented. The implementation should handle edge cases gracefully and provide clear guidance to developers at every step.

## 🎯 **Hybrid Architecture Success Criteria**

The system must successfully implement the **3-tier granularity approach**:

### **📚 Tier 1: Comprehensive Guidelines** 
- ✅ Complete stack patterns in coherent context (DTO + Repository + Factory + Action)
- ✅ Essential for feature implementation and onboarding
- ✅ Reference integration with micro-guides using `@stack/file.md` syntax
- ✅ Maintained as single source of truth for core stack patterns

### **🎯 Tier 2: Specialized Micro-Guides**
- ✅ Deep implementation details and edge cases
- ✅ Expert-maintained for specific domains
- ✅ Referenced from comprehensive but standalone usable
- ✅ Ideal for targeted fixes and advanced troubleshooting

### **🤖 Tier 3: Dynamic Selection Intelligence**
- ✅ Task-router chooses optimal granularity automatically
- ✅ Context-aware loading (comprehensive vs specific vs hybrid)
- ✅ Performance optimized for both Claude and export tools
- ✅ Evolution tracking for future consolidation decisions

## **Developer Experience Goals**

When complete, developers should be able to:

### **For Feature Development:**
1. **Install globally** with one command
2. **Bootstrap AI tools** with one command  
3. **Get comprehensive guidance** for full feature implementation
4. **Access specialized details** when needed for edge cases
5. **Maintain consistency** across all supported AI tools

### **For Standard Maintenance:**
1. **Contribute to comprehensive** guidelines for core patterns
2. **Maintain micro-guides** for specialized expertise  
3. **Track evolution** patterns for consolidation opportunities
4. **Validate integration** between comprehensive and micro-guides
5. **Monitor usage** patterns for architectural decisions

### **For AI Tool Integration:**
1. **Automatic granularity** selection by task-router
2. **Optimized context** loading based on task complexity
3. **Reference navigation** between comprehensive and specific guides
4. **Export optimization** for different AI tool capabilities
5. **Harvest integration** from dependency packages

**Success Metric**: A developer with no prior knowledge should be able to follow the README and have a fully working enterprise AI standards setup with optimal granularity selection in under 5 minutes. An expert developer should be able to contribute to either comprehensive guidelines or micro-guides without understanding the entire system architecture.