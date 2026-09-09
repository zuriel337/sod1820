// 🎛️ Canonical control family — W1 Slice 2 (Scope A).
//
// ONE semantic vocabulary for the site's shared action controls, expressed as pure
// functions over the EXISTING palette tokens. It is a spec, not an owner: it renders
// nothing, holds no state, and imports nothing.
//
// ⛔ NO HARD-CODED SHARED-CONTROL PALETTE. Every colour is read from the palette object
// passed in (`src/lib/palette.js`), so a control is automatically correct in dark, light
// and the lab skin, and `canonical_colors_law` stays the single colour owner.
//
// ROLE answers "how much weight does this action carry", STATE answers "what is true
// about it right now". They are orthogonal — a primary control can be loading, a ghost
// control can be locked.

export const CONTROL_ROLES = ["primary", "secondary", "ghost", "icon"];

// `building` and `locked` are first-class states because the frame contract requires a
// future/gated capability to be visible and honest — "never look like a broken active
// link" — rather than hidden or silently inert.
export const CONTROL_STATES = ["default", "hover", "focus", "disabled", "loading", "building", "locked"];

// Touch target floor. research_workspace_law requires >= 44px on mobile; this is the one
// place that number lives, so no surface can quietly ship a 32px tap target again.
export const CONTROL_MIN_TOUCH = 44;

const isInteractive = (state) => !["disabled", "loading", "building", "locked"].includes(state);

/**
 * Base geometry/typography shared by every role. Kept separate from colour so the two
 * concerns cannot drift.
 */
export function controlBase({ compact = false, fontFamily = "inherit" } = {}) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    boxSizing: "border-box",
    minHeight: CONTROL_MIN_TOUCH,
    padding: compact ? "8px 12px" : "8px 16px",
    borderRadius: 999,
    fontFamily,
    fontSize: 12.5,
    fontWeight: 800,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    flexShrink: 0,
    textDecoration: "none",
    cursor: "pointer",
    transition: "background .15s ease, filter .15s ease, opacity .15s ease",
  };
}

/**
 * Role + state -> palette-derived visual. `P` is a palette from src/lib/palette.js.
 * Returns plain style objects so this works with the codebase's existing inline-style
 * components without forcing a CSS-in-JS dependency on anyone.
 */
export function controlVisual(P, role = "secondary", state = "default") {
  const r = CONTROL_ROLES.includes(role) ? role : "secondary";
  const s = CONTROL_STATES.includes(state) ? state : "default";

  const byRole = {
    primary: { background: P.accentBtn, color: P.onAccent, border: "1px solid transparent" },
    secondary: { background: P.card, color: P.ink, border: `1px solid ${P.border}` },
    ghost: { background: "transparent", color: P.accentText, border: "1px solid transparent" },
    icon: { background: "transparent", color: P.accentText, border: `1px solid ${P.border}`, padding: "8px", gap: 0 },
  };
  const visual = { ...byRole[r] };

  if (!isInteractive(s)) {
    visual.cursor = "default";
    // Distinguishable, never invisible: a gated or in-progress control must remain
    // readable so the user can tell it exists and why it cannot be used yet.
    visual.opacity = s === "disabled" ? 0.45 : 0.62;
  }
  if (s === "locked") {
    visual.border = `1px dashed ${P.borderStrong}`;
    visual.color = P.accentText;
  }
  if (s === "building") {
    visual.background = P.glow;
    visual.color = P.accentText;
  }
  return visual;
}

/**
 * Accessibility contract for a state. Returned as real ARIA so every consumer announces
 * the same thing — a busy control is `aria-busy`, a gated one is `aria-disabled` and
 * stays focusable so keyboard users can still discover it.
 */
export function controlA11y(state = "default") {
  const s = CONTROL_STATES.includes(state) ? state : "default";
  if (s === "loading") return { "aria-busy": true, "aria-disabled": true, disabled: true };
  if (s === "disabled") return { "aria-disabled": true, disabled: true };
  // building/locked keep focusability: they are informative, not broken.
  if (s === "building" || s === "locked") return { "aria-disabled": true, tabIndex: 0 };
  return {};
}

/**
 * The one focus-visible treatment for the whole control family, as a CSS string.
 * Keyboard modality only — a mouse click must not paint a ring, and a real Tab must.
 * Uses `currentColor` rather than a palette value so the ring is correct in dark, light
 * and lab without this rule needing to know which theme is active — which is also what
 * lets it be injected once globally instead of per control.
 */
export const CONTROL_FOCUS_CSS = `.sod-ctl:focus-visible{outline:2px solid currentColor;outline-offset:2px;border-radius:999px}
.sod-ctl:focus:not(:focus-visible){outline:none}`;
