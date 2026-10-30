// The closed contract of ONE explicit action inside the existing Raziel conversation: read the bounded matrix area around the selected ELS occurrence.
// Imported by the browser (request adapter, transport, session) and by ai-analyze (server), exactly like the Guided-ELS planning action, so both sides apply the same rules.
// Plain ES module with no imports. It builds no request to any model, calculates no ELS position and decides nothing about truth: the engine module
// (_shared/elsMatrixReading.js) does the reading, and the canonical ELS engine verifies every proposal.

export const ELS_MATRIX_READING_ACTION = "els_matrix_reading_v1";
export const ELS_MATRIX_READING_SUBJECT = "קרא את המטריצה סביב המופע שבחרתי";
export const ELS_MATRIX_READING_RESULT_CONTRACT = "els_matrix_reading_v1";
export const ELS_MATRIX_READING_OPS = Object.freeze(["preview", "start", "status", "cancel", "recover"]);
export const isElsReadingJobId = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/** Bounds the server enforces. The values below the line are an experimental STARTING POINT (ZURIEL, 29.10.2026), not fixed rules. */
export const ELS_MATRIX_READING_LIMITS = Object.freeze({
  rows: Object.freeze({ min: 9, max: 35 }),
  cols: Object.freeze({ min: 15, max: 45 }),
  cap: Object.freeze({ min: 5, max: 60 }),
  storyMax: 300,
  ackMax: 10,
  tokenMin: 40,
  tokenMax: 6000,
});
export const ELS_MATRIX_READING_START = Object.freeze({ rows: 33, cols: 41, cap: 60 });

/**
 * A ceiling the card can show BEFORE the one click and send as the acknowledged upper bound: every window the limits allow stays below it
 * (worst case ~ $1.8 = half of list price for ~28K input tokens plus the whole 64,000-token output allowance). The server compares it with
 * the upper bound it computes for the exact request and refuses (409-like) when the acknowledged value is lower.
 */
export const ELS_MATRIX_READING_ACK_UPPER_BOUND_USD = 2;

/** What the evidence says about time: Fable batches of this kind took 3-13 minutes (EXP-15, 16, 18). Shown as a range, never a promise. */
export const ELS_MATRIX_READING_EXPECTED_MINUTES = Object.freeze({ min: 3, max: 13 });
export const ELS_MATRIX_READING_POLL_SECONDS = 20;

/**
 * Default depth of the search (ZURIEL, 30.10.2026): an ADDITION to the existing reading, not a replacement and not a quota. The measured instruction stays whole and in force
 * (focus "uniform" is exactly it); the default appends one section after it that asks for more depth along the axis and around it (about twice to three times the effort per line
 * than at the margins), keeps a margin check whatever was found near the axis, asks for source rows (plain-text rows) and for the model's own statement of the lines it went through.
 * It sets no number of proposals near or far, does not ask to fill the cap, and loses nothing: every proposal, near or far, is kept and verified. Where the proposals lay is only
 * described; coverage is reported apart from the number of proposals (deterministic coverage, the model's report, the count).
 * The radius (cells, Chebyshev distance from any cell of the occurrence) is 8. It was first read off one saved cipher, which makes that cipher IN-SAMPLE for it; checked afterwards
 * against the other saved ciphers of the site (19 Torah ciphers, 108 saved findings): 66% lie within 4 cells of their axis, 81% within 8, 94% within 12, the farthest at 27.
 * An UNMEASURED instruction: it must be compared with the measured one before any deployment.
 */
export const ELS_MATRIX_READING_FOCUS = Object.freeze({ AXIS_NEIGHBORHOOD: "axis_neighborhood", UNIFORM: "uniform" });
export const ELS_MATRIX_READING_FOCUS_DEFAULT = ELS_MATRIX_READING_FOCUS.AXIS_NEIGHBORHOOD;
export const ELS_MATRIX_READING_NEIGHBORHOOD = Object.freeze({ radius: 8 });

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isInt = (value) => Number.isSafeInteger(value);
const KEYS = new Set(["id", "op", "window", "cap", "story", "focus", "ack_upper_bound_usd", "job_token", "job_id", "request_id"]);

