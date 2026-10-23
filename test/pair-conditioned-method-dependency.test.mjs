// pair-conditioned method dependency — design reference tests (unwired; the Registry is untouched).
// The rule is derived from, and checked against, the canonical engine; Δ is never re-implemented.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PAIR_DEPENDENCY_VERSION, STRUCTURAL_IDENTITY_PAIRS, VARIANT_BASE_PAIRS, finalLetterTypes, independentFamilies,
  observedEqualities, pairConditionedDependency, variantDelta,
} from "../src/lib/research/pairConditionedMethodDependency.js";
import { METHODS, DEPTH_METHODS } from "../src/lib/gematria.js";

const ENGINE = Object.fromEntries([...METHODS, ...DEPTH_METHODS].map((m) => [m.key, m.fn]));
const dep = (a, b, base) => pairConditionedDependency(a, b).find((d) => d.base === base);

test("the pairs come from the engine's own mapping; Δ is the difference of two canonical engine calls", () => {
  assert.deepEqual(VARIANT_BASE_PAIRS.map((p) => `${p.base}/${p.variant}`).sort(), ["הכפלה/הכפלה גדולה", "מסתתר/מסתתר גדול", "קדמי/משולש גדול", "ריבוע/ריבוע גדול", "רגיל/גדול"].sort());
  for (const pair of VARIANT_BASE_PAIRS) assert.equal(variantDelta(pair, "ירושלים"), ENGINE[pair.variant]("ירושלים") - ENGINE[pair.base]("ירושלים"));
  assert.equal(variantDelta({ variant: "גדול", base: "רגיל" }, "ירושלים"), 560, "ם: 600 − 40");
});

test("no final letters on either side: Δ=0 both, the pair is one fact (אור / גדר)", () => {
  assert.equal(dep("אור", "גדר", "רגיל").same_delta, true);
  const result = independentFamilies("אור", "גדר");
  assert.deepEqual(result.families.find((f) => f.includes("רגיל")).sort(), ["גדול", "רגיל"]);
  assert.ok(result.raw_equalities.includes("רגיל") && result.raw_equalities.includes("גדול"), "raw results are kept");
  assert.equal(result.independent_family_count, result.raw_equalities.length - 1, "exactly one merge: רגיל≡גדול");
  assert.deepEqual(result.inconsistent_observations, []);
});

test("same final letter on both sides (ירושלים / שומרים): ragil≡gadol and ribua≡ribua_gadol are each one fact", () => {
  for (const base of ["רגיל", "ריבוע"]) {
    const d = dep("ירושלים", "שומרים", base);
    assert.equal(d.same_delta, true, base);
    assert.equal(d.delta_a, 560, base);
    assert.equal(d.delta_b, 560, base);
  }
  const result = independentFamilies("ירושלים", "שומרים");
  const families = result.families.map((f) => [...f].sort().join("+"));
  assert.ok(families.includes("גדול+רגיל"));
  assert.ok(families.includes("ריבוע+ריבוע גדול"));
  assert.ok(result.raw_equalities.length > result.independent_family_count, "the strength measure counts families, not raw rows");
});

test("a headline of 'four methods' can be two independent families: the post's own example", () => {
  const claimed = ["רגיל", "גדול", "ריבוע", "ריבוע גדול"];
  for (const key of claimed) assert.equal(ENGINE[key]("ירושלים"), ENGINE[key]("שומרים"), key);
  const families = independentFamilies("ירושלים", "שומרים", { observed: claimed });
  assert.equal(families.independent_family_count, 2);
});

test("same NUMBER of final letters is not enough: different types ⇒ different Δ ⇒ not one fact", () => {
  assert.equal(finalLetterTypes("מלך"), "ך");
  assert.equal(finalLetterTypes("מן"), "ן");
  assert.equal(ENGINE["רגיל"]("מלך"), ENGINE["רגיל"]("מן"), "same ragil value (90), one final letter each");
  const d = dep("מלך", "מן", "רגיל");
  assert.equal(d.same_final_types, false);
  assert.equal(d.same_delta, false);
  assert.equal(d.relation, "equalities_cannot_both_hold_for_this_pair");
  assert.notEqual(ENGINE["גדול"]("מלך"), ENGINE["גדול"]("מן"));
  assert.deepEqual(independentFamilies("מלך", "מן").families, [["רגיל"]]);
});

