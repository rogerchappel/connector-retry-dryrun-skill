import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { planFromLog, checkPlan, validateActionLog, validateRetryPlan } from '../index.js';
test('classifies mutation without idempotency as approval gated', () => { const log = JSON.parse(fs.readFileSync('fixtures/slack-failure.json','utf8')); const plan = planFromLog('fixtures/slack-failure.json', log); assert.equal(plan.classification, 'needs_idempotency_key'); assert.equal(checkPlan(plan).length, 0); });
test('classifies keyed update with approval guidance', () => { const log = JSON.parse(fs.readFileSync('fixtures/crm-update.json','utf8')); const plan = planFromLog('fixtures/crm-update.json', log); assert.equal(plan.classification, 'needs_human_approval'); assert.equal(plan.approval, 'recommended'); });
test('validates every checked-in action log fixture', () => {
  for (const file of fs.readdirSync('fixtures').filter((name) => name.endsWith('.json'))) {
    assert.doesNotThrow(() => validateActionLog(JSON.parse(fs.readFileSync(path.join('fixtures', file), 'utf8'))));
  }
});
test('rejects missing and malformed action log fields', () => {
  assert.throws(() => validateActionLog({}), /action log\.connector must be a non-empty string/);
  assert.throws(() => validateActionLog({ connector: 'slack', action: '', evidence: [] }), /action log\.action must be a non-empty string/);
  assert.throws(() => validateActionLog({ connector: 'slack', action: 'messages.get', evidence: [3] }), /action log\.evidence\[0\] must be a non-empty string/);
});
test('rejects malformed and internally inconsistent retry plans', () => {
  assert.throws(() => validateRetryPlan({}), /retry plan\.source must be a non-empty string/);
  const safe = planFromLog('fixture.json', { connector: 'github', action: 'issues.get' });
  assert.doesNotThrow(() => validateRetryPlan(safe));
  assert.throws(() => validateRetryPlan({ ...safe, classification: 'unknown' }), /retry plan\.classification must be one of/);
  assert.throws(() => validateRetryPlan({ ...safe, approval: 'required' }), /safe classification requires approval "none"/);
  assert.throws(() => validateRetryPlan({ ...safe, rationale: [] }), /retry plan\.rationale must contain at least one item/);
  assert.throws(() => validateRetryPlan({ ...safe, evidence: 'none' }), /retry plan\.evidence must be an array/);
  assert.throws(() => validateRetryPlan({ ...safe, nextSteps: [] }), /retry plan\.nextSteps must contain at least one item/);
});
test('checkPlan validates plans before applying policy', () => {
  assert.throws(() => checkPlan({} as never), /retry plan\.source must be a non-empty string/);
  const keyed = planFromLog('fixture.json', { connector: 'crm', action: 'contact.update', idempotencyKey: 'key-1' });
  assert.throws(() => checkPlan({ ...keyed, idempotencyKey: null }), /needs_human_approval classification requires a non-empty idempotencyKey/);
});
test('compiled CLI rejects empty input, tampered plans, and unsupported approval policy', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'connector-retry-test-'));
  const empty = path.join(directory, 'empty.json');
  fs.writeFileSync(empty, '{}\n');
  const planResult = spawnSync(process.execPath, ['dist/cli.js', 'plan', empty], { encoding: 'utf8' });
  assert.notEqual(planResult.status, 0);
  assert.match(planResult.stderr, /action log\.connector must be a non-empty string/);
  const checkResult = spawnSync(process.execPath, ['dist/cli.js', 'check', empty], { encoding: 'utf8' });
  assert.notEqual(checkResult.status, 0);
  assert.match(checkResult.stderr, /retry plan\.source must be a non-empty string/);
  const fixturePlan = planFromLog('fixture.json', { connector: 'github', action: 'issues.get' });
  const valid = path.join(directory, 'valid.json');
  fs.writeFileSync(valid, JSON.stringify(fixturePlan));
  const policyResult = spawnSync(process.execPath, ['dist/cli.js', 'check', valid, '--require-approval', 'invalid'], { encoding: 'utf8' });
  assert.notEqual(policyResult.status, 0);
  assert.match(policyResult.stderr, /--require-approval must be one of/);
});
