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
test("bounded story runtime updates the same state map without claiming hosted or generic completion", () => {
  const state = read("../SOD1820_MASTER_STATE.md");
  const checkpoint = state.slice(state.indexOf("Bounded runtime follow-up · 2026-10-31"), state.indexOf("Live reality is resolved from:"));
  assert.match(checkpoint, /plan37 §12\.11/);
  assert.match(checkpoint, /STORY_TREE_SEQUENCE_RUNTIME_20261031/);
  assert.match(checkpoint, /241ae98bbdbaa3c50353dc895d2c3b2232f7d95b/);
  assert.match(checkpoint, /9c7a7994390f135f6ec0779acd561c5f/);
  assert.match(checkpoint, /NOT in that Preview/);
  assert.match(checkpoint, /§12\.10 gaps remain open/);
});
test("gallery expansion is recorded without claiming migration of the whole archive", () => {
  const state = read("../SOD1820_MASTER_STATE.md");
  const checkpoint = state.slice(state.indexOf("Gallery continuation · 2026-10-31"),state.indexOf("Live reality is resolved from:"));
  assert.match(checkpoint,/plan37 §12\.12/);
  assert.match(checkpoint,/df72132b708c640239555dd4e4025866/);
  assert.match(checkpoint,/not proof of all106 galleries/);
  assert.match(checkpoint,/Legacy defaults unchanged/);
  assert.match(checkpoint,/new hosted Preview or Production change/);
});
