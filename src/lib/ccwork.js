// src/lib/ccwork.js — CC-1.3 · לוגיקת עמדת-העבודה (טהורה, READ-ONLY · אין WRITE · אין engine).
// כל הפונקציות כאן *נגזרות* מהשדות הקיימים של הפריט — לא הופכות Claim→Fact ולא מקדמות Canonical.
import { TIER } from "./discovery.js"; // רובד-ניווט בלבד (ROUTES מוגדר כאן).

// ── היררכיית-כתבים (תצוגה בלבד — לא קנוני) ─────────────────────────────────
// דרישת צוריאל (13.8.2026): כתבים-מרכזיים ראשונים בסדר הזה, שאר-המקורות אחריהם.
export const CORE_WRITERS = ["צבי (OPOC)", "ציון סיבוני", "שמעון חיימוב", "יניב לוי", "כריסטינה", "יצחק שחר קנדרו", "סלי מור"];
const CORE_FIRST = CORE_WRITERS.map((s) => s.split(" ")[0]); // התאמה-רכה לפי הטוקן הראשון (צבי/ציון/שמעון…)
export function writerRank(name) {
  if (!name) return 999;
  const i = CORE_WRITERS.indexOf(name);
  if (i >= 0) return i;
  const t = String(name).split(" ")[0];
  const j = CORE_FIRST.indexOf(t);
  return j >= 0 ? j : 500; // כתב-מרכזי (אפילו בגרסת-שם אחרת) לפני שאר-המקורות
}
export function orderWriters(names) {
  return [...new Set((names || []).filter(Boolean))].sort((a, b) => writerRank(a) - writerRank(b) || String(a).localeCompare(b, "he"));
}

// ── ניתוב (עדשות עץ-אחד) — לאן חומר יכול ללכת מכל רובד. תצוגה/הכוונה בלבד ──
export const ROUTES = {
  RAW: [["VAULT", "חילוץ→מועמד", "#b08bd8"]],
  VAULT: [["CORE", "קידום · Human-Gate", "#c79a2e"], ["Atlas", "יחס", "#3ea6ff"], ["שכבת-הציר", "זמן/אירוע", "#8458ff"]],
  CORE: [["Atlas", "יחס", "#3ea6ff"], ["שכבת-הציר", "זמן/אירוע", "#8458ff"]],
  CANONICAL: [["Atlas", "יחס", "#3ea6ff"]],
};
export const destinations = (it) => (ROUTES[it?.tier?.key] || []).map((r) => r[0]);

// רובד-נסיגה לפריטים שלא נשלף להם tier (פורום/וואטסאפ/פוסט) — נגזר מהשדות הקיימים.
export function fallbackTier(it = {}) {
  if (it.tier) return it.tier;
  if (it.published || it.status === "published" || it.status === "approved") return TIER.CANONICAL;
  if (it.inGraph) return TIER.CORE;
  if (it.status === "candidate" || it.engineVerified) return TIER.VAULT;
  return TIER.RAW;
}

export const itemValue = (it) => (it && it.values && it.values.length ? it.values[0] : it && it.value);

// ── סטטוס מנורמל לתצוגה/סינון (נגזר — לא משנה אמת) ─────────────────────────
export function normStatus(it = {}) {
  if (it.handled) return { key: "handled", he: "טופל (בתור)", c: "#8a8a95" };
  if (it.status === "candidate") return { key: "candidate", he: "מועמד · ממתין-שער", c: "#c79a2e" };
  if (it.status && it.status !== "candidate") return { key: it.status, he: it.status, c: "#b08bd8" };
  if (it.inGraph) return { key: "in_graph", he: "מחובר-לגרף", c: "#4caf7d" };
  if (it.published) return { key: "published", he: "פורסם/קיים", c: "#b08bd8" };
  if (it.engineVerified) return { key: "engine", he: "אומת-מנוע (לא-שער)", c: "#4caf7d" };
  return { key: "raw", he: "חומר-מקור", c: "#8a8a95" };
}
// אוסף-סטטוסים מרשימה (לבניית dropdown-סינון).
export function statusOptions(list) {
  const m = new Map();
  for (const it of (list || [])) { const s = normStatus(it); if (!m.has(s.key)) m.set(s.key, s); }
  return [...m.values()];
}

