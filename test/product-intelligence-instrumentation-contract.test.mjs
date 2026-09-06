import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const pi = read("src/lib/productIntelligence.js");
const probe = read("src/components/ProductExperimentProbe.jsx");
const lock = read("src/components/MaintenanceLock.jsx");
const layout = read("src/components/layout/Layout.jsx");

test("product intelligence reuses existing event metadata contract", () => {
  assert.match(pi, /product_intelligence_experiment_v1/);
  assert.match(pi, /core-tool-reachability-restore-20260906/);
  assert.match(pi, /change_ref:\s*"main:822f71fc"/);
  assert.match(pi, /shabbat_status:\s*"not_computed"/);
  assert.match(pi, /track\(surface,/);
});

test("core-tool restore probe covers the restored routes without changing routing", () => {
  assert.match(probe, /pathname === "\/research"/);
  assert.match(probe, /pathname === "\/code"/);
  assert.match(probe, /pathname === "\/beit-midrash"/);
  assert.match(probe, /pathname\.startsWith\("\/number\/"\)/);
  assert.match(probe, /entry_kind/);
  assert.match(layout, /<ProductExperimentProbe \/>/);
});

test("maintenance locks emit exposure telemetry with flag and path context", () => {
  assert.match(lock, /"maintenance-lock"/);
  assert.match(lock, /"exposure"/);
  assert.match(lock, /lock_flag/);
  assert.match(lock, /lock_mode/);
  assert.match(lock, /useLockExposureTelemetry/);
});
