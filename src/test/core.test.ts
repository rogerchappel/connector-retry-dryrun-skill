import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { planFromLog, checkPlan } from '../index.js';
test('classifies mutation without idempotency as approval gated', () => { const log = JSON.parse(fs.readFileSync('fixtures/slack-failure.json','utf8')); const plan = planFromLog('fixtures/slack-failure.json', log); assert.equal(plan.classification, 'needs_idempotency_key'); assert.equal(checkPlan(plan).length, 0); });
test('classifies keyed update with approval guidance', () => { const log = JSON.parse(fs.readFileSync('fixtures/crm-update.json','utf8')); const plan = planFromLog('fixtures/crm-update.json', log); assert.equal(plan.classification, 'needs_human_approval'); assert.equal(plan.approval, 'recommended'); });
