// 🫧 מערכת-הבועות המשותפת (עץ אחד) — מספרי-רמז כבועות זהב.
// בשימוש בסרגל-הזמן (ArchivePage), בזרם המציאות (RealityWorld) ובכל מקום עתידי.

// 🔗 זוגות «כרוכים» — מספרים שתמיד באים יחד מוצגים כבועה אחת.
// 14(דוד)+45(גאולה) = חידוש הליבה של צוריאל (תמיד יחד).
export const BUBBLE_PAIRS = [[14, 45]];
const PAIR_OF = (() => { const m = new Map(); for (const p of BUBBLE_PAIRS) for (const n of p) m.set(n, p); return m; })();

// 🔥 מספרי-ליבה — בועה שלהם מקבלת הילת-חום מיוחדת.
export const CORE_BUBBLE = new Set([1820, 358, 26, 14, 45, 1237, 541, 776]);

// ערך-ראשי → תיאור-בועה ({key,label,nums}). זוג מתמזג לבועה אחת.
export function bubbleKeyFor(pv) {
  const pair = PAIR_OF.get(pv);
  if (pair) return { key: pair.join("+"), label: pair.join("+"), nums: pair };
  return { key: String(pv), label: String(pv), nums: [pv] };
}

// כמו computeBubbles אך מקבל ספירות מוכנות [{value,count}] (מאגרגציית-מסד) — מאחד זוגות.
export function bubblesFromCounts(rows, { limit = 16 } = {}) {
  const m = new Map();
  for (const r of rows || []) {
    const pv = Number(r.value); if (!pv) continue;
    const bk = bubbleKeyFor(pv);
    const e = m.get(bk.key) || { ...bk, count: 0 }; e.count += Number(r.count) || 0; m.set(bk.key, e);
  }
  return [...m.values()]
    .map(e => ({ ...e, hot: e.nums.some(n => CORE_BUBBLE.has(n)) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// רשימת ערכי-ראשי → בועות מצרפיות ממוינות (גדול→קטן), עם דגל-חום.
export function computeBubbles(primaryValues, { limit = 16 } = {}) {
  const m = new Map();
  for (const raw of primaryValues) {
    const pv = Number(raw); if (!pv) continue;
    const bk = bubbleKeyFor(pv);
    const e = m.get(bk.key) || { ...bk, count: 0 }; e.count++; m.set(bk.key, e);
  }
  return [...m.values()]
    .map(e => ({ ...e, hot: e.nums.some(n => CORE_BUBBLE.has(n)) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
