#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
import { planFromLog, renderMarkdown, checkPlan } from './index.js';

const usage = 'usage: connector-retry-dryrun plan <log.json> [--out <plan.md>] [--json <plan.json>]\n       connector-retry-dryrun check <plan.json> [--require-approval <none|risky|all>]';
type Parsed = { input: string; options: Map<string, string> };

function usageError(message: string): never { console.error(`error: ${message}\n${usage}`); process.exit(2); }
function parse(command: string | undefined, args: string[]): Parsed {
  const allowed = command === 'plan' ? new Set(['--out', '--json']) : command === 'check' ? new Set(['--require-approval']) : undefined;
  if (!allowed) usageError(command ? `unknown command "${command}"` : 'missing command');
  let input: string | undefined;
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token.startsWith('--')) {
      if (!allowed.has(token)) usageError(`option "${token}" is not valid for ${command}`);
      if (options.has(token)) usageError(`duplicate option "${token}"`);
      const value = args[++index];
      if (!value || value.startsWith('--')) usageError(`option "${token}" requires a value`);
      options.set(token, value);
    } else if (input === undefined) input = token;
    else usageError(`unexpected positional argument "${token}"`);
  }
  if (!input) usageError(command === 'plan' ? 'missing action log' : 'missing plan json');
  return { input, options };
}

function save(file: string | undefined, body: string) { if (!file) return; fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, body); }

const command = process.argv[2];
const { input, options } = parse(command, process.argv.slice(3));
try {
  if (command === 'plan') {
    const log = JSON.parse(fs.readFileSync(input, 'utf8'));
    const plan = planFromLog(input, log);
    save(options.get('--out'), renderMarkdown(plan));
    save(options.get('--json'), JSON.stringify(plan, null, 2) + '\n');
    if (!options.has('--out') && !options.has('--json')) console.log(renderMarkdown(plan));
  } else {
    const plan = JSON.parse(fs.readFileSync(input, 'utf8'));
    const failures = checkPlan(plan, (options.get('--require-approval') ?? 'risky') as 'none' | 'risky' | 'all');
    if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
    console.log('retry plan check passed');
  }
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); }
