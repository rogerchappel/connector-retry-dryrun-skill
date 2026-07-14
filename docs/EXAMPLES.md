# Examples

```bash
connector-retry-dryrun plan fixtures/slack-failure.json --out .tmp/retry-plan.md --json .tmp/retry-plan.json
connector-retry-dryrun check .tmp/retry-plan.json --require-approval risky
```

Reports are designed for release-candidate PR bodies and agent handoffs.
