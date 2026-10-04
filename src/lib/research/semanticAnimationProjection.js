// Semantic Animation Projection V1 — renderer-neutral, pure.
// Owner: spatial_research_runtime_vision_v1 (EXTEND_EXISTING). Work: SEMANTIC_ANIMATION_PROJECTION_V1.
//
// Input is ONLY already-governed state: a Research Context selection (researchContext.js) or a
// Calculation Selection (calculator2029Model.js buildCalculationSelection), a canonical
// gematria_method_trace response, supplied existing relations, provenance and truth-state.
// Output is an ordered list of SEMANTIC CUES. No renderer, DOM, CSS, timing engine, DB, engine call,
// or formula lives here: the result cue targets the supplied canonical result, never a local one.
// Nothing is persisted; every call is fresh and disposable. Cues are projection state, not truth.

export const SEMANTIC_ANIMATION_PROJECTION_VERSION = 1;

export const CUE_KINDS = Object.freeze([
  "focus_enter",
  "expression_reveal",
  "trace_step_reveal",
  "result_reveal",
  "relation_connect",
  "relation_follow",
  "convergence",
  "source_open",
  "exact_return",
  "settle",
]);

// Deterministic motion profiles (presentation metadata only; no cue meaning depends on them).
export const MOTION_PROFILES = Object.freeze({
  standard: Object.freeze({ mode: "standard", cueMs: 240, staggerMs: 60, countUp: true }),
  reduced: Object.freeze({ mode: "reduced", cueMs: 0, staggerMs: 0, countUp: false }),
});

const isObject = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const clean = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
};
const finite = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Stable JSON: sorted keys so the signature never depends on property order.
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

// Accepts Research Context selection ({expression, method, resultValue}) and
// Calculation Selection ({expression, methodKey, resultValue}) shapes.
function readSelection(selection) {
  if (!isObject(selection)) return null;
  const out = {
    expression: clean(selection.expression),
    method: clean(selection.method ?? selection.methodKey),
    resultValue: finite(selection.resultValue),
    entityId: clean(selection.entityId),
    entityType: clean(selection.entityType),
    findingId: clean(selection.findingId),
    sourceRef: clean(selection.sourceRef),
    locator: clean(selection.locator),
    versionRef: clean(selection.versionRef),
  };
  return Object.values(out).some((v) => v != null) ? out : null;
}

// Exact trace identity gate: expression + method + result must all equal the selection's.
// Equality only — the trace result is never recomputed. Anything else fails closed.
function gateTrace(sel, trace) {
  if (trace == null) return { status: "absent", reason: null, steps: [] };
  if (!isObject(trace) || trace.status === "error") return { status: "rejected", reason: "trace_unusable", steps: [] };
  if (!sel || sel.expression == null || sel.method == null || sel.resultValue == null) {
    return { status: "rejected", reason: "selection_identity_incomplete", steps: [] };
  }
  const tExpr = clean(trace.input ?? trace.expression);
  const tMethod = clean(trace.method_key ?? trace.methodKey);
  const tResult = finite(trace.result ?? trace.value);
  if (tExpr !== sel.expression) return { status: "rejected", reason: "expression_mismatch", steps: [] };
  if (tMethod !== sel.method) return { status: "rejected", reason: "method_mismatch", steps: [] };
  if (tResult === null || tResult !== sel.resultValue) return { status: "rejected", reason: "result_mismatch", steps: [] };
  if (!Array.isArray(trace.steps) || trace.steps.length === 0) {
    return { status: "unsupported", reason: "trace_without_steps", steps: [] };
  }
  return { status: "accepted", reason: null, steps: trace.steps };
}

// Relations are consumed only if they already exist (id + findingId/relationRef). Never discovered.
function readRelations(relations) {
  const accepted = [];
  const rejected = [];
  (Array.isArray(relations) ? relations : []).forEach((rel, index) => {
    const id = isObject(rel) ? clean(rel.id) : null;
    const ref = isObject(rel) ? clean(rel.findingId ?? rel.relationRef) : null;
    if (!id || !ref) {
      rejected.push({ index, reason: "not_an_existing_relation" });
      return;
    }
    accepted.push({
      id,
      ref,
      from: clean(rel.from),
      to: clean(rel.to),
      followed: rel.followed === true,
      convergent: rel.convergent === true,
    });
  });
  return { accepted, rejected };
}

