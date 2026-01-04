# Integration Strategy: AI Standards Kit + AI Orchestrator (Parlant)

## Executive Summary

Questo documento definisce l'architettura per integrare il sistema di routing esistente (`ai-standards-kit`) con il nuovo orchestratore Parlant-style (`ai-orchestrator`), garantendo:

1. **Beneficio immediato** dalla governance strutturata Parlant
2. **Fallback trasparente** al routing tradizionale se Parlant viene deprecato
3. **Coesistenza** durante la transizione
4. **Enterprise-readiness** con audit trail e observability

---

## Analisi dei Due Sistemi

### Sistema Attuale: AI Standards Kit

```
┌─────────────────────────────────────────────────────────────────────┐
│                       AI Standards Kit                               │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      Task Router                                 ││
│  │  • Stack detection (Laravel, Hono, Workers, RN)                  ││
│  │  • Complexity assessment (low/medium/high)                       ││
│  │  • Granularity selection (comprehensive/specific/hybrid)         ││
│  │  • Agent delegation OR guide loading                             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│      ┌───────────────────────┼───────────────────────────┐          │
│      ▼                       ▼                           ▼          │
│  ┌──────────┐        ┌──────────────┐         ┌─────────────────┐   │
│  │ Agents   │        │ Micro-guides │         │ Comprehensive   │   │
│  │ 8+ spec. │        │ 100+ files   │         │ coding-guide.md │   │
│  └──────────┘        └──────────────┘         └─────────────────┘   │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                     Quality Gates                                ││
│  │  • 80+ regole (DB, PHP, TS, Workers, RN, Security, Testing)     ││
│  │  • Blocking enforcement                                          ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**Punti di forza:**
- ✅ Routing sofisticato basato su stack
- ✅ Granularità intelligente
- ✅ Quality gates enterprise (80+ regole)
- ✅ Multi-tool export (Cursor, Copilot, etc.)
- ✅ Debug mode completo

**Limitazioni:**
- ❌ Nessuno stato persistente (tutto in-memory/prompt)
- ❌ Nessun audit trail
- ❌ Retry hint generici (non contestuali)
- ❌ Contratti impliciti (solo nel prompt)
- ❌ Nessun recovery automatico

### Sistema Nuovo: AI Orchestrator (Parlant-style)

```
┌─────────────────────────────────────────────────────────────────────┐
│                       AI Orchestrator                                │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    ParlantEngine                                 ││
│  │  • Guidelines strutturate (DB-backed)                            ││
│  │  • Task decomposition → ExecutionPlan                            ││
│  │  • Retry hints contestuali                                       ││
│  │  • Step transition validation                                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Contracts                                     ││
│  │  • StepContract (must_have, requires_patch, etc.)               ││
│  │  • StepOutput (structured response)                              ││
│  │  • Enforcement esterno al modello                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│  ┌────────────┬──────────────┴──────────────┬──────────────────────┐│
│  │  MySQL DB  │                             │  Filesystem          ││
│  │  • runs    │                             │  • artifacts         ││
│  │  • steps   │                             │  • patches           ││
│  │  • events  │                             │  • logs              ││
│  └────────────┴─────────────────────────────┴──────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**Punti di forza:**
- ✅ Stato persistente in DB
- ✅ Audit trail completo
- ✅ Contratti espliciti e validati
- ✅ Retry hints contestuali
- ✅ Artifacts tracciabili (hash, size)

**Limitazioni:**
- ❌ Nessun stack detection
- ❌ Guidelines di base (non stack-specific)
- ❌ Nessun quality gate enterprise
- ❌ Agents predefiniti semplici

---

