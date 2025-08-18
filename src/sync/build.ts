#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import yaml from 'js-yaml';
import { ROOT, read, write, exists, detectStacks } from './utils.js';

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
    const matches = fg.sync(pat, { 
      cwd: ROOT, 
      onlyFiles: true, 
      unique: true, 
      dot: false, 
      ignore: ['node_modules/**', 'dist/**', '.git/**'] 
    });
    matches.sort().forEach(m => files.push(m));
  });
  
  // Also include deps if they exist
  const depsPatterns = patterns.map(p => p.replace('ai/', 'ai/_deps/*/'));
  depsPatterns.forEach(pat => {
    const matches = fg.sync(pat, { 
      cwd: ROOT, 
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
  
  // Process templates with variables
  const header = out.header_template ? processTemplate(read(path.join(ROOT, out.header_template)), variables) : '';
  const footer = out.footer_template ? processTemplate(read(path.join(ROOT, out.footer_template)), variables) : '';
  
  const sections: string[] = [];
  files.forEach(src => {
    const content = read(path.join(ROOT, src));
    const category = src.split('/')[3] || 'general'; // Extract category from path
    
    // Add section header for readability
    sections.push(`\n## ${category.toUpperCase().replace('-', ' ')}\n\n${content}`);
  });
  
  const body = sections.join('\n\n---\n');
  const final = [header, body, footer].filter(Boolean).join('\n\n');
  
  // Expand home directory
  const outPath = out.path.replace(/^~\//, process.env.HOME + '/').replace(/^~\\/, process.env.HOME + '\\');
  
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
  
  // Load main targets
  const targetsPath = path.join(ROOT, 'adapters/config/targets.yml');
  if (!exists(targetsPath)) {
    console.error('❌ targets.yml not found');
    process.exit(1);
  }
  
  const targets = yaml.load(read(targetsPath)) as Record<string, Target>;
  
  // Load deps targets if they exist
  const depsTargetsPath = path.join(ROOT, 'adapters/config/targets.deps.yml');
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

// Execute if run directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  main();
}

export { main, buildOutput, resolveIncludes };