import test from "node:test";
import assert from "node:assert/strict";
import {
  buildJourneyPromotion,
  buildJourneyResearchTarget,
  buildJourneyRestore,
  journeyAnchorMatches,
  journeySnapshotMatches,
  makeJourneySnapshot,
} from "../src/lib/elsJourney.js";

const engineState = Object.freeze({
  status: "ok",
  termRaw: "משיח",
  term: "משיח",
  scope: "torah",
  verification: { state: "MATCH", corpus_id: "torah-v1" },
  axis: { hitId: "71_1_100", skip: 71, direction: "fwd", start: 100, length: 4 },
  occurrence: { index: 2, count: 7, capped: false },
  geometry: { S: 71, r0: 0, r1: 22, c0: 0, cw: 71 },
  findings: [{
    t: "דוד",
    color: "#d08a52",
    shown: ["9_1_140", "11_-1_400"],
  }],
  ui: {
    windowSize: "medium",
    windowRequested: "medium",
    ctxR: 3,
    showN: 5,
    findingRadius: 10,
    zoom: 1.25,
    fit: false,
    heat: true,
    niqqud: true,
    hideMain: false,
  },
});

test("C02 promotes the explicitly selected verified Finding occurrence through the existing exact load contract", () => {
  const promoted = buildJourneyPromotion(engineState, engineState.findings[0], { hitId: "11_-1_400" });
  assert.equal(promoted.ok, true);
  assert.equal(promoted.target.hitId, "11_-1_400");
  assert.deepEqual(
    { term: promoted.loadItem.term, skip: promoted.loadItem.skip, dir: promoted.loadItem.dir, start: promoted.loadItem.start, hitId: promoted.loadItem.hitId },
    { term: "דוד", skip: 11, dir: -1, start: 400, hitId: "11_-1_400" },
  );
  assert.equal(promoted.loadItem.journey, true);
  assert.equal(promoted.loadItem.words[0].t, "משיח");
  assert.deepEqual(promoted.loadItem.searchWindow, {
    ctxR: 3,
    windowColumns: 60,
    windowSize: "medium",
    windowRequested: "medium",
  });
});

test("C02 reveals the promoted primary axis while exact return preserves the prior visibility", () => {
  const hiddenAxisState = {
    ...engineState,
    ui: { ...engineState.ui, hideMain: true },
  };
  const promoted = buildJourneyPromotion(hiddenAxisState, hiddenAxisState.findings[0], { hitId: "11_-1_400" });

  assert.equal(promoted.ok, true);
  assert.equal(promoted.snapshot.view.hideMain, true, "the prior axis keeps its exact return state");
  assert.equal(promoted.loadItem.hideMain, false, "the newly promoted axis is visible immediately");
  assert.equal(promoted.loadItem.view.hideMain, false, "the promotion view agrees with the engine load flag");

  const restored = buildJourneyRestore(promoted.snapshot);
  assert.equal(restored.ok, true);
  assert.equal(restored.loadItem.hideMain, true, "return restores the prior hidden-axis preference");
});

test("C02 reprojects carried Findings in the promoted geometry and retains their exact old hits only for return", () => {
  const state = {
    ...engineState,
    findings: [
      engineState.findings[0],
      { t: "בקץ", color: "#8b6bb0", shown: ["397_1_800", "421_-1_1200"] },
    ],
  };
  const promoted = buildJourneyPromotion(state, state.findings[0], { hitId: "11_-1_400" });

  assert.equal(promoted.ok, true);
  assert.deepEqual(promoted.loadItem.words[0].sh, [engineState.axis.hitId], "the former primary keeps its exact anchor as a Finding");
  const carried = promoted.loadItem.words.find((finding) => finding.t === "בקץ");
  assert.deepEqual(carried, { t: "בקץ", color: "#8b6bb0" }, "a secondary Finding is recomputed instead of importing stale hit IDs");
  assert.deepEqual(promoted.snapshot.findings.find((finding) => finding.t === "בקץ").shown, ["397_1_800", "421_-1_1200"]);

  const restored = buildJourneyRestore(promoted.snapshot);
  assert.deepEqual(restored.loadItem.words.find((finding) => finding.t === "בקץ").sh, ["397_1_800", "421_-1_1200"], "exact return restores the prior visible occurrences");
});

