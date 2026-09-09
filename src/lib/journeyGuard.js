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
import { isBot } from "./events.js";
import { noteSuppressed } from "./botVerdict.js"; // 🤖 ערוץ-אבחון בזיכרון (BOT_READ_NO_SIDE_EFFECT_V1)

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
  // 🤖 שער-בוט (שכבה ראשונה, דיוק-גבוה): מנוע-אוטומציה מוצהר (navigator.webdriver)
  // או UA של סורק → **לא מייצרים הודעת-AI בכלל.** ב-7.2026 בוטים ירו ~1,222 הודעות/שבוע
  // (2.7% סיום) ושרפו קרדיט. אפס false-positive על אדם אמיתי. כל חסימה נרשמת ללוג למדידה.
  // ⚠️ בוט שמסווה webdriver+UA יעבור — ההגנה החזקה = rate-limit צד-שרת ב-journey-message (thread).
  if (isBot()) {
    // 🤖 BOT_READ_NO_SIDE_EFFECT_V1: logView נעול עכשיו לבוטים (ל-page_views אין is_bot),
    // ולכן הרישום הזה היה הופך לשקט והמדידה הקיימת «כמה חסימות-בוט» הייתה נעלמת. שומרים
    // את האות בערוץ-האבחון היחיד שלא כותב ל-DB, כדי לא לאבד סימן שכבר היה כאן ולא להחזיר
    // כתיבת-בוט מהדלת האחורית. הקריאה ל-logView נשארת (no-op לבוט) — אם המדיניות תשתנה
    // אי-פעם וה-gate יוסר, המדידה ההיסטורית חוזרת מעצמה בלי לגעת כאן.
    try { noteSuppressed("journey_ai_bot_blocked"); } catch { /* noop */ }
    try { logView("journey_ai_bot_blocked", r); } catch { /* noop */ }
    return false;
  }
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