## Architettura Integrata Proposta

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AI Enterprise Orchestrator v2.0                           │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │                          Claude Code CLI                                  ││
│  └────────────────────────────────┬─────────────────────────────────────────┘│
│                                   │ MCP (stdio)                              │
│                                   ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │                    Orchestration Router                                   ││
│  │  ┌──────────────────────────────────────────────────────────────────────┐││
│  │  │              Mode Selection (auto/parlant/legacy)                    │││
│  │  │  • auto: Tenta Parlant → fallback legacy se non disponibile          │││
│  │  │  • parlant: Solo orchestratore Parlant (fail if unavailable)         │││
│  │  │  • legacy: Solo routing tradizionale (no DB/state)                   │││
│  │  └──────────────────────────────────────────────────────────────────────┘││
│  └────────────────────────────────┬─────────────────────────────────────────┘│
│                                   │                                          │
│           ┌───────────────────────┴───────────────────────┐                  │
│           ▼                                               ▼                  │
│  ┌────────────────────────────┐              ┌────────────────────────────┐  │
│  │    PARLANT MODE            │              │    LEGACY MODE             │  │
│  │    (Enterprise)            │              │    (Fallback)              │  │
│  │                            │              │                            │  │
│  │ ┌────────────────────────┐ │              │ ┌────────────────────────┐ │  │
│  │ │ Enhanced ParlantEngine │ │              │ │ Task Router            │ │  │
│  │ │ + Stack Detection      │ │              │ │ (ai-standards-kit)     │ │  │
│  │ │ + Quality Gates        │ │              │ │ • Prompt-based         │ │  │
│  │ │ + Enterprise Guidelines│ │              │ │ • No persistence       │ │  │
│  │ └────────────────────────┘ │              │ └────────────────────────┘ │  │
│  │            │               │              │            │               │  │
│  │ ┌──────────┴─────────────┐ │              │ ┌──────────┴─────────────┐ │  │
│  │ │ MySQL (state+audit)   │ │              │ │ Memory only            │ │  │
│  │ │ Filesystem (artifacts)│ │              │ │ (prompt context)       │ │  │
│  │ └────────────────────────┘ │              │ └────────────────────────┘ │  │
│  └────────────────────────────┘              └────────────────────────────┘  │
│                   │                                       │                  │
│                   └───────────────────┬───────────────────┘                  │
│                                       ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │                    Unified Output Layer                                   ││
│  │  • Standardized response format                                          ││
│  │  • Quality gates enforcement (shared)                                    ││
│  │  • Auto-documentation (shared)                                           ││
│  │  • Multi-tool export (shared)                                            ││
│  └──────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Componenti da Sviluppare

### 1. Orchestration Router (Nuovo)

```python
# src/ai_orchestrator/router.py

class OrchestrationRouter:
    """Decides between Parlant and Legacy modes."""

    def __init__(self, mode: str = "auto"):
        self.mode = mode  # auto, parlant, legacy
        self._parlant_available = self._check_parlant()

    def _check_parlant(self) -> bool:
        """Check if Parlant infrastructure is available."""
        try:
            # Check DB connection
            db = MySQLDB(load_db_config())
            db.get_active_guidelines()
            return True
        except Exception:
            return False

    def route(self, task: str, context: Dict) -> OrchestrationResult:
        """Route task to appropriate orchestrator."""
        if self.mode == "parlant":
            if not self._parlant_available:
                raise RuntimeError("Parlant mode requested but infrastructure unavailable")
            return self._parlant_orchestrate(task, context)

        elif self.mode == "legacy":
            return self._legacy_orchestrate(task, context)

        else:  # auto
            if self._parlant_available:
                try:
                    return self._parlant_orchestrate(task, context)
                except Exception as e:
                    logger.warning(f"Parlant failed, falling back to legacy: {e}")
                    return self._legacy_orchestrate(task, context)
            else:
                return self._legacy_orchestrate(task, context)
```

### 2. Enhanced ParlantEngine (Esteso)

Integra le funzionalità di ai-standards-kit:

