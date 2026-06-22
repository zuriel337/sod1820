import { supabase } from "./supabase.js";

// ===== מנוע נדירות ל«הצלבה הנסתרת» — נדירות מבוססת-נתונים =====
// העיקרון (לפי צוריאל): לא לספור שיטות אלא למדוד נדירות. חוזק התאמה בשיטה ∝ 1/גודל-משפחת-הערך
// (כמה ביטויים חולקים את הערך באותה שיטה, מ-bidim). + קיפול זוגות-גדול (לא ראיה בלתי-תלויה).

// זוגות גדול↔בסיס (כמו ב-convergence_meter): «גדול» כמעט נגזרת של הבסיס — נספר כאות אחת.
const GADOL_BASE = { "גדול": "רגיל", "ריבוע גדול": "ריבוע", "משולש גדול": "קדמי", "הכפלה גדולה": "הכפלה" };
const ANCHOR_SET = new Set([1820, 776, 358, 424, 604, 26, 86, 314, 543, 91, 13, 1237, 541, 137, 248, 611, 1202, 318]);

// השיטות הבלתי-תלויות: מסירים «גדול» אם שיטת-הבסיס שלו כבר נוכחת בהצלבה.
export function independentMethods(methods = []) {
  const present = new Set(methods.map(m => m.label));
  return methods.filter(m => !(GADOL_BASE[m.label] && present.has(GADOL_BASE[m.label])));
}

// נקודות נדירות לפי גודל משפחת-הערך: קטן = נדיר = הרבה נקודות.
function methodPoints(size) {
  if (size == null) return 6;
  if (size <= 3) return 30;
  if (size <= 6) return 22;
  if (size <= 12) return 15;
  if (size <= 30) return 9;
  if (size <= 80) return 4;
  return 2;
}

// אוסף את כל זוגות (label,value) מההצלבות — כדי להביא גדלי-משפחה בשאילתה אחת.
export function collectPairs(crosses = []) {
  const seen = new Set(), pairs = [];
  for (const c of crosses) for (const m of (c.methods || [])) {
    const k = `${m.label}|${m.value}`;
    if (!seen.has(k)) { seen.add(k); pairs.push({ method: m.label, value: m.value }); }
  }
  return pairs;
}

// מביא גדלי-משפחה ל-(method,value) מ-bidim. מחזיר map: "method|value" → מספר ביטויים.
export async function fetchFamilySizes(pairs = []) {
  const out = {};
  if (!supabase || !pairs.length) return out;
  const values = [...new Set(pairs.map(p => p.value).filter(v => v != null))];
  if (!values.length) return out;
  try {
    const { data } = await supabase.from("bidim").select("method,phrase,value").in("value", values).limit(20000);
    const sets = {};
    (data || []).forEach(r => { const k = `${r.method}|${r.value}`; (sets[k] ||= new Set()).add(r.phrase); });
    for (const k of Object.keys(sets)) out[k] = sets[k].size;
  } catch { /* ignore — נדירות אופציונלית */ }
  return out;
}

// מחשב «מד נדירות» 0–100 להצלבה אחת. trivial = פחות מ-2 שיטות בלתי-תלויות (רק רגיל/רגיל+גדול).
export function scoreCross(cross, sizeMap = {}) {
  const indep = independentMethods(cross.methods || []);
  let pts = 0, rarest = Infinity;
  for (const m of indep) {
    const size = sizeMap[`${m.label}|${m.value}`];
    pts += methodPoints(size);
    if (size != null && size < rarest) rarest = size;
  }
  if (indep.some(m => ANCHOR_SET.has(m.value))) pts += 10; // עוגן קדוש = בונוס
  const score = Math.max(0, Math.min(100, Math.round(pts)));
  return { score, indepCount: indep.length, rarestSize: isFinite(rarest) ? rarest : null, trivial: indep.length < 2 };
}

// מדרג רשימת הצלבות לפי נדירות (גבוה→נמוך). מצרף .rarity לכל אחת.
export function rankByRarity(crosses = [], sizeMap = {}) {
  return crosses
    .map(c => ({ ...c, rarity: scoreCross(c, sizeMap) }))
    .sort((a, b) => b.rarity.score - a.rarity.score);
}
