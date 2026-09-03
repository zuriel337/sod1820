// ===== מד-כניסות פנימי (SOD1820) =====
// נתוני האתר החדש, נאספים ישירות לבסיס הנתונים שלנו — ללא תלות בגוגל.
// פרטיות: בלי IP / בלי PII. מזהה-גולש = מחרוזת אקראית ב-localStorage (לספירת ייחודיים בלבד).
import { supabase } from "./supabase.js";
import { emit, isBot } from "./events.js"; // שלב 1: dual-write ל-pipeline החדש (events), בלי לגעת בישן
// IDENTITY_UNIFICATION_V1: מפסיקים ליצור מזהה-מבקר נפרד ("sod_visitor") — זה היה
// שכפול-בטעות של שכבת ה-Browser Visitor, ש-visitorId.js כבר "בעלים יחיד" שלה לפי
// החוזה שלו (ONE TREE). לא מוחקים את המפתח הישן (מבקרים קיימים עם sod_visitor
// ב-localStorage פשוט מפסיקים להיכתב אליו — ההיסטוריה הקיימת ב-site_visits נשארת
// כמות שהיא, בלי rewrite). אומת מול כל צרכני site_visits (track_visit/
// visits_two_meter/traffic_composition/visits_stats/visits_detail_for) שאף אחד לא
// תלוי בפורמט/namespace הישן — כולם מתייחסים ל-visitor כמחרוזת אטומה (count distinct
// בלבד), ואורך UUID זהה בשני המקורות (36 תווים, בתוך המגבלה left(...,64) ב-track_visit).
import { getVisitorId as visitorId } from "./visitorId.js";

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

// 🤖 זיהוי בוטים: מקור-אמת = פסק-הקצה (cookie vb מה-middleware, דרך isBot() ב-events.js) —
// מחושב מה-UA האמיתי בצד-שרת, ונופל ל-heuristic של UA בצד-לקוח רק אם אין עדיין cookie.
// מדיניות (11.7): לא *מדלגים* על הבוט — **מסמנים** אותו (is_bot) ורושמים בכל זאת → שני מונים
// אחידים: «כולל בוטים» (הכל) ו«אנשים בלבד» (is_bot=false), בלי מדרגה.

// רישום כניסה לדף. fire-and-forget — לעולם לא שובר גלישה.
export async function trackVisit(path) {
  if (!supabase || !path) return;
  if (path.startsWith("/admin")) return;   // לא סופרים את עמוד הניהול עצמו
  const bot = isBot();                       // 🤖 פסק-קצה סמכותי → שני מונים: כולל-בוטים + אנשים
  const referrer = firstHit ? externalReferrer() : null;
  firstHit = false;
  try {
    await supabase.rpc("track_visit", {
      p_path: path,
      p_referrer: referrer,
      p_visitor: visitorId(),
      p_device: deviceType(),
      p_is_bot: bot,
    });
  } catch { /* שקט — מד-הכניסות לא יפיל את האתר */ }
  // dual-write: אותה כניסה נרשמת גם ב-pipeline החדש (events) לרמת-אדם. לא תלוי בהצלחת הישן.
  try { emit("page", "view", { path }); } catch { /* ignore */ }
}

// ── שני מונים אחידים (מנהל) ─────────────────────────────────────────────────
// (א) יחידות-ביקורים מ-site_visits: כולל-בוטים · אנשים(is_bot=false) · בוטים.
export async function getVisitsTwoMeter(days = 21) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("visits_two_meter", { p_days: days });
  if (error) throw error;
  return data || [];
}
// (ב) הרכב-תנועה אחיד ל-3 שבועות מ-edge_geo_log (יחידות-בקשות, ה-middleware מתעד הכל):
//     total(כולל בוטים) · humans(browser) · bots(bot+goodbot). אחיד לכל התקופה, בלי מדרגה.
export async function getTrafficComposition(days = 21) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("traffic_composition", { p_days: days });
  if (error) throw error;
  return data || [];
}
// 🕷️ Crawl Intelligence — מגמות בוטים: מוגש/חסום · לפי בוט · Top דליי-תוכן · מי-סורק.
export async function getCrawlIntel(days = 7) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_crawl_intel", { p_days: days });
  if (error || data?.error) return null;
  return data || null;
}
// (ג) פירוט יום נבחר (לחיצה על עמודה): דפים (site_visits) · מקורות-הגעה (events) · מדינות (edge_geo_log).
export async function getTrafficDayDetail(day) {
  if (!supabase || !day) return null;
  const { data, error } = await supabase.rpc("traffic_day_detail", { p_day: day });
  if (error) throw error;
  return data || null;
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

// ── 📈 מרכז הצמיחה (מנהל) — מייל · מנויים · משפך-וולקום · מקורות-הגעה · שיתוף · זמן-אמת (blob יחיד) ──
export async function getGrowthCenter(days = 30) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_growth_center", { p_days: days });
  if (error) throw error;
  return data;
}

