// Long-running leg of ONE explicit matrix reading, inside the existing Raziel transport (askRaziel -> ai-analyze, persona raziel).
// A Fable batch takes minutes, so the first call only STARTS it; this module then asks the same route for the status until the reading is no longer running.
// Nothing here is a chat, a Provider, a search engine or an AI route: every call is an ai-analyze Raziel turn built by askRaziel, `invoke(action)` hides which one.
// It never starts a run by itself: it is reached only from a session turn that carries an explicit `elsMatrixReadingAction`.
import { ELS_MATRIX_READING_EXPECTED_MINUTES, ELS_MATRIX_READING_POLL_SECONDS, elsMatrixReadingPhase } from "../../../supabase/functions/_shared/elsMatrixReadingAction.js";

const ID = "els_matrix_reading_v1";
export const ELS_MATRIX_READING_MAX_WAIT_MS = 40 * 60 * 1000;      // far above the 3-13 minutes measured; a bound, not an estimate
export const ELS_MATRIX_READING_CANCEL_GRACE_MS = 3 * 60 * 1000;   // after a cancel request, how long to wait for the provider to report the end
const MAX_CONSECUTIVE_POLL_FAILURES = 3;

const reading = (data) => (data && typeof data === "object" ? data.els_matrix_reading : null);
const stateOf = (data) => elsMatrixReadingPhase(reading(data));

/** Waits `ms`, ending early when any of the signals aborts. Injectable for tests. */
export function waitUnlessAborted(ms, signals = []) {
  return new Promise((resolve) => {
    if (signals.some((signal) => signal?.aborted)) { resolve(); return; }
    const done = () => { clearTimeout(timer); for (const signal of signals) signal?.removeEventListener?.("abort", done); resolve(); };
    const timer = setTimeout(done, ms);
    for (const signal of signals) signal?.addEventListener?.("abort", done, { once: true });
  });
}

/** Keeps the job token on the result (the status answers do not echo it) so that the host can resume or retry; never invents one. */
function withToken(data, token) {
  const result = reading(data);
  if (!result || !token) return data;
  return { ...data, els_matrix_reading: { ...result, job: { ...(result.job ?? {}), token } } };
}

function interrupted(data, token, why) {
  const result = reading(data);
  if (!result) return data;
  const note = `הבדיקה האוטומטית של התקדמות הקריאה נקטעה (${why}). הקריאה עצמה ממשיכה אצל הספק, ואפשר להמשיך לבדוק אותה.`;
  const next = withToken(data, token);
  return {
    ...next,
    raziel: next.raziel ? { ...next.raziel, answer: `${String(next.raziel.answer ?? "").trim()}\n\n${note}`.trim() } : next.raziel,
    els_matrix_reading: { ...next.els_matrix_reading, poll_interrupted: { why, can_resume: Boolean(token) } },
  };
}

/**
 * action: the normalised closed action (preview | start | status | cancel).
 * invoke(action) -> Promise<{ data, error }> : one ai-analyze Raziel turn carrying that action.
 * signal       aborts silently (unmount, principal change): polling stops, the job is NOT cancelled and keeps running at the provider.
 * cancelSignal the person pressed cancel: the provider is asked to cancel, then the end is awaited for a short grace period.
 * onProgress({ phase, elapsedMs, polls, expectedMinutes, providerStatus, batchId, jobToken, pollSeconds, cancelling }) is called on every step.
 * Returns the last ai-analyze answer (the Raziel contract + els_matrix_reading), or null when the very first call fails.
 */
export async function runElsMatrixReadingTurn({
  invoke, action, signal = null, cancelSignal = null, onProgress = () => {}, wait = waitUnlessAborted, now = Date.now,
  maxWaitMs = ELS_MATRIX_READING_MAX_WAIT_MS, cancelGraceMs = ELS_MATRIX_READING_CANCEL_GRACE_MS,
} = {}) {
  const startedAt = now();
  const progress = (extra) => { try { onProgress({ kind: "els_matrix_reading", expectedMinutes: ELS_MATRIX_READING_EXPECTED_MINUTES, ...extra }); } catch { /* a progress sink must never break the turn */ } };
  const call = async (next) => {
    try { const { data, error } = await invoke(next); return error ? { ok: false } : { ok: true, data }; } catch { return { ok: false }; }
  };
  if (action.op === "start" || action.op === "status") progress({ phase: "starting", elapsedMs: 0, polls: 0 });
  const first = await call(action);
  if (signal?.aborted || !first.ok || !first.data) return null;
  let data = first.data;
  if (action.op === "preview" || action.op === "cancel") return data;
  let token = reading(data)?.job?.token ?? action.job_token ?? null;
  let polls = 0, failures = 0, cancelSentAt = null;
  const jobOf = () => reading(data)?.job ?? {};
  for (;;) {
    const phase = stateOf(data);
    if (phase.done) return withToken(data, phase.phase === "complete" ? null : token);
    const elapsedMs = Math.max(0, Number(reading(data)?.progress?.elapsed_ms ?? reading(data)?.job?.elapsed_ms) || (now() - startedAt));
    progress({ phase: cancelSentAt ? "cancelling" : "running", elapsedMs, polls, providerStatus: reading(data)?.progress?.provider_status ?? reading(data)?.job?.processing_status ?? null, batchId: jobOf().batch_id ?? null, jobToken: token, pollSeconds: phase.pollAfterSeconds ?? ELS_MATRIX_READING_POLL_SECONDS, cancelling: Boolean(cancelSentAt) });
    if (signal?.aborted) return null;
    const waited = now() - startedAt;
    if (!cancelSentAt && waited > maxWaitMs) return interrupted(data, token, "עבר זמן ההמתנה המרבי");
    if (cancelSentAt && now() - cancelSentAt > cancelGraceMs) return withToken(data, token);
    await wait(Math.max(5, phase.pollAfterSeconds ?? ELS_MATRIX_READING_POLL_SECONDS) * 1000, [signal, cancelSignal && !cancelSentAt ? cancelSignal : null].filter(Boolean));
    if (signal?.aborted) return null;
    if (cancelSignal?.aborted && !cancelSentAt) {
      // the person asked to stop: ask the provider, then keep asking for the status so the end (and its cost) is reported honestly
      const cancelled = await call({ id: ID, op: "cancel", job_token: token });
      cancelSentAt = now();
      if (cancelled.ok && cancelled.data && reading(cancelled.data)) data = cancelled.data;
      continue;
    }
    const polled = await call({ id: ID, op: "status", job_token: token });
    polls += 1;
    if (!polled.ok || !polled.data || !reading(polled.data)) {
      failures += 1;
      if (failures >= MAX_CONSECUTIVE_POLL_FAILURES) return interrupted(data, token, "שגיאת רשת חוזרת");
      continue;
    }
    failures = 0;
    data = polled.data;
  }
}
