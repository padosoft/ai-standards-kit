#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import yaml from 'js-yaml';
import { ROOT, HOME, read, write, exists, detectStacks, getStandardsPath, getCliPath } from './utils.js';

// Get paths for standards and CLI packages
const STANDARDS_PATH = getStandardsPath();
const CLI_PATH = getCliPath();

interface Target {
  condition?: string;
  outputs: Array<{
    path: string;
    mode?: 'merge' | 'split';
    includes?: string[];
    header_template?: string;
    footer_template?: string;
  }>;
}

function resolveIncludes(patterns: string[]): string[] {
  const files: string[] = [];
  (patterns || []).forEach(pat => {
    // Map old ai/ paths to standards package paths
    const mappedPattern = pat
      .replace(/^ai\/docs\//, 'docs/')
      .replace(/^ai\/.claude\/agents\//, 'agents/')
      .replace(/^ai\/.claude\/config\//, 'config/')
      .replace(/^ai\//, '');

    const matches = fg.sync(mappedPattern, {
      cwd: STANDARDS_PATH,
      onlyFiles: true,
      unique: true,
      dot: false,
      ignore: ['node_modules/**', 'dist/**', '.git/**']
    });
    matches.sort().forEach(m => files.push(m));
  });

  // Also include deps if they exist (within standards package)
  const depsPatterns = patterns.map(p => p.replace(/^ai\//, '').replace('docs/', 'docs/_deps/*/'));
  depsPatterns.forEach(pat => {
    const matches = fg.sync(pat, {
      cwd: STANDARDS_PATH,
      onlyFiles: true,
      unique: true,
      dot: false
    });
    matches.sort().forEach(m => files.push(m));
  });

  return Array.from(new Set(files));
}

function evaluateCondition(condition: string, projectPath: string = ROOT): boolean {
  if (!condition) return true;
  
  // Parse condition (e.g., "composer.json", "package.json && tsconfig.json", "ios || android")
  const parts = condition.split(/\s*(&&|\|\|)\s*/);
  let result = false;
  let operator = '&&';
  
  for (const part of parts) {
    if (part === '&&' || part === '||') {
      operator = part;
      continue;
    }
    
    const fileExists = exists(path.join(projectPath, part.trim()));
    
    if (operator === '&&') {
      result = result && fileExists;
    } else {
      result = result || fileExists;
    }
  }
  
  return result;
}

function processTemplate(content: string, variables: Record<string, string>): string {
  let processed = content;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, value);
  }
  
  return processed;
}

function buildOutput(out: any) {
  const files = resolveIncludes(out.includes || []);

  // Prepare template variables
  const stacks = detectStacks(ROOT);
  const variables = {
    timestamp: new Date().toISOString(),
    stacks_detected: stacks.length > 0
      ? `**Detected Stacks**: ${stacks.map(s => s.replace('-', ' ').toUpperCase()).join(', ')}`
      : '**No specific stacks detected** - using global standards only'
  };

  // Process templates with variables (templates are in CLI package's adapters folder)
  const resolveTemplatePath = (tpl: string) => {
    // Map old adapters/ path to CLI package path
    if (tpl.startsWith('adapters/')) {
      return path.join(CLI_PATH, tpl);
    }
    return path.join(CLI_PATH, 'adapters', tpl);
  };

  const header = out.header_template ? processTemplate(read(resolveTemplatePath(out.header_template)), variables) : '';
  const footer = out.footer_template ? processTemplate(read(resolveTemplatePath(out.footer_template)), variables) : '';

  const sections: string[] = [];
  files.forEach(src => {
    // Files are resolved from STANDARDS_PATH
    const content = read(path.join(STANDARDS_PATH, src));
    // Extract category from path (e.g., docs/standards/global -> global)
    const pathParts = src.split('/');
    const category = pathParts[2] || pathParts[1] || 'general';

    // Add section header for readability
    sections.push(`\n## ${category.toUpperCase().replace('-', ' ')}\n\n${content}`);
  });

  const body = sections.join('\n\n---\n');
  const final = [header, body, footer].filter(Boolean).join('\n\n');

  // Expand home directory (cross-platform)
  const outPath = out.path.startsWith('~/') || out.path.startsWith('~\\')
    ? path.join(HOME, out.path.slice(2))
    : out.path;

  // Ensure directory exists
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  write(outPath, final);
  console.log(`✓ Generated → ${out.path} (${files.length} files merged)`);
}

function main() {
  console.log('\n🔨 Building AI standards exports...\n');
  console.log(`📁 Standards: ${STANDARDS_PATH}`);
  console.log(`📁 CLI: ${CLI_PATH}\n`);

  // Load main targets from CLI package
  const targetsPath = path.join(CLI_PATH, 'adapters/config/targets.yml');
  if (!exists(targetsPath)) {
    console.error('❌ targets.yml not found at:', targetsPath);
    process.exit(1);
  }

  const targets = yaml.load(read(targetsPath)) as Record<string, Target>;

  // Load deps targets if they exist
  const depsTargetsPath = path.join(CLI_PATH, 'adapters/config/targets.deps.yml');
  let depsTargets: Record<string, Target> = {};
  if (exists(depsTargetsPath)) {
    depsTargets = yaml.load(read(depsTargetsPath)) as Record<string, Target>;
    console.log(`📦 Including ${Object.keys(depsTargets).length} dependency targets\n`);
  }

  // Merge targets
  const allTargets = { ...targets, ...depsTargets };

  // Build each target
  Object.entries(allTargets).forEach(([name, config]) => {
    // Check condition if present
    if (config.condition && !evaluateCondition(config.condition)) {
      console.log(`⏭️  Skipping ${name} (condition not met: ${config.condition})`);
      return;
    }

    console.log(`📝 Building target: ${name}`);
    (config.outputs || []).forEach(buildOutput);
  });

  console.log('\n✅ Build complete!\n');
}

// Execute if run directly (works on Windows and Unix)
const isDirectRun = (() => {
  try {
    const scriptPath = process.argv[1];
    if (!scriptPath) return false;
    const scriptUrl = new URL(`file:///${scriptPath.replace(/\\/g, '/')}`).href;
    const moduleUrl = import.meta.url;
    // Normalize both URLs for comparison
    return moduleUrl.replace(/\\/g, '/').toLowerCase() === scriptUrl.toLowerCase();
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  main();
}

export { main, buildOutput, resolveIncludes };