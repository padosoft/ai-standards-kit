#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import os from 'os';
import pkg from '../../package.json' with { type: 'json' };

function banner() {
  console.log(`
   _         _                         _                 _       
  / \\  _   _(_)_ __    __ _ _ __   ___| | ___   __ _  __| | ___ 
 / _ \\| | | | | '_ \\  / _\` | '_ \\ / __| |/ _ \\ / _\` |/ _\` |/ _ \\
/ ___ \\ |_| | | | | || (_| | | | | (__| | (_) | (_| | (_| |  __/
/_/   \\_\\__,_|_|_| |_(_)__,_|_| |_|\\___|_|\\___/ \\__,_|\\__,_|\\___|  validate
                        @padosoft/ai-standards v${pkg.version}
`);
}

const exists = (p: string) => { 
  try { return fs.existsSync(p); } catch { return false; }
};

const mtime = (p: string) => { 
  try { return fs.statSync(p).mtimeMs; } catch { return 0; }
};

const formatDate = (ms: number) => {
  return new Date(ms).toISOString().split('T')[0];
};

interface ValidationResult {
  file: string;
  status: 'ok' | 'missing' | 'outdated';
  message?: string;
}

function validateGlobalFiles(): ValidationResult[] {
  const home = os.homedir();
  const dist = path.join(home, '.ai-standards/dist');
  const results: ValidationResult[] = [];
  
  const expectedFiles = [
    'COPILOT_RULES.md',
    'GEMINI_SYSTEM.md', 
    'CURSOR_RULES.md',
    'OPENCODE_AGENTS.md',
    'WARP.md',
    'WARP_GLOBAL.md'
  ];
  
  expectedFiles.forEach(file => {
    const filePath = path.join(dist, file);
    if (!exists(filePath)) {
      results.push({ file, status: 'missing' });
    } else {
      results.push({ file, status: 'ok' });
    }
  });
  
  // Check global tool installations
  const globalChecks = [
    { path: path.join(home, '.claude/agents'), name: 'Claude agents' },
    { path: path.join(home, '.gemini/GEMINI.md'), name: 'Gemini global' },
    { path: path.join(home, '.config/github-copilot/intellij/global-copilot-instructions.md'), name: 'Copilot global' },
    { path: path.join(home, '.config/opencode/AGENTS.md'), name: 'OpenCode global' }
  ];
  
  globalChecks.forEach(check => {
    if (!exists(check.path)) {
      results.push({ 
        file: check.name, 
        status: 'missing',
        message: `Missing at ${check.path}`
      });
    } else {
      results.push({ file: check.name, status: 'ok' });
    }
  });
  
  return results;
}

function validateProjectFiles(cwd: string): ValidationResult[] {
  const home = os.homedir();
  const dist = path.join(home, '.ai-standards/dist');
  const results: ValidationResult[] = [];
  
  const projectChecks = [
    { 
      dst: '.github/copilot-instructions.md', 
      ref: path.join(dist, 'COPILOT_RULES.md'), 
      cmd: 'ai sync --copilot-here' 
    },
    { 
      dst: '.cursor/rules/ai-standards.mdc', 
      ref: path.join(dist, 'CURSOR_RULES.md'), 
      cmd: 'ai sync --cursor-here' 
    },
    { 
      dst: '.gemini/GEMINI.md', 
      ref: path.join(dist, 'GEMINI_SYSTEM.md'), 
      cmd: 'ai sync --gemini-here' 
    },
    { 
      dst: '.opencode/AGENTS.md', 
      ref: path.join(dist, 'OPENCODE_AGENTS.md'), 
      cmd: 'ai sync --opencode-here' 
    },
    { 
      dst: 'WARP.md', 
      ref: path.join(dist, 'WARP.md'), 
      cmd: 'ai sync --warp-here' 
    }
  ];
  
  projectChecks.forEach(check => {
    const dstPath = path.join(cwd, check.dst);
    
    if (!exists(dstPath)) {
      results.push({ 
        file: check.dst, 
        status: 'missing',
        message: `Run: ${check.cmd}`
      });
    } else if (exists(check.ref) && mtime(check.ref) > mtime(dstPath)) {
      results.push({ 
        file: check.dst, 
        status: 'outdated',
        message: `Updated ${formatDate(mtime(check.ref))} → ${check.cmd}`
      });
    } else {
      results.push({ file: check.dst, status: 'ok' });
    }
  });
  
  // Check for harvest dependencies
  const depsCache = path.join(cwd, '.ai-standards-cache.json');
  if (exists(depsCache)) {
    try {
      const cache = JSON.parse(fs.readFileSync(depsCache, 'utf8'));
      const age = Date.now() - cache.timestamp;
      const days = Math.floor(age / (1000 * 60 * 60 * 24));
      
      if (days > 7) {
        results.push({
          file: 'Dependencies cache',
          status: 'outdated',
          message: `${days} days old. Run: ai harvest`
        });
      } else {
        results.push({
          file: 'Dependencies cache',
          status: 'ok',
          message: `${cache.bundles.length} bundles imported`
        });
      }
    } catch {
      // Invalid cache
    }
  }
  
  return results;
}

