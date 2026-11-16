// ONE pipeline for every gematria shown inside a unit (an engine claim of the approved text AND every item the editor adds): the canonical readers only.
//   fn_method_profile (fetchNumberMethodProfile) → the engine's value per method  ·  gematria_method_trace (fetchGematriaMethodTrace) → the canonical Method Trace
//   → projectGematriaTrace (fails closed) → the shared display components.
// It calculates NOTHING and stores NOTHING: no step, letter breakdown or value is derived or kept here. A failed / missing / mismatched read is "unavailable".
// Both readers are injectable (tests); the defaults are the canonical ones.
import { projectGematriaTrace } from "./gematriaTracePresentation.js";
import { checkSourceHint, HINT_STATES } from "./postSourceHintCheck2029.js";

const exactInt = (v) => (v == null || String(v).trim() === "" ? null : Number.isSafeInteger(Number(v)) && Number(v) >= 0 ? Number(v) : null);

export async function loadUnitTrace({ phrase, methodKey = null, methodText = null, stated = null, readProfile = null, readTrace = null } = {}) {
  const expression = String(phrase || "").trim();
  if (!expression) return { phase: "unavailable", reason: "no_phrase" };
  try {
    const profile = readProfile || (await import("./numberCoreProjection.js")).fetchNumberMethodProfile;
    const trace = readTrace || (await import("./gematriaTrace.js")).fetchGematriaMethodTrace;
    let key = methodKey ? String(methodKey).trim() : null;
    let check = null;
    let value = null;
    let rows = null;
    if (!key) {
      // the SOURCE named its method as text: the engine resolves it (never inferred from the target number)
      check = await checkSourceHint({ expression, stated, methodText, readProfile: profile });
      key = check?.method?.key || null;
      value = exactInt(check?.value);
    } else {
      rows = await profile(expression);
      value = exactInt((rows || []).find((r) => r.methodKey === key)?.computedValue);
    }
    if (!key) return { phase: "unavailable", reason: "no_method", check };
    const finding = await trace(key, expression);
    const raw = finding?.projection?.dimensions?.trace || null;
    const model = projectGematriaTrace(raw, { expression, methodKey: key, expectedValue: value });
    if (model.state !== "ready") return { phase: "unavailable", reason: "no_verified_trace", check };
    const label = String(model.methodLabel || "").replace(/^שיטת\s+/, "") || key;
    // the gap between what a SOURCE claimed and what the engine returns is kept (never overwritten, never hidden)
    const claimed = exactInt(stated);
    const engine = exactInt(model.result);
    const gap = claimed == null ? null : { claimed, engine, state: engine === claimed ? HINT_STATES.verified : HINT_STATES.mismatch };
    if (!check && claimed != null) check = { state: gap.state, claimed, value: engine, method: { key, label } };
    return { phase: "ready", model, trace: raw, methodKey: key, methodLabel: label, value: engine, check, gap, otherMethods: rows && claimed != null && engine !== claimed ? rows.filter((r) => exactInt(r.computedValue) === claimed).map((r) => r.displayLabel || r.methodKey) : [] };
  } catch {
    return { phase: "unavailable", reason: "read_failed" };
  }
}

// the methods the engine offers for a phrase, with the engine's own value for each (for the editor's method picker)
export async function loadMethodChoices(phrase, { readProfile = null } = {}) {
  const expression = String(phrase || "").trim();
  if (!expression || /^\d+$/.test(expression)) return [];
  try {
    const read = readProfile || (await import("./numberCoreProjection.js")).fetchNumberMethodProfile;
    return ((await read(expression)) || []).filter((r) => r.methodKey && exactInt(r.computedValue) != null && exactInt(r.computedValue) > 0)
      .map((r) => ({ key: r.methodKey, label: r.displayLabel || r.methodKey, value: exactInt(r.computedValue), sort: r.sortOrder ?? 9999 })).sort((a, b) => a.sort - b.sort);
  } catch { return []; }
}
