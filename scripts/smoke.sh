#!/usr/bin/env bash
set -euo pipefail
rm -rf .tmp
mkdir -p .tmp
npm run cli -- plan fixtures/slack-failure.json --out .tmp/retry-plan.md --json .tmp/retry-plan.json
npm run cli -- check .tmp/retry-plan.json --require-approval risky

test -s .tmp/retry-plan.md
test -s .tmp/retry-plan.json
