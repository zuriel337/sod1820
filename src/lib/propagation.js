import { getVisitorId, track } from "./tracking.js";

// ===== Propagation Engine (rid) — ויראליות אמיתית =====
// כל שיתוף נושא rid=<visitor_id של המשתף>. כשמישהו נכנס דרך הקישור, נרשם אירוע
// 'arrival' עם ה-rid → כך יודעים אילו שיתופים *באמת הביאו אנשים* (לא רק קליקים),
// ומי השגרירים. כל הנתונים ב-visitor_events (אין סכמה חדשה).

// 🔑 נרמול-נחיתה קנוני (Sharing Foundation repair, Human-Gate 2026-09-05) — משמש גם בצד-השולח
// (מה נשמר כ"יעד" בשיתוף) וגם בצד-הנחיתה (captureArrival). שני הצדדים *חייבים* להשתמש באותה
// פונקציה — אחרת ה-join בין share.slug ל-arrival.meta.landing נשבר (זה בדיוק הבאג שתוקן).
// decodeURIComponent חובה: producers שגוזרים נתיב-יעד דרך new URL(...).pathname (למשל
// ShareActions/crossCard) מקבלים אחוזי-קידוד (%D7%90…) לכל תו לא-ASCII (נתיבים בעברית!),
// בעוד window.location.pathname בדפדפן עשוי להחזיר עברית גולמית — בלי הפענוח כאן, נתיב
// עברי משותף ונחיתה עברית נופלים ל-slug שונה ולא נמצאים לעולם ע״י ה-join (נבדק/אומת ידנית).
export function landingKey(pathname = "") {
  try {
    let p = (pathname || "").replace(/^\//, "") || "home";
    try { p = decodeURIComponent(p); } catch { /* אחוזי-קידוד פגומים — משתמשים כפי-שהוא */ }
    return p || "home";
  } catch { return "home"; }
}

// מוסיף rid לקישור לשיתוף (דורס rid קודם — מייחס למשתף הנוכחי).
export function withRid(url) {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il");
    u.searchParams.set("rid", getVisitorId());
    return u.toString();
  } catch { return url; }
}

// מיפוי ערוץ-שיתוף → קוד-מקור קצר שהמנוע מזהה (tracking.normalizeSource): wa/tg/fb/ig…
const SRC_BY_CHANNEL = { whatsapp: "wa", telegram: "tg", facebook: "fb", instagram: "ig", x: "x", email: "email", copy: "copy", native: "native" };

// 🔗 The link handed to other people (PREPARED FOR ZURIEL'S DECISION, 18.11.2026 — privacy/analytics contract change, not approved yet).
// It carries only `src=<channel>`. Removed from the copy made for sharing (the sharer's own address bar and arrival capture are untouched):
//   - `rid`, the sharer's persistent device id. In the 2029 public build nothing reads it: arrival attribution is `src` first
//     (events.js via()), `rid` never leaves the browser, and the readers that resolved it to a person (admin_ambassadors, viral_report,
//     growth_center) have had no input since 3.11.2026 and no caller in src. Keeping `src` keeps production telemetry byte-identical.
//   - tracking keys of the visit the sharer arrived with (utm_*, fbclid, gclid, …, via, sid, nlid): they misattributed the recipient's visit
//     and exposed the sharer's own campaign. Identity/context keys (unit, thread, reply, gallery, image, finding, p, q/m/v, …) are kept.
export const SHARE_STRIP_PARAMS = Object.freeze(["rid", "src", "via", "sid", "nlid", "fbclid", "gclid", "gbraid", "wbraid", "dclid", "msclkid",
  "igshid", "ttclid", "twclid", "mc_cid", "mc_eid", "_gl", "_ga"]);
export function taggedShareUrl(url, channel) {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il");
    for (const key of [...u.searchParams.keys()]) {
      if (SHARE_STRIP_PARAMS.includes(key) || /^utm_/i.test(key)) u.searchParams.delete(key);
    }
    const src = SRC_BY_CHANNEL[channel] || channel;
    if (src) u.searchParams.set("src", src);
    return u.toString();
  } catch { return url; }
}

// 👥 הזמנת-חברים: אם הגענו דרך קישור-הזמנה עם ?ref=<user_id של המזמין> → שומרים אותו.
// אחרי שהמבקר יירשם/יתחבר, AuthContext קורא ל-record_referral → מזמין +100, החבר +50.
export function captureRef() {
  if (typeof window === "undefined") return;
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) return;
    // לא לדרוס הזמנה קיימת שטרם נוצלה (הראשון שהזמין זוכה)
    if (!localStorage.getItem("sod_ref")) localStorage.setItem("sod_ref", ref);
  } catch { /* noop */ }
}

// נקרא בעליית האפליקציה: אם הגענו דרך קישור עם ?rid → רושמים arrival (פעם אחת ל-rid ל-session).
export function captureArrival() {
  if (typeof window === "undefined") return;
  let rid = null;
  try { rid = new URLSearchParams(window.location.search).get("rid"); } catch { return; }
  if (!rid) return;
  if (rid === getVisitorId()) return; // פתח את הקישור של עצמו — לא סופרים
  const key = "sod_arr_" + rid;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch { /* אם אין sessionStorage — נרשום בכל זאת */ }
  const landing = landingKey(window.location.pathname);
  track("propagation", landing, "arrival", { rid, landing });
}
