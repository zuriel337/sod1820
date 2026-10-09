import { supabase } from "../supabase.js";
import { mergeResearchContext, normalizeResearchContext, normalizeResearchPathStep } from "./researchContext.js";
import { buildJourney2029ContextPatch, journey2029StateFromContext } from "./journey2029Telemetry.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value, max = 240) {
  if (value == null) return null;
  const text = String(value).trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : null;
}

export function researchPathHref(value) {
  if (typeof value !== "string" || /[\\\u0000-\u0020\u007f]/.test(value)) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value.length <= 1200 ? value : null;
}
const cleanHref = researchPathHref;

export function researchPathOperationKey(prefix = "path") {
  try {
    if (globalThis.crypto?.randomUUID) return `${prefix}:${globalThis.crypto.randomUUID()}`;
  } catch { /* noop */ }
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function isResearchPathId(value) {
  return UUID_RE.test(String(value || ""));
}

export function researchContextForPath(context) {
  const normalized = normalizeResearchContext(context);
  if (!normalized) return null;
  // Access is current authorization state, never durable Path truth. It must be
  // re-resolved when the destination surface resumes.
  const { access: _access, updatedAt: _updatedAt, ...safe } = normalized;
  return safe;
}

export function buildResearchPathStep(context, { href = null, label = null, surface = null, reason = null } = {}) {
  const safe = researchContextForPath(context);
  if (!safe?.subject?.id || !safe?.subject?.type) return null;
  return normalizeResearchPathStep({
    step_index: 0, // server owns final ordering/reindexing
    entity_type: safe.subject.type,
    entity_ref: safe.subject.id,
    locator: safe.selection?.locator || null,
    label_key: safe.subject.label || cleanText(label) || safe.subject.id,
    lens: safe.lens || null,
    href: cleanHref(href || safe.subject.href),
    surface: cleanText(surface, 80),
    selection: safe.selection || null,
    reason: cleanText(reason),
    context: safe,
  });
}

export function researchPathStepKey(step) {
  const safe = normalizeResearchPathStep(step);
  return safe ? JSON.stringify([safe.entity_type, safe.entity_ref, safe.href, safe.lens, safe.selection]) : null;
}

// A late Number trace enriches the already chosen expression/method. It is
// not a new reader choice. Distinct non-null findings/versions remain distinct.
function isNumberTraceEnrichment(previous, next) {
  if (previous?.entity_type !== "number" || next?.entity_type !== "number"
    || previous.selection?.focusKind !== "expression" || previous.selection?.findingId
    || !next.selection?.findingId) return false;
  return researchPathStepKey(previous) === researchPathStepKey({ ...next,
    selection: { ...next.selection, findingId: null } });
}

// Explicit Start/Continue only. Ordinary page/method selection does not call this.
export function continueResearchPathContext(context, options = {}) {
  const current = normalizeResearchContext(context);
  const step = buildResearchPathStep(current, options);
  if (!step) return { ok: false, error: "no_research_context" };
  const active = Boolean(journey2029StateFromContext(current));
  const pending = [...(current.journey?.pendingSteps || [])];
  if (!active && !isResearchPathId(current.journey?.id) && current.returnTo?.subject) {
    const origin = buildResearchPathStep(current.returnTo, {
      href: current.returnTo.href, label: current.returnTo.label, reason: "source_return",
    });
    if (origin && researchPathStepKey(origin) !== researchPathStepKey(step)) pending.push(origin);
  }
  const previous = pending.at(-1) || current.journey?.lastSavedStep;
  const enriched = isNumberTraceEnrichment(previous, step);
  const changed = researchPathStepKey(previous) !== researchPathStepKey(step) && !enriched;
  if (enriched && pending.length) pending[pending.length - 1] = { ...step, step_index: previous.step_index };
  if (changed && pending.length >= 99) return { ok: false, error: "save_required" };
  if (changed) {
    step.step_index = (current.journey?.lastSavedStep?.step_index ?? -1) + pending.length + 1;
    pending.push(step);
  }
  const patch = buildJourney2029ContextPatch({
    kind: options.kind || "general_research", mode: options.mode || "organic", sourceSurface: options.surface,
  });
  const next = mergeResearchContext(current, {
    dimensions: active ? current.dimensions : { ...current.dimensions, ...patch.dimensions },
    journey: {
      ...current.journey,
      kind: "research_path",
      id: isResearchPathId(current.journey?.id) ? current.journey.id : null,
      root: current.journey?.root || pending[0]?.context.subject || current.subject,
      position: !active ? pending.length - 1 : Math.max(0, (current.journey?.position ?? -1) + (changed ? 1 : 0)),
      pendingSteps: pending,
    },
  });
  return { ok: true, context: next, started: !active, changed };
}

export function researchPathStepsForSave(context, options = {}) {
  const safe = normalizeResearchContext(context);
  const pending = [...(safe?.journey?.pendingSteps || [])];
  const step = buildResearchPathStep(safe, options);
  if (!step) return [];
  const previous = pending.at(-1) || safe.journey?.lastSavedStep;
  if (isNumberTraceEnrichment(previous, step)) {
    if (pending.length) pending[pending.length - 1] = { ...step, step_index: previous.step_index };
  } else if (researchPathStepKey(previous) !== researchPathStepKey(step)) pending.push(step);
  return pending;
}

export function contextFromResearchPathStep(step, current, { returnTo = null, position = 0 } = {}) {
  const safe = normalizeResearchPathStep(step);
  if (!safe || !cleanHref(safe.href)) return null;
  return normalizeResearchContext({
    ...safe.context,
    subject: { ...safe.context.subject, href: cleanHref(safe.href) },
    journey: { ...current?.journey, position },
    dimensions: { ...safe.context.dimensions, ...Object.fromEntries(Object.entries(current?.dimensions || {}).filter(([key]) => key.startsWith("journey"))) },
    returnTo,
    access: null,
  });
}

export function buildResearchPathRepresentation(context, { href = null, label = null, surface = null } = {}) {
  const safe = researchContextForPath(context);
  if (!safe) return null;
  // Pending steps travel in p_steps. Keep the revision representation bounded.
  if (safe.journey) {
    const { pendingSteps: _pending, lastSavedStep: _last, ...identity } = safe.journey;
    safe.journey = identity;
  }
  return {
    schema: "research-context-v1",
    href: cleanHref(href || safe.subject?.href),
    label: cleanText(label || safe.subject?.label || safe.subject?.id),
    surface: cleanText(surface, 80),
    context: safe,
  };
}

export function buildResearchPathIdentityMetadata(context) {
  const safe = researchContextForPath(context);
  const root = safe?.journey?.root || safe?.subject;
  if (!root) return {};
  return {
    root_type: root.type,
    root_ref: root.id,
    root_label: root.label || root.id,
  };
}

function rpcError(error, fallback = "research_path_unavailable") {
  if (!error) return null;
  return {
    ok: false,
    error: error.code || fallback,
    message: error.message || fallback,
  };
}

export async function getLatestResearchPath(pathId = null) {
  if (pathId != null && !isResearchPathId(pathId)) return { ok: false, error: "invalid_path_id" };
  if (!supabase) return { ok: false, error: "supabase_unavailable" };
  const { data, error } = await supabase.rpc("fn_research_path_resume_v1", {
    p_path_id: isResearchPathId(pathId) ? pathId : null,
  });
  if (error) return rpcError(error);
  return data || { ok: false, error: "not_found" };
}

export async function saveResearchPathSnapshot({
  context,
  href = null,
  label = null,
  surface = null,
  pathId = null,
  expectedRevisionNo = null,
  saveKey = null,
} = {}) {
  if (!supabase) return { ok: false, error: "supabase_unavailable" };
  const steps = researchPathStepsForSave(context, { href, label, surface });
  const representation = buildResearchPathRepresentation(context, { href, label, surface });
  if (!representation?.context?.subject) return { ok: false, error: "no_research_context" };
  if (pathId != null && !isResearchPathId(pathId)) return { ok: false, error: "invalid_path_id" };
  if (!steps.length && pathId) return getLatestResearchPath(pathId);
  if (!steps.length || steps.length > 100) return { ok: false, error: "save_required" };

  const { data, error } = await supabase.rpc("fn_research_path_append_v1", {
    p_path_id: isResearchPathId(pathId) ? pathId : null,
    p_steps: steps,
    p_identity_metadata: buildResearchPathIdentityMetadata(context),
    p_provenance: {
      source: "system-frame-2029",
      surface: cleanText(surface, 80),
    },
    p_representation: representation,
    p_expected_revision_no: Number.isInteger(expectedRevisionNo) ? expectedRevisionNo : null,
    p_save_key: cleanText(saveKey, 160) || researchPathOperationKey("save"),
  });
  if (error) return rpcError(error);
  return data || { ok: false, error: "save_failed" };
}

export async function forkResearchPathSnapshot({
  parentPathId,
  parentRevisionId,
  branchPointStepIndex,
  context,
  href = null,
  label = null,
  surface = null,
  forkKey = null,
} = {}) {
  if (!supabase) return { ok: false, error: "supabase_unavailable" };
  if (!isResearchPathId(parentPathId) || !isResearchPathId(parentRevisionId)) {
    return { ok: false, error: "invalid_parent_path" };
  }
  const step = buildResearchPathStep(context, { href, label, surface });
  const representation = buildResearchPathRepresentation(context, { href, label, surface });
  if (!step || !representation) return { ok: false, error: "no_research_context" };

  const { data, error } = await supabase.rpc("fn_research_path_fork_v1", {
    p_parent_path_id: parentPathId,
    p_parent_revision_id: parentRevisionId,
    p_branch_point_step_index: Number.isInteger(branchPointStepIndex) ? branchPointStepIndex : 0,
    p_branch_steps: [step],
    p_identity_metadata: buildResearchPathIdentityMetadata(context),
    p_provenance: {
      source: "system-frame-2029",
      surface: cleanText(surface, 80),
    },
    p_representation: representation,
    p_fork_key: cleanText(forkKey, 160) || researchPathOperationKey("fork"),
  });
  if (error) return rpcError(error);
  return data || { ok: false, error: "fork_failed" };
}

export function contextFromResearchPathSnapshot(snapshot) {
  if (!snapshot?.ok) return null;
  const context = researchContextForPath(snapshot?.representation?.context);
  if (!context) return null;
  const stepCount = Array.isArray(snapshot.steps) ? snapshot.steps.length : 0;
  return normalizeResearchContext({
    ...context,
    access: null,
    journey: {
      root: context.journey?.root || context.subject,
      id: snapshot.path_id,
      kind: "research_path",
      position: Math.max(0, stepCount - 1),
      revisionId: snapshot.revision_id || null,
      revisionNo: snapshot.revision_no ?? null,
      pendingSteps: [],
      lastSavedStep: snapshot.steps?.at(-1) || null,
    },
  });
}

export function resumeHrefFromResearchPath(snapshot) {
  if (!snapshot?.ok) return null;
  return cleanHref(snapshot?.representation?.href || snapshot?.representation?.context?.subject?.href);
}
