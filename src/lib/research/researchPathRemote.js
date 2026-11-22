import { supabase } from "../supabase.js";
import {
  buildResearchPathIdentityMetadata,
  buildResearchPathRepresentation,
  buildResearchPathStep,
  isResearchPathId,
  researchPathOperationKey,
  researchPathStepsForSave,
} from "./researchPathRuntime.js";

function cleanText(value, max = 240) {
  if (value == null) return null;
  const text = String(value).trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : null;
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
