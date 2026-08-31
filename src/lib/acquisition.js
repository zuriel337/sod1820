// ── Subscriber Acquisition Snapshot (v1) — מקור-אמת אחד לכל מסלולי-ההרשמה ──────────
// WIRING בלבד: מחבר הרשמה חדשה לתשתית ה-Identity/Traffic הקיימת. אין מזהה-מבקר חדש,
// אין אחסון חדש, אין מערכת-אנליטיקה מקבילה. הקובץ **טהור** (בלי import אפליקטיבי) כדי
// שגם supabase.js וגם רכיבי-UI/auth יוכלו לצרוך אותו בלי מעגל-import.
//
// קורא בדיוק את אותו חוזה ש-tracking.js כבר כותב:
//   • sod_vid        — מזהה-המבקר הקנוני; **בעלים יחיד** = src/lib/visitorId.js (כאן רק צורכים)
//   • sod_acq_first  — מגע-ראשון (tracking.captureAcquisition, נשמר פעם-אחת)
//   • sod_acq_last   — מגע-חיצוני-אמיתי אחרון (tracking.captureAcquisition)
// acquisition = תצלום-ייחוס בזמן-ההרשמה בלבד — לעולם לא היסטוריית-האירועים המלאה (events נשארים מקור-אמת-האירוע).

import { getVisitorId } from "./visitorId.js"; // ONE TREE: בעלים יחיד ל-sod_vid

const ACQ_FIRST = "sod_acq_first";
const ACQ_LAST = "sod_acq_last";

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function jparse(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }

// אותו sod_vid בדיוק — מיוצא-מחדש מהפרימיטיב הקנוני (בלי יצירה שנייה, בלי מפתח שני).
export { getVisitorId as visitorId };

// מגע-ההרשמה עצמו — provenance של ההמרה (utm/referrer/נתיב ברגע ההרשמה).
function signupTouch() {
  if (typeof window === "undefined") return null;
  let path = "/", search = "";
  try { path = window.location.pathname || "/"; search = window.location.search || ""; } catch { /* noop */ }
  const q = (() => { try { return new URLSearchParams(search); } catch { return new URLSearchParams(); } })();
  const utm = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const v = q.get(k); if (v) utm[k] = v;
  }
  const src = q.get("src"); if (src && !utm.utm_source) utm.src = src;
  let ref_host = null;
  try {
    const r = (typeof document !== "undefined" && document.referrer) || "";
    if (r) { const h = new URL(r).hostname; ref_host = /(^|\.)sod1820\.co\.il$/i.test(h) ? null : h; }
  } catch { /* noop */ }
  // Unknown ≠ Direct: source = מקור נצפה בלבד (utm/src/referrer-חיצוני). אין אות נצפה →
  // null (=«לא-נצפה מקור חיצוני במגע הזה»), לעולם לא ממציאים "direct"/קמפיין. referrer-ריק
  // הוא דו-משמעי (direct או referrer-שנחסם) → נשאר null; המקור-האמיתי חי ב-first_touch.
  const source = utm.utm_source || src || ref_host || null;
  return { source, ref_host, utm: Object.keys(utm).length ? utm : null, path, occurred_at: new Date().toISOString() };
}

// התצלום הקנוני שנצמד לכל subscriber חדש. first_touch/last_touch = בדיוק המגעים
// ש-tracking.captureAcquisition שמר (channel/tag/tagged/rid/ref/landing/at); signup_touch = רגע-ההמרה.
// Rank, Don't Hide: ייחוס לא-ידוע נשאר null — לא מומצא (Unknown ≠ Direct).
export function signupAttribution() {
  try {
    const first = jparse(lsGet(ACQ_FIRST));
    const last = jparse(lsGet(ACQ_LAST)) || first;
    return {
      attribution_version: "v1",
      visitor_id: getVisitorId(),
      first_touch: first || null,
      last_touch: last || null,
      signup_touch: signupTouch(),
    };
  } catch {
    return { attribution_version: "v1", visitor_id: null, first_touch: null, last_touch: null, signup_touch: null };
  }
}
