// Session-side helpers of the explicit ELS matrix reading, kept out of the React provider so they can be tested without rendering:
//   - the closed submission the provider hands to its ONE submit() boundary (same session, same request adapter, same transport),
//   - the non-enumerable hooks (progress, explicit cancel) a long turn gets next to the abort signal.
// Nothing here talks to a model or starts anything by itself: it only shapes what an explicit call of submitElsMatrixReading() sends.
import {
  ELS_MATRIX_READING_ACK_UPPER_BOUND_USD,
  ELS_MATRIX_READING_ACTION,
  ELS_MATRIX_READING_SUBJECT,
  normalizeElsMatrixReadingAction,
} from "../../../supabase/functions/_shared/elsMatrixReadingAction.js";

/**
 * context  the els_matrix_presentation_context_v1 the ELS screen already builds (only its axis is used by the server, which reads the window from the canonical stream)
 * op       start (explicit spend), preview (no model), status/cancel (jobId or registered legacy token), recover (selected occurrence only, no start).
 */
export function buildElsMatrixReadingSubmission({
  context,
  op = "start",
  window: readingWindow = undefined,
  cap = undefined,
  story = undefined,
  ackUpperBoundUsd = ELS_MATRIX_READING_ACK_UPPER_BOUND_USD,
  jobToken = null,
  jobId = null,
  requestId = null,
} = {}) {
  if (!context?.axis) return { ok: false, error: "matrix_context_required" };
  if (!["preview", "start", "status", "cancel", "recover"].includes(op)) return { ok: false, error: "reading_action_invalid" };
  // Losing a job token must NEVER silently change a status/cancel request into a paid start.
  if ((op === "status" || op === "cancel") && !jobToken && !jobId) return { ok: false, error: "reading_job_token_required" };
  if ((jobToken != null || jobId != null) && ["preview", "recover"].includes(op)) return { ok: false, error: "reading_action_invalid" };
  if (jobToken && jobId) return { ok: false, error: "reading_action_invalid" };
  const action = normalizeElsMatrixReadingAction(op === "recover" ? { id: ELS_MATRIX_READING_ACTION, op }
    : jobToken != null || jobId != null
    ? { id: ELS_MATRIX_READING_ACTION, op: op === "cancel" ? "cancel" : "status", ...(jobId ? { job_id: jobId } : { job_token: jobToken }) }
    : {
      id: ELS_MATRIX_READING_ACTION,
      op: op === "preview" ? "preview" : "start",
      window: readingWindow,
      cap,
      story,
      ...(op === "preview" ? {} : { ack_upper_bound_usd: ackUpperBoundUsd, request_id: requestId ?? globalThis.crypto?.randomUUID?.() }),
    });
  if (!action || (action.op === "start" && !action.request_id)) return { ok: false, error: "reading_action_invalid" };
  return {
    ok: true,
    submission: {
      question: ELS_MATRIX_READING_SUBJECT,
      intelligenceLevel: "deep",
      view: { surface: "els", elsFocus: { ...context.axis, occurrenceRef: context.axis.hitId }, elsMatrixContext: context },
      elsMatrixReadingAction: action,
    },
  };
}

/**
 * Gives a prepared request of a reading the two hooks a minutes-long turn needs, as non-enumerable properties (like the abort signal), so they never travel in the body:
 * `__razielProgress(progress)` feeds the session's turn_progress, `__razielCancelSignal` is aborted by an explicit cancel (an unmount only aborts the polling).
 * Returns { cancel } or null when the request is not a reading.
 */
export function attachElsMatrixReadingHooks(request, { turnId, dispatch, isMounted = () => true } = {}) {
  if (!request?.elsMatrixReadingAction) return null;
  const controller = new AbortController();
  Object.defineProperty(request, "__razielCancelSignal", { value: controller.signal, enumerable: false, configurable: true });
  Object.defineProperty(request, "__razielProgress", {
    value: (progress) => { if (isMounted()) dispatch({ type: "turn_progress", turnId, progress }); },
    enumerable: false,
    configurable: true,
  });
  return { cancel: () => { if (controller.signal.aborted) return false; controller.abort(); return true; }, signal: controller.signal };
}
