// SOD1820 2029 palette tokens: DESIGN_CONTRACT_V2 roles, research-lab variant and the shared icon/surface treatment.
// PURE DATA/FUNCTIONS: no React, no theme store, no route table, no side effects. Moved VERBATIM from src/lib/palette.js.
// Owned by 2029. src/lib/palette.js (Legacy) re-exports these names unchanged so its existing importers keep working.

// ELS identification colors, not success/danger/status roles. Bright fills use their
// own dark ink in every preset; the matrix surface follows the site's one theme tree.
const MATRIX_HIGHLIGHTS = Object.freeze({
  axis: "#FFE04F", onMark: "#201521",
  findings: Object.freeze([
    { color: "#FF5D6C", label: "אדום" },
    { color: "#4CDEF5", label: "תכלת" },
    { color: "#68E69D", label: "ירוק" },
    { color: "#BB9AFF", label: "סגול" },
    { color: "#FFAC57", label: "כתום" },
    { color: "#FF86CD", label: "ורוד" },
    { color: "#7DACFF", label: "כחול" },
    { color: "#63E6D0", label: "טורקיז" },
    { color: "#C5EC64", label: "ליים" },
    { color: "#F9B5A0", label: "אפרסק" },
    { color: "#E5A0F7", label: "סחלב" },
    { color: "#F2CA75", label: "זהב" },
  ].map(Object.freeze)),
});

// Royal projection: same semantic roles in Day, Parchment and Night.
export const DESIGN_V2_PALETTES = Object.freeze({
  light: Object.freeze({
    preset: "light", mode: "light",
    matrix: Object.freeze({ ...MATRIX_HIGHLIGHTS, surface: "#FFFEF9", ink: "#263252", frame: "#996813" }),
    successText: "#236D49",
    dangerText: "#B52B3C",
    pageBg: "#F4F7FC",
    card: "#FFFFFF",
    cardSoft: "#EAF0F9",
    cardRaised: "#FFFFFF",
    cardGrad: "linear-gradient(145deg, #FFFFFF, #EAF0F9)",
    border: "rgba(42,62,87,0.18)",
    borderStrong: "rgba(42,62,87,0.34)",
    ink: "#172B46",
    inkSoft: "#526580",
    accent: "#315DD5",
    accentText: "#2454B8",
    accentSecondary: "#7249A5",
    accentDiscovery: "#086C70",
    accentDim: "#647797",
    heroNum: "#2454B8",
    accentBtn: "linear-gradient(135deg, #315DD5, #2454B8)",
    onAccent: "#FFFFFF",
    glow: "rgba(49,93,213,0.10)",
    focusRing: "#086C70",
    warmAccent: "#80601D",
    brandSapphire: "#1957D9",
    brandGold: "#875E13",
    brandGlow: "rgba(25,87,217,0.12)",
  }),
  parchment: Object.freeze({
    preset: "parchment", mode: "light",
    matrix: Object.freeze({ ...MATRIX_HIGHLIGHTS, surface: "#FFF4D4", ink: "#49331D", frame: "#9F7025" }),
    successText: "#316740",
    dangerText: "#A52D36",
    pageBg: "#F4EDDE",
    card: "#FFF9EE",
    cardSoft: "#EEE3CF",
    cardRaised: "#FFFCF5",
    cardGrad: "linear-gradient(145deg, #FFFCF5, #EEE3CF)",
    border: "rgba(89,70,39,0.20)",
    borderStrong: "rgba(89,70,39,0.38)",
    ink: "#312B23",
    inkSoft: "#706252",
    accent: "#315DD5",
    accentText: "#284E9F",
    accentSecondary: "#764B87",
    accentDiscovery: "#176965",
    accentDim: "#76694F",
    heroNum: "#284E9F",
    accentBtn: "linear-gradient(135deg, #315DD5, #284E9F)",
    onAccent: "#FFFFFF",
    glow: "rgba(40,78,159,0.10)",
    focusRing: "#176965",
    warmAccent: "#80601D",
    brandSapphire: "#1957D9",
    brandGold: "#80570E",
    brandGlow: "rgba(128,87,14,0.12)",
  }),
  dark: Object.freeze({
    preset: "dark", mode: "dark",
    matrix: Object.freeze({ ...MATRIX_HIGHLIGHTS, surface: "#17120E", ink: "#F5EBDD", frame: "#D4AF37" }),
    successText: "#81DDB0",
    dangerText: "#FF9AA6",
    pageBg: "#0B0907",
    card: "#17120E",
    cardSoft: "#211A13",
    cardRaised: "#211A13",
    cardGrad: "linear-gradient(145deg, #211A13, #17120E)",
    border: "rgba(212,175,55,0.18)",
    borderStrong: "rgba(212,175,55,0.38)",
    ink: "#F5F5F0",
    inkSoft: "#C6C6C1",
    // Semantic roles follow Design V2 Night: royal blue action, violet depth, cyan discovery/focus.
    // The warm black-brown surfaces, gold-tinted borders and Brand gold are the approved identity atmosphere.
    accent: "#315DD5",
    accentText: "#A8C7FF",
    accentSecondary: "#C2A8FA",
    accentDiscovery: "#69DED7",
    accentDim: "#BCA57F",
    heroNum: "#F6E27A",
    accentBtn: "linear-gradient(135deg, #315DD5, #2454B8)",
    onAccent: "#FFFFFF",
    glow: "rgba(49,93,213,0.28)",
    focusRing: "#69DED7",
    warmAccent: "#DEBD77",
    brandSapphire: "#1957D9",
    brandGold: "#F9BA3F",
    brandGlow: "rgba(212,175,55,0.18)",
  }),
});

