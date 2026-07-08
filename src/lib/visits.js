// ===== מד-כניסות פנימי (SOD1820) =====
// נתוני האתר החדש, נאספים ישירות לבסיס הנתונים שלנו — ללא תלות בגוגל.
// פרטיות: בלי IP / בלי PII. מזהה-גולש = מחרוזת אקראית ב-localStorage (לספירת ייחודיים בלבד).
import { supabase } from "./supabase.js";
import { emit } from "./events.js"; // שלב 1: dual-write ל-pipeline החדש (events), בלי לגעת בישן

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
  // dual-write: אותה כניסה נרשמת גם ב-pipeline החדש (events) לרמת-אדם. לא תלוי בהצלחת הישן.
  try { emit("page", "view", { path }); } catch { /* ignore */ }
}

// קריאת אגרגציה (למנהל בלבד — נחסם ב-DB ל-anon).
export async function getVisitStats(days = 90) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("visits_stats", { p_days: days });
  if (error) throw error;
  return data;
}

// פירוט דפים/מקורות עבור יום (או חודש) בודד שנבחר בגרף (key תואם sel.key).
export async function getVisitDetail(gran, key) {
  if (!supabase || !key) return null;
  const { data, error } = await supabase.rpc("visits_detail_for", { p_gran: gran, p_key: key });
  if (error) throw error;
  return data;
}

// ── מקורות-הגעה מתויגים (?src=ig / utm_source) — פילוח ערוצים (אינסטגרם/פייסבוק…) ──
// קורא visitor_events (section='arrival') דרך RPC מנהל. מודד מאיפה הגיעו גם כשה-referrer
// ריק (אינסטגרם/פייסבוק מוחקים referrer בדפדפן הפנימי).
export async function getArrivalSources(days = 30) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("arrival_sources", { p_days: days });
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

// ── 🧭 דשבורד המסעות (מנהל) — זמן+צפיות לכל דף/כלי-מעבדה + מסע-לכל-מבקר ──
export async function getPageDwell(hours = 168) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_page_dwell", { p_hours: hours });
  if (error) throw error;
  return data;
}
export async function getVisitorJourneys(hours = 24, min = 4) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_visitor_journeys", { p_hours: hours, p_min: min });
  if (error) throw error;
  return data;
}
// 🔗 שיתופי-מסע + 🔓 פתיחות מסר-עומק (AI) — «מי שיתף» לדשבורד הקרדיטים. מקור: visitor_events.
export async function getJourneyShares(hours = 336) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_journey_shares", { p_hours: hours });
  if (error) throw error;
  return data;
}
// 🤖 שימוש ב-AI לפי כפתור — כמה לחצו על כל כפתור-AI (השוואה/נוטריקון/פסוק/מחקר/מסע…). מקור: visitor_events.
export async function getAiUsage(hours = 720) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_ai_usage", { p_hours: hours });
  if (error) throw error;
  return data;
}
// 🧠 שימוש באזור-המשתמש — כמה נכנסו/שמרו/הוסיפו למחקר (כולל אנונימיים). מקור: visitor_events.
export async function getResearchUsage(hours = 48) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_research_usage", { p_hours: hours });
  if (error) throw error;
  return data;
}

// ── תובנות Google Analytics חיות (מקורות, מדינות, מכשירים, זמן-אמת) ──
export async function getGaInsights(days = 28) {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  const r = await fetch(`/api/ga-insights?days=${days}`, { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) throw new Error("ga-insights " + r.status);
  return r.json();
}

// ── סנכרון Google Analytics → traffic_history (source='ga') דרך api/ga-sync ──
export async function syncGoogleAnalytics(days = 540) {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  const r = await fetch(`/api/ga-sync?days=${days}`, { method: "POST", headers: { Authorization: "Bearer " + token } });
  if (!r.ok) throw new Error("ga-sync " + r.status);
  return r.json();
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

