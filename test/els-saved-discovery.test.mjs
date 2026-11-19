import assert from "node:assert/strict";
import test from "node:test";
import { buildSavedElsDiscovery, readSavedElsDiscovery, elsSavedDiscoveryMatches, elsSavedDiscoveryReturn } from "../src/lib/research/elsSavedDiscovery.js";
import { applyResearchOps, emptyResearchState } from "../src/lib/research/researchSyncState.js";
import { prepareElsLexiconAdditions } from "../src/lib/research/elsLexiconResearch.js";
import { workspaceResearchHref } from "../src/lib/research/razielWorkspaceProjection2029.js";
import { matrix, scanState, discoveryFixture } from "./fixtures/els-saved-discovery.mjs";

test("discovery uses the existing private library and canonical return; candidates stay candidates", () => {
  const built = buildSavedElsDiscovery(discoveryFixture()); assert.equal(built.ok, true);
  const library = applyResearchOps(emptyResearchState(), [{ kind: "item_upsert", bucket: "library", entity: built.entity }]);
  const saved = readSavedElsDiscovery(JSON.parse(JSON.stringify(library.saved[0]))); assert.ok(saved);
  assert.equal(workspaceResearchHref(built.entity), `/code?mode=research&discovery=els-discovery%3Atest-scan-a`);
  const load = elsSavedDiscoveryReturn(saved.scan);
  assert.equal(load.occurrenceId, "els:0b022e8eef6f9c16:קולומביה:4545:1:248765");
  assert.equal(load.skip, 4545); assert.equal(load.matrixProjection.width, 1515); assert.equal(load.matrixProjection.rowGap, 2);
  assert.equal(load.view.zoom, 1.3); assert.equal(load.searchWindow.windowSize, "legacy");
  assert.deepEqual(load.words, [{ t: "להבהתמכ", color: "#112233", sh: ["1514_-1_274518"], sourceShown: ["1_1_248765"] }]);
  assert.equal(saved.scan.data.items[0].status, "CANDIDATE");
  assert.equal(elsSavedDiscoveryMatches(saved.scan, scanState(matrix())), true);
  const request = prepareElsLexiconAdditions(scanState(matrix()), saved.scan.data, saved.scan.data.items, "blue");
  assert.deepEqual(request.findings.at(-1).addShown, ["1514_1_254827"]);
});

test("immutable source A cannot become B; corpus version, window and occurrence must all match", () => {
  const state = matrix(), run = discoveryFixture(state);
  state.axis.start++; state.ui.zoom = 9; state.findings[0].shown = [];
  assert.equal(run.source.origin.start, 248765); assert.equal(run.source.returnSnapshot.view.zoom, 1.3);
  for (const other of [state, matrix("other-version"), matrix("tanakh-version", "tanakh"), { ...matrix(), geometry: { ...scanState(matrix()).geometry, r0: 160 } }]) {
    assert.equal(elsSavedDiscoveryMatches(run, other), false);
  }
  assert.equal(elsSavedDiscoveryMatches(run, scanState(matrix())), true);
});

test("partial coverage and provenance survive; request tokens, raw letters and resume authority do not", () => {
  const run = discoveryFixture();
  Object.assign(run.data, { continuation: "ephemeral", target: { token: "secret" }, languageInspection: { rays: [{ text: "raw" }] } });
  const built = buildSavedElsDiscovery(run); assert.equal(built.ok, true);
  const saved = readSavedElsDiscovery(built.entity).scan;
  assert.equal(saved.data.coverage.complete, false); assert.equal(saved.data.coverage.completedRays, 24);
  assert.equal(saved.data.lexicon.asset.sha256, "fixture-digest"); assert.equal(saved.data.continuation, null);
  assert.doesNotMatch(JSON.stringify(saved), /ephemeral|secret|raw"/);
  assert.equal(saved.data.rawInspectionSaved, false);
});

test("failure, pending, invalid source or coverage cannot be saved as a completed run", () => {
  for (const mutate of [
    r => { r.data.ok = false; }, r => { r.data.pending = true; },
    r => { r.data.origin = { ...r.data.origin, start: 1 }; },
    r => { r.source.origin.occurrenceId = "els:other:קולומביה:4545:1:248765"; },
    r => { r.data.coverage.complete = true; }, r => { r.data.coverage.completedRays = 101; },
    r => { r.data.items[0].positions[0]++; }, r => { r.source.returnSnapshot.axis = null; },
  ]) {
    const run = JSON.parse(JSON.stringify(discoveryFixture())); mutate(run);
    assert.equal(buildSavedElsDiscovery(run).ok, false);
  }
});

test("oversized saving is rejected without truncation; damaged optional navigation is disclosed by absence", () => {
  const run = discoveryFixture(); run.data.items = Array.from({ length: 1000 }, () => structuredClone(run.data.items[0]));
  assert.deepEqual(buildSavedElsDiscovery(run), { ok: false, reason: "too-large" }); assert.equal(run.data.items.length, 1000);
  const entity = buildSavedElsDiscovery(discoveryFixture()).entity;
  entity.scan.source.returnSnapshot = { axis: null };
  const recovered = readSavedElsDiscovery(entity); assert.ok(recovered); assert.equal(recovered.scan.source.returnSnapshot, null);
  assert.equal(elsSavedDiscoveryReturn(recovered.scan).hitId, "4545_1_248765");
  assert.equal(elsSavedDiscoveryReturn(recovered.scan).matrixProjection, undefined);
  entity.scan.data.origin = { ...entity.scan.data.origin, corpusId: "wrong" };
  assert.equal(readSavedElsDiscovery(entity), null);
});
