// Technical execution bookkeeping under the existing ai-analyze owner. Server only.
// No model transport, provider, conversation, Research OS store or public DB access.
import { isElsReadingJobId } from "./elsMatrixReadingAction.js";

export class ElsReadingJobStorageError extends Error {
  constructor(code = "reading_job_storage_unavailable") { super(code); this.code = code; }
}

export function elsReadingOwnerId(identity) {
  const id = typeof identity === "string" && identity.startsWith("u:") ? identity.slice(2) : null;
  return isElsReadingJobId(id) ? id.toLowerCase() : null;
}

export function createElsReadingJobRepository({ fetchImpl, supabaseUrl, restHeaders, identity }) {
  const owner = elsReadingOwnerId(identity);
  if (!owner) throw new ElsReadingJobStorageError("reading_identity_required");
  const rpc = async (name, args) => {
    let response;
    try {
      response = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/els_matrix_reading_job_${name}_v1`, {
        method: "POST", headers: restHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ...args, p_owner_id: owner }),
      });
      if (!response.ok) throw new Error("storage refused");
      const value = await response.json();
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid receipt");
      // Identity is supplied only by the verified server principal; fail closed on corrupt/misrouted replies too.
      if (value.job && value.job.owner_id !== owner) throw new Error("owner mismatch");
      return value;
    } catch { throw new ElsReadingJobStorageError(); }
  };
  return {
    claim: ({ requestId, scopeKey, requestHash, snapshot }) => rpc("claim", { p_request_id: requestId, p_scope_key: scopeKey, p_request_hash: requestHash, p_snapshot: snapshot }),
    get: ({ id = null, scopeKey = null, batchId = null }) => rpc("get", { p_job_id: id, p_scope_key: scopeKey, p_batch_id: batchId }),
    attach: ({ id, batchId, payload }) => rpc("attach", { p_job_id: id, p_batch_id: batchId, p_job_token: null, p_job_payload: payload }),
    markUnknown: id => rpc("mark_unknown", { p_job_id: id }),
    finish: ({ id, result }) => rpc("finish", { p_job_id: id, p_result: result }),
    cost: ({ id, model, usage, trace = null }) => rpc("cost", { p_job_id: id, p_model: model, p_usage: usage, p_trace: trace }),
  };
}
