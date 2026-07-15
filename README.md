# Connector Retry Dry-Run Skill

Local-first retry planner for connector actions with idempotency and approval evidence.

## Quickstart

```bash
npm install
npm run release:check
connector-retry-dryrun plan fixtures/slack-failure.json --out .tmp/retry-plan.md --json .tmp/retry-plan.json
connector-retry-dryrun check .tmp/retry-plan.json --require-approval risky
```

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
