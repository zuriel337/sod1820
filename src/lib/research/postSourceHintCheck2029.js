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

// Pure: rows are projected method-profile rows { methodKey, displayLabel, computedValue, definitionVersion }.
export function hintStateFromProfile(stated, rows) {
  const claimed = exactInt(stated);
  const regular = regularMethodProfile(Array.isArray(rows) ? rows : []);
  const value = exactInt(regular?.computedValue);
  if (claimed == null || value == null) return { state: HINT_STATES.unchecked, claimed, value: null, method: null };
  const method = { key: regular.methodKey || null, label: regular.displayLabel || regular.methodKey || null, version: regular.definitionVersion ?? null };
  return { state: value === claimed ? HINT_STATES.verified : HINT_STATES.mismatch, claimed, value, method };
}

// `readProfile` is injectable (tests / a caller that already holds the rows); the default is the canonical reader.
export async function checkSourceHint({ expression, stated, readProfile = null } = {}) {
  const phrase = String(expression || "").trim();
  if (!phrase || exactInt(stated) == null) return { state: HINT_STATES.unchecked, claimed: exactInt(stated), value: null, method: null };
  try {
    const read = readProfile || (await import("./numberCoreProjection.js")).fetchNumberMethodProfile;
    return hintStateFromProfile(stated, await read(phrase));
  } catch {
    // A failed read is "not checked", never a verdict.
    return { state: HINT_STATES.unchecked, claimed: exactInt(stated), value: null, method: null };
  }
}
