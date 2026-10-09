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

export const DESIGN_V2_PALETTES = Object.freeze({
  light: Object.freeze({
    preset: "light", mode: "light",
    matrix: Object.freeze({ ...MATRIX_HIGHLIGHTS, surface: "#FFFEF9", ink: "#263252", frame: "#996813" }),
    pageBg: "#F5F8FF",
    card: "#FFFFFF",
    cardSoft: "#EEF3FC",
    cardRaised: "#FFFFFF",
    cardGrad: "linear-gradient(145deg, #FFFFFF, #EDF3FF)",
    border: "rgba(57,73,200,0.14)",
    borderStrong: "rgba(57,73,200,0.30)",
    ink: "#18204A",
    inkSoft: "#64709A",
    accent: "#3949C8",
    accentText: "#2F3EB6",
    accentSecondary: "#7655E8",
    accentDiscovery: "#168DA5",
    accentDim: "#8290B6",
    heroNum: "#4336B8",
    accentBtn: "linear-gradient(135deg, #3949C8, #7655E8)",
    onAccent: "#FFFFFF",
    glow: "rgba(118,85,232,0.18)",
    focusRing: "#168DA5",
    warmAccent: "#B88A45",
    brandSapphire: "#234FCB",
    brandGold: "#C7952A",
    brandGlow: "rgba(35,79,203,0.16)",
  }),
  parchment: Object.freeze({
    preset: "parchment", mode: "light",
    matrix: Object.freeze({ ...MATRIX_HIGHLIGHTS, surface: "#FFF4D4", ink: "#49331D", frame: "#9F7025" }),
    pageBg: "#F5EDDD",
    card: "#FFF9EC",
    cardSoft: "#EEE1C8",
    cardRaised: "#FFFDF6",
    cardGrad: "linear-gradient(145deg, #FFFDF6, #F0E2C8)",
    border: "rgba(67,48,110,0.15)",
    borderStrong: "rgba(67,48,110,0.30)",
    ink: "#30251F",
    inkSoft: "#74665A",
    accent: "#43306E",
    accentText: "#5A3E86",
    accentSecondary: "#68418C",
    accentDiscovery: "#B88A45",
    accentDim: "#9A866F",
    heroNum: "#4A2F73",
    accentBtn: "linear-gradient(135deg, #43306E, #68418C)",
    onAccent: "#FFF9EC",
    glow: "rgba(104,65,140,0.18)",
    focusRing: "#B88A45",
    warmAccent: "#B88A45",
    brandSapphire: "#21459B",
    brandGold: "#B8862D",
    brandGlow: "rgba(184,134,45,0.14)",
  }),
  dark: Object.freeze({
    preset: "dark", mode: "dark",
    matrix: Object.freeze({ ...MATRIX_HIGHLIGHTS, surface: "#070C1B", ink: "#D7DFEE", frame: "#D7AC4C" }),
    pageBg: "#080D1D",
    card: "rgba(16,24,45,0.94)",
    cardSoft: "rgba(22,33,60,0.84)",
    cardRaised: "#121B31",
    cardGrad: "linear-gradient(145deg, rgba(20,30,56,0.98), rgba(10,16,34,0.96))",
    border: "rgba(84,101,255,0.18)",
    borderStrong: "rgba(155,108,255,0.38)",
    ink: "#F4F5FF",
    inkSoft: "#AAB3D0",
    accent: "#5465FF",
    accentText: "#A9B3FF",
    accentSecondary: "#9B6CFF",
    accentDiscovery: "#50D6E8",
    accentDim: "#7885AF",
    heroNum: "#D5C8FF",
    accentBtn: "linear-gradient(135deg, #5465FF, #9B6CFF)",
    onAccent: "#FFFFFF",
    glow: "rgba(155,108,255,0.28)",
    focusRing: "#50D6E8",
    warmAccent: "#B88A45",
    brandSapphire: "#2F6DF6",
    brandGold: "#D7A52A",
    brandGlow: "rgba(47,109,246,0.22)",
  }),
});

const RESEARCH_LAB_V2 = Object.freeze({
  light: Object.freeze({
    pageBg: "#EEF5FF", cardSoft: "#E6F0FC", cardGrad: "linear-gradient(145deg,#F8FBFF,#E8F1FC)",
    accent: "#2F6DF6", accentText: "#2458C4", accentSecondary: "#5B8CFF", accentDiscovery: "#168DA5",
    heroNum: "#244C9A", glow: "rgba(47,109,246,0.18)", focusRing: "#168DA5",
  }),
  parchment: Object.freeze({
    pageBg: "#F3EEE4", cardSoft: "#E9E7E6", cardGrad: "linear-gradient(145deg,#FFFAF0,#E8EDF5)",
    accent: "#3E4E8C", accentText: "#3E4E8C", accentSecondary: "#6657A8", accentDiscovery: "#4C86A8",
    heroNum: "#3E4E8C", glow: "rgba(76,134,168,0.16)", focusRing: "#4C86A8",
  }),
  dark: Object.freeze({
    pageBg: "#08111E", cardSoft: "rgba(12,25,48,0.88)", cardGrad: "linear-gradient(145deg,#0E2039,#08111E)",
    accent: "#5B8CFF", accentText: "#A8C2FF", accentSecondary: "#8174FF", accentDiscovery: "#50D6E8",
    heroNum: "#C5D6FF", glow: "rgba(91,140,255,0.24)", focusRing: "#50D6E8",
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
