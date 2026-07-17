import { getVisitorId, track } from "./tracking.js";

// ===== Propagation Engine (rid) — ויראליות אמיתית =====
// כל שיתוף נושא rid=<visitor_id של המשתף>. כשמישהו נכנס דרך הקישור, נרשם אירוע
// 'arrival' עם ה-rid → כך יודעים אילו שיתופים *באמת הביאו אנשים* (לא רק קליקים),
// ומי השגרירים. כל הנתונים ב-visitor_events (אין סכמה חדשה).

// מוסיף rid לקישור לשיתוף (דורס rid קודם — מייחס למשתף הנוכחי).
export function withRid(url) {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il");
    u.searchParams.set("rid", getVisitorId());
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
  const landing = window.location.pathname.replace(/^\//, "") || "home";
  track("propagation", landing, "arrival", { rid, landing });
}