// ── חילוץ-מבנה מהטקסט (מחרוזת טהורה — פרשנות-מבנה, לא ערך/עובדה) ────────────
// ר"ת = אות ראשונה בכל מילה · ס"ת = אות אחרונה (RAW + מנורמל מסופיות, לצורך קריאה/אנגרמה).
// ⛔ לא מחשב גימטריה ולא מאשר "קריאה" כאמת — מציג את האותיות בלבד כמועמד-פרשנות.
const HEB = /[א-תך-ן]/;
const FIN = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
export function structuralExtract(raw) {
  const words = String(raw || "").replace(/[^א-ת\s]/g, " ").split(/\s+/).filter((w) => HEB.test(w));
  if (words.length < 2) return null;
  const rashei = words.map((w) => w[0]).join("");
  const sofei = words.map((w) => w[w.length - 1]).join("");
  const sofeiNorm = words.map((w) => { const c = w[w.length - 1]; return FIN[c] || c; }).join("");
  return { words: words.length, rashei, sofei, sofeiNorm };
}

// ── מצב-פעולה מדויק (מחליף «לא בוצע») ──────────────────────────────────────
// s: done (מבוצע עכשיו) · pending (Human-Gate · פאזה 3) · blocked (לא-ניתן) · missing (חסר-מידע).
export function actionState(it = {}, action) {
  const v = itemValue(it);
  const dests = destinations(it);
  switch (action) {
    case "close":
      return it.handled
        ? { s: "done", why: "כבר סגור בתור — אפשר «בטל סגירה»" }
        : { s: "done", why: "סגירה-מהתור אישית (research_items) — לא נוגע בסטטוס-המקור" };
    case "engine":
      return it.engineVerified ? { s: "done", why: "כבר אומת-מנוע (חישובי)" }
        : (it.values?.length || v != null) ? { s: "pending", why: "בדיקת-מנוע = פאזה 3 (Human-Gate)" }
        : { s: "missing", why: "אין ערך/ביטוי לחילוץ" };
    case "atlas":
      if (!dests.includes("Atlas")) return { s: "blocked", why: `רובד ${it.tier?.he || "—"} לא מנתב ל-Atlas` };
      return (it.values?.length > 1 || it.hasCross) ? { s: "pending", why: "ניתוב-Atlas = Human-Gate (פאזה 3)" }
        : { s: "missing", why: "יחס/ערך-שני להצלבה" };
    case "axis":
      if (!dests.includes("שכבת-הציר")) return { s: "blocked", why: `רובד ${it.tier?.he || "—"} לא מנתב לשכבת-הציר` };
      return it.ts ? { s: "pending", why: "אירוע-ציר = Human-Gate (פאזה 3)" } : { s: "missing", why: "תאריך-אירוע" };
    case "core":
      return it.tier?.key === "VAULT" ? { s: "pending", why: "קידום-לגרף = Human-Gate (פאזה 3)" }
        : { s: "blocked", why: "קידום מתאפשר רק מרובד מועמד (VAULT)" };
    case "notarikon":
      return structuralExtract(it.raw) ? { s: "done", why: "חילוץ-מבנה (ר״ת/ס״ת) מוצג כפרשנות — לא עובדה" }
        : { s: "missing", why: "פחות משתי מילים — אין נוטריקון" };
    default:
      return { s: "blocked", why: "—" };
  }
}
export const ACT_STATE = {
  done: { t: "בוצע", c: "#4caf7d" },
  pending: { t: "ממתין לאישור", c: "#c79a2e" },
  blocked: { t: "לא ניתן", c: "#8a8a95" },
  missing: { t: "חסר מידע", c: "#e0563a" },
};

