export type RetryClass = 'safe' | 'needs_idempotency_key' | 'needs_human_approval' | 'do_not_retry';
export type ApprovalPolicy = 'none' | 'risky' | 'all';
export interface ActionLog { connector: string; action: string; status?: string; error?: string; payload?: Record<string, unknown>; evidence?: string[]; idempotencyKey?: string | null; }
export interface RetryPlan { source: string; connector: string; action: string; classification: RetryClass; approval: 'none' | 'recommended' | 'required'; rationale: string[]; idempotencyKey?: string | null; evidence: string[]; nextSteps: string[]; }
const mutationVerbs = new Set([
  'post', 'send', 'comment', 'create', 'update', 'patch', 'put', 'upsert',
  'add', 'delete', 'remove', 'archive', 'write', 'publish', 'upload'
]);
const irreversibleVerbs = new Set(['delete', 'remove', 'archive']);
const retryClasses: RetryClass[] = ['safe', 'needs_idempotency_key', 'needs_human_approval', 'do_not_retry'];
const approvals: RetryPlan['approval'][] = ['none', 'recommended', 'required'];
const approvalPolicies: ApprovalPolicy[] = ['none', 'risky', 'all'];
function object(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
}
function text(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string`);
}
function optionalText(value: unknown, label: string): void {
  if (value !== undefined && value !== null) text(value, label);
}
function stringList(value: unknown, label: string, allowEmpty: boolean): asserts value is string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  if (!allowEmpty && value.length === 0) throw new Error(`${label} must contain at least one item`);
  value.forEach((item, index) => text(item, `${label}[${index}]`));
}
export function validateActionLog(value: unknown): asserts value is ActionLog {
  object(value, 'action log');
  text(value.connector, 'action log.connector');
  text(value.action, 'action log.action');
  optionalText(value.status, 'action log.status');
  optionalText(value.error, 'action log.error');
  if (value.payload !== undefined) object(value.payload, 'action log.payload');
  if (value.evidence !== undefined) stringList(value.evidence, 'action log.evidence', true);
  optionalText(value.idempotencyKey, 'action log.idempotencyKey');
}
export function validateRetryPlan(value: unknown): asserts value is RetryPlan {
  object(value, 'retry plan');
  text(value.source, 'retry plan.source');
  text(value.connector, 'retry plan.connector');
  text(value.action, 'retry plan.action');
  if (!retryClasses.includes(value.classification as RetryClass)) throw new Error(`retry plan.classification must be one of: ${retryClasses.join(', ')}`);
  if (!approvals.includes(value.approval as RetryPlan['approval'])) throw new Error(`retry plan.approval must be one of: ${approvals.join(', ')}`);
  stringList(value.rationale, 'retry plan.rationale', false);
  stringList(value.evidence, 'retry plan.evidence', true);
  stringList(value.nextSteps, 'retry plan.nextSteps', false);
  optionalText(value.idempotencyKey, 'retry plan.idempotencyKey');
  if (value.classification === 'safe' && value.approval !== 'none') throw new Error('safe classification requires approval "none"');
  if (value.classification === 'needs_idempotency_key' && value.approval !== 'required') throw new Error('needs_idempotency_key classification requires approval "required"');
  if (value.classification === 'needs_idempotency_key' && value.idempotencyKey != null) throw new Error('needs_idempotency_key classification requires a null or absent idempotencyKey');
  if (value.classification === 'needs_human_approval' && !['recommended', 'required'].includes(value.approval as string)) throw new Error('needs_human_approval classification requires recommended or required approval');
  if (value.classification === 'needs_human_approval' && value.idempotencyKey == null) throw new Error('needs_human_approval classification requires a non-empty idempotencyKey');
  if (value.classification === 'do_not_retry' && value.approval !== 'required') throw new Error('do_not_retry classification requires approval "required"');
}
export function parseApprovalPolicy(value: unknown): ApprovalPolicy {
  if (!approvalPolicies.includes(value as ApprovalPolicy)) throw new Error(`--require-approval must be one of: ${approvalPolicies.join(', ')}`);
  return value as ApprovalPolicy;
}
function actionSegments(action: string): string[] {
  return action
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
export function classify(log: ActionLog): Omit<RetryPlan,'source'> {
  validateActionLog(log);
  const action = log.action;
  const connector = log.connector;
  const rationale: string[] = [];
  const evidence = Array.isArray(log.evidence) ? log.evidence : [];
  const segments = actionSegments(action);
  const mutates = segments.some((segment) => mutationVerbs.has(segment));
  const hasKey = Boolean(log.idempotencyKey);
  if (segments.some((segment) => irreversibleVerbs.has(segment))) {
    rationale.push('Delete-like or archival operations are irreversible without live provider state.');
    return { connector, action, classification:'do_not_retry', approval:'required', rationale, idempotencyKey:log.idempotencyKey ?? null, evidence, nextSteps:['Do not retry automatically. Ask a human owner to inspect provider state.'] };
  }
  if (!mutates) {
    rationale.push('Read-only action name does not imply an external mutation.');
    return { connector, action, classification:'safe', approval:'none', rationale, idempotencyKey:log.idempotencyKey ?? null, evidence, nextSteps:['Retry may be queued after preserving the original failure evidence.'] };
  }
  if (hasKey) {
    rationale.push('Mutation has an idempotency key that can be reused for a single retry attempt.');
    return { connector, action, classification:'needs_human_approval', approval:'recommended', rationale, idempotencyKey:log.idempotencyKey ?? null, evidence, nextSteps:['Confirm the original request did not complete visibly.', 'Retry once with the same idempotency key.'] };
  }
  rationale.push('Mutation lacks an idempotency key, so a blind retry may duplicate side effects.');
  return { connector, action, classification:'needs_idempotency_key', approval:'required', rationale, idempotencyKey:null, evidence, nextSteps:['Create or recover a stable idempotency key.', 'Get human approval before retrying.'] };
}
export function planFromLog(source: string, log: ActionLog): RetryPlan { text(source, 'retry plan.source'); return { source, ...classify(log) }; }
export function renderMarkdown(plan: RetryPlan): string {
  validateRetryPlan(plan);
  return ['# Connector Retry Dry-Run Plan','',`Source: ${plan.source}`,`Connector: ${plan.connector}`,`Action: ${plan.action}`,`Classification: ${plan.classification}`,`Approval: ${plan.approval}`,'','## Rationale',...plan.rationale.map((item)=>`- ${item}`),'','## Evidence',...(plan.evidence.length ? plan.evidence.map((item)=>`- ${item}`) : ['- none recorded']),'','## Next Steps',...plan.nextSteps.map((item)=>`- ${item}`),''].join('\n');
}
export function checkPlan(plan: RetryPlan, requireApproval: ApprovalPolicy = 'risky'): string[] {
  validateRetryPlan(plan);
  parseApprovalPolicy(requireApproval);
  const failures: string[] = [];
  if (requireApproval === 'all' && plan.approval === 'none') failures.push('approval required for all plans but this plan has none');
  if (requireApproval === 'risky' && ['needs_idempotency_key','needs_human_approval','do_not_retry'].includes(plan.classification) && plan.approval === 'none') failures.push('risky plan must include approval guidance');
  if (plan.classification === 'needs_idempotency_key' && plan.idempotencyKey) failures.push('classification says idempotency key is missing but key is present');
  if (plan.classification === 'do_not_retry') failures.push('plan is marked do_not_retry');
  return failures;
}
