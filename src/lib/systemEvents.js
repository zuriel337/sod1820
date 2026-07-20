// 🌱 «מה קורה במערכת» — מנוע האירועים (שלב 1: מנוע בלבד, בלי UI).
// עיקרון: הישות הראשית היא **אירוע**, והתצוגה עובדת לפי **סוג-ההשפעה** של האירוע — לא לפי זמן ולא לפי מקור.
// מקור אחד → הרבה תצוגות: כל משטח עתידי (מודול-בית, טיקר, רצועת-פוטר) קורא מכאן בלבד.
//
// שלוש שכבות + שיא:
//   🌱 צמיחה   (grows)     — תוכן חדש שמרחיב את הידע: צופן, מספר, פוסט, דיון, חידוש, רמז. → כרטיסים, ממוין בניקוד.
//   📢 תקשורת  (informs)   — הודעות, לא תוכן: ערוצים + שדרוגי-מערכת. → מצב-ערוץ («12 חדשים»), לא כרטיס לכל אחד.
//   ❤️ פעילות  (community) — לא תוכן, שכבת-חיים: חיפושים, מספרים שנפתחו, דיונים פעילים. → שורת-חיים אחת.
//   ✨ התכנסות (converge)  — האירוע החשוב ביותר: ≥2 אירועים מ-≥2 מקורות שנוגעים באותו מספר → אירוע אחד.
//
// הניקוד מכוונן: המשקלים חיים ב-nodes rule 'pulse_scoring' (metadata.weights) וניתנים לשינוי **בלי פריסה**;
// נופלים ל-DEFAULT_WEIGHTS אם אין. אין חוקים קשיחים («צופן תמיד > ערוץ») — רק ציון, והמערכת ממיינת לבד.
import { supabase, getRealityHints, getRecentSearchCount, getRecentNumbers } from "./supabase.js";
import { getForumFeed } from "./contributions.js";
import { hintNums, effDate } from "./reality.js";

// ── משקלי-ניקוד (ברירת-מחדל) ──
export const DEFAULT_WEIGHTS = {
  base: { צופן: 40, מספר: 40, פוסט: 30, חידוש: 30, דיון: 25, רמז: 20, התכנסות: 50 },
  hasNumber: 20,        // האירוע נוגע במספר
  convergenceBonus: 50, // האירוע חלק מהתכנסות
  freshHours: 48,       // חלון-טריות
  freshBonus: 15,
};

let _weights = null;
export async function getScoreWeights() {
  if (_weights) return _weights;
  _weights = DEFAULT_WEIGHTS;
  if (!supabase) return _weights;
  try {
    const { data } = await supabase.from("nodes").select("metadata")
      .eq("type", "rule").eq("rule_id", "pulse_scoring").eq("is_active", true).maybeSingle();
    const w = data?.metadata?.weights;
    if (w) _weights = { ...DEFAULT_WEIGHTS, ...w, base: { ...DEFAULT_WEIGHTS.base, ...(w.base || {}) } };
  } catch { /* ברירת-מחדל */ }
  return _weights;
}

// שמות-ערוצים לתצוגה (תקשורת). site-news = שדרוגי-מערכת.
const CHANNEL_LABEL = {
  "torat-haremez": { label: "תורת הרמז", em: "📢" },
  "gilui-yomi": { label: "גילוי יומי", em: "📢" },
  "or-geula": { label: "אור הגאולה", em: "📢" },
  "main": { label: "הערוץ הראשי", em: "📢" },
  "reality-code": { label: "קוד המציאות", em: "📢" },
  "sod-hachashmal": { label: "סוד החשמל", em: "📢" },
  "site-news": { label: "שדרוגי מערכת", em: "🛠️" },
};
const channelMeta = (c) => CHANNEL_LABEL[c] || { label: c || "ערוץ", em: "📢" };

const DAY = 86400000;
const ts = (v) => { const t = v ? new Date(v).getTime() : NaN; return Number.isFinite(t) ? t : null; };

// המספרים שאירוע נוגע בהם — הבסיס לזיהוי-התכנסות (העץ האחד).
function numbersFrom(it) {
  const out = [];
  if (it.kind === "cipher" && it.skip_distance) out.push(it.skip_distance);
  if (it.kind === "insight" && Array.isArray(it.related_numbers)) out.push(...it.related_numbers);
  if (it.kind === "contribution" && it.target_type === "number" && it.target_id) {
    const n = parseInt(it.target_id, 10); if (Number.isFinite(n)) out.push(n);
  }
  return [...new Set(out.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
}

// 🌱 שכבת-צמיחה — אירועי-קנון. עדשה על getForumFeed (פוסט/חידוש/דיון/צופן) + רמזי-מציאות.
async function growthEvents(limit = 40) {
  const [forum, hints] = await Promise.all([
    getForumFeed({ limit }).catch(() => []),
    getRealityHints(150).catch(() => []),
  ]);
  const evs = [];
  for (const it of forum || []) {
    const type = it.kind === "cipher" ? "צופן" : it.kind === "post" ? "פוסט" : it.kind === "insight" ? "חידוש" : "דיון";
    const url = it.kind === "cipher" ? `/codes/${encodeURIComponent(it.slug || "")}`
      : it.kind === "post" ? `/${it.slug || ""}` : "/forum";
    evs.push({
      source: it.kind, impact: "growth", type,
      title: it.title || it.search_term || (it.body ? String(it.body).slice(0, 60) : "חדש"),
      author: it.author_name || null, url, time: it.ts || it.created_at || null,
      numbers: numbersFrom(it),
    });
  }
  for (const h of hints || []) {
    const nums = hintNums(h) || [];
    evs.push({
      source: "reality", impact: "growth", type: "רמז",
      title: h.name || (nums[0] ? `רמז · ${nums[0]}` : "רמז חדש"), author: h.author_name || null,
      url: nums[0] ? `/number/${nums[0]}` : "/archive", time: effDate(h) || h.created_at || null,
      numbers: nums,
    });
  }
  return evs.filter((e) => e.time);
}

// 📢 שכבת-תקשורת — מצב-ערוץ (לא כרטיס לכל הודעה). קיבוץ channel_updates החיים לפי ערוץ.
async function communicationStates() {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("channel_updates")
      .select("channel,text,credit,link_url,created_at")
      .eq("status", "live")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false }).limit(300);
    const since = Date.now() - DAY;
    const byCh = new Map();
    for (const r of data || []) {
      const c = r.channel || "main";
      if (!byCh.has(c)) byCh.set(c, { channel: c, ...channelMeta(c), count24h: 0, total: 0, latest: null, latestAt: null });
      const s = byCh.get(c);
      s.total += 1;
      const t = ts(r.created_at);
      if (t && t >= since) s.count24h += 1;
      if (!s.latest) { s.latest = r.text || ""; s.latestAt = r.created_at; s.credit = r.credit || null; }
    }
    return [...byCh.values()]
      .map((s) => ({ ...s, impact: "informs", url: s.channel === "site-news" ? "/broadcasts?c=site-news" : "/broadcasts" }))
      .sort((a, b) => b.count24h - a.count24h || b.total - a.total);
  } catch { return []; }
}