// «מה חסר» לתווית-השורה — הפעולה-החסרה הראשונה, אחרת השלב-הבא במסלול.
export function whatMissing(it = {}) {
  if (it.handled) return "—";
  for (const a of ["engine", "atlas", "axis"]) {
    const r = actionState(it, a);
    if (r.s === "missing") return r.why.slice(0, 26);
  }
  const st = normStatus(it).key;
  if (st === "raw") return "חילוץ→מועמד";
  if (st === "candidate") return "שער-אנושי";
  return "—";
}

// מיון-רשימה (חדש/ישן/ערך). ברירת-מחדל: חדש.
export function sortItems(list, sort) {
  const a = [...(list || [])];
  if (sort === "old") a.sort((x, y) => new Date(x.ts || 0) - new Date(y.ts || 0));
  else if (sort === "value") a.sort((x, y) => ((itemValue(y) ?? -1) - (itemValue(x) ?? -1)));
  else a.sort((x, y) => new Date(y.ts || 0) - new Date(x.ts || 0));
  return a;
}

// 🎛️ Pass 1B (COMMAND_CENTER_ATTENTION_CLOSURE §3) — digest חסום/דטרמיניסטי של תור-הקשב הנוכחי,
// לשליחה לרזיאל (askRazielAttention). לא שולח 196 פריטים גולמיים — סופר/מקבץ את כולם (אפס-חיתוך-
// שקט: by_source/by_tier/top_writers/top_values/duplicate_flagged_count מחושבים על כל items),
// ורק דוגמית-מוצגת (sample) מוגבלת ל-maxSample. items = מערך אחיד (key/source/srckind/writer/
// rawAuthor/author/value/values/tier/ts/raw/title/handled/engineVerified/flag/__isSelf) — בדיוק
// הצורה שכבר נבנית ב-WarRoomTab (normForum/normWa/normPost/normCandidate/normChannel + withWriter
// + withH). reuse-first: אין כאן fetch/DB — טהור-קלט→פלט מעל מה שכבר טעון.
export function buildAttentionDigest(items, { mode, filters, hideSelf, maxSample = 40, maxTop = 12 } = {}) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const bySource = {}, byTier = {};
  const writerCounts = {}, valueCounts = {};
  let dupCount = 0;
  const bump = (obj, k) => { if (!k) return; obj[k] = (obj[k] || 0) + 1; };
  for (const it of list) {
    bump(bySource, it.srckind || it.source || "אחר");
    bump(byTier, it?.tier?.he || it?.tier?.key || "—");
    const writer = it?.writer?.canonical?.display_name || it?.writer?.contributor?.display_name || it.rawAuthor || it.author || "לא-מזוהה";
    bump(writerCounts, writer);
    const val = it.value ?? (Array.isArray(it.values) && it.values.length ? it.values[0] : null);
    if (val != null) {
      const k = String(val);
      if (!valueCounts[k]) valueCounts[k] = { count: 0, sample: (it.raw || it.title || "").slice(0, 60) };
      valueCounts[k].count++;
    }
    if (it.flag === "dup") dupCount++;
  }
  const topN = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
  const topWriters = topN(writerCounts, maxTop).map(([writer, count]) => ({ writer, count }));
  const topValues = Object.entries(valueCounts).sort((a, b) => b[1].count - a[1].count).slice(0, maxTop)
    .map(([value, d]) => ({ value, count: d.count, sample: d.sample }));
  const sample = list.slice(0, maxSample).map(it => ({
    id: it.key, source: it.srckind || it.source, tier: it?.tier?.he || it?.tier?.key,
    writer: it?.writer?.canonical?.display_name || it?.writer?.contributor?.display_name || it.rawAuthor || it.author,
    value: it.value ?? (Array.isArray(it.values) && it.values.length ? it.values[0] : null),
    title: (it.raw || it.title || "").slice(0, 90),
    dup: it.flag === "dup", handled: !!it.handled,
  }));
  return {
    total, mode: mode || "now", filters_active: Object.keys(filters || {}), self_hidden: !!hideSelf,
    by_source: bySource, by_tier: byTier, top_writers: topWriters, top_values: topValues,
    duplicate_flagged_count: dupCount, sample_count: sample.length, sample,
  };
}
