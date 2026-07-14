export type RetryClass = 'safe' | 'needs_idempotency_key' | 'needs_human_approval' | 'do_not_retry';
export interface ActionLog { connector: string; action: string; status?: string; error?: string; payload?: Record<string, unknown>; evidence?: string[]; idempotencyKey?: string | null; }
export interface RetryPlan { source: string; connector: string; action: string; classification: RetryClass; approval: 'none' | 'recommended' | 'required'; rationale: string[]; idempotencyKey?: string | null; evidence: string[]; nextSteps: string[]; }
const writeLike = [/post/i, /send/i, /comment/i, /create/i, /update/i, /delete/i, /write/i];
export function classify(log: ActionLog): Omit<RetryPlan,'source'> {
  const action = log.action || 'unknown';
  const connector = log.connector || 'unknown';
  const rationale: string[] = [];
  const evidence = Array.isArray(log.evidence) ? log.evidence : [];
  const mutates = writeLike.some((rule) => rule.test(action));
  const hasKey = Boolean(log.idempotencyKey);
  if (/delete/i.test(action)) {
    rationale.push('Delete-like operations are irreversible without live provider state.');
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
export function planFromLog(source: string, log: ActionLog): RetryPlan { return { source, ...classify(log) }; }
export function renderMarkdown(plan: RetryPlan): string {
  return ['# Connector Retry Dry-Run Plan','',`Source: ${plan.source}`,`Connector: ${plan.connector}`,`Action: ${plan.action}`,`Classification: ${plan.classification}`,`Approval: ${plan.approval}`,'','## Rationale',...plan.rationale.map((item)=>`- ${item}`),'','## Evidence',...(plan.evidence.length ? plan.evidence.map((item)=>`- ${item}`) : ['- none recorded']),'','## Next Steps',...plan.nextSteps.map((item)=>`- ${item}`),''].join('\n');
}
export function checkPlan(plan: RetryPlan, requireApproval: 'none' | 'risky' | 'all' = 'risky'): string[] {
  const failures: string[] = [];
  if (requireApproval === 'all' && plan.approval === 'none') failures.push('approval required for all plans but this plan has none');
  if (requireApproval === 'risky' && ['needs_idempotency_key','needs_human_approval','do_not_retry'].includes(plan.classification) && plan.approval === 'none') failures.push('risky plan must include approval guidance');
  if (plan.classification === 'needs_idempotency_key' && plan.idempotencyKey) failures.push('classification says idempotency key is missing but key is present');
  if (plan.classification === 'do_not_retry') failures.push('plan is marked do_not_retry');
  return failures;
}
