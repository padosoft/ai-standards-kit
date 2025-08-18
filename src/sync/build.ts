#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import yaml from 'js-yaml';
import { ROOT, read, write, exists } from './utils.js';

interface Target {
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

function buildOutput(out: any) {
  const header = out.header_template ? read(path.join(ROOT, out.header_template)) : '';
  const footer = out.footer_template ? read(path.join(ROOT, out.footer_template)) : '';
  const files = resolveIncludes(out.includes || []);
  
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