/** The story is background text from the person, shown to the model as data. Control characters, tags and the quote characters of the prompt frame are removed. */
export function cleanElsMatrixReadingStory(value) {
  if (value == null) return "";
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[„“”"«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The closed action envelope. Returns null for anything outside the contract (unknown keys, wrong types, out-of-range values) so the caller can refuse the whole request.
 *   preview  window? cap? story? focus?                  reads the stream and the engine, counts tokens, runs NO model
 *   start    request_id window? cap? story? focus? ack_upper_bound_usd  one explicit run; server requires idempotency UUID and acknowledged bound
 *            focus: "axis_neighborhood" (the default when absent) | "uniform" (the instruction measured in EXP-15..18)
 *   status   job_id OR registered legacy job_token        collects, verifies and reports; starts nothing
 *   cancel   job_id OR registered legacy job_token        asks the provider to cancel the batch
 *   recover  no extra fields                             retrieves this owner's latest exact occurrence job; starts nothing
 */
export function normalizeElsMatrixReadingAction(value) {
  if (!isObject(value) || value.id !== ELS_MATRIX_READING_ACTION) return null;
  if (Object.keys(value).some((key) => !KEYS.has(key))) return null;
  if (!ELS_MATRIX_READING_OPS.includes(value.op)) return null;
  const limits = ELS_MATRIX_READING_LIMITS;
  if (value.op === "recover") return Object.keys(value).every(key => key === "id" || key === "op")
    ? { id: ELS_MATRIX_READING_ACTION, op: "recover" } : null;
  if (value.op === "status" || value.op === "cancel") {
    if (["window", "cap", "story", "focus", "ack_upper_bound_usd", "request_id"].some((key) => value[key] != null)) return null;
    if (value.job_id != null) return isElsReadingJobId(value.job_id) && value.job_token == null
      ? { id: ELS_MATRIX_READING_ACTION, op: value.op, job_id: value.job_id.toLowerCase() } : null;
    const token = value.job_token;
    if (typeof token !== "string" || token.length < limits.tokenMin || token.length > limits.tokenMax || /[^A-Za-z0-9._-]/.test(token)) return null;
    return { id: ELS_MATRIX_READING_ACTION, op: value.op, job_token: token };
  }
  if (value.job_token != null || value.job_id != null) return null;
  const out = { id: ELS_MATRIX_READING_ACTION, op: value.op };
  if (value.request_id != null) {
    if (value.op !== "start" || !isElsReadingJobId(value.request_id)) return null;
    out.request_id = value.request_id.toLowerCase();
  }
  if (value.window != null) {
    if (!isObject(value.window) || Object.keys(value.window).some((key) => key !== "rows" && key !== "cols")) return null;
    const { rows = ELS_MATRIX_READING_START.rows, cols = ELS_MATRIX_READING_START.cols } = value.window;
    if (!isInt(rows) || rows < limits.rows.min || rows > limits.rows.max || !isInt(cols) || cols < limits.cols.min || cols > limits.cols.max) return null;
    out.window = { rows, cols };
  }
  if (value.cap != null) {
    if (!isInt(value.cap) || value.cap < limits.cap.min || value.cap > limits.cap.max) return null;
    out.cap = value.cap;
  }
  if (value.story != null) {
    if (typeof value.story !== "string") return null;
    const story = cleanElsMatrixReadingStory(value.story);
    if (story.length > limits.storyMax) return null;
    if (story) out.story = story;
  }
  if (value.focus != null) {
    if (!Object.values(ELS_MATRIX_READING_FOCUS).includes(value.focus)) return null;
    out.focus = value.focus;
  }
  if (value.op === "start") {
    const ack = value.ack_upper_bound_usd;
    if (typeof ack !== "number" || !Number.isFinite(ack) || ack <= 0 || ack > limits.ackMax) return null;
    out.ack_upper_bound_usd = ack;
  } else if (value.ack_upper_bound_usd != null) {
    return null;
  }
  return out;
}

// ---------- what the session keeps of a result ----------
const RESULT_KEYS = Object.freeze([
  "contract", "ok", "state", "error", "reason", "continuation_required", "retryable", "experimental", "model", "provider", "axis", "request", "coverage", "estimate",
  "job", "timing", "cost", "output", "findings", "summary", "cap", "observations", "data_class", "is_test_fixture", "notes", "story", "note", "progress", "spent", "poll_interrupted",
  "restart_blocked", "recovered", "reused", "coverage_report",
]);

function bound(value, depth = 0) {
  if (typeof value === "string") return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").slice(0, 700);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null) return value;
  if (depth >= 7) return null;
  if (Array.isArray(value)) return value.slice(0, 120).map((item) => bound(item, depth + 1));
  if (isObject(value)) {
    const out = {};
    for (const key of Object.keys(value).slice(0, 48)) out[key] = bound(value[key], depth + 1);
    return out;
  }
  return null;
}

/** The structured result kept on the Raziel message for the card: known top-level keys only, every nested value bounded. Anything that is not the contract is dropped. */
export function normalizeElsMatrixReadingResult(value) {
  if (!isObject(value) || value.contract !== ELS_MATRIX_READING_RESULT_CONTRACT) return null;
  const out = {};
  for (const key of RESULT_KEYS) if (value[key] !== undefined) out[key] = bound(value[key]);
  // A signed token is opaque: shortening it destroys its signature and makes resume/cancel fail.
  if (isObject(out.job)) {
    delete out.job.token;
    const token = value.job?.token;
    if (normalizeElsMatrixReadingAction({ id: ELS_MATRIX_READING_ACTION, op: "status", job_token: token })) out.job.token = token;
  }
  if (out.findings != null && !Array.isArray(out.findings)) delete out.findings;
  return out;
}

/** Names the phase for a card without upgrading anything: a cut-off answer is "incomplete", a refusal is "refused", an unchecked proposal stays unchecked. */
export function elsMatrixReadingPhase(result) {
  if (!isObject(result) || result.contract !== ELS_MATRIX_READING_RESULT_CONTRACT) return { phase: "error", done: true, completed: false, reason: "no_contract" };
  switch (result.state) {
    case "PREVIEW": return { phase: "preview", done: false, completed: false };
    case "RUNNING": return { phase: "running", done: false, completed: false, pollAfterSeconds: result.job?.poll_after_seconds ?? ELS_MATRIX_READING_POLL_SECONDS };
    case "CANCEL_REQUESTED": return { phase: "cancelling", done: false, completed: false };
    case "COMPLETE": return { phase: "complete", done: true, completed: true };
    case "INCOMPLETE": return { phase: "incomplete", done: true, completed: false, reason: result.reason ?? null, continuationRequired: result.continuation_required === true };
    case "FAILED_WITH_REASON": return { phase: "failed", done: true, completed: false, reason: result.reason ?? result.error ?? null, retryable: result.retryable === true };
    case "REFUSED": return { phase: "refused", done: true, completed: false, reason: result.error ?? null };
    default: return { phase: "error", done: true, completed: false, reason: result.error ?? "unknown_state" };
  }
}

/** True only for a reading that came from the real provider route. A test double, a fixture or a demo never qualifies. */
export const isLiveFableReading = (result) => isObject(result) && result.contract === ELS_MATRIX_READING_RESULT_CONTRACT
  && result.is_test_fixture === false && result.provider?.kind === "anthropic_live"
  && result.provider?.live_model_call === true && result.model?.verified_available === true;
