// ===== Composite Research Transforms (prepared, NOT wired into any UI yet) =====
// GEMATRIA_METHODS_UNIFICATION — section 8. See:
//   audits/gematria_methods_unification/GEMATRIA_METHODS_COMPOSITE_CONTRACT.md
//
// A Composite Research Transform is NOT a new atomic gematria method. It never re-implements
// letter-value math — it composes the CANONICAL outputs of two existing methods that already
// live in src/lib/gematria.js (METHODS / DEPTH_METHODS), the single source of truth
// (gematria_engine_law · canonical_methods_registry_law). If either atomic method's engine
// output ever changes, the composite automatically reflects it — there is no duplicate formula
// to fall out of sync.
//
// ⛔ Not imported by any page/component in this pass. Access tier (Free/Premium/Deep Research)
// for composites is a PRODUCT decision pending Zuriel's explicit Human-Gate approval — the
// `tierHint` below is a proposal, not an activated entitlement. See HUMAN_GATE.csv.
//
// research_dna_v1 §4.7 / gematria_methods_catalog rule: "Premium controls access, depth and
// tooling — never mathematical truth or canonical status." A composite's numbers are exactly
// as canonical as its two atoms; only *seeing* the composite view may be gated.

import { METHODS, DEPTH_METHODS } from "../gematria.js";

const ATOMIC_BY_KEY = Object.fromEntries([...METHODS, ...DEPTH_METHODS].map(m => [m.key, m]));

// The 4 composites Zuriel named explicitly in this task (section 8). "משולש" here means the
// קדמי method per the locked meshulash_kadmi_law alias — NOT a new "משולש" atomic method.
export const COMPOSITE_METHODS = [
  {
    key: "רגיל+מילוי",
    label: "רגיל + מילוי",
    atoms: ["רגיל", "מילוי"],
    soul: "המהות הגלויה מול הפנימיות שמתמלאת בפנים — שני הפנים של אותה מילה.",
    tierHint: "premium", // proposal only — see HUMAN_GATE.csv, not activated
  },
  {
    key: "רגיל+מסתתר",
    label: "רגיל + מסתתר",
    atoms: ["רגיל", "מסתתר"],
    soul: "הגלוי מול מה שמסתתר בין האותיות.",
    tierHint: "premium",
  },
  {
    key: "רגיל+משולש",
    label: "רגיל + משולש (קדמי)",
    atoms: ["רגיל", "קדמי"], // "משולש" = קדמי (meshulash_kadmi_law) — לא שיטה חדשה
    soul: "הגלוי מול השורש המצטבר.",
    tierHint: "premium",
  },
  {
    key: "משולש מילה+משולש הפוך",
    label: "משולש מילה + משולש הפוך",
    atoms: ["משולש מילה", "משולש הפוך"],
    soul: "ההיבנות מול ההיפרדות — שני כיווני הרצף של אותו ביטוי.",
    tierHint: "deep_research",
  },
];
export const COMPOSITE_BY_KEY = Object.fromEntries(COMPOSITE_METHODS.map(c => [c.key, c]));

// computeComposite: never re-derives letter values itself — calls the two canonical atomic
// .fn() functions from gematria.js and returns their outputs plus simple cross-method derived
// facts (sum / diff / equal). Returns null if the composite key or an atom is unknown (never
// silently invents a value).
export function computeComposite(compositeKey, word) {
  const spec = COMPOSITE_BY_KEY[compositeKey];
  if (!spec) return null;
  const [aKey, bKey] = spec.atoms;
  const aMethod = ATOMIC_BY_KEY[aKey];
  const bMethod = ATOMIC_BY_KEY[bKey];
  if (!aMethod || !bMethod) return null;
  const aValue = aMethod.fn(word);
  const bValue = bMethod.fn(word);
  return {
    key: spec.key,
    label: spec.label,
    word,
    a: { key: aKey, value: aValue },
    b: { key: bKey, value: bValue },
    sum: aValue + bValue,
    diff: Math.abs(aValue - bValue),
    equal: aValue === bValue, // cross-method convergence signal (FACT — interpretation is separate)
    tierHint: spec.tierHint,
  };
}

// Batch helper: all 4 composites for one word (for future Cross Engine / Research DNA consumption).
export function computeAllComposites(word) {
  return COMPOSITE_METHODS.map(c => computeComposite(c.key, word)).filter(Boolean);
}
