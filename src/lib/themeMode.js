import { useSyncExternalStore } from "react";

// ===== מתג תמה גלובלי (בהיר/כהה) — נשמר ב-localStorage, ברירת מחדל: כהה =====
// משמש את דפי התוכן המעוצבים. useSyncExternalStore → כל הרכיבים מתעדכנים יחד.
// גולש חדש (אין שמירה) → כהה. רק בחירה מפורשת ל"בהיר" נשמרת ומחזירה בהיר.

const KEY = "sod-theme";
const read = () => {
  try { return localStorage.getItem(KEY) === "light" ? "light" : "dark"; } catch { return "dark"; }
};
let mode = read();
const subs = new Set();

function emit() {
  try { document.documentElement.setAttribute("data-theme", mode); } catch { /* ignore */ }
  subs.forEach(f => f());
}
// קביעת ה-attribute כבר בטעינה (לפני React) כדי למנוע הבהוב
if (typeof document !== "undefined") { try { document.documentElement.setAttribute("data-theme", mode); } catch { /* ignore */ } }

export function setTheme(m) {
  mode = m === "dark" ? "dark" : "light";
  try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
  emit();
}
export function toggleTheme() { setTheme(mode === "light" ? "dark" : "light"); }

function subscribe(f) { subs.add(f); return () => subs.delete(f); }
export function useThemeMode() {
  return useSyncExternalStore(subscribe, () => mode, () => "dark");
}
