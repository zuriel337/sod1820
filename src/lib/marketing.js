// ===== שכבת שיווק — Meta Pixel (פייסבוק/אינסטגרם/וואטסאפ) + Google Ads =====
// נטענת בפועל רק אם הוגדרו ה-IDs ב-env. בלי ID — כל הפונקציות הן no-op מוחלט
// (לא טוענת סקריפט, לא שוברת כלום). כך אפשר לפרוס עכשיו, ולהדליק מאוחר יותר
// פשוט ע"י הוספת משתני סביבה ב-Vercel — בלי שינוי קוד.
//
// משתני הסביבה (ב-Vercel → Settings → Environment Variables):
//   VITE_META_PIXEL_ID   = מזהה הפיקסל של מטא (מספר, למשל 1234567890123456)
//   VITE_GOOGLE_ADS_ID   = מזהה Google Ads (בפורמט AW-XXXXXXXXXX)
//
// כל ההמרות עוברות דרך trackConversion אחד שמשדר ל-GA4 + מטא + Google Ads בבת אחת.

const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;
const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID;

export const META_ENABLED = !!META_PIXEL_ID;
export const GOOGLE_ADS_ENABLED = !!GOOGLE_ADS_ID;

let metaInited = false;
let adsInited = false;

// ── אתחול (פעם אחת, בעליית האפליקציה) ──
export function initMarketing() {
  initMetaPixel();
  initGoogleAds();
}

function initMetaPixel() {
  if (metaInited || !META_PIXEL_ID || typeof window === "undefined") return;
  metaInited = true;
  // ה-snippet הרשמי של מטא (fbq) — מזריק את fbevents.js פעם אחת.
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq("init", META_PIXEL_ID);
  // ה-PageView הראשון (וכל מעבר route) נשלח דרך trackMarketingPageview.
}

function initGoogleAds() {
  if (adsInited || !GOOGLE_ADS_ID || typeof window === "undefined") return;
  adsInited = true;
  // ה-gtag כבר נטען ע"י analytics.js (GA4). אם GA כבוי — טוענים gtag עצמאית כאן.
  if (!window.gtag) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
  }
  window.gtag("config", GOOGLE_ADS_ID);
}

// ── צפיית עמוד (SPA) — נקרא בכל מעבר route, אחרי שהכותרת מתעדכנת ──
// בונה את קהלי הרימרקטינג והקהלים-הדומים (lookalike) — הלב של "עוד תנועה".
export function trackMarketingPageview() {
  if (typeof window === "undefined") return;
  if (META_PIXEL_ID && window.fbq) window.fbq("track", "PageView");
  // Google Ads: צפיות נספרות אוטומטית דרך ה-config; GA4 page_view נשלח ב-analytics.js.
}

// מיפוי אירועים פנימיים → אירועי מטא סטנדרטיים (מה שלא ממופה יישלח כ-trackCustom).
const META_STD = {
  subscribe: "Lead",                 // הרשמה לרשימת התפוצה (אימות מייל)
  members_signup: "CompleteRegistration", // הצטרפות לבני ההיכל
  contact: "Contact",
  // share — אין אירוע סטנדרטי במטא; יישלח כ-trackCustom "Share".
};

// labels של המרות Google Ads — ממלאים פר-אירוע כשמגדירים המרה בלוח Ads.
// דוגמה: subscribe: "AbCdEfGhIj".  (ה-send_to יהיה `${GOOGLE_ADS_ID}/<label>`)
const ADS_LABELS = {};

// ── אירוע המרה אחיד — משדר ל-GA4 + מטא + Google Ads בקריאה אחת ──
export function trackConversion(name, params = {}) {
  if (typeof window === "undefined") return;
  // GA4 (תמיד — אם פעיל)
  if (window.gtag) window.gtag("event", name, params);
  // Meta
  if (META_PIXEL_ID && window.fbq) {
    const std = META_STD[name];
    if (std) window.fbq("track", std, params);
    else window.fbq("trackCustom", name, params);
  }
  // Google Ads (רק אם הוגדר label להמרה הזו)
  if (GOOGLE_ADS_ID && window.gtag && ADS_LABELS[name]) {
    window.gtag("event", "conversion", { send_to: `${GOOGLE_ADS_ID}/${ADS_LABELS[name]}` });
  }
}

// ── קיצורים נוחים לאירועי המפתח (לחיבור עתידי בשער ההרשמה / כפתורי שיתוף) ──
export const trackSubscribe = (p) => trackConversion("subscribe", p);
export const trackShare = (p) => trackConversion("share", p);
export const trackMembersSignup = (p) => trackConversion("members_signup", p);
export const trackContact = (p) => trackConversion("contact", p);
