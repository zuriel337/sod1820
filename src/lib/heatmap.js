// ===== מפת חום — חישוב טהור (עדשה על העץ האחד) =====
// שלוש מפות חום מעל אותם נתונים, בלי טבלה חדשה — רק שאילתה על הגרף:
//   1. חום נתונים   — אילו מספרים "חמים" (ציון מציאות + צפיות) → מפנה ל-/number/:n.
//   2. חום קלנדרי   — פעילות לאורך זמן (occurred_at) בסגנון GitHub contributions.
//   3. חום מדורים   — אילו אזורי-אתר נצפים הכי הרבה (visitor_events.section).
// הכל טהור (בלי רשת) כדי שאפשר לחשב פעם אחת ולחלוק בין הדשבורד לעדשות הציבוריות.

import { effDate } from "./reality.js";

const DAY = 86400000;

// ── סקאלת חום: t∈[0,1] → צבע (כחול-קר → זהב → אדום-חם), בכבוד לפלטת הזהב של האתר.
export function heatColor(t) {
  const x = Math.max(0, Math.min(1, Number(t) || 0));
  if (x <= 0) return "rgba(212,175,55,0.06)"; // כמעט ריק — רמז עדין של זהב
  // hue: 210 (כחול) → 40 (זהב) → 12 (אדום-חם)
  const hue = x < 0.5 ? 210 - (210 - 40) * (x / 0.5) : 40 - (40 - 12) * ((x - 0.5) / 0.5);
  const light = 30 + x * 24;
  return `hsl(${hue} 82% ${light}%)`;
}

// גרסת אלפא על בסיס זהב — לשכבת-על שקופה מעל רקע כהה (לרשת הקלנדר).
export function heatAlpha(t) {
  const x = Math.max(0, Math.min(1, Number(t) || 0));
  if (x <= 0) return "rgba(212,175,55,0.05)";
  return `rgba(212,175,55,${0.14 + x * 0.74})`;
}

const ymd = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

// ── חום קלנדרי: רשת שבועות (עמודה=שבוע, שורה=יום) מפריטים עם accessor לתאריך.
// dateOf מאפשר להזין רמזים (effDate), פוסטים (date), אירועים (occurred_at) וכו'.
export function computeCalendar(items = [], { days = 364, dateOf = effDate } = {}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = +today;
  const start = end - (days - 1) * DAY;
  const counts = new Map(); // "y-m-d" -> count
  let max = 0, total = 0;
  for (const it of items) {
    const t = dateOf(it);
    if (!t || t < start || t > end + DAY) continue;
    const d = new Date(t); d.setHours(0, 0, 0, 0);
    const key = ymd(+d);
    const n = (counts.get(key) || 0) + 1;
    counts.set(key, n); total++;
    if (n > max) max = n;
  }
  // יישור לשבועות: מתחילים מהראשון של השבוע שמכיל את start (יום ראשון=0).
  const first = new Date(start);
  first.setDate(first.getDate() - first.getDay());
  const cells = [];
  for (let t = +first; t <= end; t += DAY) {
    const d = new Date(t);
    const inRange = t >= start && t <= end;
    const count = inRange ? (counts.get(ymd(t)) || 0) : null;
    const level = count && max ? Math.min(4, Math.ceil((count / max) * 4)) : 0;
    cells.push({ t, dow: d.getDay(), count, level, intensity: count && max ? count / max : 0 });
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { weeks, max, total, start, end };
}

// ── חום נתונים: ממזג ציון-מציאות (כמה המספר "חי") עם צפיות בדף המספר.
// pulseRows: מ-computePulse(...).rows  ·  viewCounts: { [number]: views } מ-visitor_events.
export function computeNumberHeat(pulseRows = [], viewCounts = {}) {
  const map = new Map();
  for (const r of pulseRows) {
    if (r?.value == null) continue;
    map.set(r.value, { value: r.value, score: r.score || 0, all: r.all || 0, week: r.week || 0, views: 0 });
  }
  for (const [k, v] of Object.entries(viewCounts || {})) {
    const num = Number(k);
    if (!Number.isFinite(num)) continue;
    const e = map.get(num) || { value: num, score: 0, all: 0, week: 0, views: 0 };
    e.views = Number(v) || 0;
    map.set(num, e);
  }
  const rows = [...map.values()];
  const maxScore = Math.max(1, ...rows.map(r => r.score));
  const maxViews = Math.max(1, ...rows.map(r => r.views));
  for (const r of rows) {
    // 60% פעילות-מציאות (כמה המספר חי בעולם) + 40% עניין-גולשים (צפיות).
    r.heat = (r.score / maxScore) * 0.6 + (r.views / maxViews) * 0.4;
  }
  return rows.sort((a, b) => b.heat - a.heat);
}

// ── חום מדורים: ממיר ספירות מדורים לרשימה עם heat מנורמל (0..1).
export function computeSectionHeat(counts = {}) {
  const rows = Object.entries(counts || {}).map(([section, count]) => ({ section, count: Number(count) || 0 }));
  const max = Math.max(1, ...rows.map(r => r.count));
  for (const r of rows) r.heat = r.count / max;
  return rows.sort((a, b) => b.count - a.count);
}

// שם קריא בעברית למדור (visitor_events.section) — לתצוגה במפת חום המדורים.
const SECTION_LABELS = {
  home: "דף הבית", number: "דף מספר", "beit-midrash": "בית המדרש",
  "reality-stream": "זרם המציאות", home_reality: "מציאות בבית", convergence: "התכנסות",
  share: "שיתופים", app: "אפליקציה (PWA)", stream_switch: "מתג זרם", topic: "נושא/התכנסות",
};
export const sectionLabel = s => SECTION_LABELS[s] || s || "—";
