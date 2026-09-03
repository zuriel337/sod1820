// ===== A/B ניסוי — «סרגל-צד בעמוד-פוסט» (post_sidebar_v1) =====
// שאלה: האם הסרגל השמאלי (סטורי אור-הגאולה + «עדכונים אחרונים») בעמוד-פוסט פוגע
// בעומק-הקריאה או בהמרה (מעבר לעמוד שני באתר)? מחלקים כל מבקר יציבות ל-2 קבוצות:
//   sidebar_on  — הפוסט עם הסרגל השמאלי הקיים (ברירת-המחדל ההיסטורית)
//   sidebar_off — אותו פוסט בדיוק, אותו תוכן/עיצוב/CTA/סדר — רק בלי הסרגל.
// ⚠️ ההבדל היחיד בין הקבוצות = נוכחות הסרגל. אין שינוי URL/SEO/canonical/כותרת/תמונה/סדר.
//
// ההקצאה **יציבה למבקר** (hash דטרמיניסטי של sod_id) → אותו מבקר תמיד באותה קבוצה,
// בכל פוסט ובכל ביקור, בלי «פוסט-עם-סרגל מול פוסט-בלי» (שהיה מזהם נושא/איכות/מקור/גיל).
//
// מדידה נקייה: משעה שהמבקר נכנס לניסוי (ראה פוסט), הקשר-הניסוי (exp+variant) נצמד
// לכל אירוע ב-session דרך events.js → «מעבר לעמוד שני» מחושב ישירות מ-page/view.
import { getSodId, sessionId } from "./identity.js";
import { appMeta } from "./tracking.js";
import { supabase } from "./supabase.js";
import { emit } from "./events.js";

export const POST_SIDEBAR_EXPERIMENT = "post_sidebar_v1";
export const VARIANTS = ["sidebar_on", "sidebar_off"];

const CTX_KEY = "sod_exp_ctx";        // הקשר-ניסוי פעיל ל-session (נקרא ע"י events.js)
const LAND_KEY = "sod_exp_landing";   // דף-הנחיתה של ה-session (פעם אחת)

// hash דטרמיניסטי 32-ביט (FNV-1a) — אותו קלט → אותו bucket תמיד, בלי אקראיות.
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// שיוך-קבוצה יציב למבקר. מפתח קנוני = sod_id (מזהה-מבקר יציב, cookie+localStorage).
export function variantFor(experiment = POST_SIDEBAR_EXPERIMENT) {
  let key = "anon";
  try { key = getSodId() || "anon"; } catch { /* noop */ }
  const bucket = hash32(`${key}::${experiment}`) % VARIANTS.length;
  return VARIANTS[bucket];
}

// דף-הנחיתה של ה-session **הנוכחי** (הכניסה הראשונה של ה-session הזה, לא «הפעם
// הראשונה אי-פעם»). נשמר פעם אחת ב-sessionStorage.
// ⚠️ תוקן (CLEAN_AB_MEASUREMENT_V1, 2026-09-03): הגרסה הקודמת נפלה ל-
// getAcquisition()?.first?.landing — ערך **לכל-החיים** (sod_acq_first, "נשמר פעם אחת,
// לא נדרס לעולם", tracking.js) שנועד לייחוס-מקור ארוך-טווח, לא לנחיתת ה-session הנוכחי.
// לכל מבקר-חוזר (הרוב) זה דיווח את דף-הנחיתה ההיסטורי שלו (למשל "home" מלפני חודשים)
// גם כשה-session הנוכחי נחת ישירות על הפוסט — מה שהפך «נחיתה חיצונית» אמיתית ל-«ניווט
// פנימי» שגוי בדוח החדש (External landing vs Internal navigation). אומת מול חיים,
// 2026-09-03: post_slug (לוור-קייס) מול landing_path הראה אי-התאמה עקבית בדיוק מהסיבה הזו.
// המקור הנכון: sod_land, שנכתב פעם אחת ב-tracking.js captureArrivalSource() בדיוק ברגע
// שה-session הנוכחי נכנס לאתר (עדשה על אותו נתון-כניסה, לא מקור-כפול). נופלים ל-
// location.pathname רק אם captureArrivalSource עוד לא הספיק לרוץ (למשל טעינת-הפוסט
// קדמה ל-effect של App באותו commit) — שם location.pathname הוא-עצמו דף-הנחיתה הנכון.
function landingPath() {
  try {
    const s = sessionStorage.getItem(LAND_KEY);
    if (s) return s;
  } catch { /* noop */ }
  let land = null;
  try { land = JSON.parse(sessionStorage.getItem("sod_land") || "null")?.landing || null; } catch { /* noop */ }
  if (!land) { try { land = location.pathname.replace(/^\//, "") || "home"; } catch { /* noop */ } }
  try { sessionStorage.setItem(LAND_KEY, land); } catch { /* noop */ }
  return land;
}

// חבילת-השדות הקנונית שנשמרת בכל אירוע-ניסוי (spec צוריאל).
function expFields(slug, variant) {
  const m = (() => { try { return appMeta(); } catch { return {}; } })();
  let sid = null; try { sid = sessionId(); } catch { /* noop */ }
  return {
    experiment: POST_SIDEBAR_EXPERIMENT,
    variant,
    post_slug: slug || null,
    visitor_id: (() => { try { return getSodId(); } catch { return null; } })(),
    session_id: sid,
    device: m.device || null,
    source: m.source || null,
    landing_path: landingPath(),
  };
}

// כניסה-לניסוי: מצמיד את הקשר-הניסוי ל-session כדי שכל אירוע עתידי (כולל page/view של
// העמוד-השני) יישא exp+variant → «המרה לעמוד שני» מחושבת ישירות. נקרא פעם אחת בעליית הפוסט.
export function enterExperiment(slug, variant) {
  try {
    sessionStorage.setItem(CTX_KEY, JSON.stringify({ exp: POST_SIDEBAR_EXPERIMENT, variant }));
  } catch { /* noop */ }
  landingPath(); // מקבע את דף-הנחיתה מוקדם
}

// אירוע-ניסוי מפורש (post_view / layout_present / scroll_depth / internal_link_click …).
// נכתב ל-visitor_events (section='post_exp') עם חבילת-השדות המלאה, וגם ל-events (surface='post_exp').
export function trackExp(eventType, slug, variant, extra = null) {
  const fields = { ...expFields(slug, variant), ...(extra || {}) };
  try {
    if (supabase) {
      supabase.from("visitor_events").insert({
        visitor_id: fields.visitor_id, section: "post_exp", slug: slug || null,
        event_type: eventType, meta: fields,
      }).then(() => {}).catch(() => {});
    }
  } catch { /* noop */ }
  try { emit("post_exp", eventType, { props: fields }); } catch { /* noop */ }
}