```python
# src/ai_orchestrator/parlant_adapter.py (esteso)

class EnhancedParlantEngine(ParlantEngine):
    """Parlant engine with ai-standards-kit features."""

    def __init__(self, ...):
        super().__init__(...)
        self._stack_detector = StackDetector()
        self._quality_gates = QualityGatesLoader()

    def propose_plan(self, task: str, constraints: Dict) -> ExecutionPlan:
        """Enhanced plan with stack-aware steps."""
        # 1. Detect stack
        stack = self._stack_detector.detect(constraints.get("repo_root"))

        # 2. Get stack-specific guidelines from DB
        stack_guidelines = self._get_stack_guidelines(stack)

        # 3. Select appropriate template based on stack + task
        template = self._select_template(task, stack, constraints)

        # 4. Build plan with stack-specific contracts
        return self._build_stack_aware_plan(task, stack, template, stack_guidelines)

    def _get_stack_guidelines(self, stack: str) -> List[Guideline]:
        """Load guidelines specific to detected stack."""
        # Merge default + stack-specific from DB
        base = self.get_applicable_guidelines({})
        stack_specific = self._db.get_active_guidelines(category=f"stack-{stack}")
        return base + stack_specific
```

### 3. Stack Detector (Portato da ai-standards-kit)

```python
# src/ai_orchestrator/stack_detection.py

class StackDetector:
    """Detect project stack from file markers."""

    MARKERS = {
        "php-laravel": ["composer.json", "artisan"],
        "ts-hono": ["package.json", "tsconfig.json", "src/index.ts"],
        "cf-workers": ["wrangler.toml"],
        "react-native": ["ios/", "android/", "App.tsx"],
        "python": ["requirements.txt", "pyproject.toml"],
    }

    def detect(self, repo_root: str) -> List[str]:
        """Detect all applicable stacks."""
        detected = []
        for stack, markers in self.MARKERS.items():
            if all(os.path.exists(os.path.join(repo_root, m)) for m in markers):
                detected.append(stack)
        return detected or ["generic"]
```

### 4. Quality Gates Integration

```python
# src/ai_orchestrator/quality_gates.py

class QualityGatesValidator:
    """Enterprise quality gates from ai-standards-kit."""

    def __init__(self, gates_config: Dict):
        self.gates = gates_config

    def validate_step_output(
        self,
        output: StepOutput,
        stack: str,
        gate_categories: List[str]
    ) -> ValidationResult:
        """Validate output against applicable gates."""
        violations = []

        # Load applicable gates for this stack
        applicable = self._get_applicable_gates(stack, gate_categories)

        for gate in applicable:
            result = self._check_gate(output, gate)
            if not result.passed:
                violations.append(result)

        return ValidationResult(
            valid=len(violations) == 0,
            violations=violations,
            gates_checked=len(applicable),
        )
```

### 5. Unified MCP Tools

```python
# src/ai_orchestrator/server.py (esteso)

@mcp.tool
def orchestrate(
    task: str,
    mode: str = "auto",  # auto, parlant, legacy
    stack: Optional[str] = None,
    constraints: Optional[Dict] = None,
) -> Dict[str, Any]:
    """Create orchestration with mode selection.

    Modes:
    - auto: Use Parlant if available, fallback to legacy
    - parlant: Force Parlant mode (fails if unavailable)
    - legacy: Use prompt-based routing (no DB, no state)
    """
    router = OrchestrationRouter(mode=mode)

    # Auto-detect stack if not provided
    if not stack:
        detector = StackDetector()
        stacks = detector.detect(get_config().repo_root)
        stack = stacks[0] if stacks else "generic"

    constraints = constraints or {}
    constraints["stack"] = stack

    return router.route(task, constraints)
```

---

## Migrazione delle Guidelines

### Da settings.json a DB

Le 80+ quality gates di ai-standards-kit vanno migrate a tabella `guidelines`:

