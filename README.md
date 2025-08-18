# AI-Standards Enterprise Kit

```
▄▀█ █   █▀ ▀█▀ ▄▀█ █▄░█ █▀▄ ▄▀█ █▀█ █▀▄ █▀
█▀█ █   ▄█  █  █▀█ █░▀█ █▄▀ █▀█ █▀▄ █▄▀ ▄█

▀█▀ ▄▀█ █▄░█ █▀▄ ▄▀█ █▀█ █▀▄   █▄▀ █ ▀█▀
░█░ █▀█ █░▀█ █▄▀ █▀█ █▀▄ █▄▀   █░█ █ ░█░
🤖 Enterprise AI Engineering Standards & Agents toolkit
   by Lorenzo Padovani - Surface SRL
```

**Enterprise AI Engineering Standards & Agents toolkit for multi-stack development**

Toolkit **enterprise** per qualità, performance e sicurezza su più stack:
- **Global** (valido per tutti)
- **PHP/Laravel** 
- **TypeScript/Hono**
- **Cloudflare Workers**
- **React Native**

Include **micro‑guide** (docs/standards/**) e **sub‑agenti** Claude Code (.claude/agents/**) orchestrati da un **task‑router**.  
Obiettivo: **DRY a strati** + **contesto minimo e mirato** + **quality gates** bloccanti.

---

## 📁 Struttura Cartelle

```
ai-standards-kit/                           # Root del pacchetto npm
├─ package.json                             # Package configuration con bin e dependencies
├─ tsconfig.json                            # TypeScript configuration
├─ LICENSE                                  # MIT License
├─ README.md                                # Questa documentazione completa
├─ COMPLETE_PROJECT_PROMPT.md               # Prompt per ricreare il progetto da zero
├─ Requisiti-creazione-progetto.md          # Analisi e requisiti originali
├─ .idea/                                   # IntelliJ IDEA configuration
├─ src/                                     # Codice TypeScript sorgente
│  ├─ sync/                                 # Logica di sincronizzazione e CLI
│  │  ├─ cli.ts                             # Main CLI con tutti i comandi
│  │  ├─ build.ts                           # Export builder per tutti i target
│  │  ├─ harvest.ts                         # Scansione pacchetti npm/composer
│  │  ├─ validate.ts                        # Validazione configurazioni
│  │  └─ utils.ts                           # Utility comuni (parsing, paths)
│  └─ example-command.ts                    # Esempio di CLI creato con node-command-builder
├─ dist/                                    # JavaScript compilato (output tsc)
│  ├─ sync/                                 # CLI compilati
│  │  ├─ cli.js                             # Entry point principale
│  │  ├─ build.js                           # Builder compilato
│  │  ├─ harvest.js                         # Harvest compilato
│  │  └─ validate.js                        # Validator compilato
│  └─ example-command.js                    # Esempio CLI compilato
├─ ai/                                      # SSOT: Single Source of Truth per guide e agenti
│  ├─ .claude/                              # Configurazione Claude (SSOT)
│  │  ├─ settings.json                      # Quality gates e policy enterprise
│  │  └─ agents/                            # Sub-agenti Claude specializzati
│  │     └─ global/                         # Agenti globali riusabili
│  │        ├─ task-router.md               # Router multi-stack intelligente
│  │        ├─ docs-writer.md               # Agente: documentazione (README, ADR, RFC)
│  │        ├─ test-writer.md               # Agente: test strategy (unit/integration/E2E)
│  │        ├─ dto-builder.md               # Agente: DTO e mapper enterprise
│  │        ├─ code-reviewer.md             # Agente: security, performance, maintainability
│  │        ├─ adapter-builder.md           # Agente: crea adapter per nuovi AI tools
│  │        └─ node-command-builder.md      # Agente: CLI Node.js professionali con logging
│  └─ docs/                                 # Guide tecniche dettagliate
│     └─ standards/                         # Standard per categoria/stack
│        ├─ global/                         # Regole globali valide ovunque
│        │  ├─ style.md                     # Code style, naming, patterns
│        │  ├─ logging.md                   # Structured logging, correlation IDs
│        │  ├─ comments.md                  # Meaningful comments, TODO policies
│        │  ├─ dto.md                       # Data Transfer Objects standards
│        │  ├─ testing.md                   # Testing pyramid, coverage, patterns
│        │  ├─ db.md                        # Database optimization, indexing
│        │  ├─ cache.md                     # Caching strategies, invalidation
│        │  ├─ ci.md                        # CI/CD pipelines, quality gates
│        │  └─ shell-snippets.md            # Common shell patterns
│        ├─ php-laravel/                    # Standard specifici Laravel
│        │  ├─ routes.md                    # Routing, middleware, versioning
│        │  ├─ controllers.md               # Slim controllers, FormRequest, Policies
│        │  ├─ errors.md                    # Exception handling, logging
│        │  ├─ validation.md                # FormRequest patterns, custom rules
│        │  ├─ queries.md                   # Eloquent optimization, raw queries
│        │  ├─ eloquent.md                  # Models, relationships, scopes
│        │  ├─ commands.md                  # Artisan commands, queue jobs
│        │  ├─ migrations.md                # Database migrations, expand/contract
│        │  └─ api-doc.md                   # OpenAPI documentation
│        ├─ ts-hono/                        # Standard TypeScript + Hono
│        │  ├─ routing.md                   # Hono routing patterns
│        │  ├─ handlers.md                  # Async handlers, error boundaries
│        │  ├─ errors.md                    # Error handling, status codes
│        │  ├─ testing.md                   # Vitest, MSW, test patterns
│        │  ├─ api-doc.md                   # OpenAPI for TypeScript
│        │  └─ perf.md                      # Performance optimization
│        ├─ cf-workers/                     # Standard Cloudflare Workers
│        │  ├─ security.md                  # Headers, SSRF, secrets management
│        │  ├─ caching.md                   # Cache API, KV, R2, strategies
│        │  ├─ limits.md                    # CPU time, memory, subrequests
│        │  └─ observability.md             # Logging, tracing, analytics
│        └─ react-native/                   # Standard React Native
│           ├─ architecture.md              # Navigation, state, modular structure
│           ├─ performance.md               # Memoization, FlatList, animations
│           ├─ accessibility.md             # A11y checklist, screen readers
│           └─ testing.md                   # Jest, RTL, E2E testing
├─ adapters/                                # Generatori per altri AI tools
│  ├─ config/
│  │  └─ targets.yml                        # Mapping export per tool (Copilot, Cursor, etc)
│  └─ templates/                            # Header/footer per export personalizzati
│     ├─ copilot_header.md                  # Header per GitHub Copilot
│     ├─ copilot_footer.md                  # Footer per GitHub Copilot
│     ├─ cursor_header.md                   # Header per Cursor IDE
│     ├─ cursor_footer.md                   # Footer per Cursor IDE
│     ├─ gemini_header.md                   # Header per Google Gemini
│     ├─ warp_header.md                     # Header per Warp terminal
│     ├─ warp_footer.md                     # Footer per Warp terminal
│     └─ warp_global_header.md              # Header globale per Warp
└─ .ai-standards-cache.json                 # Cache per dependency harvest (auto-generated)
```

**Filosofia architetturale:**
- Gli agenti Claude **non duplicano** regole: leggono `global/` + guida dello **stack** + micro‑guida del **task**
- Il **task-router** decide a chi delegare o carica **solo** i Markdown necessari (**contesto corto**)
- **Quality Gates** in `.claude/settings.json` bloccano PR non conformi (es. PII nei log, OFFSET profondi, controller senza FormRequest)

---

## 🚀 Installazione e Setup

### Setup Globale (una tantum)
```bash
# Installa il pacchetto globalmente
npm i -g @padosoft/ai-standards

# Bootstrap: installa agenti Claude e file globali
ai bootstrap --user

# Verifica installazione
ai validate
```

Questo comando:
- Copia gli agenti Claude in `~/.claude/agents/`
- Installa file globali per Copilot (`~/.config/github-copilot/intellij/`)
- Installa file globali per Gemini (`~/.gemini/GEMINI.md`)
- Installa file globali per OpenCode (`~/.config/opencode/AGENTS.md`)
- Genera file di export in `~/.ai-standards/dist/`

### Setup Progetto
```bash
# Importa guide da pacchetti npm/composer (se presenti)
ai harvest

# Sincronizza tutti gli AI tools
ai sync --cursor-here --warp-here --gemini-here --copilot-here --opencode-here

# Opzionale: split Cursor rules per categoria
ai sync --cursor-here --cursor-split

# Verifica configurazione progetto
ai validate
```

---

## 📋 Comandi CLI

### Core Commands
```bash
ai bootstrap --user          # Installa agenti e settings globali
ai sync [options]           # Genera e esporta configurazioni AI tools
ai harvest [options]        # Importa AI bundles dalle dependencies
ai update                   # Aggiorna standards globali da source
ai print --target=<target>  # Stampa rules generate per target specifico
ai validate                 # Verifica se configurazioni sono aggiornate
ai check-updates            # Controlla aggiornamenti pacchetto npm
ai --help                   # Mostra help completo
```

### Sync Options
```bash
--with-harvest            # Esegui harvest prima del sync
--cursor-here             # Scrivi Cursor rules nel progetto (.cursor/rules/ai-standards.mdc)
--cursor-split            # Split Cursor rules per categoria (global, php-laravel, etc.)
--copilot-here            # Scrivi Copilot instructions (.github/copilot-instructions.md)
--gemini-here             # Scrivi Gemini config (.gemini/GEMINI.md)
--opencode-here           # Scrivi OpenCode agents (.opencode/AGENTS.md + dynamic agents)
--warp-here               # Scrivi Warp config (WARP.md)
--windsurf-here           # Scrivi Windsurf rules (.windsurf/rules/ai-standards.md)
--windsurf-split          # Split Windsurf rules per stack (multiple files)
--augment-here            # Scrivi Augment Code guidelines (.augment-guidelines)
--augment-split           # Split Augment rules per stack (.augment/rules/)
--project-context         # Scrivi template personalizzati (auto-detect stack)
```

### Harvest Options
```bash
--clean                   # Pulisci dependencies esistenti prima import
--dry-run                 # Anteprima senza modifiche
--packages pkg1,pkg2      # Importa solo pacchetti specifici
```

### Print Targets
```bash
ai print --target=copilot     # Stampa rules per GitHub Copilot
ai print --target=cursor      # Stampa rules per Cursor IDE
ai print --target=gemini      # Stampa rules per Google Gemini
ai print --target=opencode    # Stampa rules per OpenCode AI
ai print --target=warp        # Stampa rules per Warp terminal
ai print --target=warp-global # Stampa rules globali per Warp
ai print --target=augment     # Stampa rules per Augment Code
```

---

## 🎯 Esempi d'Uso

### Setup Iniziale Completo
```bash
# 1. Installa globalmente
npm i -g @padosoft/ai-standards

# 2. Bootstrap globale
ai bootstrap --user

# 3. Nel progetto Laravel
cd my-laravel-project
ai harvest
ai sync --cursor-here --copilot-here --gemini-here --windsurf-here --augment-here --project-context

# 4. Verifica tutto
ai validate
```

### Workflow Sviluppo con Claude Code
```bash
# In Claude Code CLI, usa il task-router per feature complesse:
"Usa task-router per implementare endpoint POST /api/v1/products con:
- Laravel routes e controller
- FormRequest validation  
- Query ottimizzate con indexes
- DTO transformation
- Migration expand/contract
- Tests con 80% coverage"
```

Il **task-router** automaticamente:
1. Detecta Laravel via `composer.json`
2. Delega a: `routes-architect` → `controller-builder` → `sql-optimizer` → `dto-builder` → `migration-planner` → `test-writer`
3. Ogni agente legge solo le sue guide specifiche
4. Valida output contro quality gates
5. Consegna patch pronte per production

### Aggiornamento Standards
```bash
# Controlla automaticamente aggiornamenti
ai check-updates

# Aggiorna package globale
npm update -g @padosoft/ai-standards

# Aggiorna files locali da nuova versione
ai update

# Rigenera configurazioni progetto (con auto-check updates)
ai sync --cursor-here --copilot-here --gemini-here --windsurf-here --augment-here --project-context

# Verifica aggiornamenti
ai validate
```

### Template Personalizzati per Progetto
```bash
# Auto-detection stack e generazione template personalizzati
ai sync --project-context

# Il sistema detecta automaticamente:
# - Laravel (composer.json) → .ai-standards/PROJECT_PHP_LARAVEL.md
# - TypeScript (package.json + tsconfig.json) → PROJECT_TYPESCRIPT.md  
# - Cloudflare Workers (wrangler.toml) → PROJECT_CLOUDFLARE.md
# - React Native (ios/android/app.json) → PROJECT_REACT_NATIVE.md

# Template includono:
# - Timestamp generazione
# - Stack rilevati automaticamente
# - Regole specifiche per il progetto
# - Quality gates personalizzate
```

### Harvest da Pacchetti
```bash
# Scenario: hai installato @mycompany/payment-sdk con bundle AI
npm install @mycompany/payment-sdk

# Il pacchetto contiene ai/docs/standards/ e ai/.claude/agents/
ai harvest

# Ora le guide del SDK sono disponibili in docs/standards/_deps/payment-sdk/
ai sync --cursor-here  # Include automaticamente le guide del SDK
```

---

## 🧠 Agenti Claude Principali

### Global Agents (tutti gli stack)
- **`task-router`** — Orchestratore multi‑step, auto‑detect stack, delega o fallback a micro‑guide
- **`docs-writer`** — README, ADR, RFC, OpenAPI documentation
- **`test-writer`** — Unit/integration/E2E con 80%+ coverage
- **`dto-builder`** — DTO + mapper, versioning, serialization
- **`code-reviewer`** — Security, performance, maintainability
- **`adapter-builder`** — Crea adapter per nuovi AI tools analizzando documentazione ufficiale
- **`node-command-builder`** — Crea CLI Node.js professionali con logging, test mode, help system

### PHP & Laravel Agents
- **`laravel-routes-architect`** — Routes, middleware, versioning
- **`laravel-controller-builder`** — FormRequest, Policy, DTO
- **`laravel-sql-optimizer`** — Keyset pagination, covered indexes
- **`laravel-validator`** — FormRequest patterns, custom rules
- **`laravel-migration-planner`** — Expand/contract migrations

### TypeScript/Hono Agents
- **`ts-router-architect`** — Hono routes, middleware chain
- **`ts-handler-builder`** — Async handlers, error boundaries
- **`ts-validator`** — Zod schemas, type inference
- **`ts-performance-auditor`** — Hot path optimization

### Cloudflare Workers Agents
- **`worker-security-auditor`** — Headers, SSRF, secrets
- **`worker-cache-strategist`** — Cache API, KV, R2, Reserve
- **`worker-streaming-expert`** — 103 Early Hints, TransformStream

### React Native Agents  
- **`rn-screen-builder`** — Navigation, gestures, animations
- **`rn-state-architect`** — Zustand/Redux, persistence
- **`rn-accessibility-linter`** — WCAG, screen readers

---

## ⚡ Quality Gates Enterprise

I quality gates sono definiti in `.claude/settings.json` e bloccano automaticamente:

### Database
- ❌ OFFSET > 1000 rows (usa keyset pagination)
- ❌ Query senza covered index su hot paths
- ❌ Pattern N+1 (usa eager loading)
- ❌ Funzioni in WHERE clause (previene index usage)

### PHP/Laravel
- ❌ Controller senza FormRequest validation
- ❌ Resource controller senza Policy authorization
- ❌ Route senza middleware richiesti (auth, throttle)
- ⚠️ API response senza DTO transformation

### TypeScript/Hono
- ❌ Handler senza Zod schema validation
- ❌ Route senza error boundary
- ❌ API route senza CORS configuration
- ⚠️ GET endpoint senza cache headers

### Cloudflare Workers
- ❌ Response senza security headers (X-Content-Type-Options, CSP)
- ❌ Endpoint senza rate limiting
- ⚠️ Hot path senza cache strategy

### React Native
- ❌ Component senza accessibility props
- ❌ Screen senza error boundary
- ⚠️ Expensive computation senza memoization

### Security & General
- ❌ PII nei log statements
- ❌ Hardcoded secrets/credentials
- ❌ TODO senza issue reference
- ❌ Test coverage sotto 80%

---

## 🛠️ AI Tools Supportati

| Tool | File Globale | File Progetto | Split Support | Project Context |
|------|-------------|---------------|---------------|----------------|
| **Claude Code** | `~/.claude/agents/` | `.claude/agents/` | ✅ (agenti separati) | ✅ (auto-detect) |
| **GitHub Copilot** | `~/.config/github-copilot/intellij/` | `.github/copilot-instructions.md` | ❌ (file unico) | ⚠️ (manuale) |
| **Cursor IDE** | ❌ | `.cursor/rules/ai-standards.mdc` | ✅ (--cursor-split) | ⚠️ (manuale) |
| **Google Gemini** | `~/.gemini/GEMINI.md` | `.gemini/GEMINI.md` | ❌ (file unico) | ⚠️ (manuale) |
| **OpenCode AI** | `~/.config/opencode/AGENTS.md` | `.opencode/AGENTS.md + agent/*.md` | ✅ (agenti dinamici) | ⚠️ (manuale) |
| **Warp Terminal** | ❌ | `WARP.md` | ❌ (file unico) | ⚠️ (manuale) |
| **Windsurf IDE** | ❌ | `.windsurf/rules/ai-standards.md` | ✅ (--windsurf-split) | ✅ (auto-detect) |
| **Augment Code** | ❌ | `.augment-guidelines` | ✅ (--augment-split) | ✅ (auto-detect) |
| **🆕 Project Templates** | ❌ | `.ai-standards/PROJECT_*.md` | ✅ (per stack) | ✅ (auto-detect) |

### Filosofia Multi-Tool
- **Claude Code**: Usa agenti specializzati + router orchestratore (contesto segmentato)
- **Altri tools**: Ricevono file merged con tutti gli standard (contesto unificato)
- **Generazione dinamica**: Gli agenti OpenCode sono sintetizzati automaticamente da SSOT Claude
- **🆕 Project Context**: Template personalizzati con auto-detection stack e timestamp
- **🆕 Auto-Update**: Controllo automatico aggiornamenti durante sync e bootstrap
- **Nessuna duplicazione**: Una sola fonte di verità, esportata in formati tool-specific

---

## 🏗️ Architettura Decisionale

### DRY a Strati
1. **Global standards** → Applicabili ovunque (style, db, security)
2. **Stack-specific** → Laravel, TypeScript, Workers, React Native
3. **Task-specific** → Controller, routes, tests, migrations

### Context Management
- **Claude agents**: Caricano solo guide pertinenti (minimal context)
- **Other tools**: Ricevono bundle completo merged (single file)
- **Fallback strategy**: Se agente mancante → carica micro-guide

### Quality Enforcement
- **Preventive**: Quality gates bloccano codice non conforme
- **Detective**: Validate command identifica drift
- **Corrective**: Update command allinea alle nuove versioni

---

## 🔗 Link Documentazione Ufficiale

- **GitHub Copilot – Repository instructions**: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions
- **Cursor – Rules (Project Rules, .mdc)**: https://docs.cursor.com/en/context/rules
- **Gemini CLI – Configuration & Context files**: https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/configuration.md#context-files-hierarchical-instructional-context
- **OpenCode AI – Rules**: https://opencode.ai/docs/rules/  
- **OpenCode AI – Agents**: https://opencode.ai/docs/agents/  
- **OpenCode AI – Config**: https://opencode.ai/docs/config/#agents
- **Claude CLI**: https://docs.anthropic.com/en/docs/claude-code

---

## 🚀 Node Command Builder - Agente per CLI Professionali

Il nuovo agente **`node-command-builder`** crea comandi CLI Node.js/TypeScript con standard enterprise:

### Funzionalità Automatiche
- **🎨 ASCII Art Banner** - Colorato (viola) con branding personalizzato
- **📋 Help System** - Comando `--help` con esempi per global/local/npx
- **🧪 Test Mode** - Flag `--test` per esecuzione sicura senza side effects
- **🔍 Verbose Logging** - Flag `--verbose` per debug dettagliato
- **⏱️ DateTime Tracking** - Start/end time + durata esecuzione
- **🌐 HTTP Logging** - Request/response con timing in verbose mode
- **⚙️ Configuration** - Gestione config da file JSON e environment
- **📦 Multi-Installation** - Supporto global, locale e npx
- **🔤 Short Aliases** - Alias corti per comandi lunghi

### Esempio di Comando Generato
```typescript
// Banner con ASCII art viola
function showBanner() {
  console.log('\x1b[95m' + `
▄▀█ █   █▀ ▀█▀ ▄▀█ █▄░█ █▀▄ ▄▀█ █▀█ █▀▄ █▀
█▀█ █   ▄█  █  █▀█ █░▀█ █▄▀ █▀█ █▀▄ █▄▀ ▄█

[NOME COMANDO]
🤖 [Descrizione del comando]
   by Surface SRL
  ` + '\x1b[0m');
}
```

### Uso dell'Agente
```bash
# In Claude Code:
"Usa node-command-builder per creare un CLI tool che:
- Processa file CSV e li carica su API
- Ha modalità test per validazione senza upload
- Logga tutte le chiamate HTTP in verbose mode
- Supporta batch processing con progress bar"
```

### Output Professionale
```bash
# Installazione globale
npm install -g @surface/data-processor
data-processor upload --file data.csv --test --verbose

# Output:
🚀 Upload command started
   Started at: 2025-08-18 23:45:00
⚙️  API URL: https://api.example.com
⚙️  Test Mode: true
⚙️  File: data.csv
🔍 Reading CSV file...
🌐 POST /api/batch (234ms)
✅ Test completed - no data uploaded
🏁 Command completed
   Duration: 456ms
```

## 📈 Estensione e Personalizzazione

### Aggiungere Nuovo Stack
1. Crea cartella `ai/docs/standards/new-stack/`
2. Aggiungi guide specifiche (routing, validation, testing)
3. Crea agenti in `ai/.claude/agents/new-stack/`
4. Aggiorna `task-router.md` con routing rules
5. Aggiorna `targets.yml` per includere nuovo stack in export

### Override per Progetto
1. Crea `.claude/agents/` nel progetto
2. File omonimi sovrascrivono agenti globali
3. Crea `.claude/settings.json` per quality gates specifici
4. Le regole progetto hanno precedenza su quelle globali

### Packaging per Distribuzione
Se vuoi distribuire le tue guide come pacchetto npm:
```
my-company-standards/
├─ package.json
├─ ai/
│  ├─ docs/standards/...
│  ├─ .claude/agents/...
│  ├─ targets.yml (optional)
│  └─ manifest.json (optional)
```

Il comando `ai harvest` importa automaticamente in `_deps/`.

---

## 🤝 Contributi

1. **Fork** il repository
2. **Crea branch** per la feature (`git checkout -b feature/amazing-feature`)
3. **Aggiorna guide e agenti** correlati
4. **Includi esempi** di codice buono/cattivo
5. **Testa** con `ai validate`
6. **Commit** con messaggio significativo
7. **Push** e crea **Pull Request**

### Standard Contributi
- Mantieni filosofia SSOT (Single Source of Truth)
- Aggiorna sia guide che agenti correlati
- Includi esempi pratici nelle guide
- Testa su progetti reali prima del commit
- Documenta breaking changes in CHANGELOG.md

---

## 📄 Licenza

COPYRIGHT PADOSOFT 2025

---

## 📞 Supporto

- **Issues**: [GitHub Issues](https://github.com/padosoft/ai-standards-kit/issues)  
- **Discussions**: [GitHub Discussions](https://github.com/padosoft/ai-standards-kit/discussions)
- **Email**: helpdesk AT padosoft.com

---ottimo

*Sviluppato con ❤️ da Lorenzo Padovani [Padosoft](https://www.padosoft.com) per accelerare lo sviluppo enterprise con AI tools.*