import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT = process.cwd();
export const HOME = os.homedir();

// Get the path to the standards package (works in monorepo and installed package)
export function getStandardsPath(): string {
  // Try monorepo path first (../../standards from cli/src/sync)
  const monorepoPath = path.resolve(__dirname, '../../../standards');
  if (fs.existsSync(path.join(monorepoPath, 'package.json'))) {
    return monorepoPath;
  }

  // Try node_modules resolution
  try {
    const standardsIndex = require.resolve('@padosoft/ai-standards');
    return path.dirname(standardsIndex);
  } catch {
    // Fallback: try relative from cli package
    const cliPackagePath = path.resolve(__dirname, '../../..');
    const nodeModulesPath = path.join(cliPackagePath, 'node_modules/@padosoft/ai-standards');
    if (fs.existsSync(nodeModulesPath)) {
      return nodeModulesPath;
    }
  }

  // Last resort: use root node_modules in monorepo
  const rootNodeModules = path.resolve(__dirname, '../../../../node_modules/@padosoft/ai-standards');
  if (fs.existsSync(rootNodeModules)) {
    return rootNodeModules;
  }

  throw new Error('Could not find @padosoft/ai-standards package. Run npm install first.');
}

// Get the CLI package path (for adapters/templates)
export function getCliPath(): string {
  // From cli/src/sync -> cli
  return path.resolve(__dirname, '../..');
}
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

function compareVersions(current: string, latest: string): number {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  const maxLength = Math.max(currentParts.length, latestParts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const curr = currentParts[i] || 0;
    const lat = latestParts[i] || 0;
    
    if (curr < lat) return -1;
    if (curr > lat) return 1;
  }
  
  return 0;
}

export async function checkForUpdates(packageName: string, currentVersion: string): Promise<{hasUpdate: boolean, latestVersion: string, updateUrl: string}> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const latestVersion = data.version;
    const hasUpdate = compareVersions(currentVersion, latestVersion) < 0;
    
    return {
      hasUpdate,
      latestVersion,
      updateUrl: `npm update -g ${packageName}`
    };
  } catch (error) {
    // Fallback silenzioso se registry non disponibile
    return {
      hasUpdate: false,
      latestVersion: currentVersion,
      updateUrl: `npm update -g ${packageName}`
    };
  }
}
