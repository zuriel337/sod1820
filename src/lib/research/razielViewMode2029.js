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
