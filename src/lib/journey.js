// ===== מנוע «מסע ההתכנסות» — עזר טהור (value-as-trunk) =====
// המסע מטייל בתוך משפחת-הערך (כל הביטויים ששווים לערך אחד), ובסוף חושף את הגזע המספרי.
// מקור הנתונים: bidim (דרך getValuePhraseList/getPhraseValueFamilies ב-supabase.js).

export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export const isNumeric = s => /^\d+$/.test(String(s ?? "").trim());

// ה-world השכיח בתחנות = «השדה המשותף» (נתונים בלבד, בלי פרשנות).
export function dominantWorld(stations) {
  const count = {};
  for (const s of stations || []) { const w = s?.world; if (w) count[w] = (count[w] || 0) + 1; }
  let best = null, bestC = 0;
  for (const [w, c] of Object.entries(count)) if (c > bestC) { best = w; bestC = c; }
  return best;
}