test("the SUM decides, not the types: different final-letter multisets with an equal added weight are one fact", () => {
  const a = "אך בך גץ";  // ך + ך + ץ  → 480 + 480 + 810
  const b = "אם בם גן";  // ם + ם + ן  → 560 + 560 + 650
  assert.notEqual(finalLetterTypes(a), finalLetterTypes(b));
  const d = dep(a, b, "רגיל");
  assert.equal(d.delta_a, 1770);
  assert.equal(d.delta_b, 1770);
  assert.equal(d.same_delta, true);
  assert.equal(d.same_final_types, false, "reported for the reviewer, not used to decide");
});

test("ribua / ribua_gadol are checked separately: a final letter's weight depends on its position", () => {
  const a = "ךא";   // final form first in the word
  const b = "אך";   // final form last
  assert.equal(dep(a, b, "רגיל").same_delta, true, "plain sofit weight is position-free");
  assert.equal(dep(a, b, "ריבוע").same_delta, false, "the squared contribution depends on position");
  assert.equal(dep(a, b, "ריבוע").delta_a, 960);
  assert.equal(dep(a, b, "ריבוע").delta_b, 480);
});

test("property check against the engine: for any two expressions with equal ragil, gadol is equal ⇔ Δ is equal (never the reverse)", () => {
  const alphabet = [..."אבגדהוזחטיכךלמםנןסעפףצץקרשת"];
  let seed = 20261023;
  const next = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed; };
  const words = Array.from({ length: 6000 }, () => Array.from({ length: 3 + (next() % 3) }, () => alphabet[next() % alphabet.length]).join(""));
  const buckets = new Map();
  for (const w of words) { const v = ENGINE["רגיל"](w); (buckets.get(v) || buckets.set(v, []).get(v)).push(w); }
  let pairs = 0;
  let bothEqual = 0;
  for (const list of buckets.values()) {
    for (let i = 0; i < Math.min(list.length, 12); i += 1) for (let j = i + 1; j < Math.min(list.length, 12); j += 1) {
      const [a, b] = [list[i], list[j]];
      const d = dep(a, b, "רגיל");
      const gadolEqual = ENGINE["גדול"](a) === ENGINE["גדול"](b);
      assert.equal(gadolEqual, d.same_delta, `${a} / ${b}`);
      pairs += 1;
      if (gadolEqual) bothEqual += 1;
    }
  }
  assert.ok(pairs > 500 && bothEqual > 20, `pairs=${pairs} bothEqual=${bothEqual}`);
});

test("the single-word identity (משולש מילה ≡ ריבוע) is a SEPARATE, off-by-default candidate surfaced by the audit", () => {
  assert.deepEqual(STRUCTURAL_IDENTITY_PAIRS.map((p) => `${p.base}/${p.variant}`), ["ריבוע/משולש מילה"]);
  assert.equal(independentFamilies("ירושלים", "שומרים").independent_family_count, 3, "default: only the final-letter rule");
  assert.equal(independentFamilies("ירושלים", "שומרים", { includeStructuralIdentity: true }).independent_family_count, 2);
  // two-word expressions diverge, so the rule must not merge them
  const multi = pairConditionedDependency("אור גדר", "גדר אור", { includeStructuralIdentity: true }).find((d) => d.variant === "משולש מילה");
  assert.equal(multi.same_delta, true, "a permutation has the same Δ trivially");
  const different = pairConditionedDependency("אור גדר", "שלום עולם", { includeStructuralIdentity: true }).find((d) => d.variant === "משולש מילה");
  assert.equal(different.same_delta, false);
});

test("it is not method equivalence and not wired: no Registry/DB/Raziel reference, no 'equivalence' export", () => {
  const source = readFileSync(new URL("../src/lib/research/pairConditionedMethodDependency.js", import.meta.url), "utf8");
  const code = source.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(code, /supabase|dependency_rules|method_equivalence|fetch\(|askRaziel|ai-analyze/);
  assert.match(PAIR_DEPENDENCY_VERSION, /pair-conditioned-method-dependency/);
  assert.equal(/export (?:const|function) \w*[Ee]quivalen/.test(code), false);
});
