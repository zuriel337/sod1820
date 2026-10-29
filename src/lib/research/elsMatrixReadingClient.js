// Client side of the experimental ELS matrix reading layer (contract els_matrix_reading_v1, admin-only, no credits).
// It is not a chat, not a Provider and not a search engine: it calls the existing ai-analyze route, whose server side
// (supabase/functions/_shared/elsMatrixReading.js) reads the window from the canonical stream and verifies every
// proposal with the canonical ELS engine. Nothing here decides what is true; it builds requests and names states.
import { supabase } from "../supabase.js";

export const ELS_MATRIX_READING_REQUEST_CONTRACT = "els_matrix_reading_request_v1";
export const ELS_MATRIX_READING_CONTRACT = "els_matrix_reading_v1";

// Experimental starting values, not fixed rules (the server accepts rows 9-35, cols 15-45, cap 5-60).
export const ELS_MATRIX_READING_START = Object.freeze({ rows: 33, cols: 41, cap: 60 });

const FINALS = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const normalizeTerm = (value) => [...String(value || "")].filter((c) => c >= "א" && c <= "ת").map((c) => FINALS[c] || c).join("");

/** The axis of the reading comes only from the verified matrix context the ELS screen already builds (els_matrix_presentation_context_v1). */
export function axisFromMatrixContext(context) {
  const axis = context?.axis;
  if (context?.contract !== "els_matrix_presentation_context_v1" || !axis) return null;
  if (axis.scope !== "torah") return null; // the reading layer reads the Torah stream only
  const term = normalizeTerm(axis.term);
  if (term.length < 2 || term.length > 24) return null;
  if (!Number.isSafeInteger(axis.skip) || axis.skip < 2 || !Number.isSafeInteger(axis.start) || axis.start < 0 || ![1, -1].includes(axis.dir)) return null;
  return { term, scope: "torah", skip: axis.skip, dir: axis.dir, start: axis.start };
}

const windowOf = (options) => ({ rows: options?.rows ?? ELS_MATRIX_READING_START.rows, cols: options?.cols ?? ELS_MATRIX_READING_START.cols });
const capOf = (options) => options?.cap ?? ELS_MATRIX_READING_START.cap;

/** op "preview": reads the stream and the engine and counts tokens. It starts no model run and costs nothing. */
export function buildPreviewRequest(axis, options = {}) {
  return { contract: ELS_MATRIX_READING_REQUEST_CONTRACT, op: "preview", axis, window: windowOf(options), cap: capOf(options) };
}

/** op "create": starts the run. ackUpperBoundUsd is the upper bound the person saw in the preview for these exact parameters. */
export function buildCreateRequest(axis, ackUpperBoundUsd, options = {}) {
  return { contract: ELS_MATRIX_READING_REQUEST_CONTRACT, op: "create", axis, window: windowOf(options), cap: capOf(options), ack_upper_bound_usd: ackUpperBoundUsd };
}

/** op "status": collects the batch, verifies the proposals with the canonical engine and logs the cost once. */
export function buildStatusRequest(jobToken) {
  return { contract: ELS_MATRIX_READING_REQUEST_CONTRACT, op: "status", job_token: jobToken };
}

async function invokeAiAnalyze(body, invoker) {
  const call = invoker ?? (supabase ? (payload) => supabase.functions.invoke("ai-analyze", { body: payload }) : null);
  if (!call) return { ok: false, error: "supabase_unavailable" };
  const { data, error } = await call(body);
  if (error) {
    // non-2xx responses carry the contract body in the error context; keep it so the card can show the reason
    const detail = await error.context?.clone?.().json().catch(() => null);
    return detail && typeof detail === "object" ? { ok: false, ...detail } : { ok: false, error: "reading_unavailable" };
  }
  return data && typeof data === "object" ? data : { ok: false, error: "reading_unavailable" };
}

export const previewElsMatrixReading = (axis, options, invoker) => invokeAiAnalyze({ els_matrix_reading: buildPreviewRequest(axis, options) }, invoker);
export const startElsMatrixReading = (axis, ackUpperBoundUsd, options, invoker) => invokeAiAnalyze({ els_matrix_reading: buildCreateRequest(axis, ackUpperBoundUsd, options) }, invoker);
export const checkElsMatrixReading = (jobToken, invoker) => invokeAiAnalyze({ els_matrix_reading: buildStatusRequest(jobToken) }, invoker);

/**
 * Names the state of a response for a card. It never upgrades anything: a cut-off answer is "incomplete", an engine MISMATCH is not a finding,
 * and a proposal the engine could not check stays "plain text".
 */
export function readingPhase(result) {
  if (!result || result.contract !== ELS_MATRIX_READING_CONTRACT) return { phase: "error", done: true, completed: false, reason: result?.error ?? "no_contract" };
  if (result.ok === false) return { phase: "error", done: true, completed: false, reason: result.error ?? "error", retryable: result.reason === "engine_unavailable" || result.retryable === true };
  switch (result.state) {
    case "PREVIEW": return { phase: "preview", done: false, completed: false };
    case "RUNNING": return { phase: "running", done: false, completed: false, pollAfterSeconds: result.job?.poll_after_seconds ?? 20 };
    case "COMPLETE": return { phase: "complete", done: true, completed: true };
    case "INCOMPLETE": return { phase: "incomplete", done: true, completed: false, reason: result.reason ?? null, continuationRequired: result.continuation_required === true };
    case "FAILED_WITH_REASON": return { phase: "failed", done: true, completed: false, reason: result.reason ?? result.error ?? null, retryable: result.retryable === true };
    default: return { phase: "error", done: true, completed: false, reason: "unknown_state" };
  }
}

/** Findings split by what the engine established, for a card that must not mix test data with verified findings. */
export function groupReadingFindings(result) {
  const findings = Array.isArray(result?.findings) ? result.findings : [];
  return {
    engineVerified: findings.filter((f) => f?.verification?.state === "ENGINE_VERIFIED"),
    plainTextOnly: findings.filter((f) => f?.verification?.state === "PLAIN_TEXT_ONLY"),
    notVerified: findings.filter((f) => f?.verification?.state === "NOT_VERIFIED"),
    isTestFixture: result?.is_test_fixture === true,
  };
}

/**
 * Polls status until the reading is no longer running. `wait` and `invoker` are injectable so the loop is testable and the card can cancel (shouldStop).
 * Every status call collects the batch and logs the cost once (idempotent on the batch id); polling does not start a second model run.
 */
export async function pollElsMatrixReading(jobToken, { invoker, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), shouldStop = () => false, maxPolls = 90, onUpdate = () => {} } = {}) {
  let last = null;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    if (shouldStop()) return { stopped: true, last };
    last = await checkElsMatrixReading(jobToken, invoker);
    onUpdate(last);
    const phase = readingPhase(last);
    if (phase.done) return { stopped: false, last, phase };
    await wait(Math.max(5, phase.pollAfterSeconds ?? 20) * 1000);
  }
  return { stopped: false, last, phase: { phase: "running", done: false, completed: false, pollLimitReached: true } };
}
