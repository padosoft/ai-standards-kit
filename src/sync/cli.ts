#!/usr/bin/env node
import { parseArgv, detectStacks, read, write, exists, mkdirp, ROOT, HOME, checkForUpdates } from './utils.js';
import { harvest } from './harvest.js';
import child_process from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import fg from 'fast-glob';
import yaml from 'js-yaml';
import pkg from '../../package.json' with { type: 'json' };

function banner() {
  console.log(`
   _         _                         _                 _       
  / \\  _   _(_)_ __    __ _ _ __   ___| | ___   __ _  __| | ___ 
 / _ \\| | | | | '_ \\  / _\` | '_ \\ / __| |/ _ \\ / _\` |/ _\` |/ _ \\
/ ___ \\ |_| | | | | || (_| | | | | (__| | (_) | (_| | (_| |  __/
/_/   \\_\\__,_|_|_| |_(_)__,_|_| |_|\\___|_|\\___/ \\__,_|\\__,_|\\___|
                        @padosoft/ai-standards v${pkg.version}
`);
}

async function checkAndNotifyUpdates() {
  try {
    const updateInfo = await checkForUpdates(pkg.name, pkg.version);
    if (updateInfo.hasUpdate) {
      console.log(`🆕 Nuova versione disponibile: v${updateInfo.latestVersion} (attuale: v${pkg.version})`);
      console.log(`💡 Per aggiornare: ${updateInfo.updateUrl}\n`);
    }
  } catch (error) {
    // Silent fail - non bloccare l'esecuzione se il controllo fallisce
  }
}

function run(nodeFile: string, extraArgs: string[] = []) {
  banner();
  // Handle spaces and special characters in paths
  const cleanPath = nodeFile.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
  const finalPath = decodeURIComponent(cleanPath);
  console.log(`Running: ${finalPath}`);
  const p = child_process.spawnSync(process.execPath, [finalPath, ...extraArgs], { stdio: 'inherit' });
  process.exitCode = p.status ?? 0;
}

