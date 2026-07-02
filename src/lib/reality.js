// ===== דופק המציאות — חישוב טהור מעל «רמזים» (gallery_images, source='update') =====
// היחידה היא רמז: { primary_value (דומיננטי), all_values (תגיות), occurred_at, created_at, ocr_meta }.
// ציר הזמן = תאריך האירוע (occurred_at), נפילה לתאריך ההעלאה (created_at) — הכרעת המשתמש.
// הכל טהור (בלי רשת) כדי שניתן לחשב פעם אחת ולחלוק בין הזרם, הדופק ודף המספר.

const DAY = 86400000;
export const RARE_MAX = 2;            // «נדיר» = מספר שהופיע עד 2 פעמים בכל הזמן

// תאריך אפקטיבי של רמז (אירוע > העלאה) — לדופק/ציר-הזמן
export function effDate(h) {
  const s = h?.occurred_at || h?.created_at;
  const t = s ? +new Date(s) : 0;
  return Number.isFinite(t) ? t : 0;
}

// 🌊 «מתי נוסף לזרם» — קובע את סדר-הזרם (הכי-חדש-שנוסף ראשון). נפילה ל-created_at.
export function streamDate(h) {
  const s = h?.stream_at || h?.created_at;
  const t = s ? +new Date(s) : 0;
  return Number.isFinite(t) ? t : 0;
}
// תווית «נוסף לזרם»: היום / אתמול / תאריך (עברית)
export function streamLabel(h) {
  const t = streamDate(h);
  if (!t) return "";
  const d = new Date(t), now = new Date();
  const dayMs = 86400000;
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const diff = +startToday - +new Date(d).setHours(0, 0, 0, 0);
  if (diff <= 0) return "היום";
  if (diff <= dayMs) return "אתמול";
  try { return new Date(t).toLocaleDateString("he-IL", { day: "numeric", month: "long" }); } catch { return ""; }
}

// המספר הדומיננטי של הרמז (לספירת הדופק)
export function domNum(h) {
  return h?.primary_value ?? (h?.all_values || [])[0] ?? null;
}

// כל המספרים שהרמז נושא (דומיננטי + תגיות) — לסינון/חיפוש
export function hintNums(h) {
  const s = new Set();
  if (h?.primary_value != null) s.add(h.primary_value);
  for (const v of h?.all_values || []) if (v != null) s.add(v);
  return [...s];
}

// תגיות-נושא טקסטואליות (מ-OCR) — «אלוהים, טבע, אמת»
export function hintTags(h) {
  const e = h?.ocr_meta?.entities;
  return Array.isArray(e) ? e.filter(Boolean).slice(0, 6) : [];
}

// ספירה לכל מספר דומיננטי לכל חלון זמן + מגמה (השבוע מול השבוע הקודם)
export function computePulse(hints = []) {
  const now = Date.now();
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const tToday = +startToday, tWeek = now - 7 * DAY, tMonth = now - 30 * DAY, tPrevWeek = now - 14 * DAY;
  const m = new Map(); // value -> {today,week,month,all,prevWeek,last}
  for (const h of hints) {
    const v = domNum(h); if (v == null) continue;
    const d = effDate(h);
    const r = m.get(v) || { value: v, today: 0, week: 0, month: 0, all: 0, prevWeek: 0, last: 0 };
    r.all++;
    if (d >= tToday) r.today++;
    if (d >= tWeek) r.week++;
    if (d >= tMonth) r.month++;
    if (d >= tPrevWeek && d < tWeek) r.prevWeek++;
    if (d > r.last) r.last = d;
    m.set(v, r);
  }
  const rows = [...m.values()].map(r => ({ ...r, trend: computeTrend(r.week, r.prevWeek), score: realityScore(r) }));
  const by = key => [...rows].sort((a, b) => b[key] - a[key] || b.last - a.last);
  // ⚡ מזנק — לא בהכרח המוביל, אלא זה שמתעורר (העלייה הגדולה ביותר השבוע)
  const movers = rows.filter(r => r.week > 0 && (r.trend.fresh || (r.trend.pct != null && r.trend.pct > 0)))
    .sort((a, b) => (b.trend.pct ?? 9999) - (a.trend.pct ?? 9999));
  return {
    rows,
    byValue: m,
    hotToday: by("today").filter(r => r.today > 0),
    hotWeek: by("week").filter(r => r.week > 0),
    hotMonth: by("month").filter(r => r.month > 0),
    hotAll: by("all"),
    hotScore: by("score").filter(r => r.score > 0),  // «המספרים החיים ביותר»
    topMover: movers[0] || null,
    topRiser: movers[0] || null,
  };
}

// ציון מציאות — «כמה המספר חי» (לא רק נפוץ): מדגיש את ההווה על פני הארכיון
export function realityScore(r) {
  return (r?.week || 0) * 3 + (r?.month || 0) * 1;
}

// מגמה: השבוע מול השבוע הקודם → כיוון + אחוז
export function computeTrend(week, prevWeek) {
  if (!week && !prevWeek) return { dir: "flat", pct: null };
  if (!prevWeek) return { dir: "up", pct: null, fresh: true };     // חדש — אין בסיס להשוואה
  const pct = Math.round(((week - prevWeek) / prevWeek) * 100);
  return { dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat", pct };
}

export function trendLabel(trend) {
  if (!trend) return "";
  if (trend.fresh) return "🆕 חדש";
  if (trend.pct == null || trend.dir === "flat") return "";
  const arrow = trend.dir === "up" ? "📈" : "📉";
  const sign = trend.pct > 0 ? "+" : "";
  return `${arrow} ${sign}${trend.pct}%`;
}

// סינון הזרם לפי שבב פעיל. value=מספר יחיד; values=סט מספרים («גלריית רמזים» שמורה).
export function filterHints(hints = [], { value = null, values = null, period = null, rare = false } = {}) {
  let arr = hints;
  if (value != null) arr = arr.filter(h => hintNums(h).includes(value));
  if (values && values.length) { const s = new Set(values); arr = arr.filter(h => hintNums(h).some(n => s.has(n))); }
  if (period) {
    const now = Date.now();
    const cut = period === "today" ? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return +d; })()
      : period === "week" ? now - 7 * DAY
      : period === "month" ? now - 30 * DAY : 0;
    arr = arr.filter(h => effDate(h) >= cut);
  }
  if (rare) {
    const cnt = new Map();
    for (const h of hints) { const v = domNum(h); if (v != null) cnt.set(v, (cnt.get(v) || 0) + 1); }
    arr = arr.filter(h => { const v = domNum(h); return v != null && (cnt.get(v) || 0) <= RARE_MAX; });
  }
  // 🌊 סדר הזרם: הכי-חדש-שנוסף-לזרם ראשון (בקשת צוריאל). נפילה: אירוע → העלאה.
  return [...arr].sort((a, b) =>
    (streamDate(b) - streamDate(a)) ||
    (effDate(b) - effDate(a)) ||
    (new Date(b.created_at) - new Date(a.created_at))
  );
}

// פירוק תאריך קצר לתצוגה
export function shortDate(h) {
  const s = h?.occurred_at || h?.created_at;
  if (!s) return "";
  try { return new Date(s).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

// דופק של מספר יחיד (לדף /number/:n)
export function pulseForValue(hints = [], value) {
  const pulse = computePulse(hints);
  const r = pulse.byValue.get(value);
  if (!r) return { today: 0, week: 0, month: 0, all: 0, score: 0, trend: { dir: "flat", pct: null } };
  return { today: r.today, week: r.week, month: r.month, all: r.all, score: realityScore(r), trend: computeTrend(r.week, r.prevWeek) };
}
