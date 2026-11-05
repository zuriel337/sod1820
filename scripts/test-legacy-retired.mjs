// Legacy is a retired product (ZURIEL decision, 2026-11-05): it is not served, not a compatibility target and not a rollback
// artifact; Git history is the only copy. This gate replaces the former Legacy Production lock. It fails if deployment
// configuration or the release build starts pointing at Legacy again.
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const config = JSON.parse(read("vercel.json"));
const rewrites = config.rewrites || [];
const redirects = config.redirects || [];

for (const rule of rewrites) {
  assert.notEqual(String(rule.destination || ""), "/index.html", `rewrite ${rule.source} must not target the retired Legacy document`);
}
for (const rule of redirects) {
  assert.notEqual(String(rule.destination || ""), "/index.html", `redirect ${rule.source} must not target the retired Legacy document`);
}
const catchAll = rewrites.find((rule) => rule.source === "/(.*)" && !rule.has);
assert.ok(catchAll, "the catch-all rewrite must exist");
assert.equal(catchAll.destination, "/2029.html", "the catch-all must serve the 2029 document");

const releaseBuild = read("scripts/build-public-reading-production.mjs");
assert.equal(/legacy-sw|legacyRollbackWorker|public\/sw\.js/.test(releaseBuild), false, "the release artifact must not carry a Legacy rollback worker");

const pkg = JSON.parse(read("package.json"));
assert.match(pkg.scripts.prebuild, /scripts\/test-legacy-retired\.mjs/, "build must run the Legacy-retired gate");

console.log("Legacy retired gate: PASS");
