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


test("PR #1520: saved research storage reclamation triggers CRITICAL quota and sync guards", () => {
  // Exactly the changed-file inventory from PR 1520 reviewed on 23 Nov 2026.
  const files = [
    ".github/workflows/research-sync-gate.yml",
    "docs/reviews/saved-storage-reclaim-20261123/chrome-fill-quota.py",
    "docs/reviews/saved-storage-reclaim-20261123/chrome-reclaim-save.py",
    "docs/reviews/saved-storage-reclaim-20261123/entry.js",
    "src/components/userCenter/LocalOnlyResearch2029.jsx",
    "src/components/userCenter/PersonalSaveButton2029.jsx",
    "src/lib/research/researchLocalOnly.js",
    "src/lib/research/researchSyncRuntime.js",
    "test/research-saved-integration-2029.test.mjs",
  ];
  const report = impactForChangedFiles(files);
  assert.equal(report.priority, "critical");
  assert.equal(report.verdict, "RISK_CANDIDATE_REQUIRES_TESTS");
  assert.ok(report.categories.includes("research-local-storage-and-reclaim"));
  assert.ok(report.categories.includes("personal-save-and-sync"));
  assert.ok(report.affectedScopes.includes("local quota recovery"));
  assert.ok(report.proposedChecks.some(check => check.includes("research-saved-integration-2029")));
  assert.ok(report.proposedChecks.some(check => check.includes("full quota")));
  assert.equal(report.browserRequired, true);
});
test("PR #1522: ELS on-boarding and registered advanced mode trigger CRITICAL access guards", () => {
  // Exactly the changed-file inventory from PR 1522 reviewed on 23 Nov 2026.
  const files = [
    "docs/reviews/els-onboarding-registered-access-20261123/MODE_GUIDES.md",
    "docs/reviews/els-onboarding-registered-access-20261123/README.md",
    "docs/reviews/els-onboarding-registered-access-20261123/REGISTERED_ADVANCED_SECURITY.md",
    "src/components/experience2029/ElsModeHelp2029.jsx",
    "src/pages/Els2029Page.jsx",
  ];
  const report = impactForChangedFiles(files);
  assert.equal(report.priority, "critical");
  assert.ok(report.categories.includes("els-mode-and-access"));
  assert.ok(report.affectedScopes.includes("ELS registered advanced gate"));
  assert.ok(report.proposedChecks.some(check => check.includes("els-2029-classic-faithful-port")));
  assert.ok(report.proposedChecks.some(check => check.includes("guest Classic")));
  assert.equal(report.browserRequired, true);
});