```sql
-- Esempio migrazione database gates
INSERT INTO guidelines (guideline_id, category, priority, name, description, condition_json) VALUES
('g-db-001', 'stack-db', 10, 'no_offset_pagination',
 'Block OFFSET > 1000. Use keyset pagination instead for better performance.',
 '{"requires_stack": ["php-laravel", "ts-hono"]}'),

('g-db-002', 'stack-db', 15, 'require_covered_index',
 'All frequently queried columns must have covering indexes.',
 NULL),

-- PHP/Laravel gates
('g-php-001', 'stack-php-laravel', 20, 'require_form_request',
 'All controller methods must use FormRequest for validation. No inline validation.',
 '{"requires_stack": ["php-laravel"]}'),

-- E così via per tutte le 80+ gates...
```

### Script di Migrazione

```python
# scripts/migrate_gates.py

import json
from ai_orchestrator.db_mysql import MySQLDB

def migrate_settings_to_db(settings_path: str, db: MySQLDB):
    """Migrate ai-standards-kit settings.json to guidelines DB."""
    with open(settings_path) as f:
        settings = json.load(f)

    quality_gates = settings.get("quality_gates", {})

    for category, gates in quality_gates.items():
        for gate_name, gate_config in gates.items():
            db.upsert_guideline(
                guideline_id=f"g-{category}-{gate_name}",
                category=f"stack-{category}",
                name=gate_name,
                description=gate_config.get("description", gate_config),
                priority=gate_config.get("priority", 50),
                condition={"requires_stack": [category]} if category != "global" else None,
            )
```

---

## Workflow Operativo

### Scenario 1: Parlant Disponibile (Normale)

```
1. Utente: "Implementa sistema di pagamento con Laravel"

2. OrchestrationRouter:
   - mode = "auto"
   - _check_parlant() → True (DB disponibile)
   - route() → _parlant_orchestrate()

3. EnhancedParlantEngine:
   - StackDetector.detect() → ["php-laravel"]
   - _get_stack_guidelines("php-laravel") →
       [g-behavior-001, g-security-001, g-php-001, g-db-001, ...]
   - propose_plan() → ExecutionPlan:
       Step 1: researcher (analyze payment requirements)
       Step 2: coder (implement PaymentService + DTOs)
       Step 3: reviewer (run tests + security check)

4. Ogni step:
   - commit_step() valida vs contract
   - QualityGatesValidator verifica 80+ gates
   - Artifacts salvati + hashati
   - Events loggati

5. finalize():
   - Run completato
   - Audit trail completo in DB
   - Artifacts in filesystem
```

### Scenario 2: Parlant Non Disponibile (Fallback)

```
1. Utente: "Implementa sistema di pagamento con Laravel"

2. OrchestrationRouter:
   - mode = "auto"
   - _check_parlant() → False (DB non raggiungibile)
   - route() → _legacy_orchestrate()

3. LegacyOrchestrator:
   - Genera prompt con task-router.md
   - Inietta guidelines da files statici
   - Delega a sub-agents via prompt

4. Ogni step:
   - Nessuna validazione formale
   - Quality gates via prompt instructions
   - Nessun artifact tracking

5. Completamento:
   - Risposta diretta
   - Nessun audit trail
   - Nessuno stato persistente
```

### Scenario 3: Migrazione Progressiva

```
Fase 1: Solo audit (mode=auto, parlant passivo)
   - Parlant traccia tutto ma non blocca
   - Legacy esegue effettivamente
   - Compara risultati

Fase 2: Parlant primario (mode=auto, legacy fallback)
   - Parlant esegue normalmente
   - Legacy solo se Parlant fallisce
   - Monitora frequenza fallback

Fase 3: Parlant esclusivo (mode=parlant)
   - Parlant obbligatorio
   - Nessun fallback
   - Legacy rimosso
```

---

## Configurazione

### Nuove Variabili Environment

