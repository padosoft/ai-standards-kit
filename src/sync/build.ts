
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import yaml from 'js-yaml';
import { ROOT, read, write } from './utils.js';

function resolveIncludes(patterns: string[]): string[] {
  const files: string[] = [];
  (patterns || []).forEach(pat => {
    const matches = fg.sync(pat, { cwd: ROOT, onlyFiles: true, unique: true, dot: false, ignore:['node_modules/**','dist/**','.git/**'] });
    matches.sort().forEach(m => files.push(m));
  });
  return Array.from(new Set(files));
}

function buildOutput(out: any) {
  const header = out.header_template ? read(path.join(ROOT, out.header_template)) : '';
  const footer = out.footer_template ? read(path.join(ROOT, out.footer_template)) : '';
  const files = resolveIncludes(out.includes || []);
  const body = files.map(src => read(path.join(ROOT, src))).join('\n\n---\n\n');
  const final = [header, body, footer].filter(Boolean).join('\n\n');
  const outPath = out.path.replace(/^~\//, process.env.HOME + '/');
  write(outPath, final);
  console.log(`✓ merge → ${out.path} (files: ${files.length})`);
}

function main(){
  const targets = yaml.load(read(path.join(ROOT, 'adapters/config/targets.yml'))) as any;
  Object.values<any>(targets).forEach(block => (block.outputs||[]).forEach(buildOutput));
}
main();
