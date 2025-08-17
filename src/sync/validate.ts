
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import os from 'os';
import pkg from '../../package.json' assert { type: 'json' };

function banner() {
  console.log(`
   _         _                         _                 _       
  / \  _   _(_)_ __    __ _ _ __   ___| | ___   __ _  __| | ___ 
 / _ \| | | | | '_ \  / _\` | '_ \ / __| |/ _ \ / _\` |/ _\` |/ _ \
/ ___ \ |_| | | | | || (_| | | | | (__| | (_) | (_| | (_| |  __/
/_/   \_\__,_|_|_| |_(_)__,_|_| |_|\___|_|\___/ \__,_|\__,_|\___|  validate
`);
}

const exists=p=>{ try{return fs.existsSync(p);}catch{return false;}};
const mtime=p=>{ try{return fs.statSync(p).mtimeMs;}catch{return 0;}};

(function(){
  banner();
  const home=os.homedir();
  const dist=path.join(home,'.ai-standards/dist');
  const need=['COPILOT_RULES.md','GEMINI_SYSTEM.md','CURSOR_RULES.md','WARP.md','WARP_GLOBAL.md'];
  const missing=need.filter(f=>!exists(path.join(dist,f)));
  if(missing.length){ console.log('Global dist missing:'); missing.forEach(m=>console.log(' - '+m)); console.log('Run: ai bootstrap --user'); } else { console.log('✓ Global dist OK'); }

  const cwd=process.cwd();
  const repoChecks=[
    ['.github/copilot-instructions.md', path.join(dist,'COPILOT_RULES.md'), 'ai sync --copilot-here'],
    ['.cursor/rules/ai-standards.mdc', path.join(dist,'CURSOR_RULES.md'), 'ai sync --cursor-here'],
    ['.gemini/GEMINI.md', path.join(dist,'GEMINI_SYSTEM.md'), 'ai sync --gemini-here'],
    ['.opencode/AGENTS.md', path.join(dist,'WARP.md'), 'ai sync --opencode-here'],
    ['WARP.md', path.join(dist,'WARP.md'), 'ai sync --warp-here']
  ];
  for(const [dst, ref, cmd] of repoChecks){
    const p=path.join(cwd, dst);
    if(!exists(p)) console.log(`Missing ${dst} → ${cmd}`);
    else if (exists(ref) && mtime(ref)>mtime(p)) console.log(`${dst} outdated → ${cmd}`);
    else console.log(`✓ ${dst}`);
  }
  console.log('\nVersion: v'+pkg.version);
  console.log('Update global: npm update -g @yourorg/ai-standards && ai update');
  console.log('Update repo  : ai harvest && ai sync --cursor-here --warp-here --gemini-here --copilot-here --opencode-here');
})();
