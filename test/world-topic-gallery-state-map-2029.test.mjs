import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
test("existing owner index routes to the live-verified UI and Experience versions", () => {
  const index=read("../SOD1820_MASTER_OWNER_INDEX.md");
  assert.match(index,/Experience lifecycle[^\n]+`experience_governance_foundation_v1_law` \*\*v10 ACTIVE/);
  assert.match(index,/canonical reusable UI primitives[^\n]+`canonical_ui_components_law` \*\*v11 ACTIVE/);
  assert.match(index,/type='rule' AND nodes\.is_active=true/);
  assert.match(index,/version-pointer correction, not a new owner/);
});
test("state points to the existing planning map without claiming a final design or release", () => {
  const state=read("../SOD1820_MASTER_STATE.md");
  const checkpoint=state.slice(state.indexOf("Scoped documented checkpoint · 2026-10-31"),state.indexOf("Live reality is resolved from:"));
  assert.match(checkpoint,/project_codex\.id=37/);
  assert.match(checkpoint,/§12\.10/);
  assert.match(checkpoint,/6b16163667a74a88e8d38c5309dc74fe/);
  assert.match(checkpoint,/DRAFT remains/);
  assert.match(checkpoint,/BRANCH ONLY/);
  assert.match(checkpoint,/29\/81 pilot/);
  assert.match(checkpoint,/NOT in that Preview/);
  assert.match(checkpoint,/not evidence of a main merge, Production change, G4 closure or final/);
  assert.match(checkpoint,/no source merge or renumbering/);
});
