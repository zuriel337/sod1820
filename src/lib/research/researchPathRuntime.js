import { supabase } from "../supabase.js";
import { normalizeResearchContext } from "./researchContext.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value, max = 240) {
  if (value == null) return null;
  const text = String(value).trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : null;
}

function cleanHref(value) {
  const href = cleanText(value, 1200);
  return href && href.startsWith("/") && !href.startsWith("//") ? href : null;
}

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

export function buildResearchPathStep(context, { href = null, label = null, surface = null } = {}) {
  const safe = researchContextForPath(context);
  if (!safe?.subject?.id || !safe?.subject?.type) return null;
  return {
    step_index: 0, // server owns final ordering/reindexing
    entity_type: safe.subject.type,
    entity_ref: safe.subject.id,
    locator: safe.selection?.locator || null,
    label_key: safe.subject.label || cleanText(label) || safe.subject.id,
    lens: safe.lens || null,
    href: cleanHref(href || safe.subject.href),
    surface: cleanText(surface, 80),
    selection: safe.selection || null,
  };
}

export function buildResearchPathRepresentation(context, { href = null, label = null, surface = null } = {}) {
  const safe = researchContextForPath(context);
  if (!safe) return null;
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
  if (!safe?.subject) return {};
  return {
    root_type: safe.subject.type,
    root_ref: safe.subject.id,
    root_label: safe.subject.label || safe.subject.id,
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
  const step = buildResearchPathStep(context, { href, label, surface });
  const representation = buildResearchPathRepresentation(context, { href, label, surface });
  if (!step || !representation) return { ok: false, error: "no_research_context" };

  const { data, error } = await supabase.rpc("fn_research_path_append_v1", {
    p_path_id: isResearchPathId(pathId) ? pathId : null,
    p_steps: [step],
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
      id: snapshot.path_id,
      kind: "research_path",
      position: Math.max(0, stepCount - 1),
      revisionId: snapshot.revision_id || null,
      revisionNo: snapshot.revision_no ?? null,
    },
  });
}

export function resumeHrefFromResearchPath(snapshot) {
  if (!snapshot?.ok) return null;
  return cleanHref(snapshot?.representation?.href || snapshot?.representation?.context?.subject?.href);
}
