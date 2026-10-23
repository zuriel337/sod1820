// pair-conditioned method dependency — DESIGN REFERENCE (unwired).
//
// This is NOT method equivalence and it does NOT change the Registry. gematria_methods.dependency_rules keep
// declaring only what they declare today (conditional equivalence "no_final_letters"). Nothing imports this file
// yet; it exists so the rule can be specified, tested against the canonical engine, and reviewed before any owner
// decides to adopt it.
//
// The rule, for a PAIR of expressions (A, B) and a method M with a final-letter ("גדול") variant Mg:
//     Δ(X) = Mg(X) − M(X)                       the extra weight the final letters add, computed by the engine
//     M(A)=M(B) and Mg(A)=Mg(B)  ⇔  M(A)=M(B) and Δ(A)=Δ(B)
//   • Δ(A) = Δ(B)  → for THIS pair the two equalities are one fact: counting both would count it twice (dependent).
//   • Δ(A) ≠ Δ(B) → the two equalities cannot hold together; an equality in Mg alone (M different) is a separate
//     coincidence and stays an independent family.
// It is not enough that A and B have the same NUMBER of final letters: the final-letter types and the actual sum
// of the added weight decide. Δ is never re-implemented here — it is the difference of two canonical engine calls,
// so ribua / ribua_gadol (position-weighted) get their own Δ the same way.
//
// All raw engine equalities are kept; only the strength measure counts independent families.

import { METHODS, DEPTH_METHODS, GADOL_BASE } from "../gematria.js";

export const PAIR_DEPENDENCY_VERSION = "pair-conditioned-method-dependency-design-v1";

const FINAL_FORMS = "ךםןףץ";
const ENGINE = Object.fromEntries([...METHODS, ...DEPTH_METHODS].map((m) => [m.key, m.fn]));

// The (variant, base) pairs come from the canonical mapping already exported by the engine file.
export const VARIANT_BASE_PAIRS = Object.freeze(Object.entries(GADOL_BASE).map(([variant, base]) => Object.freeze({ variant, base })));

// A second, SEPARATE candidate surfaced by the posts audit (not part of the final-letter rule, not requested, not adopted):
// for a single-word expression משולש מילה (one running triangle) is by definition the same computation as ריבוע (per-word
// prefix sums); for several words they diverge. The same Δ-algebra applies, so it is expressed with the same pair form.
// Off by default; an owner must decide whether it belongs anywhere near the Registry.
export const STRUCTURAL_IDENTITY_PAIRS = Object.freeze([Object.freeze({ variant: "משולש מילה", base: "ריבוע" })]);

export function finalLetterTypes(text) {
  return [...String(text || "")].filter((c) => FINAL_FORMS.includes(c)).sort().join("");
}

export function variantDelta(pair, text) {
  return ENGINE[pair.variant](text) - ENGINE[pair.base](text);
}

export function pairConditionedDependency(a, b, { includeStructuralIdentity = false } = {}) {
  const pairs = includeStructuralIdentity ? [...VARIANT_BASE_PAIRS, ...STRUCTURAL_IDENTITY_PAIRS] : VARIANT_BASE_PAIRS;
  return pairs.map((pair) => {
    const deltaA = variantDelta(pair, a);
    const deltaB = variantDelta(pair, b);
    const sameDelta = deltaA === deltaB;
    return {
      variant: pair.variant, base: pair.base,
      delta_a: deltaA, delta_b: deltaB,
      final_types_a: finalLetterTypes(a), final_types_b: finalLetterTypes(b),
      same_final_types: finalLetterTypes(a) === finalLetterTypes(b),
      same_delta: sameDelta,
      relation: sameDelta ? "equalities_are_one_fact_for_this_pair" : "equalities_cannot_both_hold_for_this_pair",
    };
  });
}

// Methods (of the engine's 23 value methods) in which the two expressions have the same value. Raw, nothing merged.
export function observedEqualities(a, b) {
  return Object.keys(ENGINE).filter((key) => ENGINE[key](a) === ENGINE[key](b));
}

// Strength input: the independent families among the observed equalities of this pair.
export function independentFamilies(a, b, { observed = observedEqualities(a, b), includeStructuralIdentity = false } = {}) {
  const family = new Map(observed.map((key) => [key, key]));
  const merged = [];
  const impossible = [];
  for (const dep of pairConditionedDependency(a, b, { includeStructuralIdentity })) {
    if (!family.has(dep.variant) || !family.has(dep.base)) continue;
    if (dep.same_delta) {
      const keep = family.get(dep.base);
      const drop = family.get(dep.variant);
      for (const [k, v] of family) if (v === drop) family.set(k, keep);
      merged.push({ variant: dep.variant, base: dep.base, reason: `Δ equal (${dep.delta_a}) — one fact for this pair` });
    } else {
      impossible.push({ variant: dep.variant, base: dep.base, delta_a: dep.delta_a, delta_b: dep.delta_b });
    }
  }
  const groups = new Map();
  for (const [key, root] of family) groups.set(root, [...(groups.get(root) || []), key]);
  return {
    version: PAIR_DEPENDENCY_VERSION,
    raw_equalities: observed,
    families: [...groups.values()],
    independent_family_count: groups.size,
    merged,
    // Both equalities observed while Δ differs is arithmetically impossible; if it ever appears the engine, not the rule, is wrong.
    inconsistent_observations: impossible,
  };
}
