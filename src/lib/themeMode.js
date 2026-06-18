// ===== מצב התמה — מקור אמת יחיד (חוק העץ האחד) =====
// בעלות: הסוכן הראשי. אל תיצור מערכת מקבילה למצב התמה.
// אחראי על: קריאה/כתיבה ל-localStorage, החלת data-theme על השורש,
// מתג מחזורי (☀→📜→🌙), ו-hook לרכיבים (useThemeMode).
import { useState, useEffect, useCallback } from "react";
import { PALETTES, THEME_ORDER, DEFAULT_MODE, getPalette } from "./palette.js";

const KEY = "sod-theme";

// קריאת המצב השמור (או ברירת המחדל). חוסן מול localStorage חסום/לא זמין.
export function readMode() {
  try {
    const m = localStorage.getItem(KEY);
    if (m && PALETTES[m]) return m;
  } catch { /* ignore */ }
  return DEFAULT_MODE;
}

// החלת המצב על השורש (data-theme → לעתיד CSS vars) + שידור לכל המאזינים בחלון.
export function applyMode(mode) {
  try {
    document.documentElement.setAttribute("data-theme", mode);
    window.dispatchEvent(new CustomEvent("sod-theme", { detail: mode }));
  } catch { /* ignore */ }
}

// שמירה + החלה.
export function writeMode(mode) {
  if (!PALETTES[mode]) return;
  try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
  applyMode(mode);
}

// המצב הבא במחזור (☀→📜→🌙→☀).
export function nextMode(mode) {
  const i = THEME_ORDER.indexOf(mode);
  return THEME_ORDER[(i + 1) % THEME_ORDER.length];
}

// hook לרכיבים. מחזיר: { mode, palette, cycle, setMode }.
// מסונכרן בין כל המאזינים (אירוע sod-theme) ובין טאבים (storage).
export function useThemeMode() {
  const [mode, setModeState] = useState(readMode);

  useEffect(() => {
    applyMode(mode);
    const onEvt = (e) => { if (e.detail && e.detail !== mode && PALETTES[e.detail]) setModeState(e.detail); };
    const onStorage = (e) => { if (e.key === KEY && e.newValue && PALETTES[e.newValue]) setModeState(e.newValue); };
    window.addEventListener("sod-theme", onEvt);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("sod-theme", onEvt);
      window.removeEventListener("storage", onStorage);
    };
  }, [mode]);

  const setMode = useCallback((m) => {
    if (!PALETTES[m]) return;
    setModeState(m);
    writeMode(m);
  }, []);

  const cycle = useCallback(() => setMode(nextMode(readMode())), [setMode]);

  return { mode, palette: getPalette(mode), cycle, setMode };
}
