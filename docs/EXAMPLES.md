# Examples

## Compare Retry Decisions

Run the repository demo to compare two fixture-backed plans:

```bash
npm install
npm run demo
```

The command renders plans to standard output only. In the Slack timeout case,
the missing idempotency key blocks a blind retry. In the CRM update case, the
existing key permits a one-attempt retry only after checking provider state and
getting the recommended human approval.

## Save and Check a Plan

```bash
connector-retry-dryrun plan fixtures/slack-failure.json --out .tmp/retry-plan.md --json .tmp/retry-plan.json
connector-retry-dryrun check .tmp/retry-plan.json --require-approval risky
```

Reports are designed for release-candidate PR bodies and agent handoffs.
