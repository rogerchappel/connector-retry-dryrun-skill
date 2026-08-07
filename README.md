# Connector Retry Dry-Run Skill

Local-first retry planner for connector actions with idempotency and approval evidence.

## Quickstart

```bash
npm install
npm run release:check
npm run cli -- plan fixtures/slack-failure.json --out .tmp/retry-plan.md --json .tmp/retry-plan.json
npm run cli -- check .tmp/retry-plan.json --require-approval risky
```

`npm run cli --` builds and runs the checkout's local CLI; no global install or
package link is required.

`--require-approval` accepts `none`, `risky` (the default), or `all`.

## JSON inputs

An action log must be a JSON object with non-empty string `connector` and
`action` fields. Optional `status`, `error`, and `idempotencyKey` values must be
non-empty strings (`idempotencyKey` may also be `null`); `payload` must be an
object, and `evidence` must be an array of non-empty strings.

A saved retry plan must contain non-empty string `source`, `connector`, and
`action` fields; a supported `classification` and `approval`; non-empty string
arrays for `rationale` and `nextSteps`; and a string array for `evidence`.
Classification, approval, and idempotency must agree:

- `safe` requires `approval: "none"`.
- `needs_idempotency_key` requires `approval: "required"` and no key.
- `needs_human_approval` requires a key and `recommended` or `required`
  approval.
- `do_not_retry` requires `approval: "required"`.

Mutation detection recognizes boundary-delimited action verbs including
`post`, `send`, `comment`, `create`, `update`, `patch`, `put`, `upsert`,
`add`, `edit`, `set`, `move`, `delete`, `remove`, `archive`, `write`, `publish`,
and `upload`. `delete`, `remove`, and `archive` are classified as
`do_not_retry`; the other mutation verbs follow the idempotency-key policy
above. See
[the safety model](docs/SAFETY.md#action-name-heuristic) for boundary examples
and limitations.

The library validators throw deterministic field-specific errors. The CLI
prints the same error to standard error and exits nonzero for malformed input,
tampered/inconsistent plans, or unsupported approval policy values.
Command-line usage errors (unknown, duplicate, misplaced, or valueless options
and unexpected positional arguments) print actionable help to standard error,
exit with status `2`, and are rejected before any output artifact is created.

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
