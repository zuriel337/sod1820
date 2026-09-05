// src/lib/spatial/gematriaOperationModel.js
// Pure, framework-free adapter — Spatial Gematria Golden Slice (Slice 2).
// This is the ONLY place that calls the canonical gematria engine (src/lib/gematria.js,
// gematria_engine_law's own official_engines entry). Every value/step returned here traces to a
// live engine function call — nothing is a handwritten constant. The renderer never recomputes.
//
// ONE GEMATRIA ENGINE LAW: METHODS[].fn / methodLetters() / miluiLettersV() ARE the engine. This
// file only reshapes their output into a small, reusable OPERATION VOCABULARY so the renderer can
// stay generic across methods instead of growing one bespoke 3D component per method (the exact
// anti-pattern the task's METHOD VISUALIZATION LAW warns against).

import { METHODS, DEPTH_METHODS, methodLetters, miluiLettersV, MILUI_VAR_DEFAULT, onlyHeb } from "../gematria.js";

// The semantic operation primitives this slice's evidence actually required (challenged against
// the task's suggested list: sequence/group/transform/substitute/expand/accumulate/compare/converge).
// Four were sufficient for every method wired into this slice's method-switcher:
export const OPERATION_PRIMITIVES = {
  ACCUMULATE: "accumulate", // independent per-letter value, summed (רגיל/קדמי/סידורי/גדול/אלבם/הכפלה/ריבוע)
  SEQUENCE: "sequence",     // order-dependent adjacent-pair operation (מסתתר — the diff chain)
  SUBSTITUTE: "substitute", // each letter maps to a different letter, forming a new word (אתבש/אלבם-as-cipher/אטבח/שכנות)
  EXPAND: "expand",         // each letter expands to its full spelled-out name, then summed (מילוי)
};
// "compare" and "converge" are INTERACTIONS (compare_methods, follow_relation), not per-method
// primitives — they operate across the objects this file already produces, so they are not listed
// here as a fifth/sixth data shape. "group" and "transform" were considered (מסתתר sums per-word
// before combining words) but the evidence for this golden case (a single word, "משיח") never
// required a distinct shape for that — it is SEQUENCE with an implicit single group. Flagged in the
// AFTER as the one primitive-family question left open for a future multi-word golden case, not
// invented speculatively here.

const CIPHER_KEYS = new Set(["אתבש", "אלבם", "אטבח", "אותיות אחרי", "אותיות לפני"]);

const ALL_METHOD_DEFS = [...METHODS, ...DEPTH_METHODS];
export function findMethodDef(key) {
  return ALL_METHOD_DEFS.find((m) => m.key === key) || null;
}

// The method-switcher's default set for this golden case — chosen because each hits a DIFFERENT
// primitive (compare_methods must show "same input ≠ same operation", not four variations on one
// shape) and each is a REAL registered method in the live engine, not curated for effect.
export const GOLDEN_METHOD_KEYS = ["רגיל", "מסתתר", "אתבש", "מילוי", "קדמי"];

function classifyPrimitive(key, lettersResult) {
  if (key === "מילוי") return OPERATION_PRIMITIVES.EXPAND;
  if (CIPHER_KEYS.has(key) || lettersResult?.type === "cipher") return OPERATION_PRIMITIVES.SUBSTITUTE;
  if (key === "מסתתר" || key === "מסתתר גדול" || lettersResult?.type === "diff") return OPERATION_PRIMITIVES.SEQUENCE;
  return OPERATION_PRIMITIVES.ACCUMULATE; // value-type: independent per-letter, summed
}

// buildMethodOperation(key, word) -> the full SUBJECT->REPRESENTATION->METHOD->OPERATION->RESULT
// walkthrough for one method, using ONLY live engine calls. This is what the scene compiler and the
// renderer consume; neither of them ever touches METHODS/methodLetters directly.
export function buildMethodOperation(key, word) {
  const def = findMethodDef(key);
  if (!def) return null;
  const letters = onlyHeb(word);
  if (!letters.length) return null;

  const resultValue = def.fn(word); // THE engine result — never recomputed elsewhere.
  const primitive = classifyPrimitive(key, key === "מילוי" ? null : methodLetters(key, word));

  let steps = [];
  let representationText = null; // the resulting textual FORM this method produces, when it produces one distinct from the subject's own letters (REPRESENTATION layer, per task: "only when live evidence exists")

  if (primitive === OPERATION_PRIMITIVES.EXPAND) {
    const milui = miluiLettersV(word, MILUI_VAR_DEFAULT); // {type:"milui", segs:[{from,name,val}]}
    steps = (milui?.segs || []).map((s, i) => ({ index: i, ch: s.from, expandedTo: s.name, val: s.val }));
    representationText = steps.map((s) => s.expandedTo).join(" ");
  } else if (primitive === OPERATION_PRIMITIVES.SUBSTITUTE) {
    const lr = methodLetters(key, word); // {type:"cipher", word, segs:[{from,to,val}]}
    steps = (lr?.segs || []).map((s, i) => ({ index: i, ch: s.from, substitutedTo: s.to, val: s.val }));
    representationText = lr?.word || null;
  } else if (primitive === OPERATION_PRIMITIVES.SEQUENCE) {
    const lr = methodLetters(key, word); // {type:"diff", segs:[{label,val}]}
    steps = (lr?.segs || []).map((s, i) => ({ index: i, label: s.label, val: s.val }));
  } else {
    const lr = methodLetters(key, word); // {type:"value", segs:[{ch,val}]}
    steps = (lr?.segs || []).map((s, i) => ({ index: i, ch: s.ch, val: s.val }));
  }

  return {
    key,
    label: def.key,
    sub: def.sub,
    soul: def.soul,
    resultValue,
    primitive,
    steps,
    representationText,
  };
}

// Live cross-check for a STORED claim (e.g. a gematria_words row asserting phrase X has ragil=V):
// re-derives via the same live engine and reports whether it reproduces. Per the task's own rule —
// "if the live engine cannot reproduce a stored source-supported claim, show SOURCE-SUPPORTED ·
// ENGINE NOT VERIFIED. Do not silently compute or promote it." Never silently trusts the stored value.
export function engineVerifyClaim(methodKey, phrase, claimedValue) {
  const def = findMethodDef(methodKey);
  if (!def) return { verified: false, engineValue: null, reason: "unknown-method" };
  const engineValue = def.fn(phrase);
  return { verified: engineValue === Number(claimedValue), engineValue, claimedValue: Number(claimedValue) };
}
