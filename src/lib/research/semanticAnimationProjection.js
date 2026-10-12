// Semantic Animation Projection V1 — renderer-neutral, pure.
// Owner: spatial_research_runtime_vision_v1 (EXTEND_EXISTING).
// Projection only: no arithmetic, DB, UI, renderer, or truth mutation.

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

export const MOTION_PROFILES = Object.freeze({
  standard: Object.freeze({ mode: "standard", cueMs: 240, staggerMs: 60, countUp: true }),
  reduced: Object.freeze({ mode: "reduced", cueMs: 0, staggerMs: 0, countUp: false }),
});

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const clean = (value) => {
  if (value == null) return null;
  const out = String(value).trim();
  return out || null;
};
const finite = (value) => {
  if (value == null || value === "" || typeof value === "boolean") return null;
  const out = Number(value);
  return Number.isFinite(out) ? out : null;
};

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

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
  return Object.values(out).some((value) => value != null) ? out : null;
}

function validateTraceSteps(steps, resultValue) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { status: "unsupported", reason: "trace_without_steps", steps: [] };
  }
  const accepted = [];
  for (const step of steps) {
    if (!isObject(step) || clean(step.scope) !== "letter") {
      return { status: "unsupported", reason: "trace_step_scope_unsupported", steps: [] };
    }
    const token = clean(step.token);
    const contribution = finite(step.contribution ?? step.base_value);
    const subtotal = finite(step.running_subtotal);
    if (!token) {
      // Engine whitespace rows mark a word boundary, not an animated letter.
      const previous = accepted.length ? finite(accepted.at(-1).running_subtotal) : 0;
      if (typeof step.token === "string" && /^\s+$/.test(step.token) && contribution === 0 && subtotal === previous) continue;
      return { status: "unsupported", reason: "trace_step_token_missing", steps: [] };
    }
    if (contribution == null) return { status: "unsupported", reason: "trace_step_contribution_invalid", steps: [] };
    if (subtotal == null) return { status: "unsupported", reason: "trace_step_subtotal_invalid", steps: [] };
    accepted.push(step);
  }
  const finalSubtotal = finite(steps[steps.length - 1]?.running_subtotal);
  if (finalSubtotal !== resultValue) {
    return { status: "unsupported", reason: "trace_final_subtotal_mismatch", steps: [] };
  }
  return { status: "accepted", reason: null, steps: accepted };
}

function gateTrace(selection, trace) {
  if (trace == null) return { status: "absent", reason: null, steps: [] };
  if (!isObject(trace) || trace.status === "error") {
    return { status: "rejected", reason: "trace_unusable", steps: [] };
  }
  if (!selection || selection.expression == null || selection.method == null || selection.resultValue == null) {
    return { status: "rejected", reason: "selection_identity_incomplete", steps: [] };
  }
  const traceExpression = clean(trace.input ?? trace.expression);
  const traceMethod = clean(trace.method_key ?? trace.methodKey);
  const traceResult = finite(trace.result ?? trace.value);
  if (traceExpression !== selection.expression) return { status: "rejected", reason: "expression_mismatch", steps: [] };
  if (traceMethod !== selection.method) return { status: "rejected", reason: "method_mismatch", steps: [] };
  if (traceResult == null || traceResult !== selection.resultValue) return { status: "rejected", reason: "result_mismatch", steps: [] };
  return validateTraceSteps(trace.steps, selection.resultValue);
}

function readRelations(relations) {
  const accepted = [];
  const rejected = [];
  for (const [index, relation] of (Array.isArray(relations) ? relations : []).entries()) {
    const id = isObject(relation) ? clean(relation.id) : null;
    const ref = isObject(relation) ? clean(relation.findingId ?? relation.relationRef) : null;
    if (!id || !ref) {
      rejected.push({ index, reason: "not_an_existing_relation" });
      continue;
    }
    accepted.push({
      id,
      ref,
      from: clean(relation.from),
      to: clean(relation.to),
      followed: relation.followed === true,
      convergent: relation.convergent === true,
    });
  }
  return { accepted, rejected };
}

function readInvokedAction(invokedAction) {
  if (!isObject(invokedAction)) return null;
  const kind = clean(invokedAction.kind);
  if (kind === "source_open") {
    const sourceRef = clean(invokedAction.sourceRef);
    if (!sourceRef) return null;
    return { kind, sourceRef, locator: clean(invokedAction.locator), versionRef: clean(invokedAction.versionRef) };
  }
  if (kind === "exact_return") {
    const href = clean(invokedAction.href);
    if (!href) return null;
    return { kind, href, selection: invokedAction.selection ?? null };
  }
  return null;
}

