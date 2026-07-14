#!/usr/bin/env bash
set -euo pipefail
rm -rf .tmp
mkdir -p .tmp
node dist/cli.js plan fixtures/slack-failure.json --out .tmp/retry-plan.md --json .tmp/retry-plan.json
node dist/cli.js check .tmp/retry-plan.json --require-approval risky
