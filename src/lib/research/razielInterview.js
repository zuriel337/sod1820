import { supabase } from "../supabase.js";

async function invoke(body) {
  if (!supabase) return { ok: false, error: "supabase_unavailable" };
  const { data, error } = await supabase.functions.invoke("number-researcher", { body });
  if (error) {
    const detail = await error.context?.clone?.().json().catch(() => null);
    return { ok: false, error: detail?.error || "interview_unavailable", stage: detail?.stage };
  }
  return data || { ok: false, error: "interview_unavailable" };
}

// Same endpoint/persona and canonical owners; no browser persistence or memory store.
export const loadRazielInterview = (pathId = null) => invoke({ op: "interview", action: "load", path_id: pathId });
export const startRazielInterview = ({ sourceRef, questionIds, requestId }) => invoke({
  op: "interview", action: "start", source_ref: sourceRef, question_ids: questionIds, request_id: requestId,
});
export const correctRazielInterpretation = ({ pathId, revisionNo, questionId, interpretation, reason, scope, exceptions, requestId }) => invoke({
  op: "interview", action: "correct", path_id: pathId, expected_revision_no: revisionNo, question_id: questionId,
  interpretation, reason, scope, exceptions, request_id: requestId,
});
export const askRazielInterview = (pathId, message) => invoke({ values: [787], message, history: [], interview_path_id: pathId });
