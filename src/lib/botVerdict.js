// 🤖 פסק-הבוט — הפרימיטיב הקנוני היחיד (BOT_READ_NO_SIDE_EFFECT_V1).
//
// הקוד כאן **הועבר כמות-שהוא** מ-src/lib/events.js. אין כאן לוגיקת-בוט חדשה, אין
// מערכת-בוט חדשה ואין מקור-אמת שני — רק הוצאה של אותה פונקציה בדיוק לקובץ נטול-תלויות,
// בדיוק כמו שהעץ כבר עושה ל-getVisitorId (src/lib/visitorId.js = בעלים יחיד, ו-tracking.js
// רק מייצא-מחדש: «צריכה, לא בעלות»). events.js ממשיך לייצא isBot כרגיל, ולכן כל הצרכנים
// הקיימים (journeyGuard.js · engagement.js · visits.js) לא משתנים בכלל.
//
// למה בכלל להוציא: הכיורים שצריכים עכשיו את הפסק — logView/logSearch ב-supabase.js — נמצאים
// *מתחת* ל-events.js בגרף-הייבוא (events.js מייבא את supabase.js). ייבוא הפוך היה יוצר מעגל,
// ומעגל-ESM עלול להשאיר את isBot כ-undefined ברגע-הקריאה תחת חלק מה-bundlers. הקובץ הזה
// חייב להישאר **בלי אף import** כדי שזה לא יוכל לקרות שוב.
//
// מקור-אמת: cookie vb=<kind> שה-middleware (Vercel Edge) מזריק מה-UA האמיתי בצד-שרת
// (browser=אדם · goodbot/ai/bot=בוט). נופלים ל-heuristic של UA בצד-לקוח רק אם ה-cookie
// עוד לא נכתב (בקשה ראשונה / נחסם).

const BOT_UA = /bot|crawl|spider|slurp|googlebot|bingpreview|jetmon|uptime|monitor|headless|phantom|puppeteer|playwright|python|curl|wget|libwww|okhttp|java\/|go-http|facebookexternal|externalhit|preview|lighthouse|pagespeed|gtmetrix|semrush|ahrefs|mj12|dotbot|petalbot|dataprovider|scan|um-ic|feedfetch/i;

function serverBotVerdict() {
  // null = אין פסק-קצה עדיין; true/false = פסק סמכותי (kind!=='browser' → בוט)
  try { const m = document.cookie.match(/(?:^|;\s*)vb=([a-z]+)/i); return m ? (m[1].toLowerCase() !== "browser") : null; }
  catch { return null; }
}

export function isBot() {
  const v = serverBotVerdict();
  if (v !== null) return v;              // פסק-הקצה גובר
  try { return BOT_UA.test(navigator.userAgent || "") || navigator.webdriver === true; } catch { return false; }
}

// ── מונה-השתקות (אבחון בלבד) ───────────────────────────────────────────────
// כשחוסמים כתיבה של בוט אי-אפשר לרשום את החסימה לאותה טבלה (זו בדיוק עוד כתיבת-בוט),
// ולכן ההשתקה נספרת בזיכרון בלבד. נפח-הבוטים האמיתי כבר נמדד בקצה (crawl_daily דרך
// log_crawl ב-middleware.js) — זה רק כדי שבדיקה/דיבאג יוכלו להוכיח שהשער אכן פעל.
const _suppressed = Object.create(null);

export function noteSuppressed(sink) {
  _suppressed[sink] = (_suppressed[sink] || 0) + 1;
}

export function suppressedCounts() {
  return { ..._suppressed };
}

// 🚦 השער היחיד שהכיורים קוראים לו. מחזיר true כשמותר לבצע את תופעת-הלוואי.
// שם מפורש בכוונה: «האם קריאה זו רשאית לייצר תופעת-לוואי», לא «האם זה בוט» —
// כדי שאתר-הקריאה יקרא כמו החוק ולא כמו הזיהוי.
export function sideEffectAllowed(sink) {
  let bot = false;
  try { bot = isBot(); } catch { bot = false; }   // אי-ודאות → מתנהגים כאדם (fail-open לאדם)
  if (bot) { noteSuppressed(sink); return false; }
  return true;
}
