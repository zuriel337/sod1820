// Raziel observation modes (RAZIEL_VIEW_MODE_V1). A SEPARATE axis from intelligence_level (fast|deep):
// view_mode only chooses how one answer over the same canonical Result Bundle is structured. It never selects a
// provider, never changes calculation/authorization, and "general" is the existing behaviour byte-for-byte.

export const RAZIEL_VIEW_MODES = Object.freeze(["general", "landscape", "exploratory", "surprise"]);
export const RAZIEL_DEFAULT_VIEW_MODE = "general";

export const RAZIEL_VIEW_MODE_META = Object.freeze({
  general: { label: "כללי", experimental: false, hint: "" },
  landscape: { label: "התמונה המלאה", experimental: true, hint: "" },
  exploratory: {
    label: "מתפרע",
    experimental: true,
    hint: "פרשנות עמוקה: עובדה, פרשנות והשערה בנפרד.",
  },
  surprise: { label: "הפתע אותי", experimental: true, hint: "" },
});

// Unknown/missing ⇒ general (mirrors the server). Never throws.
export function normalizeRazielViewMode(value) {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return RAZIEL_VIEW_MODES.includes(v) ? v : RAZIEL_DEFAULT_VIEW_MODE;
}

export const razielViewModeLabel = (mode) => RAZIEL_VIEW_MODE_META[normalizeRazielViewMode(mode)].label;

// Two VISIBLE conversation modes: general and exploratory ("מתפרע · ניסוי"). "landscape" stays a valid contract value
// (server + older requests) but is no longer a selectable standing mode: it is a one-shot action ("🗺️ פתח את התמונה המלאה").
export const RAZIEL_VISIBLE_VIEW_MODES = ["general", "exploratory"];

// One-shot actions on the latest answer ("surprise" and "map"). Their labels are eager; the spec (explicit per-request view
// mode and level) and the Bundle gate live in the lazy razielOneShotGate2029.js. Each re-sends the last question as a
// continuation (again:true) over the same session and canonical Result Bundle; the session's own mode is never changed and no
// second engine, store or memory exists for them.
export const RAZIEL_ONE_SHOT_LABEL = { surprise: "✨ הפתע אותי", map: "🗺️ פתח את התמונה המלאה" };
// The explanation / no-material copy lives in razielOneShotCopy2029.js and ships only with the lazily loaded offer panel.
