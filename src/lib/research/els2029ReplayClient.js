const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

const toInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

export function buildEls2029ReplayRequest(selection) {
  if (!selection || selection.entityType !== "els") return null;
  const term = clean(selection.term);
  const scope = clean(selection.corpus);
  const skip = toInt(selection.skip);
  const dir = toInt(selection.dir);
  const start = toInt(selection.start);

  if (!term || term.length < 2) return null;
  if (!["torah", "tanakh"].includes(scope)) return null;
  if (skip == null || skip < 2) return null;
  if (![-1, 1].includes(dir)) return null;
  if (start == null || start < 0) return null;

  return Object.freeze({
    op: "verify",
    term,
    scope,
    skip,
    dir,
    start,
  });
}

export function els2029ReplaySelectionKey(selection) {
  const request = buildEls2029ReplayRequest(selection);
  if (!request) return null;
  return [request.scope, request.term, request.skip, request.dir, request.start].join("|");
}

export async function verifyEls2029Selection(selection, invoke) {
  const request = buildEls2029ReplayRequest(selection);
  if (!request) {
    return Object.freeze({
      ok: false,
      state: "CONTEXT_REQUIRED",
      request: null,
      result: null,
      traceId: null,
      error: null,
    });
  }
  if (typeof invoke !== "function") {
    return Object.freeze({
      ok: false,
      state: "MISSING_ADAPTER",
      request,
      result: null,
      traceId: null,
      error: "invoke_required",
    });
  }

  try {
    const response = await invoke(request);
    const error = response?.error || null;
    const data = response?.data ?? response ?? null;
    if (error) {
      return Object.freeze({
        ok: false,
        state: "FAILED",
        request,
        result: null,
        traceId: null,
        error: clean(error?.message || error) || "bridge_error",
      });
    }

    const result = data?.result ?? null;
    if (!result || result.contract !== "els_occurrence_replay_v1") {
      return Object.freeze({
        ok: false,
        state: "UNSUPPORTED_CONTRACT",
        request,
        result: null,
        traceId: clean(data?.trace_id),
        error: null,
      });
    }

    const verificationState = clean(result.verification_state) || clean(result.status) || "UNVERIFIED";
    return Object.freeze({
      ok: verificationState === "MATCH",
      state: verificationState,
      request,
      result,
      traceId: clean(data?.trace_id),
      error: null,
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      state: "FAILED",
      request,
      result: null,
      traceId: null,
      error: clean(error?.message || error) || "bridge_error",
    });
  }
}

export default verifyEls2029Selection;
