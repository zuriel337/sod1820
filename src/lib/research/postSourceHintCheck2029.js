// Engine state of a hint cited from an EXTERNAL source inside a Post (ZURIEL 12.11.2026, section C).
//   unchecked  the hint was not run through the engine: neutral small symbol, no ✓ and no repeated warning sentences
//   verified   the method AND the result were actually checked: the engine's regular-method value equals the stated number
//   mismatch   the engine returned another value: both values are shown, distinct from "unchecked"
// A verified CALCULATION says nothing about the INTERPRETATION of the hint. State comes only from the canonical engine profile
// (fn_method_profile via numberCoreProjection.js) — never from memory, from the source's own claim, or from a general model.
import { regularMethodProfile } from "./numberExpressionFocus.js";

export const HINT_STATES = Object.freeze({ unchecked: "unchecked", verified: "verified", mismatch: "mismatch" });
const exactInt = (value) => {
  const n = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value;
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
};

const norm = (v) => String(v ?? "").replace(/["״'׳”“]/g, "").replace(/\s+/g, " ").trim();
// The method the SOURCE named. No text = the regular method (a bare "= 1111" is read in the engine's default). A text that is exactly one
// engine method (key or label) selects that method. Anything else (a free description such as "ריבוע [מספר] משולש מילה") is NOT a
// method the engine can run as written, so it stays unchecked with that reason: no guess.
export function resolveMethodRow(rows, methodText) {
  const list = Array.isArray(rows) ? rows : [];
  const text = norm(methodText);
  if (!text) return { row: regularMethodProfile(list), reason: null };
  const row = list.find((r) => norm(r?.methodKey) === text || norm(r?.displayLabel) === text) || null;
  return row ? { row, reason: null } : { row: null, reason: "method_not_a_single_engine_method" };
}

// Pure: rows are projected method-profile rows { methodKey, displayLabel, computedValue, definitionVersion }.
export function hintStateFromProfile(stated, rows, { methodText = null } = {}) {
  const claimed = exactInt(stated);
  const list = Array.isArray(rows) ? rows : [];
  const { row: regular, reason } = resolveMethodRow(rows, methodText);
  const value = exactInt(regular?.computedValue);
  // A value of 0 means the engine could not read the text as an expression (for example letters spaced apart one by one): that is
  // "not checked", never a verdict, and the text is not silently re-spelled into something the engine can read.
  if (claimed == null || value == null || value === 0) return { state: HINT_STATES.unchecked, claimed, value: null, method: null, reason: reason || (value === 0 ? "expression_not_readable_by_engine" : null), methodText: methodText || null };
  const method = { key: regular.methodKey || null, label: regular.displayLabel || regular.methodKey || null, version: regular.definitionVersion ?? null };
  const state = value === claimed ? HINT_STATES.verified : HINT_STATES.mismatch;
  // No method was named and the regular method differs: say in WHICH other engine methods the stated number does come out, as information
  // for the editor. It is not a verification (the method was never stated) and it never changes the state.
  const otherMethods = state === HINT_STATES.mismatch && !methodText
    ? list.filter((r) => exactInt(r?.computedValue) === claimed).map((r) => r.displayLabel || r.methodKey).filter(Boolean) : [];
  return { state, claimed, value, method, methodText: methodText || null, otherMethods };
}

// `readProfile` is injectable (tests / a caller that already holds the rows); the default is the canonical reader.
export async function checkSourceHint({ expression, stated, methodText = null, readProfile = null } = {}) {
  const phrase = String(expression || "").trim();
  if (!phrase || exactInt(stated) == null) return { state: HINT_STATES.unchecked, claimed: exactInt(stated), value: null, method: null };
  try {
    const read = readProfile || (await import("./numberCoreProjection.js")).fetchNumberMethodProfile;
    return hintStateFromProfile(stated, await read(phrase), { methodText });
  } catch {
    // A failed read is "not checked", never a verdict.
    return { state: HINT_STATES.unchecked, claimed: exactInt(stated), value: null, method: null };
  }
}
