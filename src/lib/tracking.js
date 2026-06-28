import { supabase } from "./supabase.js";
import { trackConversion } from "./marketing.js";

// ===== אנליטיקה פנימית — מעקב מדורים ופעולות =====
// כל גולש = visitor_id אנונימי ב-localStorage (לא PII).
// שולח ל-visitor_events ב-Supabase. debounce על view כדי לא לספור scroll.

const KEY = "sod_vid";

export function getVisitorId() {
  let vid = localStorage.getItem(KEY);
  if (!vid) {
    vid = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, vid);
  }
  return vid;
}

const pending = new Map(); // debounce per section key

export function track(section, slug = null, eventType = "view", meta = null) {
  if (!supabase) return;
  const key = `${section}:${slug ?? ""}:${eventType}`;
  if (eventType === "view") {
    if (pending.has(key)) return; // כבר בדרך
    pending.set(key, setTimeout(() => { pending.delete(key); }, 2000));
  }
  const visitor_id = getVisitorId();
  supabase.from("visitor_events").insert({
    visitor_id, section, slug, event_type: eventType,
    meta: meta ?? undefined,
  }).then(() => {}).catch(() => {});
}

// שיתוף — מתעד פנימית (visitor_events) עם פילוח מלא: פלטפורמה + מכשיר/OS + מקור,
// וגם שולח המרת share ל-Meta (Pixel/CAPI). כל כפתור שיתוף באתר קורא לזה.
export const trackShare = (platform, slug) => {
  const m = (() => { try { return appMeta(); } catch { return {}; } })();
  track("share", slug, "share", { platform, ...m });
  try { trackConversion("share", { platform, source: m.source, device: m.device }); } catch { /* noop */ }
};

export const trackImageClick = (imageId, value) =>
  track("reality-stream", null, "image_click", { image_id: imageId, value });

export const trackWhatsapp = slug => trackShare("whatsapp", slug);

// ===== מעקב התקנות אפליקציה (PWA install) =====
// האתר ניתן להתקנה בכרום (יש manifest). כאן בונים משפך התקנה על visitor_events
// הקיים (אין סכימה חדשה), עם פילוח דפדפן/מכשיר/מקור:
//   offer   — ההצעה להתקין הוצגה (beforeinstallprompt).
//   install — הושלמה התקנה (appinstalled).
//   launch  — המשתמש פתח מהאפליקציה המותקנת (פעם אחת ל-session) = חזרה לשימוש.
// הערה: "כמה לחצו התקן" (accept/dismiss) דורש כפתור התקנה מותאם שיחזיק את
// ה-deferred prompt ויקרא userChoice — לא נכלל כאן (ראה תוכנית Notification Center).

// האם רץ כאפליקציה מותקנת (standalone) ולא בכרטיסיית דפדפן רגילה.
export function isStandalone() {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  } catch { /* noop */ }
  return window.navigator?.standalone === true; // iOS Safari
}

// זיהוי דפדפן / מערכת-הפעלה / סוג-מכשיר מתוך ה-userAgent.
function deviceInfo() {
  const ua = window.navigator?.userAgent || "";
  let browser = "אחר";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/crios|chrome/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua)) browser = "Safari";
  let os = "אחר";
  if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/mac os|macintosh/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";
  const device = /android|iphone|ipad|ipod|mobile/i.test(ua) ? "mobile" : "desktop";
  return { browser, os, device };
}

// התג הגולמי מהכתובת — utm_source או הכינוי הקצר src (לקישורים ב-bio/פוסט).
// מוחזר כפי-שהוא (lowercase) כדי לשמר פילוח ברמת ערוץ (fb-meluha מול fb-code).
function campaignTag() {
  try {
    const q = new URLSearchParams(window.location.search);
    const raw = q.get("utm_source") || q.get("src");
    return raw ? raw.trim().toLowerCase() : null;
  } catch { return null; }
}

// ממפה תג/מחרוזת לפלטפורמה אחידה לפי תחילית, כדי שהפילוח לא יתפצל
// (ig, ig-bio → instagram · fb, fb-meluha, fb-code → facebook).
function normalizeSource(raw) {
  const v = (raw || "").toLowerCase();
  if (/^(ig|insta|instagram)/.test(v)) return "instagram";
  if (/^(fb|facebook)/.test(v)) return "facebook";
  if (/^(wa|whatsapp)/.test(v)) return "whatsapp";
  if (/^(tg|telegram)/.test(v)) return "telegram";
  if (/^(yt|youtube)/.test(v)) return "youtube";
  return v;
}

// מקור ההגעה — תיוג-קמפיין (utm_source/src) אם קיים, אחרת זיהוי לפי referrer.
function sourceInfo() {
  const tag = campaignTag();
  if (tag) return normalizeSource(tag);
  const ref = (typeof document !== "undefined" && document.referrer) || "";
  if (!ref) return "ישיר";
  if (/facebook|fb\./i.test(ref)) return "facebook";
  if (/whatsapp|wa\.me/i.test(ref)) return "whatsapp";
  if (/t\.me|telegram/i.test(ref)) return "telegram";
  if (/instagram/i.test(ref)) return "instagram";
  if (/google/i.test(ref)) return "google";
  try { return new URL(ref).hostname; } catch { return "אחר"; }
}

