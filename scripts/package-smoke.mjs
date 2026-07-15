#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8"
});
const [pack] = JSON.parse(output);
const files = new Set(pack.files.map((file) => file.path));

const required = [
  "dist/cli.js",
  "dist/cli.d.ts",
  "dist/index.js",
  "dist/index.d.ts",
  "README.md",
  "SKILL.md",
  "LICENSE",
  "CHANGELOG.md",
  "fixtures/slack-failure.json",
  "docs/RELEASE_CANDIDATE.md",
  "scripts/smoke.sh"
];
const forbidden = [
  "dist/test/core.test.js",
  "dist/test/core.test.d.ts",
  "src/cli.ts",
  "src/index.ts"
];

const missing = required.filter((file) => !files.has(file));
const unexpected = forbidden.filter((file) => files.has(file));

if (missing.length || unexpected.length) {
  if (missing.length) {
    console.error(`Package smoke failed; missing files:\n${missing.join("\n")}`);
  }
  if (unexpected.length) {
    console.error(`Package smoke failed; unexpectedly packed:\n${unexpected.join("\n")}`);
  }
  process.exit(1);
}

console.log(`package smoke ok: ${pack.filename} includes ${pack.files.length} files`);
