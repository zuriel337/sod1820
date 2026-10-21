import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isVerifiedReadOnlyHybrid2029, projectHybridPreviewDisplayAccess } from "../src/lib/hybridPreviewVisualAccess2029.js";

const HOST = "sod1820-47ptnhjgh-sod1820-s-projects.vercel.app";
const hosted = {
  build2029: true,
  deployEnv: "preview",
  runtime: "2029",
  hostname: HOST,
  hostedGuard: "a".repeat(64),
  localGuard: "",
};

test("only attested read-only Hosted Hybrid 2029 Preview can open UI", () => {
  assert.equal(isVerifiedReadOnlyHybrid2029(hosted), true);
  for (const change of [
    { deployEnv: "production" },
    { deployEnv: "unknown" },
    { build2029: false },
    { runtime: "legacy" },
    { hostname: "sod1820.co.il" },
    { hostname: "sod1820-sod1820-s-projects.vercel.app" },
    { hostname: "attacker.vercel.app" },
    { hostedGuard: "" },
    { hostedGuard: "checking" },
    { hostedGuard: "blocked" },
    { hostedGuard: "A".repeat(64) },
    { hostedGuard: "a".repeat(63) },
  ]) {
    assert.equal(isVerifiedReadOnlyHybrid2029({ ...hosted, ...change }), false, JSON.stringify(change));
  }
});

test("guarded local hybrid read-only preview may show surfaces; arbitrary local dev cannot", () => {
  const local = { ...hosted, deployEnv: "hybrid-local", hostname: "127.0.0.1", localGuard: "local-read-only", hostedGuard: "" };
  assert.equal(isVerifiedReadOnlyHybrid2029(local), true);
  assert.equal(isVerifiedReadOnlyHybrid2029({ ...local, hostname: "localhost" }), true);
  assert.equal(isVerifiedReadOnlyHybrid2029({ ...local, localGuard: "" }), false);
  assert.equal(isVerifiedReadOnlyHybrid2029({ ...local, deployEnv: "development" }), false);
});

test("read-only preview projects unlocked PRESENTATION without mutating canonical availability", () => {
  const original = Object.freeze({
    enabled: true, mode: "all", blocked: true, allowed: false,
    publicState: "closed", viewerState: "closed", status: "building",
    showLogin: true,
  });
  const projected = projectHybridPreviewDisplayAccess(original, true);
  assert.equal(projected.blocked, false);
  assert.equal(projected.allowed, true);
  assert.equal(projected.enabled, false);
  assert.equal(projected.readOnlyPreview, true);
  assert.equal(original.blocked, true);
  assert.equal(original.enabled, true);
  assert.equal(projectHybridPreviewDisplayAccess(original, false), original);
  assert.equal(projectHybridPreviewDisplayAccess(null, true), null);
});

test("canonical feature resolver and DB are untouched; visual projection stays inside existing UI hook", () => {
  const maintenance = readFileSync(new URL("../src/components/MaintenanceLock.jsx", import.meta.url), "utf8");
  assert.match(maintenance, /projectHybridPreviewDisplayAccess/);
  assert.match(maintenance, /isVerifiedReadOnlyHybrid2029/);
  assert.match(maintenance, /resolveFeatureState\(lock, \{ user, isAdmin, requireFlag \}\)/);
  assert.doesNotMatch(maintenance, /\.update\(\s*\{\s*enabled:\s*false/);
});