export function buildSemanticAnimationProjection({
  selection = null,
  trace = null,
  relations = [],
  invokedAction = null,
  provenance = null,
  truthState = null,
  reducedMotion = false,
  previousSignature = null,
} = {}) {
  const normalizedSelection = readSelection(selection);
  const profile = reducedMotion ? MOTION_PROFILES.reduced : MOTION_PROFILES.standard;
  const lifecycleBase = {
    version: SEMANTIC_ANIMATION_PROJECTION_VERSION,
    motion: profile,
    provenance,
    truthState,
  };

  if (!normalizedSelection) {
    const signature = `sap1:${stable({ empty: true, mode: profile.mode })}`;
    return Object.freeze({
      ...lifecycleBase,
      status: "empty",
      selectionKey: null,
      trace: Object.freeze({ status: "absent", reason: null }),
      relationsRejected: Object.freeze([]),
      cues: Object.freeze([]),
      signature,
      lifecycle: Object.freeze({
        cancelPrevious: previousSignature != null && previousSignature !== signature,
        supersedes: previousSignature ?? null,
        rebuild: true,
      }),
    });
  }

  const gatedTrace = gateTrace(normalizedSelection, trace);
  const relationState = readRelations(relations);
  const action = readInvokedAction(invokedAction);
  const cues = [];
  const push = (kind, target, extra = {}) => cues.push({ kind, order: cues.length, target, ...extra });

  push("focus_enter", {
    entityId: normalizedSelection.entityId,
    entityType: normalizedSelection.entityType,
    findingId: normalizedSelection.findingId,
  });
  if (normalizedSelection.expression != null) {
    push("expression_reveal", {
      expression: normalizedSelection.expression,
      method: normalizedSelection.method,
    });
  }

  gatedTrace.steps.forEach((step, stepIndex) => {
    push("trace_step_reveal", {
      expression: normalizedSelection.expression,
      method: normalizedSelection.method,
      stepIndex,
      step,
    });
  });

  if (normalizedSelection.resultValue != null) {
    push("result_reveal", {
      expression: normalizedSelection.expression,
      method: normalizedSelection.method,
      value: normalizedSelection.resultValue,
    }, {
      presentation: profile.countUp
        ? { countUp: { from: 0, to: normalizedSelection.resultValue, intermediate: "presentation_only" } }
        : { countUp: null },
    });
  }

  relationState.accepted.forEach((relation) => {
    push("relation_connect", {
      relationId: relation.id,
      ref: relation.ref,
      from: relation.from,
      to: relation.to,
    });
    if (relation.followed) push("relation_follow", { relationId: relation.id, ref: relation.ref });
  });

  const convergentIds = relationState.accepted.filter((relation) => relation.convergent).map((relation) => relation.id);
  if (convergentIds.length) push("convergence", { relationIds: convergentIds });

  if (action?.kind === "source_open") {
    push("source_open", {
      sourceRef: action.sourceRef,
      locator: action.locator,
      versionRef: action.versionRef,
    });
  } else if (action?.kind === "exact_return") {
    push("exact_return", { href: action.href, selection: action.selection });
  }

  push("settle", { selectionKey: null });

  const selectionKey = stable({
    e: normalizedSelection.expression,
    m: normalizedSelection.method,
    r: normalizedSelection.resultValue,
    f: normalizedSelection.findingId,
    i: normalizedSelection.entityId,
    s: normalizedSelection.sourceRef,
  });
  cues[cues.length - 1].target.selectionKey = selectionKey;

  const timed = cues.map((cue) => Object.freeze({
    ...cue,
    target: Object.freeze(cue.target),
    startMs: cue.order * profile.staggerMs,
    durationMs: profile.cueMs,
  }));

  const signature = `sap1:${stable({
    mode: profile.mode,
    selectionKey,
    trace: gatedTrace.status,
    invokedAction: action,
    cues: timed,
  })}`;

  return Object.freeze({
    ...lifecycleBase,
    status: "ready",
    selectionKey,
    trace: Object.freeze({ status: gatedTrace.status, reason: gatedTrace.reason }),
    relationsRejected: Object.freeze(relationState.rejected),
    cues: Object.freeze(timed),
    signature,
    lifecycle: Object.freeze({
      cancelPrevious: previousSignature != null && previousSignature !== signature,
      supersedes: previousSignature ?? null,
      rebuild: true,
    }),
  });
}