function bootstrapUser() {
  banner();
  const srcAI = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:')), '../../../ai');
  const dstClaude = path.join(HOME, '.claude');
  const dstAI = path.join(HOME, '.ai-standards');
  
  // Copy Claude agents and settings
  if (exists(path.join(srcAI, '.claude'))) {
    fs.cpSync(path.join(srcAI, '.claude'), dstClaude, { recursive: true });
    console.log('✓ Claude agents → ~/.claude');
  }
  
  // Copy docs
  if (exists(path.join(srcAI, 'docs'))) {
    fs.cpSync(path.join(srcAI, 'docs'), path.join(dstAI, 'docs'), { recursive: true });
    console.log('✓ Docs → ~/.ai-standards/docs');
  }
  
  // Create dist directory
  mkdirp(path.join(dstAI, 'dist'));
  
  // Run build to generate dist files
  run(path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:')), './build.js'), []);
  
  // Copy to tool-specific global locations
  const distDir = path.join(HOME, '.ai-standards/dist');
  
  // Copilot global (JetBrains)
  const copGlb = path.join(HOME, '.config/github-copilot/intellij/global-copilot-instructions.md');
  mkdirp(path.dirname(copGlb));
  if (exists(path.join(distDir, 'COPILOT_RULES.md'))) {
    fs.copyFileSync(path.join(distDir, 'COPILOT_RULES.md'), copGlb);
    console.log('✓ Copilot global → ~/.config/github-copilot/intellij/');
  }
  
  // Gemini global
  const gemGlb = path.join(HOME, '.gemini/GEMINI.md');
  mkdirp(path.dirname(gemGlb));
  if (exists(path.join(distDir, 'GEMINI_SYSTEM.md'))) {
    fs.copyFileSync(path.join(distDir, 'GEMINI_SYSTEM.md'), gemGlb);
    console.log('✓ Gemini global → ~/.gemini/');
  }
  
  // OpenCode global
  const ocGlb = path.join(HOME, '.config/opencode/AGENTS.md');
  mkdirp(path.dirname(ocGlb));
  if (exists(path.join(distDir, 'OPENCODE_AGENTS.md'))) {
    fs.copyFileSync(path.join(distDir, 'OPENCODE_AGENTS.md'), ocGlb);
    console.log('✓ OpenCode global → ~/.config/opencode/');
  }
  
  console.log('\n✓ Bootstrap complete. Global settings installed.');
}

function writeCopilotHere(cwd: string) {
  const src = path.join(HOME, '.ai-standards/dist/COPILOT_RULES.md');
  const dst = path.join(cwd, '.github/copilot-instructions.md');
  
  if (!exists(src)) {
    console.error('⚠ Source not found. Run "ai bootstrap --user" first.');
    return;
  }
  
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
  console.log('✓ Copilot → .github/copilot-instructions.md');
}

function writeCursorHere(cwd: string, split: boolean = false) {
  const src = path.join(HOME, '.ai-standards/dist/CURSOR_RULES.md');
  
  if (!exists(src)) {
    console.error('⚠ Source not found. Run "ai bootstrap --user" first.');
    return;
  }
  
  const dir = path.join(cwd, '.cursor/rules');
  mkdirp(dir);
  
  if (split) {
    // Generate multiple MDC files by category
    const targetsPath = path.join(ROOT, 'adapters/config/targets.yml');
    const targets = yaml.load(read(targetsPath)) as any;
    
    // Parse content to split by category
    const content = fs.readFileSync(src, 'utf8');
    const sections = content.split(/^---$/m);
    
    // Create MDC for each major category
    const categories = ['global', 'php-laravel', 'ts-hono', 'cf-workers', 'react-native'];
    
    categories.forEach(category => {
      const categoryContent = sections.find(s => s.toLowerCase().includes(category)) || '';
      if (categoryContent) {
        const mdc = `---
description: AI-Standards ${category} rules
alwaysApply: true
globs: ${category === 'global' ? '**/*' : category.includes('php') ? '**/*.php' : category.includes('ts') ? '**/*.ts' : '**/*'}
---

${categoryContent}`;
        
        fs.writeFileSync(path.join(dir, `ai-standards-${category}.mdc`), mdc, 'utf8');
        console.log(`✓ Cursor → .cursor/rules/ai-standards-${category}.mdc`);
      }
    });
  } else {
    // Single MDC file
    const content = fs.readFileSync(src, 'utf8');
    const mdc = `---
description: AI-Standards project rules (merged)
alwaysApply: true
globs: "**/*"
---

${content}`;
    
    fs.writeFileSync(path.join(dir, 'ai-standards.mdc'), mdc, 'utf8');
    console.log('✓ Cursor → .cursor/rules/ai-standards.mdc');
  }
  
  // Always create legacy .cursorrules for compatibility
  fs.writeFileSync(path.join(cwd, '.cursorrules'), fs.readFileSync(src, 'utf8'), 'utf8');
  console.log('✓ Cursor legacy → .cursorrules');
}

function writeGeminiHere(cwd: string) {
  const src = path.join(HOME, '.ai-standards/dist/GEMINI_SYSTEM.md');
  const dst = path.join(cwd, '.gemini/GEMINI.md');
  
  if (!exists(src)) {
    console.error('⚠ Source not found. Run "ai bootstrap --user" first.');
    return;
  }
  
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
  console.log('✓ Gemini → .gemini/GEMINI.md');
}

function writeOpenCodeHere(cwd: string) {
  const src = path.join(HOME, '.ai-standards/dist/OPENCODE_AGENTS.md');
  const dst = path.join(cwd, '.opencode/AGENTS.md');
  
  if (!exists(src)) {
    console.error('⚠ Source not found. Run "ai bootstrap --user" first.');
    return;
  }
  
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
  
  // Generate dynamic sub-agents from Claude SSOT
  const agentDir = path.join(cwd, '.opencode/agent');
  mkdirp(agentDir);
  
  // Read Claude agents to synthesize OpenCode versions
  const claudeAgentsPath = path.join(HOME, '.claude/agents');
  if (exists(claudeAgentsPath)) {
    const agentFiles = fg.sync('**/*.md', { cwd: claudeAgentsPath });
    
    // Create OpenCode equivalents for key agents
    const keyAgents = ['docs-writer', 'test-writer', 'dto-builder', 'code-reviewer'];
    
    agentFiles.forEach(file => {
      const name = path.basename(file, '.md');
      if (keyAgents.some(ka => name.includes(ka))) {
        const claudeContent = read(path.join(claudeAgentsPath, file));
        
        // Parse Claude agent and convert to OpenCode format
        const lines = claudeContent.split('\n');
        const descLine = lines.find(l => l.startsWith('description:')) || 'description: Enterprise agent';
        const description = descLine.replace('description:', '').trim();
        
        const openCodeAgent = `---
description: ${description}
mode: subagent
temperature: 0.1
maxTokens: 4096
---

# ${name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

${description}

## Focus Areas
- Security-first approach
- Performance optimization
- Enterprise patterns
- Quality gates enforcement

## Process
1. Analyze requirements
2. Apply enterprise standards
3. Validate against quality gates
4. Generate optimized solution
`;
        
        fs.writeFileSync(path.join(agentDir, `${name}.md`), openCodeAgent, 'utf8');
      }
    });
    
    console.log('✓ OpenCode → .opencode/AGENTS.md + dynamic agents');
  } else {
    // Fallback: create basic review agent
    const reviewAgent = `---
description: Enterprise code review
mode: subagent
temperature: 0.1
---

Focus on security, performance, maintainability.
Apply enterprise standards and quality gates.
`;
    fs.writeFileSync(path.join(agentDir, 'review.md'), reviewAgent, 'utf8');
    console.log('✓ OpenCode → .opencode/AGENTS.md + review.md');
  }
}

function writeWarpHere(cwd: string) {
  const src = path.join(HOME, '.ai-standards/dist/WARP.md');
  const dst = path.join(cwd, 'WARP.md');
  
  if (!exists(src)) {
    console.error('⚠ Source not found. Run "ai bootstrap --user" first.');
    return;
  }
  
  fs.copyFileSync(src, dst);
  console.log('✓ Warp → WARP.md');
}

function writeProjectContextHere(cwd: string) {
  const stacks = detectStacks(cwd);
  const distDir = path.join(HOME, '.ai-standards/dist');
  
  if (stacks.length === 0) {
    console.log('⚠ No specific stacks detected. Using global standards only.');
    return;
  }
  
  // Map detected stacks to project template files
  const projectFiles: Record<string, string> = {
    'php-laravel': 'PROJECT_LARAVEL.md',
    'ts-hono': 'PROJECT_TYPESCRIPT.md', 
    'cf-workers': 'PROJECT_CLOUDFLARE.md',
    'react-native': 'PROJECT_REACT_NATIVE.md'
  };
  
  let written = false;
  stacks.forEach(stack => {
    const filename = projectFiles[stack];
    if (filename) {
      const src = path.join(distDir, filename);
      const dst = path.join(cwd, '.ai-standards', `PROJECT_${stack.toUpperCase().replace('-', '_')}.md`);
      
      if (exists(src)) {
        mkdirp(path.dirname(dst));
        fs.copyFileSync(src, dst);
        console.log(`✓ Project context → .ai-standards/${path.basename(dst)} (${stack})`);
        written = true;
      }
    }
  });
  
  if (!written) {
    console.log('⚠ No project templates found. Run "ai bootstrap --user" first.');
  }
}

function updateCommand() {
  banner();
  console.log('Updating AI standards from source...\n');
  
  // Re-run bootstrap to update everything
  bootstrapUser();
  
  console.log('\n✓ Update complete. Re-run sync in your projects to apply changes.');
}

function printCommand(target: string) {
  banner();
  
  const distDir = path.join(HOME, '.ai-standards/dist');
  const files: Record<string, string> = {
    'copilot': 'COPILOT_RULES.md',
    'cursor': 'CURSOR_RULES.md',
    'gemini': 'GEMINI_SYSTEM.md',
    'opencode': 'OPENCODE_AGENTS.md',
    'warp': 'WARP.md',
    'warp-global': 'WARP_GLOBAL.md'
  };
  
  const file = files[target];
  if (!file) {
    console.error(`Unknown target: ${target}`);
    console.log('Available targets: copilot, cursor, gemini, opencode, warp, warp-global');
    return;
  }
  
  const filePath = path.join(distDir, file);
  if (!exists(filePath)) {
    console.error(`File not found: ${filePath}`);
    console.log('Run "ai bootstrap --user" first to generate files.');
    return;
  }
  
  console.log(`\n=== ${target.toUpperCase()} RULES ===\n`);
  console.log(read(filePath));
}

// Main CLI logic
async function main() {
  const { cmd, flags } = parseArgv();

  switch(cmd) {
  case 'bootstrap':
    if (flags.user) {
      bootstrapUser();
      await checkAndNotifyUpdates();
    } else {
      banner();
      console.log('Usage: ai bootstrap --user');
      console.log('  Installs global agents and settings in user home directory');
    }
    break;
    
  case 'sync':
    // Run harvest if requested
    if (flags['with-harvest']) {
      harvest();
    }
    
    // Run build to generate dist files
    run(path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:')), './build.js'), []);
    
    // Check for updates after sync completion
    await checkAndNotifyUpdates();
    
    // Write to project locations as requested
    if (flags['cursor-here']) {
      writeCursorHere(process.cwd(), flags['cursor-split']);
    }
    if (flags['warp-here']) {
      writeWarpHere(process.cwd());
    }
    if (flags['gemini-here']) {
      writeGeminiHere(process.cwd());
    }
    if (flags['copilot-here']) {
      writeCopilotHere(process.cwd());
    }
    if (flags['opencode-here']) {
      writeOpenCodeHere(process.cwd());
    }
    if (flags['project-context']) {
      writeProjectContextHere(process.cwd());
    }
    
    if (!flags['cursor-here'] && !flags['warp-here'] && !flags['gemini-here'] && 
        !flags['copilot-here'] && !flags['opencode-here'] && !flags['project-context']) {
      console.log('\n✓ Sync complete. Files generated in ~/.ai-standards/dist/');
      console.log('Use --cursor-here, --warp-here, --gemini-here, --copilot-here, --opencode-here, --project-context to write to project.');
    }
    break;
    
  case 'harvest':
    harvest({
      clean: flags.clean,
      dryRun: flags['dry-run'],
      packages: flags.packages ? flags.packages.split(',') : undefined
    });
    break;
    
  case 'update':
    updateCommand();
    break;
    
  case 'print':
    if (flags.target) {
      printCommand(flags.target);
    } else {
      banner();
      console.log('Usage: ai print --target=<target>');
      console.log('Targets: copilot, cursor, gemini, opencode, warp, warp-global');
    }
    break;
    
  case 'validate':
    run(path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]):/, '$1:')), './validate.js'), []);
    break;
    
  case 'check-updates':
    banner();
    await checkAndNotifyUpdates();
    break;
    
  case 'help':
  case '--help':
  default:
    banner();
    console.log(`
Commands:
  ai bootstrap --user          Install global agents and settings
  ai sync [options]           Generate and export AI tool configurations
    --with-harvest            Run harvest before sync
    --cursor-here             Write Cursor rules to project
    --cursor-split            Split Cursor rules by category (MDC)
    --copilot-here            Write Copilot instructions to project
    --gemini-here             Write Gemini config to project
    --opencode-here           Write OpenCode agents to project
    --warp-here               Write Warp config to project
    --project-context         Write project-specific context (auto-detected stacks)
  ai harvest [options]        Import AI bundles from dependencies
    --clean                   Clean existing deps before import
    --dry-run                 Preview without making changes
    --packages pkg1,pkg2      Only import specific packages
  ai update                   Update global standards from source
  ai print --target=<target>  Print generated rules for target
  ai validate                 Check if configurations are up to date
  ai check-updates            Check for package updates

Examples:
  ai bootstrap --user
  ai harvest && ai sync --cursor-here --cursor-split
  ai sync --copilot-here --gemini-here --opencode-here --project-context
  ai validate
  ai check-updates
`);
  }
}

// Execute main function
main().catch(console.error);