```bash
# .env.local

# Orchestration mode
AI_ORCH_MODE=auto  # auto | parlant | legacy

# Stack detection
AI_ORCH_STACK_AUTO_DETECT=true
AI_ORCH_DEFAULT_STACK=generic

# Quality gates
AI_ORCH_QUALITY_GATES_ENABLED=true
AI_ORCH_QUALITY_GATES_BLOCKING=true  # false = warn only

# Fallback behavior
AI_ORCH_FALLBACK_ENABLED=true
AI_ORCH_FALLBACK_LOG_LEVEL=warning

# Legacy mode paths (for fallback)
AI_ORCH_LEGACY_AGENTS_PATH=/path/to/.claude/agents
AI_ORCH_LEGACY_GUIDES_PATH=/path/to/ai/docs/standards
```

### settings.json Esteso

```json
{
  "orchestration": {
    "mode": "auto",
    "fallback_enabled": true,
    "parlant": {
      "db_required": true,
      "artifacts_required": true
    },
    "legacy": {
      "task_router_path": ".claude/agents/global/task-router.md",
      "quality_gates_inline": true
    }
  },
  "quality_gates": {
    "source": "database",  // database | file | inline
    "blocking": true,
    "categories": ["behavior", "security", "quality", "stack-*"]
  }
}
```

---

## Vantaggi dell'Architettura Ibrida

### Per Parlant Mode

| Vantaggio | Descrizione |
|-----------|-------------|
| Stato persistente | Run/step/artifacts tracciabili nel tempo |
| Audit trail | Ogni evento loggato per compliance |
| Retry intelligente | Hints contestuali basati su errore + history |
| Contratti espliciti | Enforcement esterno al modello |
| Artifacts verificabili | Hash SHA-256, size limits, safe paths |

### Per Legacy Mode (Fallback)

| Vantaggio | Descrizione |
|-----------|-------------|
| Zero dependencies | Nessun DB, nessun filesystem state |
| Prompt-based | Tutto embedded nel contesto LLM |
| Portabilità | Funziona ovunque senza setup |
| Debugging semplice | Tutto visibile nel prompt |

### Per l'Ibrido

| Vantaggio | Descrizione |
|-----------|-------------|
| Graceful degradation | Mai bloccati se infrastruttura ko |
| Migrazione graduale | Adozione progressiva senza big-bang |
| A/B testing | Confronto risultati Parlant vs Legacy |
| Best of both | Quality gates + State + Fallback |

---

## Roadmap Implementazione

### Fase 1: Foundation (Settimana 1)

- [ ] Creare `OrchestrationRouter` con mode selection
- [ ] Estendere `ParlantEngine` con stack detection
- [ ] Creare `StackDetector` (porta da ai-standards-kit)
- [ ] Aggiungere parametro `mode` a `orchestrate()`

### Fase 2: Quality Gates (Settimana 2)

- [ ] Creare `QualityGatesValidator`
- [ ] Migrare 80+ gates da settings.json a DB
- [ ] Integrare validazione in `commit_step()`
- [ ] Aggiungere gate violations a response

### Fase 3: Legacy Fallback (Settimana 3)

- [ ] Creare `LegacyOrchestrator` wrapper
- [ ] Implementare generazione prompt da task-router.md
- [ ] Integrare quality gates inline (non-blocking)
- [ ] Test fallback automatico

### Fase 4: Migration & Polish (Settimana 4)

- [ ] Script migrazione settings.json → DB
- [ ] Documentazione completa
- [ ] Test end-to-end tutti gli scenari
- [ ] Monitoring/alerting setup

---

## Conclusione

L'architettura ibrida proposta offre:

1. **Beneficio immediato** dalla governance Parlant (stato, audit, contratti)
2. **Sicurezza operativa** con fallback automatico al legacy
3. **Migrazione graduale** senza rischi
4. **Enterprise-readiness** con tutte le quality gates esistenti
5. **Estensibilità** per futuri miglioramenti

La chiave è il `mode=auto` che:
- Usa Parlant quando disponibile (massimo beneficio)
- Cade su legacy se Parlant fallisce (continuità garantita)
- Logga sempre quale mode ha usato (observability)

Questo permette di adottare Parlant immediatamente in produzione con la sicurezza di avere sempre un piano B funzionante.
