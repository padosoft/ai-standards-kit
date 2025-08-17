# ai-standards — pacchetto FULL enterprise

## Struttura cartelle

```
ai-standards/                               # root del pacchetto
├─ ai/                                      # SSOT: guide e agenti
│  ├─ .claude/                              # agenti Claude (SSOT)
│  │  └─ agents/
│  │     └─ global/
│  │        ├─ task-router.md               # router generale
│  │        ├─ docs-writer.md               # agente: documentazione
│  │        ├─ test-writer.md               # agente: test
│  │        └─ dto-builder.md               # agente: DTO
│  └─ docs/                                 # guide tecniche
│     └─ standards/
│        ├─ global/                         # regole globali (shell, logging, dto, testing, db, cache, ci)
│        │  ├─ style.md
│        │  ├─ logging.md
│        │  ├─ comments.md
│        │  ├─ dto.md
│        │  ├─ testing.md
│        │  ├─ db.md
│        │  ├─ cache.md
│        │  ├─ ci.md
│        │  └─ shell-snippets.md
│        ├─ php-laravel/                    # standard Laravel
│        │  ├─ routes.md
│        │  ├─ controllers.md
│        │  ├─ errors.md
│        │  ├─ validation.md
│        │  ├─ queries.md
│        │  ├─ eloquent.md
│        │  ├─ commands.md
│        │  ├─ migrations.md
│        │  └─ api-doc.md
│        ├─ ts-hono/                        # standard TypeScript + Hono
│        │  ├─ routing.md
│        │  ├─ handlers.md
│        │  ├─ errors.md
│        │  ├─ testing.md
│        │  ├─ api-doc.md
│        │  └─ perf.md
│        ├─ cf-workers/                     # standard Cloudflare Workers
│        │  ├─ security.md
│        │  ├─ caching.md
│        │  ├─ limits.md
│        │  └─ observability.md
│        └─ react-native/                   # standard React Native
│           ├─ architecture.md
│           ├─ performance.md
│           ├─ accessibility.md
│           └─ testing.md
├─ adapters/
│  ├─ config/
│  │  └─ targets.yml                        # mapping per export dist (Copilot, Cursor, Gemini, Warp)
│  └─ templates/                            # header/footer per i vari target
│     ├─ copilot_header.md
│     ├─ copilot_footer.md
│     ├─ cursor_header.md
│     ├─ cursor_footer.md
│     ├─ gemini_header.md
│     ├─ warp_header.md
│     ├─ warp_footer.md
│     └─ warp_global_header.md
├─ src/
│  └─ sync/
│     ├─ utils.ts                           # util comuni (argv, path, detect stack)
│     ├─ build.ts                           # exporter → ~/.ai-standards/dist/*
│     ├─ harvest.ts                         # (opz) importa bundle ai/ da deps
│     ├─ validate.ts                        # check global+repo
│     └─ cli.ts                             # CLI con alias `ai`
├─ dist/                                    # JS build (bin)
│  └─ sync/
│     ├─ cli.js
│     ├─ build.js
│     ├─ harvest.js
│     └─ validate.js
├─ README.md                                # guida completa + esempi
└─ COMPLETE_PROJECT_PROMPT.md               # ricetta per ricreare il pacchetto
```

# @yourorg/ai-standards

See commands: `ai --help`. Supports Copilot (.github/copilot-instructions.md), Cursor (.cursor/rules/*.mdc), Gemini (~/.gemini/GEMINI.md & .gemini/GEMINI.md), OpenCode (.opencode/AGENTS.md).


## Esempi rapidi d’uso
### Setup globale (una tantum)
```bash
npm i -g @yourorg/ai-standards
ai bootstrap --user
ai validate
```

### In un progetto
```bash
ai harvest
ai sync --warp-here --cursor-here --gemini-here --copilot-here --opencode-here
# con split MDC per Cursor (per categorie)
ai sync --cursor-here --cursor-split
ai validate
```

## Link documentazione ufficiale
- **GitHub Copilot – Repository instructions:** https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions
- **Cursor – Rules (Project Rules, .mdc):** https://docs.cursor.com/en/context/rules
- **Gemini CLI – Configuration & Context files:** https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/configuration.md#context-files-hierarchical-instructional-context
- **OpenCode AI – Rules:** https://opencode.ai/docs/rules/  
  **OpenCode AI – Agents:** https://opencode.ai/docs/agents/  
  **OpenCode AI – Config (agents):** https://opencode.ai/docs/config/#agents
- **Claude CLI:** https://docs.anthropic.com/en/docs/agents-and-tools/anthropic-cli  (o pagina ufficiale “Claude CLI” più aggiornata)
