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
npm run cli -- plan fixtures/slack-failure.json --out .tmp/retry-plan.md --json .tmp/retry-plan.json
npm run cli -- check .tmp/retry-plan.json --require-approval risky
```

Reports are designed for release-candidate PR bodies and agent handoffs.
Run `npm install` first in a fresh checkout; `npm run cli --` builds and invokes
the local executable without a global install or package link.

Malformed JSON structures are rejected before classification or policy checks:

```bash
printf '{}\n' > .tmp/empty-log.json
npm run cli -- plan .tmp/empty-log.json
# action log.connector must be a non-empty string

npm run cli -- check .tmp/retry-plan.json --require-approval invalid
# --require-approval must be one of: none, risky, all
```

Both commands exit with a nonzero status. See the JSON input schema in the
README before generating logs or plans programmatically.
