
#!/usr/bin/env node
import { parseArgv, detectStacks, read, write } from './utils.js';
import child_process from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

function banner(){console.log(`
   _         _                         _                 _       
  / \  _   _(_)_ __    __ _ _ __   ___| | ___   __ _  __| | ___ 
 / _ \| | | | | '_ \  / _\` | '_ \ / __| |/ _ \ / _\` |/ _\` |/ _ \
/ ___ \ |_| | | | | || (_| | | | | (__| | (_) | (_| | (_| |  __/
/_/   \_\__,_|_|_| |_(_)__,_|_| |_|\___|_|\___/ \__,_|\__,_|\___|
`);}

function run(nodeFile, extraArgs=[]) { banner(); const p=child_process.spawnSync(process.execPath,[nodeFile,...extraArgs],{stdio:'inherit'}); process.exitCode=p.status??0; }

function bootstrapUser(){
  banner();
  const HOME=os.homedir();
  const srcAI=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../../../ai');
  const dstClaude=path.join(HOME,'.claude'); const dstAI=path.join(HOME,'.ai-standards');
  fs.cpSync(path.join(srcAI,'.claude'),path.join(dstClaude),{recursive:true});
  fs.cpSync(path.join(srcAI,'docs'),path.join(dstAI,'docs'),{recursive:true});
  fs.mkdirSync(path.join(dstAI,'dist'),{recursive:true});
  run(path.resolve(path.dirname(new URL(import.meta.url).pathname),'./build.js'),[]);
  const distDir=path.join(HOME,'.ai-standards/dist');
  const copGlb=path.join(HOME,'.config/github-copilot/intellij/global-copilot-instructions.md');
  fs.mkdirSync(path.dirname(copGlb),{recursive:true});
  if(fs.existsSync(path.join(distDir,'COPILOT_RULES.md'))) fs.copyFileSync(path.join(distDir,'COPILOT_RULES.md'),copGlb);
  const gemGlb=path.join(HOME,'.gemini/GEMINI.md');
  fs.mkdirSync(path.dirname(gemGlb),{recursive:true});
  if(fs.existsSync(path.join(distDir,'GEMINI_SYSTEM.md'))) fs.copyFileSync(path.join(distDir,'GEMINI_SYSTEM.md'),gemGlb);
  const ocGlb=path.join(HOME,'.config/opencode/AGENTS.md');
  fs.mkdirSync(path.dirname(ocGlb),{recursive:true});
  if(fs.existsSync(path.join(distDir,'WARP.md'))) fs.copyFileSync(path.join(distDir,'WARP.md'),ocGlb);
  console.log('✓ bootstrap globals installed');
}

function writeCopilotHere(cwd){ const src=path.join(os.homedir(),'.ai-standards/dist/COPILOT_RULES.md'); const dst=path.join(cwd,'.github/copilot-instructions.md'); fs.mkdirSync(path.dirname(dst),{recursive:true}); fs.copyFileSync(src,dst); console.log('✓ Copilot repo → .github/copilot-instructions.md'); }
function writeCursorHere(cwd){ const src=path.join(os.homedir(),'.ai-standards/dist/CURSOR_RULES.md'); const dir=path.join(cwd,'.cursor/rules'); fs.mkdirSync(dir,{recursive:true}); const content=fs.readFileSync(src,'utf8'); const mdc=`---\ndescription: AI-Standards project rules (merged)\nalwaysApply: true\nglobs:\n---\n\n${content}\n`; fs.writeFileSync(path.join(dir,'ai-standards.mdc'),mdc,'utf8'); fs.writeFileSync(path.join(cwd,'.cursorrules'),content,'utf8'); console.log('✓ Cursor → .cursor/rules/ai-standards.mdc (+ .cursorrules)'); }
function writeGeminiHere(cwd){ const src=path.join(os.homedir(),'.ai-standards/dist/GEMINI_SYSTEM.md'); const dst=path.join(cwd,'.gemini/GEMINI.md'); fs.mkdirSync(path.dirname(dst),{recursive:true}); fs.copyFileSync(src,dst); console.log('✓ Gemini → .gemini/GEMINI.md'); }
function writeOpenCodeHere(cwd){ const src=path.join(os.homedir(),'.ai-standards/dist/WARP.md'); const dst=path.join(cwd,'.opencode/AGENTS.md'); fs.mkdirSync(path.dirname(dst),{recursive:true}); fs.copyFileSync(src,dst); const agentDir=path.join(cwd,'.opencode/agent'); fs.mkdirSync(agentDir,{recursive:true}); fs.writeFileSync(path.join(agentDir,'review.md'),"---\ndescription: Enterprise code review\nmode: subagent\ntemperature: 0.1\n---\nFocus su sicurezza, performance, maintainability.\n",'utf8'); console.log('✓ OpenCode → .opencode/AGENTS.md + agent/review.md'); }

const { cmd, flags } = parseArgv();
switch(cmd){
  case 'bootstrap': if(flags.user) bootstrapUser(); else console.log('ai bootstrap --user'); break;
  case 'sync':
    run(path.resolve(path.dirname(new URL(import.meta.url).pathname),'./build.js'),[]);
    if(flags['cursor-here']) writeCursorHere(process.cwd());
    if(flags['warp-here']) { /* project WARP.md minimal */ const dst=path.join(process.cwd(),'WARP.md'); fs.writeFileSync(dst,'# WARP.md\n','utf8'); console.log('✓ WARP.md (minimal)'); }
    if(flags['gemini-here']) writeGeminiHere(process.cwd());
    if(flags['copilot-here']) writeCopilotHere(process.cwd());
    if(flags['opencode-here']) writeOpenCodeHere(process.cwd());
    break;
  case 'validate': run(path.resolve(path.dirname(new URL(import.meta.url).pathname),'./validate.js'),[]); break;
  case 'help':
  case '--help':
  default:
    console.log('ai --help: bootstrap | sync | harvest | update | print | validate');
}
