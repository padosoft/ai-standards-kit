# COMPLETE PROJECT PROMPT - AI Standards Kit

```
   _         _                         _                 _       
  / \  _   _(_)_ __    __ _ _ __   ___| | ___   __ _  __| | ___ 
 / _ \| | | | | '_ \  / _` | '_ \ / __| |/ _ \ / _` |/ _` |/ _ \
/ ___ \ |_| | | | | || (_| | | | | (__| | (_) | (_| | (_| |  __/
/_/   \_\__,_|_|_| |_(_)__,_|_| |_|\___|_|\___/ \__,_|\__,_|\___|
                     COMPLETE PROJECT RECREATION PROMPT
```

## PROJECT OVERVIEW

Create a **complete enterprise AI standards toolkit** named `@padosoft/ai-standards` that serves as:
- **Single Source of Truth (SSOT)** for development standards across multiple stacks
- **Multi-AI tool adapter** that generates configurations for Claude Code, GitHub Copilot, Cursor IDE, Google Gemini, OpenCode AI, and Warp
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
  - ASCII art banner with version display
  - Integration with all other modules

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

### Phase 4: Export Configuration
- [ ] **4.1** Create `adapters/config/targets.yml`
  - Target configurations for: copilot, cursor, gemini, opencode, warp, warp-global
  - Each target with correct path, includes, and template references
  - Support for all stacks: global, php-laravel, ts-hono, cf-workers, react-native

- [ ] **4.2** Create Template Files (`adapters/templates/`)
  - copilot_header.md, copilot_footer.md
  - cursor_header.md, cursor_footer.md  
  - gemini_header.md
  - warp_header.md, warp_footer.md, warp_global_header.md
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
  - [ ] `ai --help` shows complete help
  - [ ] `ai bootstrap --user` creates all global files
  - [ ] `ai sync --cursor-here` creates .cursor/rules/ai-standards.mdc
  - [ ] `ai sync --cursor-here --cursor-split` creates multiple MDC files
  - [ ] `ai sync --copilot-here` creates .github/copilot-instructions.md
  - [ ] `ai sync --gemini-here` creates .gemini/GEMINI.md
  - [ ] `ai sync --opencode-here` creates .opencode/AGENTS.md + dynamic agents
  - [ ] `ai harvest` works with mock packages
  - [ ] `ai validate` correctly identifies missing/outdated files
  - [ ] `ai print --target=copilot` outputs generated rules
  - [ ] `ai update` updates global files

- [ ] **7.2** Edge Case Testing
  - [ ] Handle missing home directories gracefully
  - [ ] Handle permission errors appropriately
  - [ ] Handle corrupted cache files
  - [ ] Handle invalid YAML in targets.yml
  - [ ] Handle missing dependencies gracefully

### Phase 8: Final Integration and Polish
- [ ] **8.1** Complete Code Review
  - [ ] All TypeScript strict mode compliance
  - [ ] Proper error handling in all functions
  - [ ] Consistent code style and patterns
  - [ ] All imports and exports correct
  - [ ] No hardcoded paths (use HOME, ROOT constants)

- [ ] **8.2** Documentation Review
  - [ ] README.md matches actual implementation
  - [ ] All commands documented with correct syntax
  - [ ] Examples work as written
  - [ ] File paths in documentation are accurate
  - [ ] All supported AI tools mentioned and linked

- [ ] **8.3** Package Preparation
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

**FINAL NOTE**: This is an enterprise-grade toolkit. Every component must be production-ready, thoroughly tested, and properly documented. The implementation should handle edge cases gracefully and provide clear guidance to developers at every step.

When complete, developers should be able to:
1. Install globally with one command
2. Bootstrap their AI tools with one command  
3. Maintain consistent enterprise standards across all supported AI tools
4. Automatically harvest standards from their dependency packages
5. Validate their configuration and receive actionable recommendations

**Success Metric**: A developer with no prior knowledge should be able to follow the README and have a fully working enterprise AI standards setup in under 5 minutes.