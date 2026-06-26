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

export const trackShare = (platform, slug) =>
  track("share", slug, "share", { platform });

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

// מקור ההגעה — utm_source אם קיים, אחרת זיהוי לפי referrer.
function sourceInfo() {
  try {
    const utm = new URLSearchParams(window.location.search).get("utm_source");
    if (utm) return utm;
  } catch { /* noop */ }
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

  // הושלמה התקנה — פנימי + Meta/CAPI.
  window.addEventListener("appinstalled", () => {
    const m = appMeta();
    track("app", null, "install", m);
    trackConversion("app_install", m);
  });

  // פתיחה מהאפליקציה המותקנת = חזרה לשימוש (פעם אחת ל-session).
  if (isStandalone()) {
    trackOncePerSession("sod_app_launched", "launch", appMeta());
  }
}
