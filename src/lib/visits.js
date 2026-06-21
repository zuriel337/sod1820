// ===== מד-כניסות פנימי (SOD1820) =====
// נתוני האתר החדש, נאספים ישירות לבסיס הנתונים שלנו — ללא תלות בגוגל.
// פרטיות: בלי IP / בלי PII. מזהה-גולש = מחרוזת אקראית ב-localStorage (לספירת ייחודיים בלבד).
import { supabase } from "./supabase.js";

const VKEY = "sod_visitor";

function visitorId() {
  try {
    let v = localStorage.getItem(VKEY);
    if (!v) {
      v = (crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2)));
      localStorage.setItem(VKEY, v);
    }
    return v;
  } catch { return null; }
}

function deviceType() {
  if (typeof navigator === "undefined") return null;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

// referrer חיצוני נרשם רק בכניסה הראשונה לאתר (לא בניווט פנימי ב-SPA).
function externalReferrer() {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).host;
    if (host && host !== location.host) return host;
  } catch { /* ignore */ }
  return null;
}

let firstHit = true;

// רישום כניסה לדף. fire-and-forget — לעולם לא שובר גלישה.
export async function trackVisit(path) {
  if (!supabase || !path) return;
  if (path.startsWith("/admin")) return;   // לא סופרים את עמוד הניהול עצמו
  const referrer = firstHit ? externalReferrer() : null;
  firstHit = false;
  try {
    await supabase.rpc("track_visit", {
      p_path: path,
      p_referrer: referrer,
      p_visitor: visitorId(),
      p_device: deviceType(),
    });
  } catch { /* שקט — מד-הכניסות לא יפיל את האתר */ }
}

// קריאת אגרגציה (למנהל בלבד — נחסם ב-DB ל-anon).
export async function getVisitStats(days = 90) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("visits_stats", { p_days: days });
  if (error) throw error;
  return data;
}

// ── היסטוריית תנועה ארוכת-טווח: Jetpack (עבר) + חי (האתר החדש), קו רציף ──
export async function getTrafficHistory(granularity = "month") {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("traffic_history_combined", { p_gran: granularity });
  if (error) throw error;
  return data || [];
}

// ── העמודים הישנים הכי נצפים (Jetpack top-posts) ──
export async function getLegacyTopPages(limit = 15) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("legacy_top_pages", { p_limit: limit });
  if (error) throw error;
  return data || [];
}

// ── Google Search Console — שאילתות חיפוש כנתונים (דרך api/search-console) ──
// שולח את ה-session token של המנהל; ה-endpoint מאמת role=admin ומושך מגוגל.
export async function getSearchConsole(days = 90) {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  const r = await fetch(`/api/search-console?days=${days}`, { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) throw new Error("search-console " + r.status);
  return r.json();
}