function checkForUpdates() {
  // In a real scenario, this would check npm registry
  console.log(`\nCurrent version: v${pkg.version}`);
  console.log('Check for updates: npm view @padosoft/ai-standards version');
}

function main() {
  banner();
  
  console.log('\n📋 GLOBAL VALIDATION\n' + '='.repeat(50));
  
  const globalResults = validateGlobalFiles();
  const globalMissing = globalResults.filter(r => r.status === 'missing');
  const globalOutdated = globalResults.filter(r => r.status === 'outdated');
  
  if (globalMissing.length > 0) {
    console.log('\n❌ Missing global files:');
    globalMissing.forEach(r => {
      console.log(`  - ${r.file} ${r.message || ''}`);
    });
    console.log('\n💡 Fix: ai bootstrap --user');
  }
  
  if (globalOutdated.length > 0) {
    console.log('\n⚠️  Outdated global files:');
    globalOutdated.forEach(r => {
      console.log(`  - ${r.file} ${r.message || ''}`);
    });
    console.log('\n💡 Fix: ai update');
  }
  
  const globalOk = globalResults.filter(r => r.status === 'ok');
  if (globalOk.length > 0) {
    console.log(`\n✅ Global files OK: ${globalOk.length}/${globalResults.length}`);
  }
  
  console.log('\n📋 PROJECT VALIDATION\n' + '='.repeat(50));
  
  const cwd = process.cwd();
  const projectResults = validateProjectFiles(cwd);
  const projectMissing = projectResults.filter(r => r.status === 'missing');
  const projectOutdated = projectResults.filter(r => r.status === 'outdated');
  
  if (projectMissing.length > 0) {
    console.log('\n❌ Missing project files:');
    projectMissing.forEach(r => {
      console.log(`  - ${r.file}`);
      if (r.message) console.log(`    → ${r.message}`);
    });
  }
  
  if (projectOutdated.length > 0) {
    console.log('\n⚠️  Outdated project files:');
    projectOutdated.forEach(r => {
      console.log(`  - ${r.file}`);
      if (r.message) console.log(`    → ${r.message}`);
    });
  }
  
  const projectOk = projectResults.filter(r => r.status === 'ok');
  if (projectOk.length > 0) {
    console.log(`\n✅ Project files OK: ${projectOk.length}/${projectResults.length}`);
    projectOk.forEach(r => {
      if (r.message) console.log(`  - ${r.file}: ${r.message}`);
    });
  }
  
  console.log('\n📋 RECOMMENDED ACTIONS\n' + '='.repeat(50));
  
  if (globalMissing.length > 0) {
    console.log('\n1. Install global standards:');
    console.log('   ai bootstrap --user');
  }
  
  if (globalOutdated.length > 0 || projectOutdated.length > 0) {
    console.log('\n2. Update global package:');
    console.log('   npm update -g @padosoft/ai-standards');
    console.log('   ai update');
  }
  
  if (projectMissing.length > 0 || projectOutdated.length > 0) {
    console.log('\n3. Sync project files:');
    console.log('   ai harvest');
    console.log('   ai sync --cursor-here --warp-here --gemini-here --copilot-here --opencode-here');
  }
  
  checkForUpdates();
  
  // Exit code
  const totalIssues = globalMissing.length + globalOutdated.length + 
                     projectMissing.length + projectOutdated.length;
  
  if (totalIssues === 0) {
    console.log('\n✨ All validations passed!');
    process.exit(0);
  } else {
    console.log(`\n⚠️  Found ${totalIssues} issue(s) to resolve.`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}