#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
import { planFromLog, renderMarkdown, checkPlan } from './index.js';
function arg(name: string, fallback?: string): string | undefined { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i+1] : fallback; }
function save(file: string | undefined, body: string) { if (!file) return; fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, body); }
const cmd = process.argv[2];
try {
  if (cmd === 'plan') { const source = process.argv[3]; if (!source) throw new Error('missing action log'); const log = JSON.parse(fs.readFileSync(source,'utf8')); const plan = planFromLog(source, log); save(arg('--out'), renderMarkdown(plan)); save(arg('--json'), JSON.stringify(plan,null,2)+'\n'); if (!arg('--out') && !arg('--json')) console.log(renderMarkdown(plan)); }
  else if (cmd === 'check') { const file = process.argv[3]; if (!file) throw new Error('missing plan json'); const plan = JSON.parse(fs.readFileSync(file,'utf8')); const failures = checkPlan(plan, arg('--require-approval','risky') as 'none' | 'risky' | 'all'); if (failures.length) { console.error(failures.join('\n')); process.exit(1); } console.log('retry plan check passed'); }
  else { console.error('usage: connector-retry-dryrun plan <log.json> | check <plan.json>'); process.exit(1); }
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); }
