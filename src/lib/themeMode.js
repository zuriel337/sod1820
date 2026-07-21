import { useSyncExternalStore } from "react";

// ===== מתג תמה גלובלי (בהיר/כהה) — נשמר ב-localStorage, ברירת מחדל: כהה =====
// משמש את דפי התוכן המעוצבים. useSyncExternalStore → כל הרכיבים מתעדכנים יחד.
// גולש חדש (אין שמירה) → כהה. רק בחירה מפורשת ל"בהיר" נשמרת ומחזירה בהיר.

const KEY = "sod-theme";
const read = () => {
  try { return localStorage.getItem(KEY) === "light" ? "light" : "dark"; } catch { return "dark"; }
};
let mode = read();
let forced = null;               // כפיית-מצב זמנית (המעבדה כופה «בהיר») — גובר על mode
const subs = new Set();
const effective = () => forced ?? mode;

function emit() {
  try { document.documentElement.setAttribute("data-theme", effective()); } catch { /* ignore */ }
  subs.forEach(f => f());
}
// קביעת ה-attribute כבר בטעינה (לפני React) כדי למנוע הבהוב
if (typeof document !== "undefined") { try { document.documentElement.setAttribute("data-theme", effective()); } catch { /* ignore */ } }

export function setTheme(m) {
  mode = m === "dark" ? "dark" : "light";
  try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
  emit();
}
// מתג התמה: אם עמוד כופה מצב (forced — כמו «בית תמיד כהה» / «פורום בהיר»), המתג משנה את
// הכפייה («שינה בעמוד זה») ולא את ההעדפה הגלובלית; אחרת — משנה את ההעדפה הגלובלית הנשמרת.
export function toggleTheme() {
  if (forced) { setForcedMode(forced === "dark" ? "light" : "dark"); return; }
  setTheme(mode === "light" ? "dark" : "light");
}

// כפיית-מצב (המעבדה: setForcedMode("light") בכניסה, setForcedMode(null) ביציאה).
// לא נשמר ב-localStorage → לא משנה את העדפת המשתמש, רק את התצוגה הנוכחית.
export function setForcedMode(m) {
  forced = (m === "light" || m === "dark") ? m : null;
  emit();
}

function subscribe(f) { subs.add(f); return () => subs.delete(f); }
export function useThemeMode() {
  return useSyncExternalStore(subscribe, effective, () => "dark");
}
