// Topic-authored expression → existing canonical Number focus.
// No local gematria, source publication, method parsing, graph or UI.
import { resolveExpressionFocus } from "./numberExpressionFocus.js";

const clean = value => value == null ? "" : String(value).trim();
function claimedValue(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return NaN;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return NaN;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : NaN;
}

/**
 * Takes the authored row as projected by topicConvergenceContentSections.
 * methodLabel/note are preserved verbatim, never split or interpreted as an
 * engine identity. Exact method selection is checked by the existing resolver.
 * A match locates the result; trace parity is still required for rich explanation.
 */
export async function resolveTopicExpressionFocus2029(row, { profileReader = null } = {}) {
  const expression = clean(row?.phrase || row?.text);
  const authorMethodLabel = clean(row?.methodLabel || row?.method) || null;
  const sourcePath = clean(row?.sourcePath) || null;
  const sourceNote = clean(row?.note) || null;
  const claim = claimedValue(row?.value);
  const base = { expression: expression || null, authorMethodLabel, sourcePath, sourceNote,
    claimedValue: Number.isNaN(claim) ? null : claim, claimStatus: "authored_not_verified", focus: null };
  // Multiple expressions or author annotations are not an exact single input.
  if (!expression || /[=←→]/u.test(expression) || Number.isNaN(claim)) return { ...base, status: "needs_exact_expression" };
  // A numeric assertion without an explicit method must not silently become regular.
  if (claim != null && !authorMethodLabel) return { ...base, status: "needs_method" };
  try {
    const focus = await resolveExpressionFocus(expression, {
      preferredMethod: authorMethodLabel, expectedValue: claim, profileReader,
    });
    if (!focus?.href) return { ...base, status: "method_unavailable_or_value_mismatch" };
    return { ...base, status: "ready", focus,
      claimStatus: claim == null ? "no_authored_numeric_claim" : "profile_match_trace_not_checked" };
  } catch {
    return { ...base, status: "profile_unavailable" };
  }
}
