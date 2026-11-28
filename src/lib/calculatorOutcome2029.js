// Calculator outcomes that had no event (S5, 27.11.2026): first compute on the advanced row, a compute that failed or came back empty, and the result of the AI analysis.
// Existing family calculator_2029; tokens and bounded integers only; never the expression. Called only after a real edit by a person (never for a restored or shared result).
import { emit } from "./events.js";
import { registerNavSpec2029 } from "./publicReadingNavSpec2029.js";
registerNavSpec2029();

const FIRST_KEY = "fc29-first";
let firstSent = false;
const reason = value => typeof value === "string" && /^[a-z][a-z0-9_]{0,31}$/.test(value) ? value : "unknown";

export function recordFirstCompute(expressionLength) {
  if (firstSent) return false;
  firstSent = true;
  try { if (sessionStorage.getItem(FIRST_KEY)) return false; sessionStorage.setItem(FIRST_KEY, "1"); } catch { /* once per page load at least */ }
  try { emit("calculator_2029", "first_compute", { props: { surface: "advanced", expression_length: Number.isSafeInteger(expressionLength) ? expressionLength : undefined, from_share: false } }); return true; } catch { return false; }
}
export function recordComputeFailed(why = "unknown") { try { emit("calc_outcome_2029", "compute_failed", { props: { surface: "advanced", reason: reason(why) } }); return true; } catch { return false; } }
export function recordComputeEmpty() { try { emit("calc_outcome_2029", "compute_empty", { props: { surface: "advanced" } }); return true; } catch { return false; } }
export function recordAiResult(ok, why) { try { emit("calc_outcome_2029", "ai_analysis_result", { props: { reason: ok ? "ok" : reason(why || "no_answer") } }); return true; } catch { return false; } }
export function recordEqualsPreview(kind, { method, count } = {}) {
  const m = typeof method === "string" && /^[a-z0-9_:-]{1,48}$/i.test(method) ? method.toLowerCase() : undefined;
  try { emit("calc_outcome_2029", kind === "all_opened" ? "equals_preview_all_opened" : "equals_preview_shown", { props: { surface: "professional", method: m, count: Number.isSafeInteger(count) ? count : undefined } }); return true; } catch { return false; }
}
export function resetCalculatorOutcomeForTest() { firstSent = false; }
