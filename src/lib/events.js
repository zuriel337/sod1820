// ===== פליטת אירועים אחידה (events) — שלב 1 =====
// כותב ל-events דרך RPC ingest_event, במקביל למערכת הישנה (dual-write). fire-and-forget.
import { supabase } from "./supabase.js";
import { getSodId, appContext, sessionId } from "./identity.js";

function param(name) { try { return new URLSearchParams(location.search).get(name); } catch { return null; } }
function refHost() {
  try { if (!document.referrer) return null; const h = new URL(document.referrer).host; return (h && h !== location.host) ? h : null; }
  catch { return null; }
}
function device() { try { return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop"; } catch { return null; } }
// 🤖 סימון בוט (עקבי עם visits.js): מסמנים ולא מדלגים → dashboard יכול להפריד אנשים/בוטים.
const BOT_UA = /bot|crawl|spider|slurp|googlebot|bingpreview|jetmon|uptime|monitor|headless|phantom|puppeteer|playwright|python|curl|wget|libwww|okhttp|java\/|go-http|facebookexternal|externalhit|preview|lighthouse|pagespeed|gtmetrix|semrush|ahrefs|mj12|dotbot|petalbot|dataprovider|scan|um-ic|feedfetch/i;
function isBot() { try { return BOT_UA.test(navigator.userAgent || "") || navigator.webdriver === true; } catch { return false; } }

// via — מאיפה הגיע: תיוג מפורש (via=) → rid → utm_source → referrer → direct
function via() {
  const p = param("via"); if (p) return p;
  if (param("rid")) return "share";
  const s = param("utm_source"); if (s) return s;
  const rh = refHost();
  if (!rh) return "direct";
  if (/google/i.test(rh)) return "google";
  if (/facebook|fb\./i.test(rh)) return "facebook";
  if (/instagram/i.test(rh)) return "instagram";
  if (/t\.co|twitter|x\.com/i.test(rh)) return "twitter";
  return "referral";
}
function utm() {
  try {
    const q = new URLSearchParams(location.search); const o = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "rid", "sid"].forEach(k => { const v = q.get(k); if (v) o[k] = v; });
    return Object.keys(o).length ? o : null;
  } catch { return null; }
}

// emit(surface, eventType, opts?) — opts: {path, via, journeyId, depth, props}
export function emit(surface, eventType, opts = {}) {
  if (!supabase) return;
  try {
    supabase.rpc("ingest_event", {
      p_sod_id: getSodId(),
      p_surface: surface,
      p_event_type: eventType,
      p_path: opts.path ?? (typeof location !== "undefined" ? location.pathname : null),
      p_ref_host: refHost(),
      p_via: opts.via ?? via(),
      p_app_context: appContext(),
      p_device: device(),
      p_session_id: sessionId(),
      p_journey_id: opts.journeyId ?? null,
      p_depth: opts.depth ?? null,
      p_utm: utm(),
      p_props: opts.props ?? null,
      p_is_bot: isBot(),
    }).then(() => {}).catch(() => {});
  } catch { /* לעולם לא שובר גלישה */ }
}
