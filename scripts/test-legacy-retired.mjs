// Legacy is a retired product (ZURIEL decision, 2026-11-05): it is not served, not a compatibility target and not a rollback
// artifact; Git history is the only copy. This gate replaces the former Legacy Production lock. It fails if deployment
// configuration or the release build starts pointing at Legacy again.
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const read = (path) => fs.readFileSync(path, "utf8");
// The hosted release build materializes public-reading-deploy/vercel.json over the working-tree vercel.json (see
// scripts/build-public-reading-production.mjs, platformConfigMaterialization). The repository-root configuration is therefore read
// from the committed bytes whenever Git is available (it always is in CI and in the hosted build), and every configuration that can be in
// effect - the committed root one, the committed public-reading one and the working-tree one - is checked for Legacy targets.
const committed = (path) => { try { return execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
const parse = (text, path) => JSON.parse(text ?? read(path));
const rootConfig = parse(committed("vercel.json"), "vercel.json");
const configs = [
  ["root vercel.json", rootConfig],
  ["public-reading-deploy/vercel.json", parse(committed("public-reading-deploy/vercel.json"), "public-reading-deploy/vercel.json")],
  ["working-tree vercel.json", JSON.parse(read("vercel.json"))],
];

for (const [name, config] of configs) {
  for (const rule of config.rewrites || []) {
    assert.notEqual(String(rule.destination || ""), "/index.html", `${name}: rewrite ${rule.source} must not target the retired Legacy document`);
  }
  for (const rule of config.redirects || []) {
    assert.notEqual(String(rule.destination || ""), "/index.html", `${name}: redirect ${rule.source} must not target the retired Legacy document`);
  }
}
const catchAll = (rootConfig.rewrites || []).find((rule) => rule.source === "/(.*)" && !rule.has);
assert.ok(catchAll, "the root catch-all rewrite must exist");
assert.equal(catchAll.destination, "/2029.html", "the root catch-all must serve the 2029 document");

const releaseBuild = read("scripts/build-public-reading-production.mjs");
assert.equal(/legacy-sw|legacyRollbackWorker|public\/sw\.js/.test(releaseBuild), false, "the release artifact must not carry a Legacy rollback worker");

const pkg = JSON.parse(read("package.json"));
assert.match(pkg.scripts.prebuild, /scripts\/test-legacy-retired\.mjs/, "build must run the Legacy-retired gate");

console.log("Legacy retired gate: PASS");