// ❤️ שכבת-פעילות — שורת-חיים. חיפושים היום, מספרים אחרונים שנפתחו, דיונים פעילים.
async function activityPulse(growth) {
  const [searches24h, recentNums] = await Promise.all([
    getRecentSearchCount(24).catch(() => 0),
    getRecentNumbers(12).catch(() => []),
  ]);
  const since = Date.now() - DAY;
  const discussionsActive = (growth || []).filter((e) => e.type === "דיון" && ts(e.time) >= since).length;
  return {
    impact: "community",
    searches24h: searches24h || 0,
    numbersOpened: (recentNums || []).length,
    discussionsActive,
  };
}

// ✨ זיהוי-התכנסות — ≥2 אירועי-צמיחה מ-≥2 מקורות שנוגעים באותו מספר בחלון-יומיים → אירוע יחיד.
function detectConvergences(growth, windowDays = 2) {
  const cutoff = Date.now() - windowDays * DAY;
  const byNum = new Map();
  for (const e of growth) {
    if (ts(e.time) < cutoff) continue;
    for (const n of e.numbers || []) {
      if (!byNum.has(n)) byNum.set(n, []);
      byNum.get(n).push(e);
    }
  }
  const out = [];
  for (const [number, evs] of byNum) {
    const sources = new Set(evs.map((e) => e.source));
    if (evs.length >= 2 && sources.size >= 2) {
      out.push({ number, events: evs, impact: "convergence", url: `/number/${number}` });
    }
  }
  return out.sort((a, b) => b.events.length - a.events.length);
}

// ניקוד אירוע-צמיחה (סינכרוני — המשקלים כבר נטענו). ללא חוקים קשיחים; רק ציון.
function scoreEvent(e, w, convNumbers) {
  let s = w.base[e.type] ?? 10;
  if ((e.numbers || []).length) s += w.hasNumber;
  if ((e.numbers || []).some((n) => convNumbers.has(n))) s += w.convergenceBonus;
  const t = ts(e.time);
  if (t && Date.now() - t < (w.freshHours || 48) * 3600000) s += w.freshBonus;
  return s;
}

// מכסת-מקורות: «הכוח בבחירה, לא בכמות» — מגבילים כל סוג כדי שאחד לא ישתלט על הבמה.
const TYPE_CAP = { צופן: 2, פוסט: 2, דיון: 2, חידוש: 2, רמז: 2, מספר: 2 };
function capAndSort(events, limit) {
  const sorted = [...events].sort((a, b) => (b.score || 0) - (a.score || 0) || (ts(b.time) || 0) - (ts(a.time) || 0));
  const perType = {}, out = [];
  for (const e of sorted) {
    const cap = TYPE_CAP[e.type] ?? 2;
    perType[e.type] = (perType[e.type] || 0);
    if (perType[e.type] >= cap) continue;
    perType[e.type] += 1; out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

// 🎯 המנוע הראשי — מקור-אמת יחיד. מחזיר את שלוש השכבות + ההתכנסויות, מוכן לכל תצוגה.
export async function getSystemEvents({ growthLimit = 8, forumLimit = 40 } = {}) {
  const weights = await getScoreWeights();
  const growth = await growthEvents(forumLimit);
  const [communication, convergence] = [communicationStates(), Promise.resolve(detectConvergences(growth))];
  const [channels, convs] = await Promise.all([communication, convergence]);
  const convNumbers = new Set(convs.map((c) => c.number));
  for (const e of growth) e.score = scoreEvent(e, weights, convNumbers);
  const activity = await activityPulse(growth);
  return {
    convergence: convs.map((c) => ({ ...c, score: (weights.base["התכנסות"] || 50) + (weights.convergenceBonus || 50) })),
    growth: capAndSort(growth, growthLimit),
    communication: channels,
    activity,
    counts: {
      growth: growth.length, convergence: convs.length,
      channels: channels.length, channelUpdates24h: channels.reduce((a, c) => a + (c.count24h || 0), 0),
    },
    weights,
  };
}
