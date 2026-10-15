import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { researchNumber } from "../src/lib/research/numericResearch.js";
import { mergeNumberLookupStage } from "../src/lib/research/entityHubProjection.js";
import { RUNTIME_SWITCHES_2029, switchesFromFlags } from "../src/lib/runtimeSwitches2029.js";

const rows = (n, value = 776) => Array.from({ length: n }, (_, i) => ({
  bid_id: `bid-${String(i).padStart(5, "0")}`, phrase: `ביטוי ${i % 211}`, method: ["רגיל", "מילוי", "אתבש", "מסתתר"][i % 4], value,
  method_governed: i % 3 !== 0, atomic_or_composite: i % 7 === 0 ? "composite" : "atomic", total_count: n,
}));
const mockRpc = (lookupRows) => async (name) => {
  if (name === "fn_number_lookup") return { data: lookupRows, error: null };
  if (name === "fn_number_dossier") return { data: { number: 776, facts: [1, 2, 3] }, error: null };
  if (name === "fn_number_journey") return { data: { steps: [776] }, error: null };
  if (name === "number_neighbors") return { data: [{ value: 775 }, { value: 777 }], error: null };
  return { data: [], error: null };
};
const common = (lookupRows) => ({ rpc: mockRpc(lookupRows), fetchResearchObjects: async () => ({ data: [] }), researchObjectLimit: 5, lookupWindow: { limit: 500 }, provenance: { requestSource: "entity-hub-projection-v2", inputRef: "node:n1" } });
const ALL = ["number_lookup", "number_dossier", "number_journey", "neighbors", "research_objects"];
const FIRST = ALL.filter((lens) => lens !== "number_lookup");

for (const [name, n] of [["exhaustive set (379 rows)", 379], ["truncated set (620 rows > 500 window)", 620], ["empty set", 0]]) {
  test(`merged staged result equals the one-shot result: ${name}`, async () => {
    const data = rows(n);
    const full = await researchNumber(776, { ...common(data), lenses: ALL, budget: { maxLenses: 5, depth: 1 } });
    const first = await researchNumber(776, { ...common(data), lenses: FIRST, budget: { maxLenses: 4, depth: 1 } });
    const stage = await researchNumber(776, { ...common(data), lenses: ["number_lookup"], budget: { maxLenses: 1, depth: 1 } });
    // first projection: no lookup rows, no partial list, no bounds pretending to be complete
    assert.equal(first.per_lens.number_lookup, undefined);
    assert.equal(first.bounds.number_lookup, null);
    assert.equal(first.universal_findings.length, 0);
    const merged = mergeNumberLookupStage({ lenses: { numberResearch: first, numberLookupStage: { deferred: true, number: 776 } } }, stage).lenses;
    assert.equal(merged.numberLookupStage, undefined);
    const m = merged.numberResearch;
    assert.deepEqual(m.universal_findings, full.universal_findings);        // same findings, same order, same ids
    assert.deepEqual(m.bounds, full.bounds);                                   // TRUE total_count + truncated/continuation
    assert.deepEqual(m.per_lens.number_lookup, full.per_lens.number_lookup);
    for (const lens of FIRST) assert.deepEqual(m.per_lens[lens], full.per_lens[lens]);
    assert.deepEqual(m.priority, full.priority);
    if (n > 500) { assert.equal(m.bounds.number_lookup.total_count, n); assert.equal(m.bounds.number_lookup.source_exhaustive, false); assert.equal(m.universal_findings.length, 500); }
    if (n === 379) { assert.equal(m.bounds.number_lookup.total_count, 379); assert.equal(m.bounds.number_lookup.source_exhaustive, true); assert.equal(m.universal_findings.length, 379); }
  });
}

test("a late stage for another number is never attached; a projection without a pending stage is returned unchanged", async () => {
  const stage776 = await researchNumber(776, { ...common(rows(10)), lenses: ["number_lookup"], budget: { maxLenses: 1, depth: 1 } });
  const projection = { lenses: { numberResearch: { universal_findings: [], bounds: { number_lookup: null } }, numberLookupStage: { deferred: true, number: 1820 } } };
  assert.equal(mergeNumberLookupStage(projection, stage776), projection);                       // 776 answer arriving for the 1820 page
  const settled = { lenses: { numberResearch: { universal_findings: ["x"] } } };
  assert.equal(mergeNumberLookupStage(settled, stage776), settled);
  assert.equal(mergeNumberLookupStage(projection, null), projection);
});

test("the switch is independent, default OFF, registered in the existing registry; wiring keeps OFF on the existing path", async () => {
  const entry = RUNTIME_SWITCHES_2029.find((e) => e.key === "fx_staged_number_results");
  assert.ok(entry && entry.mode === "optimization" && entry.defaultOn === false);
  assert.equal(switchesFromFlags({}).fx_staged_number_results, false);
  assert.equal(switchesFromFlags({ fx_staged_number_results: { enabled: true } }).fx_staged_number_results, true);
  for (const other of ["fx_world_relation_identity", "fx_number_lookup_page"]) assert.equal(switchesFromFlags({ fx_staged_number_results: { enabled: true } })[other], false);
  const hub = await readFile(new URL("../src/lib/research/entityHubProjection.js", import.meta.url), "utf8");
  assert.match(hub, /stagedNumberResults = false/);                                           // default: one-shot projection
  assert.match(hub, /staged \? requestedNumberLenses\.filter\(lens => lens !== "number_lookup"\) : requestedNumberLenses/);
  const page = await readFile(new URL("../src/pages/World2029Page.jsx", import.meta.url), "utf8");
  assert.match(page, /fx_staged_number_results === true/);                                    // only an explicit ON stages
  assert.match(page, /lookupStageRun\.current\.token !== token/);                              // stale answers dropped
  assert.match(page, /kind="unavailable" title="רשימת הגימטריות לא נטענה"/);                  // failure state, not a partial list
});
