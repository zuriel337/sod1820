import test from "node:test";
import assert from "node:assert/strict";
import { impactForChangedFiles } from "../scripts/performance-change-impact-2029.mjs";

test("lazy storage optimization always raises personal save and authentication risks", () => {
  const r=impactForChangedFiles(["src/lib/storageLazy2029.js"]);
  assert.equal(r.priority,"critical");
  assert.equal(r.browserRequired,true);
  assert.ok(r.categories.includes("shared-entry"));
  assert.ok(r.categories.includes("storage-auth-access"));
  assert.ok(r.categories.includes("personal-save-and-sync"));
  assert.ok(r.affectedScopes.includes("personal-area"));
  assert.ok(r.proposedChecks.some(c=>c.includes("research-sync-hardening")));
});
test("actual save button change is not classed as mere presentational optimization", () => {
  const r=impactForChangedFiles(["src/components/userCenter/PersonalSaveButton2029.jsx"]);
  assert.equal(r.priority,"critical");
  assert.ok(r.potentialFailures.some(x=>x.includes("server-confirmed")));
  assert.ok(r.proposedChecks.some(x=>x.includes("personal-save-decision")));
});
test("changes to a Book reader require real public source verification", () => {
  const r=impactForChangedFiles(["src/lib/research/publicLibraryContinuity2029.js"]);
  assert.ok(r.categories.includes("book-public-source"));
  assert.ok(r.proposedChecks.some(x=>x.includes("anonymous browser")));
});
test("home optimization must protect LCP, CLS and the pinned lead", () => {
  const r=impactForChangedFiles(["src/components/experience2029/HomeComposition2029.jsx"]);
  assert.ok(r.categories.includes("home-first-content") || r.categories.includes("shared-entry"));
  assert.ok(r.potentialFailures.some(x=>x.includes("LCP")) || r.potentialFailures.some(x=>x.includes("entry weight")));
});
test("unmapped change is explicitly UNKNOWN, never a pass", () => {
  const r=impactForChangedFiles(["docs/unrelated-doc.md"]);
  assert.equal(r.verdict,"NO_RULE_MATCH_COVERAGE_UNKNOWN");
  assert.equal(r.proposedChecks.length,0);
});
test("one change set has deduplicated affected scopes and checks", () => {
  const r=impactForChangedFiles(["src/lib/storageLazy2029.js","./src/lib/storageLazy2029.js","src/components/userCenter/PersonalSaveButton2029.jsx"]);
  assert.equal(new Set(r.inspectedFiles).size,r.inspectedFiles.length);
  assert.equal(new Set(r.proposedChecks).size,r.proposedChecks.length);
});