// ── 🩺 עומסים ותשתית (מנהל) — תנועת-גולשים יומית מול עומס-רקע שעתי (cron) ──
// מקור-אמת: admin_infra_load (SECURITY DEFINER, אדמין-בלבד). מחזיר { kpis, daily[], hourly[] }.
export async function getInfraLoad(days = 10, hours = 48) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_infra_load", { p_days: days, p_hours: hours });
  if (error) throw error;
  return data;
}

// 🚀 טבלת-השגרירים — מי מפיץ קישורים (rid) ומביא אנשים/הרשמות. עצמאי מ-getGrowthCenter
// כדי לא להכביד על הטעינה הראשית (כמו getGaInsights). אדמין-בלבד (RPC SECURITY DEFINER).
export async function getAmbassadors(days = 30) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_ambassadors", { p_days: days });
  if (error) throw error;
  return data;
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

// ── 🛰️ Traffic Intelligence — כניסות אמיתיות (מקור-אמת: fn_human_entrances / traffic_daily) ──
// חוזה ההגדרות: project_codex slug='traffic_intelligence_law'. כל המדדים מכאן בלבד (Source of Truth).
export async function getEntriesDaily(days = 30) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("admin_entries_daily", { p_days: days });
  if (error) throw error;
  return data || [];
}
export async function getEntriesBreakdown(days = 30) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_entries_breakdown", { p_days: days });
  if (error) throw error;
  return data || null;
}
export async function getEntryDayDetail(day) {
  if (!supabase || !day) return [];
  const { data, error } = await supabase.rpc("admin_entries_day_detail", { p_day: day });
  if (error) throw error;
  return data || [];
}
export async function getMeasurementGap(days = 30) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_measurement_gap", { p_days: days });
  if (error) throw error;
  return data || null;
}
// ציר היסטורי מאוחד — צפיות לפי שנים/חודשים, Jetpack(ישן)→GA→first-party (קדימות ליום, בלי כפילות)
export async function getTrafficUnified(gran = "year") {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("admin_traffic_unified", { p_gran: gran });
  if (error) throw error;
  return data || [];
}
// מד-זמן: סדרת כניסות אנושיות נטו לפי רזולוציה (יום/חודש/שנה)
export async function getEntriesSeries(gran = "day") {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("admin_entries_series", { p_gran: gran });
  if (error) throw error;
  return data || [];
}
// פאזה 2: Funnel התנהגותי + Insights אוטומטיים (על נטו-אנושי)
export async function getFunnel(days = 30) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("admin_funnel", { p_days: days });
  if (error) throw error;
  return data || [];
}
export async function getTrafficInsights(days = 30) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("admin_traffic_insights", { p_days: days });
  if (error) throw error;
  return data || [];
}
// 🧠 מפקדה — מקבץ קנוני אחד (המלצות מטטרון + חיוויים + פעילות). קורא ממקורות קיימים בלבד.
export async function getCommandCenter() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_command_center");
  if (error) throw error;
  return data || null;
}
export async function reviewRecommendation(id, status, note = null) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_recommendation_review", { p_id: id, p_status: status, p_note: note });
  if (error) throw error;
  return data || null;
}
// מטטרון: הרצה ידנית של גלאי-הפערים/ההמלצות (אדמין) — ממלא את תור-ההמלצות
export async function runMetatronRecommend() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_run_metatron_recommend");
  if (error) throw error;
  return data || null;
}
// שופט ההתכנסויות — מועמדים ממתינים (מדורגים, עם «למה הגיע אליי»)
export async function getConvergenceCandidates(limit = 50) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_convergence_candidates", { p_limit: limit });
  if (error) throw error;
  return data || null;
}
// החלטת-אדם על מועמד → decision_ledger + הזנת Learned-Pattern
export async function decideCandidate(id, decision, reasonCode = null, humanReason = null) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_candidate_decide", { p_candidate_id: id, p_decision: decision, p_reason_code: reasonCode, p_human_reason: humanReason });
  if (error) throw error;
  return data || null;
}
// 💬 חוקר-המספרים: ה-dossier הקנוני לערך (אותו אובייקט שרזיאל מקבל)
export async function getNumberDossier(value) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_number_dossier", { p_value: Number(value) });
  if (error) throw error;
  return data || null;
}
// 💬 שיחה עם רזיאל-חוקר (Edge — אותו raziel_brain + fn_raziel_context + metatron_context בצד-שרת).
// זהות המשתמש נגזרת מה-JWT בצד-שרת (לא מפרמטר) → הזיכרון הפרטי מוזרק רק לבעליו.
export async function askNumberResearcher(values, message, history = []) {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke("number-researcher", { body: { values, message, history } });
  if (error) throw error;
  return data || null;
}
// 🧵 טעינת השיחה המתמשכת השמורה (agent_user_memory, channel='site') — לא נמחקת ברענון/יציאה.
// מחזיר גם את ה-context_snapshot האחרון כדי ש-«על סמך מה?» יעבוד אחרי כניסה מחדש (Replay).
// אותה שיחה בדיוק גם עבור askRazielAttention (למטה) — "ONE SYSTEM. ONE RAZIEL." לא thread שני.
export async function loadResearcherThread() {
  if (!supabase) return { history: [], snapshot: null };
  const { data, error } = await supabase.functions.invoke("number-researcher", { body: { op: "history" } });
  if (error) return { history: [], snapshot: null };
  return { history: Array.isArray(data?.history) ? data.history : [], snapshot: data?.snapshot || null };
}
// 🎛️ רזיאל — עוזר-Human-Gate של חדר המפקדה (Pass 1B, COMMAND_CENTER_ATTENTION_CLOSURE).
// digest = תקציר-דטרמיניסטי-חסום של תור-הקשב הנוכחי (buildAttentionDigest ב-lib/ccwork.js) — לא
// שולח פריטים גולמיים. Edge raziel-attention: אותו raziel_brain, admin-gated, שולף חוקים-רלוונטיים
// חיים (fn_raziel_relevant_rules) — לא רשימה-קשיחה. profile כרגע רק 'ZURIEL_RESEARCH' (extension
// point ל-'USER_ASSISTANT' עתידי, לא-בנוי). קורא/מנתח/ממליץ בלבד — אין RPC-כתיבה בתוך הקריאה הזו.
export async function askRazielAttention(message, history = [], digest = null, profile = "ZURIEL_RESEARCH") {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke("raziel-attention", { body: { message, history, digest, profile } });
  if (error) throw error;
  return data || null;
}
// ➕ שלח לשופט: יוצר Candidate מלא-trace מה-dossier → השופט הקיים
export async function sendCandidateFromResearcher(value, note = null, claim = null) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_candidate_from_researcher", { p_value: Number(value), p_note: note, p_claim: claim });
  if (error) throw error;
  return data || null;
}
// פרטי-התכנסות מלאים לערך (הביטויים בפועל בכל שיטה + ראיות)
export async function getConvergenceDetail(value) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_convergence_detail", { p_value: Number(value) });
  if (error) throw error;
  return data || null;
}
// הרצת מחולל המועמדים (אדמין)
export async function generateCandidates(limit = 20) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_generate_candidates", { p_limit: limit });
  if (error) throw error;
  return data || null;
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

