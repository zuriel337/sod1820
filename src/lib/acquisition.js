// ── Subscriber Acquisition Snapshot (v1) — מקור-אמת אחד לכל מסלולי-ההרשמה ──────────
// WIRING בלבד: מחבר הרשמה חדשה לתשתית ה-Identity/Traffic הקיימת. אין מזהה-מבקר חדש,
// אין אחסון חדש, אין מערכת-אנליטיקה מקבילה. הקובץ **טהור** (בלי import אפליקטיבי) כדי
// שגם supabase.js וגם רכיבי-UI/auth יוכלו לצרוך אותו בלי מעגל-import.
//
// קורא בדיוק את אותו חוזה ש-tracking.js כבר כותב:
//   • sod_vid        — מזהה-המבקר הקנוני של האתר (tracking.getVisitorId · events/visitor_events)
//   • sod_acq_first  — מגע-ראשון (tracking.captureAcquisition, נשמר פעם-אחת)
//   • sod_acq_last   — מגע-חיצוני-אמיתי אחרון (tracking.captureAcquisition)
// acquisition = תצלום-ייחוס בזמן-ההרשמה בלבד — לעולם לא היסטוריית-האירועים המלאה (events נשארים מקור-אמת-האירוע).

const VID_KEY = "sod_vid";
const ACQ_FIRST = "sod_acq_first";
const ACQ_LAST = "sod_acq_last";

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function jparse(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }

// קורא/יוצר את אותו sod_vid ש-tracking.getVisitorId משתמש בו — לעולם לא מזהה שני.
export function visitorId() {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v) {
      v = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VID_KEY, v);
    }
    return v;
  } catch { return null; }
}

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
  // מקור אמיתי-נצפה בלבד — לעולם לא ממציאים קמפיין. אין אות → "direct" (חוזה ה-Traffic הקיים).
  const source = utm.utm_source || src || ref_host || "direct";
  return { source, ref_host, utm: Object.keys(utm).length ? utm : null, path, occurred_at: new Date().toISOString() };
}

// התצלום הקנוני שנצמד לכל subscriber חדש. first_touch/last_touch = בדיוק המגעים
// ש-tracking.captureAcquisition שמר (channel/tag/tagged/rid/ref/landing/at); signup_touch = רגע-ההמרה.
// Rank, Don't Hide: ייחוס לא-ידוע נשאר null/direct — לא מומצא.
export function signupAttribution() {
  try {
    const first = jparse(lsGet(ACQ_FIRST));
    const last = jparse(lsGet(ACQ_LAST)) || first;
    return {
      attribution_version: "v1",
      visitor_id: visitorId(),
      first_touch: first || null,
      last_touch: last || null,
      signup_touch: signupTouch(),
    };
  } catch {
    return { attribution_version: "v1", visitor_id: null, first_touch: null, last_touch: null, signup_touch: null };
  }
}
