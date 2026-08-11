#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const workspace = mkdtempSync(join(tmpdir(), "connector-retry-package-smoke-"));

try {
  const output = execFileSync("npm", ["pack", "--json", "--pack-destination", workspace], {
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

  execFileSync("npm", ["init", "--yes"], { cwd: workspace, stdio: "ignore" });
  execFileSync("npm", ["install", "--ignore-scripts", join(workspace, pack.filename)], {
    cwd: workspace,
    stdio: "ignore"
  });

  const probe = join(workspace, "probe.mjs");
  writeFileSync(probe, `
import { planFromLog } from "connector-retry-dryrun-skill";
const plan = planFromLog("smoke", { connector: "github", action: "issues.get" });
if (plan.classification !== "safe") throw new Error(JSON.stringify(plan));
`);
  execFileSync(process.execPath, [probe], { cwd: workspace, stdio: "inherit" });

  const fixture = join(workspace, "node_modules", "connector-retry-dryrun-skill", "fixtures", "slack-failure.json");
  const cli = join(workspace, "node_modules", ".bin", "connector-retry-dryrun");
  const cliOutput = execFileSync(cli, ["plan", fixture], { cwd: workspace, encoding: "utf8" });
  if (!cliOutput.includes("Classification: needs_idempotency_key")) {
    throw new Error(`Packed CLI returned an unexpected plan:\n${cliOutput}`);
  }

  console.log(`package smoke ok: ${pack.filename} includes ${pack.files.length} files; library and CLI consumer probes passed`);
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
