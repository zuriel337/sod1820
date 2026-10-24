// Raziel observation modes (RAZIEL_VIEW_MODE_V1). A SEPARATE axis from intelligence_level (fast|deep):
// view_mode only chooses how one answer over the same canonical Result Bundle is structured. It never selects a
// provider, never changes calculation/authorization, and "general" is the existing behaviour byte-for-byte.

export const RAZIEL_VIEW_MODES = Object.freeze(["general", "landscape", "exploratory"]);
export const RAZIEL_DEFAULT_VIEW_MODE = "general";

export const RAZIEL_VIEW_MODE_META = Object.freeze({
  general: Object.freeze({ label: "כללי", experimental: false, hint: "" }),
  landscape: Object.freeze({
    label: "נוף",
    experimental: true,
    hint: "מפת קשרים לפי שכבות על אותו חומר מאומת: עובדה, מקור ופרשנות מופרדים.",
  }),
  exploratory: Object.freeze({
    label: "מתפרע",
    experimental: true,
    hint: "עובדה מאומתת, פרשנות אפשרית והשערה ניסיונית — בלי להמציא עובדות.",
  }),
});

// Unknown/missing ⇒ general (mirrors the server). Never throws.
export function normalizeRazielViewMode(value) {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return RAZIEL_VIEW_MODES.includes(v) ? v : RAZIEL_DEFAULT_VIEW_MODE;
}

export const razielViewModeLabel = (mode) => RAZIEL_VIEW_MODE_META[normalizeRazielViewMode(mode)].label;

// What a server answer reports about the mode it actually applied (plan_meta.view_mode / view_mode).
// "applied:false" (no Bundle / quota / degraded) must never be presented as a landscape/exploratory answer.
export function normalizeRazielViewModeReport(response) {
  const raw = response?.view_mode ?? response?.plan_meta?.view_mode;
  if (!raw || typeof raw !== "object") return null;
  const requested = normalizeRazielViewMode(raw.requested);
  if (requested === RAZIEL_DEFAULT_VIEW_MODE) return null;
  return Object.freeze({
    requested,
    applied: raw.applied === true,
    reason: typeof raw.reason === "string" ? raw.reason.slice(0, 40) : null,
  });
}

// "✨ הפתע אותי" — a ONE-SHOT request, not a mode switch: the last question is sent again as a continuation with
// view_mode "exploratory" over the same Result Bundle. The session's own mode (default "general") is never touched,
// and no second engine, store or memory exists for it. It is offered only while the last answer carries a valid Bundle.
export const RAZIEL_SURPRISE_LABEL = "✨ הפתע אותי";
export const RAZIEL_SURPRISE_MODE = "exploratory";
export const RAZIEL_SURPRISE_EXPLANATION = "רזיאל יחפש קשר לא צפוי בתוך העובדות המאומתות, ויפריד בין עובדה, פרשנות והשערה.";
export const RAZIEL_SURPRISE_NO_MATERIAL = "אין עדיין מספיק חומר להפתעה.";

// lastAnswer: the newest Raziel message of the thread · provenance: the session provenance (must belong to that same turn).
// A valid Bundle = the server reported plan_meta.canonical_result_bundle.status === "ready" for exactly that answer.
export function razielSurpriseEligibility({ lastAnswer = null, provenance = null } = {}) {
  const question = typeof lastAnswer?.question === "string" ? lastAnswer.question.trim() : "";
  if (!lastAnswer || lastAnswer.role !== "raziel" || !question) return Object.freeze({ ok: false, reason: "no_answer" });
  if (!lastAnswer.turnId || provenance?.turnId !== lastAnswer.turnId || provenance?.bundleStatus !== "ready") {
    return Object.freeze({ ok: false, reason: "no_valid_bundle" });
  }
  return Object.freeze({ ok: true, question });
}