test("C02 exact return restores the same axis, findings and geometry envelope without recomputation", () => {
  const snapshot = makeJourneySnapshot(engineState, { mode: "research" });
  const restored = buildJourneyRestore(snapshot);
  assert.equal(restored.ok, true);
  assert.equal(restored.loadItem.hitId, engineState.axis.hitId);
  assert.equal(restored.loadItem.term, engineState.termRaw);
  assert.deepEqual(restored.loadItem.searchWindow, snapshot.searchWindow);
  assert.deepEqual(restored.loadItem.words, snapshot.findings.map((finding) => ({
    t: finding.t,
    color: finding.color,
    sh: finding.shown,
  })));
  assert.equal(restored.loadItem.view.zoom, engineState.ui.zoom);
  assert.equal(restored.loadItem.view.findingRadius, engineState.ui.findingRadius);
  assert.equal(journeyAnchorMatches({ status: "ok", axis: { hitId: engineState.axis.hitId } }, restored.target), true);
  assert.equal(journeyAnchorMatches({ status: "ok", axis: { hitId: "71_1_101" } }, restored.target), false);
  assert.equal(journeySnapshotMatches({ ...engineState, findings: [{ ...engineState.findings[0], shown: [] }] }, snapshot), false, "axis-only transient is not exact return");
  assert.equal(journeySnapshotMatches(engineState, snapshot), true);
});

test("C02 fails closed when the requested occurrence is not one of the Finding's shown verified anchors", () => {
  const promoted = buildJourneyPromotion(engineState, engineState.findings[0], { hitId: "13_1_500" });
  assert.deepEqual(promoted, { ok: false, reason: "finding-has-no-shown-anchor" });

  const none = buildJourneyPromotion(engineState, { t: "דוד", shown: [] }, { hitId: "13_1_500" });
  assert.deepEqual(none, { ok: false, reason: "finding-has-no-shown-anchor" });
});

test("a verified continuation reuses the C02 exact load and return snapshot without becoming stored research state", () => {
  const prepared = buildJourneyResearchTarget(engineState, {
    term: "יום משיח בא",
    label: "יום משיח בא",
    scope: "torah",
    hitId: "71_1_100",
  }, { view: { mode: "research" } });

  assert.equal(prepared.ok, true);
  assert.equal(prepared.loadItem.journey, true);
  assert.equal(prepared.loadItem.term, "יום משיח בא");
  assert.equal(prepared.loadItem.hitId, "71_1_100");
  assert.equal(prepared.loadItem.researchNonce, "יום משיח בא:71_1_100");
  assert.deepEqual(prepared.loadItem.words[0], { t: "משיח", color: "#e8c84a", sh: ["71_1_100"] });
  assert.equal(Object.hasOwn(prepared.loadItem, "research_object_id"), false);

  const restored = buildJourneyRestore(prepared.snapshot);
  assert.equal(restored.ok, true);
  assert.equal(restored.loadItem.term, engineState.termRaw);
  assert.equal(restored.loadItem.hitId, engineState.axis.hitId);
});

test("a continuation target fails closed across scopes or without an engine-owned hit key", () => {
  assert.deepEqual(buildJourneyResearchTarget(engineState, { term: "יום משיח בא", scope: "tanakh", hitId: "71_1_100" }), { ok: false, reason: "scope-mismatch" });
  assert.deepEqual(buildJourneyResearchTarget(engineState, { term: "יום משיח בא", scope: "torah", hitId: "bad" }), { ok: false, reason: "invalid-research-target" });
});

test("Research v1 journey snapshots are local serialization only and contain no truth/store promotion", () => {
  const snapshot = makeJourneySnapshot(engineState, { mode: "research" });
  assert.equal(snapshot.term, "משיח");
  assert.equal(snapshot.axis.hitId, "71_1_100");
  assert.equal(Object.hasOwn(snapshot, "research_object_id"), false);
  assert.equal(Object.hasOwn(snapshot, "canonical"), false);
  assert.equal(Object.hasOwn(snapshot, "published"), false);
});
