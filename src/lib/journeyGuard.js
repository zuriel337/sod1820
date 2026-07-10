// 🛡️ מגן קרדיט-AI למסע (journey_ai_guard) — חוק-ברזל: **מסע אחד = מסר-AI אחד ל-Session.**
// למה: ב-4.7.2026 באג-רגרסיה ירה את מסר-ה-AI של המסע שוב ושוב (879 קריאות ב-7 ימים
// עבור ~36 השלמות בלבד) ושרף קרדיט Anthropic בשקט. המגן הזה מבטיח שגם אם תחזור
// רגרסיה — קריאה כפולה **תיחסם ותירשם ללוג**, ולעולם לא נגיע שוב למאות קריאות בלי לדעת.
//
// היקף: session-scoped (sessionStorage) → מתאפס בטאב/סשן חדש, אבל בתוך אותו סשן
// אותו מספר-שורש לא יורה AI פעמיים. בנוסף גג-קשיח לכל הסשן (למקרה-קצה: לולאה על
// מספרים *שונים*). כל חסימה נרשמת ל-page_views (`journey_ai_blocked`/`journey_ai_capped`)
// כדי שנראה אותה בדף-הניהול.
import { logView } from "./supabase.js";

const KEY = "sod_j_aikeys";       // אוסף מספרי-שורש שכבר קיבלו מסר-AI בסשן הזה
const CAP_KEY = "sod_j_aicount";  // סה״כ מסרי-AI שנורו בסשן הזה
const SESSION_CAP = 5;            // גג-קשיח לסשן — מעבר לזה חוסמים כל קריאה (אנומליה)

function readSet() {
  try { return new Set(JSON.parse(sessionStorage.getItem(KEY) || "[]")); } catch { return new Set(); }
}
function writeSet(s) {
  try { sessionStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* noop */ }
}
function sessionCount() {
  try { return parseInt(sessionStorage.getItem(CAP_KEY) || "0", 10) || 0; } catch { return 0; }
}

// 🛡️ מותר לירות מסר-AI חדש עבור root? true=מותר · false=חסום (כבר נשלח בסשן / חריגה מהגג).
// חסימה נרשמת ללוג אוטומטית.
export function allowAiMessage(root) {
  const r = String(root);
  if (readSet().has(r)) {
    try { logView("journey_ai_blocked", r); } catch { /* noop */ }   // כפילות לאותו מסע
    return false;
  }
  if (sessionCount() >= SESSION_CAP) {
    try { logView("journey_ai_capped", r); } catch { /* noop */ }    // חריגה מגג-הסשן
    return false;
  }
  return true;
}

// 🛡️ סימון שנשלח מסר-AI עבור root (לקרוא רק אחרי allowAiMessage()===true, לפני הקריאה בפועל).
export function markAiMessage(root) {
  const r = String(root);
  const set = readSet();
  set.add(r);
  writeSet(set);
  try { sessionStorage.setItem(CAP_KEY, String(sessionCount() + 1)); } catch { /* noop */ }
}
