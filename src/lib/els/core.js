// ⚡ ליבת חיפוש דילוגי-אותיות (ELS) מהירה — טהורה, בלי React, בטוחה לריצה ב-Web Worker.
// האלגוריתם: «שתי האותיות הנדירות». במקום לסרוק כל דילוג (איטי ולא מוגבל), בוחרים את
// שתי אותיות-המטרה הנדירות ביותר, ומכל זוג-מיקומים שלהן *מחשבים את הדילוג ישירות*
// ואז מאמתים את שאר האותיות. כך אפשר לחפש **בלי הגבלת-מרחק** ועדיין מהר, כי מספר
// המועמדים נקבע ע"י האותיות הנדירות ולא ע"י טווח-הדילוג.

export const ELS_FINALS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };

// נרמול: אותיות עבריות בלבד, סופיות → רגילות (הרווח שובר רצף — נשמר רק א-ת).
export function normalize(s) {
  const out = [];
  for (const ch of s || "") {
    if (ch >= "א" && ch <= "ת") out.push(ELS_FINALS[ch] || ch);
  }
  return out.join("");
}

// חיפוש בינארי — האינדקס הראשון ב-arr (ממוין עולה) שערכו ≥ x
function lowerBound(arr, x) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < x) lo = mid + 1; else hi = mid; }
  return lo;
}

// סריקה קדימה של המטרה tt (מערך-אותיות) בטווח [winFrom,winTo). דוחף מופעים ל-hits
// בהתאם ל-orient: 'fwd' → dir +1 ישיר · 'back' → tt הוא היפוך-המטרה, ממופה ל-dir −1.
function findForward(letters, tt, winFrom, winTo, skipMin, skipMax, cap, skipSet, hits, orient, state, onProgress, progBase, progSpan) {
  const L = tt.length;
  const need = new Set(tt);
  const posOf = new Map();
  for (const ch of need) posOf.set(ch, []);
  for (let idx = winFrom; idx < winTo; idx++) { const arr = posOf.get(letters[idx]); if (arr) arr.push(idx); }
  for (const ch of need) if (posOf.get(ch).length === 0) return;   // אות חסרה → אין מופעים

  // עוגן = שתי אותיות-המטרה הנדירות ביותר (הכי מעט מיקומים) → הכי מעט זוגות לבדוק
  const order = [];
  for (let k = 0; k < L; k++) order.push(k);
  order.sort((a, b) => posOf.get(tt[a]).length - posOf.get(tt[b]).length);
  let i = order[0], j = order[1];
  if (i > j) { const tmp = i; i = j; j = tmp; }
  const g = j - i;                       // המרחק באותיות בין שני העוגנים (g≥1)
  const Pi = posOf.get(tt[i]), Pj = posOf.get(tt[j]);
  const total = Pi.length || 1;
  const progEvery = Math.max(1, Math.floor(total / 40));

  for (let a = 0; a < Pi.length; a++) {
    if (state.capped) return;
    const pi = Pi[a];
    const lo = pi + g * skipMin, hi = pi + g * skipMax;   // טווח מיקומי-pj התקפים
    for (let b = lowerBound(Pj, lo); b < Pj.length; b++) {
      const pj = Pj[b];
      if (pj > hi) break;
      const d = pj - pi;
      if (d % g !== 0) continue;                          // הדילוג חייב להיות שלם
      const skip = d / g;
      if (skipSet && !skipSet.has(skip)) continue;        // תבנית (פיבונאצ׳י/ראשוניים/חזקות-2)
      const start = pi - i * skip;                        // מיקום האות הראשונה של tt
      const end = start + (L - 1) * skip;
      if (start < winFrom || end >= winTo) continue;
      let ok = true;                                      // אימות שאר האותיות
      for (let k = 0; k < L; k++) { if (letters[start + k * skip] !== tt[k]) { ok = false; break; } }
      if (!ok) continue;
      // בניית המופע במונחי המטרה המקורית
      if (orient === "back") {
        // tt = היפוך-המטרה. מיקום t[0] = start+(L-1)·skip; המילה יורדת אחורה.
        const s0 = start + (L - 1) * skip;
        const positions = [];
        for (let k = 0; k < L; k++) positions.push(s0 - k * skip);
        hits.push({ skip, dir: -1, start: s0, positions, mismatches: 0 });
      } else {
        const positions = [];
        for (let k = 0; k < L; k++) positions.push(start + k * skip);
        hits.push({ skip, dir: 1, start, positions, mismatches: 0 });
      }
      if (hits.length >= cap) { state.capped = true; return; }
    }
    if (onProgress && a % progEvery === 0) onProgress(progBase + Math.round((a / total) * progSpan));
  }
}

// חיפוש ELS מהיר. opts: { winFrom, winTo, skipMin, skipMax(Infinity=בלי הגבלה),
//   dir('fwd'|'back'|'both'), cap, skipSet(Set|null — לתבניות), onProgress(pct) }
export function elsFind(letters, targetRaw, opts = {}) {
  const t = typeof targetRaw === "string" ? normalize(targetRaw) : targetRaw;
  const L = t.length;
  const N = letters.length;
  const winFrom = Math.max(0, opts.winFrom ?? 0);
  const winTo = Math.min(N, opts.winTo ?? N);
  const cap = opts.cap ?? 5000;
  const onProgress = opts.onProgress || null;
  const skipSet = opts.skipSet || null;
  const dir = opts.dir || "both";
  const hits = [];
  if (L < 2 || winTo - winFrom < 2) return { hits, capped: false, target: t };

  const maxSkip = Math.floor((winTo - winFrom - 1) / (L - 1)) || 1;
  const skipMin = Math.max(1, Math.floor(opts.skipMin ?? 1));
  const skipMaxRaw = opts.skipMax == null ? maxSkip : opts.skipMax;
  const skipMax = Number.isFinite(skipMaxRaw) ? Math.min(maxSkip, Math.floor(skipMaxRaw)) : maxSkip;
  if (skipMax < skipMin) return { hits, capped: false, target: t };

  const state = { capped: false };
  const rev = () => { const a = t.split(""); a.reverse(); return a.join(""); };
  if (dir === "fwd") {
    findForward(letters, t, winFrom, winTo, skipMin, skipMax, cap, skipSet, hits, "fwd", state, onProgress, 0, 100);
  } else if (dir === "back") {
    findForward(letters, rev(), winFrom, winTo, skipMin, skipMax, cap, skipSet, hits, "back", state, onProgress, 0, 100);
  } else {
    findForward(letters, t, winFrom, winTo, skipMin, skipMax, cap, skipSet, hits, "fwd", state, onProgress, 0, 50);
    findForward(letters, rev(), winFrom, winTo, skipMin, skipMax, cap, skipSet, hits, "back", state, onProgress, 50, 50);
  }
  hits.sort((x, y) => (x.mismatches - y.mismatches) || (Math.abs(x.skip) - Math.abs(y.skip)));
  return { hits, capped: state.capped, target: t };
}
