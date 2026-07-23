import React, { createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import { useThemeMode } from "./themeMode.js";
import { effectiveMode } from "./lightRoutes.js";

// ===== פלטות סמנטיות לדפי התוכן (בהיר/כהה) =====
// טוקנים לפי *תפקיד* ולא לפי צבע — כך הניגודיות נכונה בשתי התמות.
// ink=טקסט ראשי · inkSoft=משני · accent=זהב נגיש · accentText=טקסט-זהב קריא · onAccent=טקסט על כפתור זהב.

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
    accentBtn: "linear-gradient(135deg, #e3c259, #c9a227)",
    onAccent: "#3a2a00",        // טקסט על כפתור זהב
    glow: "rgba(201,162,39,0.22)",
    labBg: "linear-gradient(160deg, #141019, #0b0813)", // פאנל "מעבדה" כהה מכוון
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
    accentBtn: "linear-gradient(135deg, #d4af37, #e8c840)",
    onAccent: "#1a0e00",
    glow: "rgba(212,175,55,0.40)",
    labBg: "linear-gradient(160deg, rgba(20,15,12,0.6), rgba(8,5,2,0.45))",
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
    accentBtn: "linear-gradient(135deg, #2f6df6, #4f86ff)",
    onAccent: "#ffffff",
    glow: "rgba(47,109,246,0.16)",
    labBg: "linear-gradient(160deg, #eef2f8, #e5ecf6)",
  },
};

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
