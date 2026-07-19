#!/usr/bin/env bash
set -euo pipefail

for fixture in fixtures/slack-failure.json fixtures/crm-update.json; do
  printf '\n=== %s ===\n' "$fixture"
  node dist/cli.js plan "$fixture"
done
