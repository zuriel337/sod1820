import assert from "node:assert/strict";
import test from "node:test";
import { elsLexiconWindowKey } from "../src/lib/research/elsLexiconResearch.js";
import { projectElsDiscoveryStructures, compatibleElsDiscoveryRuns, prepareElsStructureAdditions, prepareElsStructureRestore } from "../src/lib/research/elsDiscoveryStructureSources.js";
import { buildSavedElsDiscovery, readSavedElsDiscovery } from "../src/lib/research/elsSavedDiscovery.js";

import { state, fixtures } from "./fixtures/els-discovery-structures.mjs";

test("cross-run structures deduplicate canonical occurrences, retain provenance and never sum coverage", () => {
  const s = state(), runs = fixtures(s), view = projectElsDiscoveryStructures(s, runs);
  assert.equal(view.entries.size, 2); assert.equal(view.collected, 3); assert.equal(view.duplicates, 1);
  const group = view.groups.find(group => group.items.length === 2 && !group.includesAxis);
  assert.ok(group?.types.includes("intersection")); assert.equal(group.sources.length, 2);
  assert.equal(group.memberSources.find(m => m.term === "להבהתמכ").sourceIds.length, 2);
  assert.deepEqual(view.included.map(source => source.run.data.coverage.completedRays), [100, 24]);
  assert.equal(view.partial, true); assert.equal(view.score, null); assert.equal(view.independentConfirmations, false);
  assert.equal(view.items.find(item => item.term === "להבהתמכ").label, "להבה תמכ");
  assert.equal(projectElsDiscoveryStructures(s, { words: runs.words }).groups.some(g => g.items.length === 2), false);
});

test("selection only changes grouping; old windows, row spacing, axes and corpus versions cannot join", () => {
  const s = state(), runs = fixtures(s), original = JSON.stringify(runs);
  const view = projectElsDiscoveryStructures(s, runs, { excludedIds: [runs.language.id] });
  assert.equal(view.included.length, 1); assert.equal(view.available.length, 2); assert.equal(view.entries.size, 1);
  assert.equal(JSON.stringify(runs), original);
  for (const change of [
    r => { r.data.origin = { ...r.data.origin, corpusId: "other" }; },
    r => { r.data.origin = { ...r.data.origin, start: 511 }; },
    r => { r.data.box = { ...r.data.box, S: 50 }; },
    r => { r.data.box = { ...r.data.box, c0: 1 }; },
    r => { r.key = "old-window"; }, r => { r.data.pending = true; }, r => { r.data.ok = false; },
  ]) {
    const wrong = structuredClone(runs.language); change(wrong);
    assert.equal(projectElsDiscoveryStructures(s, { words: runs.words, wrong }).included.length, 1);
  }
});

test("saved language runs join additively; same-operation copies use the latest segment once", () => {
  const s = state(), runs = fixtures(s), built = buildSavedElsDiscovery(runs.language); assert.equal(built.ok, true);
  const restored = readSavedElsDiscovery(JSON.parse(JSON.stringify(built.entity))).scan;
  const joined = { words: runs.words, language: runs.language, saved: { ...restored, key: elsLexiconWindowKey(s) } };
  assert.equal(compatibleElsDiscoveryRuns(s, joined).length, 2);
  const newer = { ...runs.language, endedAt: "2026-11-19T10:01:00Z", data: { ...runs.language.data, items: runs.language.data.items.slice(1) } };
  assert.equal(compatibleElsDiscoveryRuns(s, { ...joined, newer }).find(x => x.id === newer.id).run, newer);
  const second = { ...restored, id: "another-language-run", key: elsLexiconWindowKey(s) };
  assert.equal(projectElsDiscoveryStructures(s, { words: runs.words, first: joined.saved, second }).included.length, 3);
  assert.equal(projectElsDiscoveryStructures(s, { words: runs.words, first: joined.saved, second }).entries.size, 2);
});

test("mixed-source groups create one atomic verification request, with original memberships and the existing 24-word cap", () => {
  const s = state(), runs = fixtures(s), view = projectElsDiscoveryStructures(s, runs);
  const prepared = prepareElsStructureAdditions(s, view, view.items, "blue"); assert.ok(prepared.findings);
  assert.deepEqual(prepared.findings.map(f => f.addShown), [["100_1_512"], ["101_1_511"]]);
  const load = prepareElsStructureRestore(s, view, view.items, "blue");
  assert.equal(load.hitId, "100_1_510"); assert.equal(load.words.length, 2);
  assert.equal(prepareElsStructureAdditions(s, view, [{ ...view.items[0] }], "blue").error, "stale");
  assert.equal(prepareElsStructureAdditions({ ...s, geometry: { ...s.geometry, c0: 1 } }, view, view.items, "blue").error, "stale");
  const full = { ...s, findings: Array.from({ length: 23 }, (_, i) => ({ t: `מילה${i}`, color: "red" })) };
  assert.equal(prepareElsStructureAdditions(full, view, view.items, "blue").error, "limit");
  assert.equal(full.findings.length, 23); assert.deepEqual(s.findings, []);
  view.items[0].positions[0]++;
  assert.equal(prepareElsStructureAdditions(s, view, view.items, "blue").error, "stale", "a changed receipt is rechecked at admission");
});

test("invalid positions are disclosed; original source records and replay receipts remain unchanged", () => {
  const s = state(), runs = fixtures(s), original = JSON.stringify(runs);
  const wrong = structuredClone(runs.words); wrong.data.items[0].positions[0]++;
  const view = projectElsDiscoveryStructures(s, { wrong, language: runs.language });
  assert.equal(view.invalid, 1); assert.equal(view.entries.size, 2);
  assert.equal(JSON.stringify(runs), original);
});

test("the existing 300-candidate/240-group budgets stay bounded and exclusions are counted", () => {
  const s = state(); s.geometry = { S: 100, r0: 0, r1: 20, c0: 0, cw: 100 };
  const runs = fixtures(s), template = runs.words.data.items[0];
  runs.words.data.items = Array.from({ length: 305 }, (_, i) => ({ ...template, start: 600 + i, hitId: `100_1_${600 + i}`,
    positions: [...template.term].map((_, n) => 600 + i + n * 100) }));
  const view = projectElsDiscoveryStructures(s, { words: runs.words });
  assert.equal(view.entries.size, 305); assert.equal(view.analyzed, 300); assert.equal(view.omittedFromStructures, 5);
  assert.ok(view.groups.length <= 240); assert.equal(view.structures.maxGroups, 240);
  assert.equal(runs.words.data.items.length, 305, "the omitted candidates remain in their source");
});

test("two occurrences of one word are combined into one finding without dropping either explicit key", () => {
  const s = state(), runs = fixtures(s), original = runs.words.data.items[0];
  const second = { ...original, start: 513, hitId: "100_1_513", positions: original.positions.map(p => p + 1) };
  const extra = { ...runs.words, id: "second-word-run", data: { ...runs.words.data, items: [second] } };
  const view = projectElsDiscoveryStructures(s, { words: runs.words, extra });
  const result = prepareElsStructureAdditions(s, view, view.items, "blue");
  assert.equal(result.findings.length, 1); assert.deepEqual(result.findings[0].addShown, ["100_1_512", "100_1_513"]);
});
