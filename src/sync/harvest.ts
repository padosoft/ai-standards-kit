#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import yaml from 'js-yaml';
import { ROOT, read, write, exists, mkdirp } from './utils.js';

interface AiManifest {
  namespace?: string;
  priority?: number;
  compatibility?: {
    stack?: string[];
  };
}

interface HarvestOptions {
  clean?: boolean;
  packages?: string[];
  dryRun?: boolean;
}

function banner() {
  console.log(`
   _         _                         _                 _       
  / \\  _   _(_)_ __    __ _ _ __   ___| | ___   __ _  __| | ___ 
 / _ \\| | | | | '_ \\  / _\` | '_ \\ / __| |/ _ \\ / _\` |/ _\` |/ _ \\
/ ___ \\ |_| | | | | || (_| | | | | (__| | (_) | (_| | (_| |  __/
/_/   \\_\\__,_|_|_| |_(_)__,_|_| |_|\\___|_|\\___/ \\__,_|\\__,_|\\___|  harvest
`);
}

function findAiBundles(cwd: string = ROOT): string[] {
  const patterns = [
    'node_modules/**/ai',
    'vendor/**/ai'
  ];
  
  const bundles: string[] = [];
  patterns.forEach(pattern => {
    const matches = fg.sync(pattern, {
      cwd,
      onlyDirectories: true,
      unique: true,
      ignore: ['**/dist/**', '**/.git/**']
    });
    bundles.push(...matches);
  });
  
  return bundles;
}

function loadManifest(bundlePath: string): AiManifest {
  const manifestPath = path.join(ROOT, bundlePath, 'manifest.json');
  if (exists(manifestPath)) {
    try {
      return JSON.parse(read(manifestPath));
    } catch (e) {
      console.warn(`⚠ Invalid manifest.json in ${bundlePath}`);
    }
  }
  
  // Default manifest from package name
  const pkgName = bundlePath.split('/').slice(-2, -1)[0] || 'unknown';
  return {
    namespace: pkgName,
    priority: 0
  };
}

function copyBundleContent(bundlePath: string, manifest: AiManifest, options: HarvestOptions) {
  const namespace = manifest.namespace || 'unknown';
  const srcBase = path.join(ROOT, bundlePath);
  
  // Copy docs/standards
  const docsPath = path.join(srcBase, 'docs/standards');
  if (exists(docsPath)) {
    const dstDocs = path.join(ROOT, 'docs/standards/_deps', namespace);
    if (!options.dryRun) {
      mkdirp(dstDocs);
      const files = fg.sync('**/*.md', { cwd: docsPath });
      files.forEach(file => {
        const src = path.join(docsPath, file);
        const dst = path.join(dstDocs, file);
        mkdirp(path.dirname(dst));
        fs.copyFileSync(src, dst);
      });
    }
    console.log(`  ✓ Imported docs/standards → _deps/${namespace}`);
  }
  
  // Copy .claude/agents
  const agentsPath = path.join(srcBase, '.claude/agents');
  if (exists(agentsPath)) {
    const dstAgents = path.join(ROOT, '.claude/agents/_deps', namespace);
    if (!options.dryRun) {
      mkdirp(dstAgents);
      const files = fg.sync('**/*.md', { cwd: agentsPath });
      files.forEach(file => {
        const src = path.join(agentsPath, file);
        const dst = path.join(dstAgents, file);
        mkdirp(path.dirname(dst));
        fs.copyFileSync(src, dst);
      });
    }
    console.log(`  ✓ Imported .claude/agents → _deps/${namespace}`);
  }
  
  // Merge targets.yml
  const targetsPath = path.join(srcBase, 'targets.yml');
  if (exists(targetsPath)) {
    const depsTargetsPath = path.join(ROOT, 'adapters/config/targets.deps.yml');
    if (!options.dryRun) {
      const pkgTargets = yaml.load(read(targetsPath)) as any;
      let depsTargets: any = {};
      
      if (exists(depsTargetsPath)) {
        depsTargets = yaml.load(read(depsTargetsPath)) as any;
      }
      
      // Merge with namespace prefix
      Object.keys(pkgTargets).forEach(key => {
        const nsKey = `${namespace}-${key}`;
        depsTargets[nsKey] = pkgTargets[key];
      });
      
      write(depsTargetsPath, yaml.dump(depsTargets));
    }
    console.log(`  ✓ Merged targets.yml → targets.deps.yml`);
  }
}

function updateCache(bundles: string[], manifests: AiManifest[]) {
  const cachePath = path.join(ROOT, '.ai-standards-cache.json');
  const cache = {
    timestamp: Date.now(),
    bundles: bundles.map((b, i) => ({
      path: b,
      namespace: manifests[i].namespace,
      priority: manifests[i].priority
    }))
  };
  write(cachePath, JSON.stringify(cache, null, 2));
}

export function harvest(options: HarvestOptions = {}) {
  banner();
  
  // Clean if requested
  if (options.clean) {
    const depsPaths = [
      path.join(ROOT, 'docs/standards/_deps'),
      path.join(ROOT, '.claude/agents/_deps')
    ];
    depsPaths.forEach(p => {
      if (exists(p)) {
        fs.rmSync(p, { recursive: true, force: true });
        console.log(`✓ Cleaned ${p}`);
      }
    });
  }
  
  // Find bundles
  const bundles = findAiBundles();
  
  if (bundles.length === 0) {
    console.log('No AI bundles found in node_modules or vendor');
    return;
  }
  
  console.log(`Found ${bundles.length} AI bundle(s):`);
  
  // Process each bundle
  const manifests: AiManifest[] = [];
  bundles.forEach(bundlePath => {
    const manifest = loadManifest(bundlePath);
    manifests.push(manifest);
    
    // Filter by package list if provided
    if (options.packages && !options.packages.includes(manifest.namespace || '')) {
      console.log(`  ⊘ Skipping ${manifest.namespace} (not in allowlist)`);
      return;
    }
    
    console.log(`\n→ Processing ${manifest.namespace} (priority: ${manifest.priority})`);
    
    if (options.dryRun) {
      console.log('  [DRY RUN] Would import bundle content');
    } else {
      copyBundleContent(bundlePath, manifest, options);
    }
  });
  
  // Update cache
  if (!options.dryRun) {
    updateCache(bundles, manifests);
    console.log('\n✓ Harvest complete. Cache updated.');
  } else {
    console.log('\n[DRY RUN] Complete. No files modified.');
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options: HarvestOptions = {};
  
  if (args.includes('--clean')) options.clean = true;
  if (args.includes('--dry-run')) options.dryRun = true;
  
  const pkgIdx = args.indexOf('--packages');
  if (pkgIdx !== -1 && args[pkgIdx + 1]) {
    options.packages = args[pkgIdx + 1].split(',');
  }
  
  harvest(options);
}