export function buildSemanticAnimationProjection({
  selection = null,
  trace = null,
  relations = [],
  returnTo = null,
  provenance = null,
  truthState = null,
  reducedMotion = false,
  previousSignature = null,
} = {}) {
  const sel = readSelection(selection);
  const profile = reducedMotion ? MOTION_PROFILES.reduced : MOTION_PROFILES.standard;
  const lifecycleBase = {
    version: SEMANTIC_ANIMATION_PROJECTION_VERSION,
    motion: profile,
    provenance,
    truthState,
  };

  if (!sel) {
    const signature = `sap1:${stable({ empty: true, mode: profile.mode })}`;
    return Object.freeze({
      ...lifecycleBase,
      status: "empty",
      selectionKey: null,
      trace: Object.freeze({ status: "absent", reason: null }),
      relationsRejected: Object.freeze([]),
      cues: Object.freeze([]),
      signature,
      lifecycle: Object.freeze({ cancelPrevious: previousSignature != null && previousSignature !== signature, supersedes: previousSignature ?? null, rebuild: true }),
    });
  }

  const gate = gateTrace(sel, trace);
  const rels = readRelations(relations);
  const cues = [];
  const push = (kind, target, extra = {}) => cues.push({ kind, order: cues.length, target, ...extra });

  push("focus_enter", { entityId: sel.entityId, entityType: sel.entityType, findingId: sel.findingId });
  if (sel.expression != null) push("expression_reveal", { expression: sel.expression, method: sel.method });

  gate.steps.forEach((step, stepIndex) => {
    // Step payload is the canonical trace step, passed through unchanged and opaque to this module.
    push("trace_step_reveal", { expression: sel.expression, method: sel.method, stepIndex, step });
  });

  if (sel.resultValue != null) {
    push("result_reveal", {
      expression: sel.expression,
      method: sel.method,
      value: sel.resultValue,
    }, {
      // Presentation metadata only: a renderer MAY tween visually; the cue target is the canonical value.
      presentation: profile.countUp ? { countUp: { from: 0, to: sel.resultValue, intermediate: "presentation_only" } } : { countUp: null },
    });
  }

  rels.accepted.forEach((rel) => {
    push("relation_connect", { relationId: rel.id, ref: rel.ref, from: rel.from, to: rel.to });
    if (rel.followed) push("relation_follow", { relationId: rel.id, ref: rel.ref });
  });
  const convergent = rels.accepted.filter((rel) => rel.convergent).map((rel) => rel.id);
  if (convergent.length > 0) push("convergence", { relationIds: convergent });

  if (sel.sourceRef != null) push("source_open", { sourceRef: sel.sourceRef, locator: sel.locator, versionRef: sel.versionRef });
  if (isObject(returnTo) && clean(returnTo.href)) {
    push("exact_return", { href: clean(returnTo.href), selection: returnTo.selection ?? null });
  }
  push("settle", { selectionKey: null });

  const selectionKey = stable({ e: sel.expression, m: sel.method, r: sel.resultValue, f: sel.findingId, i: sel.entityId, s: sel.sourceRef });
  cues[cues.length - 1].target.selectionKey = selectionKey;

  // Timing is derived from cue order only (profile constants), never from content.
  const timed = cues.map((cue) => Object.freeze({
    ...cue,
    target: Object.freeze(cue.target),
    startMs: cue.order * profile.staggerMs,
    durationMs: profile.cueMs,
  }));

  const signature = `sap1:${stable({ mode: profile.mode, selectionKey, trace: gate.status, cues: timed })}`;
  return Object.freeze({
    ...lifecycleBase,
    status: "ready",
    selectionKey,
    trace: Object.freeze({ status: gate.status, reason: gate.reason }),
    relationsRejected: Object.freeze(rels.rejected),
    cues: Object.freeze(timed),
    signature,
    // Selection change => previous projection is cancelled and this one is rebuilt from scratch.
    lifecycle: Object.freeze({
      cancelPrevious: previousSignature != null && previousSignature !== signature,
      supersedes: previousSignature ?? null,
      rebuild: true,
    }),
  });
}
