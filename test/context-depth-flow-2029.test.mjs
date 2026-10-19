// Browser acceptance for the context-depth card flow (real clicks on the production card, exact return, region landing).
// Runs scripts/context-depth-acceptance.mjs; skipped when Playwright/Chromium are not available.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const chrome = process.env.PERF_CHROME || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
const playwright = existsSync(`${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/playwright`);
test("context-depth card flow: 787 block, image 30691, exact return, tags, publication, year hint", { skip: !chrome || !playwright, timeout: 300000 }, () => {
  const script = fileURLToPath(new URL("../scripts/context-depth-acceptance.mjs", import.meta.url));
  const run = spawnSync(process.execPath, [script, mkdtempSync(join(tmpdir(), "ctxdepth-flow-"))], { encoding: "utf8", timeout: 280000 });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`.slice(-2500));
  assert.match(run.stdout, /opens the exact 787 block/);
  assert.match(run.stdout, /opens image 30691/);
});
