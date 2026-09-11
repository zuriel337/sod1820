import React, { createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import { useThemeMode } from "./themeMode.js";
import { effectiveMode } from "./lightRoutes.js";

// ===== פלטות סמנטיות לדפי התוכן (בהיר/כהה/מעבדה) =====
// טוקנים לפי *תפקיד* ולא לפי צבע — כך הניגודיות נכונה בכל תמה.
// canonical_colors_law v2: Theme → effective mode → semantic palette → role → canonical component → surface.

const lightControls = {
  primary: {
    background: "linear-gradient(135deg, #e3c259, #c9a227)",
    color: "#3a2a00",
    border: "rgba(122,94,18,0.38)",
    hoverBackground: "linear-gradient(135deg, #ecd16f, #d3ad31)",
    hoverColor: "#2d2000",
    hoverBorder: "rgba(122,94,18,0.58)",
    focusRing: "rgba(154,120,24,0.34)",
  },
  secondary: {
    background: "#ffffff",
    color: "#6a520f",
    border: "rgba(120,90,20,0.28)",
    hoverBackground: "#f7f0dc",
    hoverColor: "#4c3a0c",
    hoverBorder: "rgba(120,90,20,0.48)",
    focusRing: "rgba(154,120,24,0.26)",
  },
  ghost: {
    background: "transparent",
    color: "#6b6354",
    border: "transparent",
    hoverBackground: "rgba(154,120,24,0.09)",
    hoverColor: "#4c3a0c",
    hoverBorder: "rgba(120,90,20,0.18)",
    focusRing: "rgba(154,120,24,0.22)",
  },
  disabled: {
    background: "#ece7dc",
    color: "#817a6d",
    border: "#ded7c8",
    hoverBackground: "#ece7dc",
    hoverColor: "#817a6d",
    hoverBorder: "#ded7c8",
    focusRing: "transparent",
  },
};

const darkControls = {
  primary: {
    background: "linear-gradient(135deg, #d4af37, #e8c840)",
    color: "#1a0e00",
    border: "rgba(246,226,122,0.42)",
    hoverBackground: "linear-gradient(135deg, #e0bc45, #f0d653)",
    hoverColor: "#120900",
    hoverBorder: "rgba(246,226,122,0.68)",
    focusRing: "rgba(246,226,122,0.34)",
  },
  secondary: {
    background: "rgba(8,5,2,0.52)",
    color: "#f6e27a",
    border: "rgba(212,175,55,0.42)",
    hoverBackground: "rgba(212,175,55,0.12)",
    hoverColor: "#fff0a8",
    hoverBorder: "rgba(246,226,122,0.62)",
    focusRing: "rgba(246,226,122,0.28)",
  },
  ghost: {
    background: "transparent",
    color: "#cfc9d6",
    border: "transparent",
    hoverBackground: "rgba(212,175,55,0.08)",
    hoverColor: "#f6e27a",
    hoverBorder: "rgba(212,175,55,0.18)",
    focusRing: "rgba(246,226,122,0.22)",
  },
  disabled: {
    background: "rgba(255,255,255,0.055)",
    color: "#817b86",
    border: "rgba(255,255,255,0.09)",
    hoverBackground: "rgba(255,255,255,0.055)",
    hoverColor: "#817b86",
    hoverBorder: "rgba(255,255,255,0.09)",
    focusRing: "transparent",
  },
};

const labControls = {
  primary: {
    background: "linear-gradient(135deg, #2f6df6, #4f86ff)",
    color: "#ffffff",
    border: "rgba(30,78,188,0.42)",
    hoverBackground: "linear-gradient(135deg, #255fdf, #3f78f0)",
    hoverColor: "#ffffff",
    hoverBorder: "rgba(28,75,191,0.68)",
    focusRing: "rgba(47,109,246,0.28)",
  },
  secondary: {
    background: "#ffffff",
    color: "#1c4bbf",
    border: "#cdd6e4",
    hoverBackground: "#edf3ff",
    hoverColor: "#153d9d",
    hoverBorder: "#9eb5df",
    focusRing: "rgba(47,109,246,0.22)",
  },
  ghost: {
    background: "transparent",
    color: "#5b6472",
    border: "transparent",
    hoverBackground: "rgba(47,109,246,0.08)",
    hoverColor: "#1c4bbf",
    hoverBorder: "rgba(47,109,246,0.14)",
    focusRing: "rgba(47,109,246,0.20)",
  },
  disabled: {
    background: "#edf0f4",
    color: "#8b94a2",
    border: "#dfe4eb",
    hoverBackground: "#edf0f4",
    hoverColor: "#8b94a2",
    hoverBorder: "#dfe4eb",
    focusRing: "transparent",
  },
};

const lightStatuses = {
  building: { background: "#fff3c4", color: "#684a00", border: "#c89a1f" },
  success: { background: "#e8f7ef", color: "#155f3c", border: "#6db38e" },
  warning: { background: "#fff0dc", color: "#7a4300", border: "#d18a2d" },
  danger: { background: "#fdecec", color: "#8c2020", border: "#d86a6a" },
  info: { background: "#e8f4ff", color: "#1f5f96", border: "#75a9d3" },
};

const darkStatuses = {
  building: { background: "rgba(232,200,64,0.14)", color: "#ffe89a", border: "rgba(232,200,64,0.58)" },
  success: { background: "rgba(47,158,107,0.14)", color: "#79e0ad", border: "rgba(79,191,132,0.54)" },
  warning: { background: "rgba(224,138,46,0.15)", color: "#ffc078", border: "rgba(224,138,46,0.58)" },
  danger: { background: "rgba(214,69,69,0.15)", color: "#ffaaaa", border: "rgba(214,69,69,0.62)" },
  info: { background: "rgba(62,166,255,0.15)", color: "#9bd4ff", border: "rgba(62,166,255,0.55)" },
};

const labStatuses = {
  building: { background: "#fff4d1", color: "#684a00", border: "#d3a62a" },
  success: { background: "#e9f8f0", color: "#155f3c", border: "#6db38e" },
  warning: { background: "#fff0dc", color: "#7a4300", border: "#d18a2d" },
  danger: { background: "#fdecec", color: "#8c2020", border: "#d86a6a" },
  info: { background: "#eaf1ff", color: "#204eaa", border: "#8aa8df" },
};

export const PALETTES = {
  light: {
    mode: "light",
    pageBg: "#f6f1e6",          // קרם חם — רקע הדף
    card: "#ffffff",            // רקע כרטיס
    cardSoft: "#faf6ec",        // כרטיס משני
    cardGrad: "linear-gradient(135deg, #ffffff, #f7f2e6)",
    border: "rgba(120,90,20,0.16)",
    borderStrong: "rgba(120,90,20,0.34)",
    ink: "#2c2719",             // כותרות
    inkSoft: "#6b6354",         // גוף טקסט
    accent: "#9a7818",          // זהב — אייקונים/קווים
    accentText: "#7a5e12",      // טקסט-זהב קריא על בהיר
    accentDim: "#a3946a",       // תוויות-על (eyebrow)
    heroNum: "#b8901f",         // המספר הענק
    accentBtn: lightControls.primary.background,
    onAccent: lightControls.primary.color,
    glow: "rgba(201,162,39,0.22)",
    labBg: "linear-gradient(160deg, #141019, #0b0813)", // פאנל "מעבדה" כהה מכוון
    controls: lightControls,
    statuses: lightStatuses,
  },
  dark: {
    mode: "dark",
    pageBg: "transparent",      // משאיר את הקוסמוס מאחור
    card: "rgba(20,15,12,0.6)",
    cardSoft: "rgba(8,5,2,0.42)",
    cardGrad: "linear-gradient(135deg, rgba(20,15,12,0.6), rgba(8,5,2,0.45))",
    border: "rgba(212,175,55,0.18)",
    borderStrong: "rgba(212,175,55,0.38)",
    ink: "#e8c840",
    inkSoft: "#cfc9d6",
    accent: "#d4af37",
    accentText: "#f6e27a",
    accentDim: "#9a7818",
    heroNum: "#f6e27a",
    accentBtn: darkControls.primary.background,
    onAccent: darkControls.primary.color,
    glow: "rgba(212,175,55,0.40)",
    labBg: "linear-gradient(160deg, rgba(20,15,12,0.6), rgba(8,5,2,0.45))",
    controls: darkControls,
    statuses: darkStatuses,
  },
  // ===== עור «מעבדה» (research_workspace_law) — בהיר-נקי, אקסנט כחול + נגיעת זהב =====
  // משמש רק בדף-המספר כשהוא מוטמע בהיכל (embedded). דף-הבית/תוכן נשארים מלכותיים (canonical_colors_law).
  lab: {
    mode: "light",
    pageBg: "#f6f7f9",
    card: "#ffffff",
    cardSoft: "#eef2f8",
    cardGrad: "linear-gradient(135deg, #ffffff, #f1f5fb)",
    border: "#e4e7ec",
    borderStrong: "#cdd6e4",
    ink: "#1b1d22",
    inkSoft: "#5b6472",
    accent: "#2f6df6",          // כחול — אקסנט המעבדה
    accentText: "#1c4bbf",      // כחול קריא לטקסט
    accentDim: "#8a93a3",
    heroNum: "#12325f",         // מספר עמוק-כחול על רקע נקי
    accentBtn: labControls.primary.background,
    onAccent: labControls.primary.color,
    glow: "rgba(47,109,246,0.16)",
    labBg: "linear-gradient(160deg, #eef2f8, #e5ecf6)",
    controls: labControls,
    statuses: labStatuses,
  },
};

// Role readers are deliberately tiny: callers ask for meaning, never for a color name.
// Unknown role falls back to a safe canonical role instead of inventing local colors.
export function controlTone(P, role = "primary") {
  const set = P?.controls || PALETTES.dark.controls;
  return set[role] || set.secondary || set.primary;
}

export function statusTone(P, role = "info") {
  const set = P?.statuses || PALETTES.dark.statuses;
  return set[role] || set.info || set.building;
}

// CSS-variable bridge for legacy/shared components that already style themselves with CSS classes.
// This is projection-only: the canonical values still live in PALETTES above.
export function semanticControlVars(P) {
  const primary = controlTone(P, "primary");
  const secondary = controlTone(P, "secondary");
  const ghost = controlTone(P, "ghost");
  const disabled = controlTone(P, "disabled");
  return {
    "--control-primary-bg": primary.background,
    "--control-primary-fg": primary.color,
    "--control-primary-border": primary.border,
    "--control-primary-hover-bg": primary.hoverBackground,
    "--control-primary-hover-fg": primary.hoverColor,
    "--control-primary-focus": primary.focusRing,
    "--control-secondary-bg": secondary.background,
    "--control-secondary-fg": secondary.color,
    "--control-secondary-border": secondary.border,
    "--control-secondary-hover-bg": secondary.hoverBackground,
    "--control-secondary-hover-fg": secondary.hoverColor,
    "--control-secondary-focus": secondary.focusRing,
    "--control-ghost-bg": ghost.background,
    "--control-ghost-fg": ghost.color,
    "--control-ghost-hover-bg": ghost.hoverBackground,
    "--control-disabled-bg": disabled.background,
    "--control-disabled-fg": disabled.color,
    "--control-disabled-border": disabled.border,
  };
}

// 🎨 override-context: עוטף תת-עץ בפלטה ספציפית (למשל דף-המספר המוטמע בהיכל → «lab»),
// כך שכל רכיבי-המשנה שקוראים usePalette() מקבלים את אותה פלטה — בלי להעביר props לכל אחד.
const PaletteCtx = createContext(null);
export function PaletteProvider({ value, children }) {
  return React.createElement(PaletteCtx.Provider, { value }, children);
}
// 🌗 usePalette עוקב אחרי אותו «מצב אפקטיבי» של ה-Layout (route-aware) — כך שצבעי-התוכן
// תמיד תואמים לרקע-הדף, בלי «חצי בהיר חצי כהה». override (PaletteProvider) עדיין גובר
// (למשל דף-המספר המוטמע בהיכל = «lab»). בדף לא-מוגר → כהה, גם אם המתג על בהיר.
export function usePalette() {
  const override = useContext(PaletteCtx);
  const globalMode = useThemeMode();
  const { pathname } = useLocation();
  if (override) return override;
  return PALETTES[effectiveMode(pathname, globalMode)] || PALETTES.light;
}
