
import fs from 'fs';
import path from 'path';
import os from 'os';

export const ROOT = process.cwd();
export const HOME = os.homedir();
export const read = (p: string) => fs.readFileSync(p, 'utf8');
export const exists = (p: string) => fs.existsSync(p);
export const mkdirp = (p: string) => fs.mkdirSync(p, { recursive: true });
export const write = (p: string, data: string) => { mkdirp(path.dirname(p)); fs.writeFileSync(p, data, 'utf8'); };
export function parseArgv(argv = process.argv.slice(2)) {
  const flags: Record<string, any> = {}; const args: string[] = [];
  for (let i=0;i<argv.length;i++){ const a=argv[i]; if(a.startsWith('--')){ const [k,v]=a.split('='); flags[k.replace(/^--/,'')]=v ?? true; } else args.push(a); }
  return { cmd: args[0], args: args.slice(1), flags };
}
export function detectStacks(cwd: string){ const has=(p:string)=>fs.existsSync(path.join(cwd,p)); const s:string[]=[]; if(has('composer.json')) s.push('php-laravel'); if(has('package.json')||has('tsconfig.json')) s.push('ts-hono'); if(has('wrangler.toml')) s.push('cf-workers'); if(has('ios')||has('android')||has('app.json')) s.push('react-native'); return s; }
