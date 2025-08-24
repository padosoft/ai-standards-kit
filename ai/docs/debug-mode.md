# AI Debug Mode - Complete Routing Visibility

## Overview
Il debug mode fornisce **completa visibilità** sulle decisioni di routing dell'AI, permettendoti di:
- Capire quale stack è stato rilevato e perché
- Vedere quali agenti sono stati selezionati/delegati
- Monitorare quali guide/micro-guide sono state caricate
- Verificare quali quality gates sono stati applicati
- Analizzare le performance e ottimizzare il sistema

## Quick Start

### 1. Abilita Debug Mode
```bash
# Windows
ai\scripts\debug-control.bat enable

# Linux/Mac  
ai/scripts/debug-control.sh enable

# Manualmente in settings.json
"debug_mode": { "enabled": true }
```

### 2. Esegui un Task
```bash
ai "create user authentication controller"
```

### 3. Ottieni Debug Report
Alla fine del task vedrai un report completo:
```markdown
## 🔍 AI Routing Debug Report

### 📋 Task Analysis  
- **Original Request**: create user authentication controller
- **Task Type**: implementation
- **Complexity**: medium
- **Scope**: multi_file

### 🎯 Stack Detection
- **Primary Stack**: php-laravel
- **Detection Method**: config_file
- **Confidence**: high
- **Evidence**:
  - ✅ composer.json (Laravel detected)
  - ✅ artisan file exists
  - ✅ app/Http/Controllers directory

### 🤖 Agent Routing  
- **Selected Agents**:
  - `@laravel-controller-builder` - Controller creation with FormRequest
  - `@laravel-validator` - Authentication validation rules
  - `@test-writer` - Comprehensive test coverage

### 📚 Guide Loading Strategy
- **Granularity**: comprehensive
- **Loaded Guides**:
  - `/docs/standards/php-laravel/php-laravel-coding-guidelines.md`
  - `/docs/standards/php-laravel/controllers.md`
  - `/docs/standards/php-laravel/validation.md`

### ⚡ Quality Gates Applied
- ✅ `require_form_request` - Enforced FormRequest validation
- ✅ `require_policy` - Added authorization policy
- ⚠️ `require_test_coverage` - 85% coverage achieved

### 📊 Performance Metrics
- **Total Execution Time**: 1,250ms
- **Context Tokens Used**: 3,247 / 200,000
- **Agent Calls**: 3 parallel executions
```

## Debug Mode Levels

### Level 1: Basic Debug (`enabled = true`)
```json
{
  "debug_mode": {
    "enabled": true
  }
}
```
**Output**: Summary report alla fine con stack rilevato, agenti usati, performance di base.

### Level 2: Verbose Routing (`verbose_routing = true`)
```json  
{
  "debug_mode": {
    "enabled": true,
    "verbose_routing": true
  }
}
```
**Output**: Step-by-step delle decisioni di routing, alternative considerate, giustificazioni.

### Level 3: Full Debug (`all options = true`)
```json
{
  "debug_mode": {
    "enabled": true,
    "verbose_routing": true,
    "show_stack_detection": true,
    "show_agent_selection": true,
    "show_guide_loading": true,
    "show_quality_gates": true,
    "show_execution_summary": true
  }
}
```
**Output**: Massimo dettaglio su ogni aspetto del routing e esecuzione.

## Controllo via Script

### Comandi Disponibili

```bash
# Abilita debug base
ai/scripts/debug-control.sh enable

# Abilita routing verbose  
ai/scripts/debug-control.sh verbose

# Abilita monitoraggio performance
ai/scripts/debug-control.sh performance

# Abilita tutto (full debug)
ai/scripts/debug-control.sh full

# Controlla stato attuale
ai/scripts/debug-control.sh status

# Lista report recenti
ai/scripts/debug-control.sh reports

# Pulisci report vecchi
ai/scripts/debug-control.sh clean

# Disabilita debug
ai/scripts/debug-control.sh disable
```

### Workflow Tipico per Testing

```bash
# 1. Abilita debug completo
ai/scripts/debug-control.sh full

# 2. Testa il tuo task
ai "implement payment processing with Stripe"

# 3. Analizza il debug report  
# - Quale stack è stato rilevato?
# - Quali agenti sono stati scelti?
# - Quali guide sono state caricate?
# - Ci sono bottleneck di performance?

# 4. Modifica guides/agents in base ai risultati

# 5. Testa di nuovo
ai "implement payment processing with Stripe"

# 6. Confronta i risultati

# 7. Quando finito, disabilita debug
ai/scripts/debug-control.sh disable
```

## Analisi dei Report

