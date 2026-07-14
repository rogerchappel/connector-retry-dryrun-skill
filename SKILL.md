# Connector Retry Dry-Run Skill

Use this skill when an agent needs to rehearse retry plans for connector actions before any external write happens.

## Required Inputs

- Local repository or fixture path.
- Captured logs or JSON action records.
- Explicit approval before any external action or fixture rewrite.

## Side Effects

Default commands only read local files and write requested reports. Do not use this skill to publish, tag, merge, or call live connector APIs.

## Workflow

1. Run the planner against fixtures or logs.
2. Review JSON and Markdown output.
3. Run the check command.
4. Paste evidence into the release-candidate PR.

## Examples

```bash
connector-retry-dryrun plan fixtures/slack-failure.json --out .tmp/retry-plan.md --json .tmp/retry-plan.json
connector-retry-dryrun check .tmp/retry-plan.json --require-approval risky
```