// Environment changes surfaces, not the user-selected control/status family.
const RESEARCH_LAB_V2 = Object.freeze({
  light: Object.freeze({
    pageBg: "#EEF5FF", cardSoft: "#E6F0FC", cardGrad: "linear-gradient(145deg,#F8FBFF,#E8F1FC)",
  }),
  parchment: Object.freeze({
    pageBg: "#F3EEE4", cardSoft: "#E9E7E6", cardGrad: "linear-gradient(145deg,#FFFAF0,#E8EDF5)",
  }),
  dark: Object.freeze({
    pageBg: "#0B0907", cardSoft: "#211A13", cardGrad: "linear-gradient(145deg,#211A13,#17120E)",
  }),
});

export function resolve2029Palette(preset = "dark", environmentRole = null) {
  const key = DESIGN_V2_PALETTES[preset] ? preset : "dark";
  const base = DESIGN_V2_PALETTES[key];
  if (environmentRole !== "research_lab") return base;
  return Object.freeze({ ...base, ...RESEARCH_LAB_V2[key], environmentRole: "research_lab" });
}

// ── Shared icon / tile / surface treatment (Design V2 "Shared icon and surface color resolution", 25.10.2026) ──
// A caller supplies the authorized semantic PURPOSE and STATE; this one resolver returns the preset's
// foreground, surface, border and line roles. Glyph geometry (NavigationIcon2029) never decides colour, and a
// subject kind (writer, category, number…) is not a purpose. Unavailable/disabled always wins over an active accent.
export const TREATMENT_PURPOSES = Object.freeze(["ordinary", "action", "discovery", "secondary", "identity"]);
export const TREATMENT_STATES = Object.freeze(["active", "unavailable", "disabled", "loading", "unknown"]);
const MUTED_STATES = new Set(["unavailable", "disabled", "loading", "unknown"]);
// The only place the reusable tint/mix scale lives.
export const TREATMENT_MIX = Object.freeze({ tile: 12, selected: 11, border: 62, glow: 28 });
const mix = (color, percent, into = "transparent") => `color-mix(in srgb, ${color} ${percent}%, ${into})`;

export function resolveTreatment(palette, { purpose = "ordinary", state = "active" } = {}) {
  const p = TREATMENT_PURPOSES.includes(purpose) ? purpose : "ordinary";
  const s = TREATMENT_STATES.includes(state) ? state : "unknown";
  if (MUTED_STATES.has(s)) {
    return { purpose: p, state: s, muted: true, fg: palette.inkSoft, bg: "transparent", border: palette.border, line: palette.borderStrong,
      selected: "transparent", glow: "none" };
  }
  const role = {
    ordinary: { fg: palette.ink, accent: palette.borderStrong },
    action: { fg: palette.accentText, accent: palette.accent },
    discovery: { fg: palette.accentDiscovery, accent: palette.accentDiscovery },
    secondary: { fg: palette.accentSecondary, accent: palette.accentSecondary },
    identity: { fg: palette.accentText, accent: palette.brandGold },
  }[p];
  const bg = p === "identity"
    ? `linear-gradient(135deg, ${mix(palette.brandSapphire, TREATMENT_MIX.tile * 2, palette.cardSoft)}, ${mix(palette.brandGold, TREATMENT_MIX.tile * 1.6, palette.cardSoft)})`
    : p === "ordinary" ? "transparent" : mix(role.accent, TREATMENT_MIX.tile);
  return { purpose: p, state: s, muted: false, fg: role.fg, bg, border: mix(role.accent, TREATMENT_MIX.border), line: role.accent,
    selected: mix(role.accent, TREATMENT_MIX.selected, palette.cardSoft), glow: p === "identity" ? `0 0 22px ${mix(palette.brandSapphire, TREATMENT_MIX.glow)}` : "none" };
}

// CSS custom properties for a consumer to spread on an element; surface CSS only reads these.
export function treatmentVars(palette, spec) {
  const t = resolveTreatment(palette, spec);
  return { "--tr-fg": t.fg, "--tr-bg": t.bg, "--tr-border": t.border, "--tr-line": t.line, "--tr-selected": t.selected, "--tr-glow": t.glow };
}
