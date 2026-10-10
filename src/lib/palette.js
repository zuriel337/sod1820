import React, { createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import { useThemeMode, useThemePreset } from "./themeMode.js";
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
  // ===== סביבת RESEARCH_LAB — אותה שפה, שתי הקרנות אור/חושך =====
  labLight: {
    mode: "light",
    pageBg: "#f2f5f8",
    card: "#fbfcfe",
    cardSoft: "#edf2f7",
    cardGrad: "linear-gradient(135deg, #ffffff, #edf2f7)",
    border: "rgba(67,86,112,0.16)",
    borderStrong: "rgba(67,86,112,0.34)",
    ink: "#172033",
    inkSoft: "#5d6c82",
    accent: "#326fe8",
    accentText: "#234fa9",
    accentDim: "#8290a5",
    heroNum: "#173865",
    accentBtn: "linear-gradient(135deg, #326fe8, #5d8ef0)",
    onAccent: "#ffffff",
    glow: "rgba(50,111,232,0.16)",
    labBg: "linear-gradient(160deg, #f7f9fc, #e8eef5)",
  },
  labDark: {
    mode: "dark",
    pageBg: "#08111e",
    card: "rgba(15,25,40,0.88)",
    cardSoft: "rgba(12,21,35,0.78)",
    cardGrad: "linear-gradient(135deg, rgba(18,31,49,0.94), rgba(9,17,31,0.9))",
    border: "rgba(126,158,202,0.16)",
    borderStrong: "rgba(126,158,202,0.34)",
    ink: "#edf3fb",
    inkSoft: "#9fb0c8",
    accent: "#5b8cff",
    accentText: "#8eb2ff",
    accentDim: "#6f83a2",
    heroNum: "#c5d6ff",
    accentBtn: "linear-gradient(135deg, #356fe8, #6b7cff)",
    onAccent: "#ffffff",
    glow: "rgba(91,140,255,0.24)",
    labBg: "linear-gradient(160deg, #0d1929, #08111e)",
  },
  // Legacy embedded-lab alias kept for existing consumers.
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


// Royal projection: same semantic roles in Day, Parchment and Night.
export const DESIGN_V2_PALETTES = Object.freeze({
  light: Object.freeze({
    preset: "light", mode: "light",
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
    brandSapphire: "#234FCB",
    brandGold: "#80601D",
    brandGlow: "rgba(35,79,203,0.12)",
  }),
  parchment: Object.freeze({
    preset: "parchment", mode: "light",
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
    brandSapphire: "#21459B",
    brandGold: "#80601D",
    brandGlow: "rgba(184,134,45,0.12)",
  }),
  dark: Object.freeze({
    preset: "dark", mode: "dark",
    successText: "#81DDB0",
    dangerText: "#FF9AA6",
    pageBg: "#080F1C",
    card: "#122036",
    cardSoft: "#172940",
    cardRaised: "#1B2E48",
    cardGrad: "linear-gradient(145deg, #172940, #122036)",
    border: "rgba(177,190,208,0.20)",
    borderStrong: "rgba(177,190,208,0.38)",
    ink: "#F1F5FC",
    inkSoft: "#B1BED0",
    accent: "#315DD5",
    accentText: "#A8C7FF",
    accentSecondary: "#C2A8FA",
    accentDiscovery: "#69DED7",
    accentDim: "#91A7C5",
    heroNum: "#A8C7FF",
    accentBtn: "linear-gradient(135deg, #315DD5, #284E9F)",
    onAccent: "#FFFFFF",
    glow: "rgba(49,93,213,0.14)",
    focusRing: "#69DED7",
    warmAccent: "#DEBD77",
    brandSapphire: "#2F6DF6",
    brandGold: "#DEBD77",
    brandGlow: "rgba(47,109,246,0.16)",
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
    pageBg: "#08111E", cardSoft: "#102740", cardGrad: "linear-gradient(145deg,#142C46,#122036)",
  }),
});

export function resolve2029Palette(preset = "dark", environmentRole = null) {
  const key = DESIGN_V2_PALETTES[preset] ? preset : "dark";
  const base = DESIGN_V2_PALETTES[key];
  if (environmentRole !== "research_lab") return base;
  return Object.freeze({ ...base, ...RESEARCH_LAB_V2[key], environmentRole: "research_lab" });
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


export function use2029Palette(environmentRole = null) {
  const override = useContext(PaletteCtx);
  const preset = useThemePreset();
  const resolved = resolve2029Palette(preset, environmentRole);
  return override ? { ...resolved, ...override, preset: resolved.preset } : resolved;
}
