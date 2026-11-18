// Skeleton, not wired into CI. The open plan is bounded: no discovery on open (decision 2).
// The engine side (exact-only restore in restoreMatrix) depends on PR #1397 and is specified, not implemented, here.
import test from "node:test";
import assert from "node:assert/strict";
import { elsFindingOpenPlan, openFailureState } from "../elsFindingShare.draft.mjs";
import { parseElsOccurrenceId } from "../vendor/elsOccurrenceIdentity.pr1397.js";
import { approvedExact, approvedLegacy, tanakhExact, TORAH, TANAKH } from "./fixtures.mjs";

test("exact record: one axis candidate, one verify per word with saved verified hits, no discovery", () => {
  const plan = elsFindingOpenPlan(approvedExact);
  assert.equal(plan.mode, "exact");
  assert.equal(plan.discovery, false);
  assert.equal(plan.axisCandidates, 1);
  assert.equal(plan.occurrenceId, `els:${TORAH}:משיח:17:1:1234`);
  assert.equal(plan.hitId, "17_1_1234");
  assert.equal(plan.serverCalls, 2);                // axis + "דוד" (גאולה has only plain-text source context)
  assert.deepEqual(plan.explicitActions, ["find-other-occurrences"]);
});

test("occurrence id is the engine's (PR #1397) form and round-trips", () => {
  const plan = elsFindingOpenPlan(tanakhExact);
  const parsed = parseElsOccurrenceId(plan.occurrenceId);
  assert.equal(parsed.corpusId, TANAKH);
  assert.equal(parsed.dir, -1);
  assert.equal(parsed.start, 900000);
});

test("legacy record: saved image, zero server calls, search only on an explicit action", () => {
  const plan = elsFindingOpenPlan(approvedLegacy);
  assert.equal(plan.mode, "saved-image");
  assert.equal(plan.discovery, false);
  assert.equal(plan.serverCalls, 0);
  assert.deepEqual(plan.explicitActions, ["find-at-saved-skip"]);
});

test("word list is capped at the engine's 24 words", () => {
  const many = { ...approvedExact, positions: { findings: Array.from({ length: 40 }, (_, i) => ({ t: "אב" + i, sh: [`3_1_${i}`] })) } };
  assert.equal(elsFindingOpenPlan(many).serverCalls, 1 + 24);
});

test("failure states: removed and private look the same to a guest; verifier outage is not 'not found'", () => {
  assert.equal(openFailureState({ rowFound: false }), "unavailable");
  assert.equal(openFailureState({ rowFound: true, access: "unavailable" }), "unavailable");
  assert.equal(openFailureState({ rowFound: true, access: "public-approved", bridgeError: "rate_limited" }), "rate-limited");
  assert.equal(openFailureState({ rowFound: true, access: "public-approved", bridgeError: "bridge_error" }), "verify-unavailable");
  assert.equal(openFailureState({ rowFound: true, access: "public-approved", engineReason: "anchor-not-found" }), "mismatch");
  assert.equal(openFailureState({ rowFound: true, access: "public-approved", engineReason: "corpus-mismatch" }), "corpus-mismatch");
  assert.equal(openFailureState({ rowFound: true, access: "public-approved" }), null);
});

// TODO after #1397 merges (engine, not testable here): browser test in test/els-native-ui-browser.test.mjs style -
//   open /code?cipher=<exact slug>; assert engine-request ops == ["verify_batch" x (1 + words)], zero "page" ops,
//   verify_batch[0].candidates.length === 1, no routed-discover worker message, load operation phases
//   opening -> verifying -> restoring-findings -> done, and state.occurrence carries exactOnly=true.
