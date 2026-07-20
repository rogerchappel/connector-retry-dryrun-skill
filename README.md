# Connector Retry Dry-Run Skill

Local-first retry planner for connector actions with idempotency and approval evidence.

## Quickstart

```bash
npm install
npm run release:check
connector-retry-dryrun plan fixtures/slack-failure.json --out .tmp/retry-plan.md --json .tmp/retry-plan.json
connector-retry-dryrun check .tmp/retry-plan.json --require-approval risky
```

## Runnable Demo

Compare two checked-in failure scenarios without connector credentials, network
access, or output files:

```bash
npm run demo
```

The Slack fixture models a timed-out message post without an idempotency key, so
the planner classifies it as `needs_idempotency_key` with required approval. The
CRM fixture includes an idempotency key, so it is classified as
`needs_human_approval` with recommended approval and a single-retry next step.
The demo renders both Markdown plans to standard output and does not execute a
retry.

## Library

Import from `connector-retry-dryrun-skill` to build local-first automation around the same deterministic planner.

## Safety Notes

- No live connector calls.
- No credential reads.
- No publishing, tagging, or release creation.
- Treat generated Markdown and JSON as review evidence, not execution approval.

## Limitations

V1 uses conservative heuristics and fixture inputs. Provider-specific state should still be checked by a human before risky external actions.

## Verification

```bash
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

`release:check` is the CI and release-candidate gate. It runs TypeScript checks,
fixture-backed tests, the CLI retry-plan smoke path, and an npm pack dry run
after building the CLI.