// meta אחיד לכל אירועי האפליקציה — פילוח לדשבורד.
function appMeta() {
  return { ...deviceInfo(), source: sourceInfo() };
}

// ===== תפיסת מקור-הגעה (arrival source) — פעם אחת ל-session =====
// אינסטגרם (ורשתות רבות) מוחקים את ה-referrer בדפדפן הפנימי שלהם → כניסה מהן
// נראית "ישיר" ואי-אפשר למדוד. הפתרון: מתייגים את הקישורים שמפרסמים ברשת
// ב-?src=ig (או ?utm_source=instagram), וכאן תופסים את התיוג *פעם אחת* בכניסה
// ורושמים ל-visitor_events (section='arrival') — בלי סכמה חדשה (עץ אחד).
//   meta.source  — הפלטפורמה האחידה (instagram/facebook/google/ישיר…)
//   meta.tag     — התג הגולמי לפילוח ברמת ערוץ (fb-meluha / fb-code / ig…), null אם נוחש
//   meta.tagged  — true אם הגיע מתיוג מפורש (אמין), false אם נוחש מ-referrer
//   meta.landing — דף הנחיתה
export function captureArrivalSource() {
  if (typeof window === "undefined" || !supabase) return;
  try {
    if (sessionStorage.getItem("sod_src")) return; // כבר נרשם ל-session הזה
    sessionStorage.setItem("sod_src", "1");
  } catch { /* אם אין sessionStorage — נרשום בכל זאת */ }
  const tag = campaignTag();
  const source = sourceInfo();
  const landing = window.location.pathname.replace(/^\//, "") || "home";
  track("arrival", null, "source", { source, tag: tag || null, tagged: !!tag, landing });
}

// בונה קישור מתויג לשיתוף ברשת (להעתקה ל-bio/פוסט). דוגמה:
//   sourceUrl("/reality", "ig") → https://sod1820.co.il/reality?src=ig
export function sourceUrl(path = "/", src = "ig") {
  try {
    const origin = (typeof window !== "undefined" && window.location.origin) || "https://sod1820.co.il";
    const u = new URL(path, origin);
    u.searchParams.set("src", src);
    return u.toString();
  } catch { return path; }
}

// רישום פעם-אחת-ל-session (כדי לא לספור כל טעינת דף מחדש).
function trackOncePerSession(flag, eventType, meta) {
  try {
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
  } catch { /* אם אין sessionStorage — נרשום בכל זאת */ }
  track("app", null, eventType, meta);
}

let appInstallInited = false;

// אתחול פעם אחת (בעליית האפליקציה). תופס את כל שלבי משפך ההתקנה.
export function initAppInstallTracking() {
  if (appInstallInited || typeof window === "undefined") return;
  appInstallInited = true;

  // ההצעה להתקין זמינה (כרום/אדג'/אנדרואיד). לא חוסמים — נותנים לדפדפן להציג.
  window.addEventListener("beforeinstallprompt", () => {
    trackOncePerSession("sod_app_offer", "offer", appMeta());
  });

  // הושלמה התקנה (אנדרואיד/כרום) — פנימי + Meta/CAPI. מסמנים את המכשיר כמותקן
  // כדי לא לספור שוב את אותה התקנה דרך האומדן שלמטה.
  window.addEventListener("appinstalled", () => {
    const m = appMeta();
    markInstalledOnce("real", m);
  });

  // פתיחה מהאפליקציה המותקנת = חזרה לשימוש (פעם אחת ל-session).
  if (isStandalone()) {
    trackOncePerSession("sod_app_launched", "launch", appMeta());
    // אומדן התקנה: ב-iOS אין כלל אירוע appinstalled (מוסיפים למסך הבית ידנית),
    // וגם באנדרואיד הוא לעיתים מתפספס. לכן בפתיחה הראשונה אי-פעם במצב מותקן
    // (standalone) רושמים install משוער — פעם אחת לכל מכשיר, מסומן inferred=true.
    markInstalledOnce("inferred", appMeta());
  }
}

// רישום התקנה פעם-אחת-לכל-מכשיר (localStorage). kind="real" (appinstalled) גובר על
// "inferred" (אומדן standalone) — שניהם מסמנים את אותו דגל כדי שלא נספור כפול.
function markInstalledOnce(kind, meta) {
  try {
    if (localStorage.getItem("sod_app_installed")) return; // כבר נספר במכשיר הזה
    localStorage.setItem("sod_app_installed", "1");
  } catch { /* אם אין localStorage — לא רושמים אומדן כדי לא לספור כפול בכל פתיחה */
    if (kind === "inferred") return;
  }
  const m = { ...meta, ...(kind === "inferred" ? { inferred: true } : {}) };
  track("app", null, "install", m);
  trackConversion("app_install", m);
}