### Stack Detection Analysis
```markdown
### 🎯 Stack Detection
- **Primary Stack**: php-laravel
- **Confidence**: high (95%)
- **Evidence**:
  - ✅ composer.json found
  - ✅ artisan script exists  
  - ✅ app/ directory structure
  - ❌ package.json not found
```

**Cosa controllare**:
- Il confidence è abbastanza alto? (>90% ideale)
- L'evidence è corretta per il tuo progetto?
- Ci sono falsi positivi/negativi?

### Agent Selection Analysis  
```markdown
### 🤖 Agent Routing
- **Selected Agents**:
  - `@laravel-controller-builder` - Matched "create controller" keywords
  - `@laravel-sql-optimizer` - Detected database operations  
  - `@test-writer` - Quality gates require 80% coverage

- **Rejected Agents**:
  - `@laravel-migration-planner` - No schema changes detected
  - `@laravel-api-doc-writer` - Not an API endpoint task
```

**Cosa controllare**:
- Gli agenti selezionati sono appropriati?
- Gli agenti rifiutati sono stati rifiutati correttamente?
- C'è qualche agente mancante che dovrebbe essere coinvolto?

### Guide Loading Analysis
```markdown
### 📚 Guide Loading Strategy  
- **Granularity**: comprehensive (multi-file task detected)
- **Context Used**: 3,247 / 200,000 tokens (1.6%)
- **Load Time**: 180ms
- **Guides**:
  - php-laravel-coding-guidelines.md (2,100 tokens)
  - controllers.md (800 tokens)
  - validation.md (347 tokens)
```

**Cosa controllare**:
- La strategia di granularità è appropriata?
- Il context usage è efficiente?
- Ci sono guide mancanti o superflue?

### Performance Analysis
```markdown
### 📊 Performance Metrics
- **Bottlenecks**:
  - Guide loading: 180ms (can be cached)
  - Agent coordination: 45ms (good parallelism)
  - Quality gate validation: 15ms (efficient)

- **Optimization Score**: 8.5/10
- **Recommendations**:
  - Consider guide caching for repeated tasks
  - Stack detection can be cached per session
```

**Cosa controllare**:
- Ci sono bottleneck significativi?
- Le raccomandazioni sono implementabili?
- La coordination tra agenti è efficiente?

## Uso Avanzato

### Filtraggio Debug Output
```bash
# Solo stack detection
ai/scripts/debug-control.sh enable
# Modifica settings.json per abilitare solo show_stack_detection

# Solo agent selection  
# Modifica per abilitare solo show_agent_selection

# Solo performance
ai/scripts/debug-control.sh performance
```

### Salvataggio Report Automatico
```json
{
  "debug_mode": {
    "enabled": true,
    "save_reports": true,
    "reports_directory": ".claude/debug-reports/",
    "max_reports": 50
  }
}
```

I report vengono salvati come:
- `.claude/debug-reports/2024-01-15_14-30-22_create-controller.md`
- `.claude/debug-reports/2024-01-15_14-35-10_implement-auth.md`

### Analisi Storica
```bash  
# Trova task con performance issues
grep -l "Bottlenecks" .claude/debug-reports/*.md

# Trova task che hanno usato un agente specifico
grep -l "@laravel-controller-builder" .claude/debug-reports/*.md

# Analizza trend di stack detection
grep "Primary Stack" .claude/debug-reports/*.md | sort | uniq -c
```

## Troubleshooting

### Debug Mode Non Funziona
1. Verifica che `debug_mode.enabled = true` in settings.json
2. Controlla che il task-router stia effettivamente delegando al debug-reporter
3. Verifica che l'agente @debug-reporter esista in `ai/.claude/agents/global/`

### Report Non Salvati  
1. Controlla che la directory `.claude/debug-reports/` esista
2. Verifica permissions di scrittura
3. Controlla `debug_mode.save_reports = true`

### Performance Impact
Il debug mode aggiunge ~100-200ms per task per la generazione del report. Se è troppo:
1. Usa solo specific flags invece di `full`
2. Disabilita `save_reports`  
3. Usa debug solo durante development/testing

## Best Practices

### Per Development
```bash
# Abilita full debug per capire il sistema
ai/scripts/debug-control.sh full
```

### Per Testing Guide Changes
```bash
# Prima del cambiamento
ai/scripts/debug-control.sh verbose
ai "test task" > before.log

# Dopo il cambiamento  
ai "test task" > after.log

# Confronta
diff before.log after.log
```

### Per Production
```bash  
# Disabilita sempre debug in production
ai/scripts/debug-control.sh disable
```

Questo sistema ti dà **controllo completo** su cosa sta facendo l'AI ad ogni richiesta, permettendoti di iterare e migliorare il sistema di routing, agenti e guide con dati concreti invece di indovinare!