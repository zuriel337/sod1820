// 🧵 Web Worker לחיפוש ELS — רץ מחוץ ל-thread של הדפדפן, כך שהדף לעולם לא נתקע.
// מקבל בקשה (יחיד/אשכול), מריץ את הליבה המהירה (core.elsFind), פולט התקדמות, ומחזיר תוצאה.
// ה-letters נשמר במטמון לפי מפתח (torah/tanakh) כדי לא לשכפל 0.6–2.4MB בכל חיפוש.

import { elsFind } from "./core.js";

let cache = { key: null, letters: "" };

const centerOf = h => (Math.min(...h.positions) + Math.max(...h.positions)) / 2;

// אשכול-קרבה: מחפש כל מונח, בוחר עוגן (הנדיר), ומודד קרבה — כמו ElsGrid, אך ב-Worker.
function buildClusters(letters, terms, base, onProgress) {
  const perTerm = [];
  for (let i = 0; i < terms.length; i++) {
    const r = elsFind(letters, terms[i], { ...base, onProgress: p => onProgress(Math.round((i * 100 + p) / terms.length)) });
    perTerm.push({ term: r.target, hits: r.hits });
  }
  const allTerms = perTerm.map(p => p.term);
  const missing = perTerm.filter(p => p.hits.length === 0).map(p => p.term);
  if (missing.length) return { clusters: [], missing, terms: allTerms };
  const sorted = [...perTerm].sort((a, b) => a.hits.length - b.hits.length);
  const anchor = sorted[0], others = sorted.slice(1);
  const clusters = [];
  for (const aHit of anchor.hits.slice(0, 200)) {
    const aC = centerOf(aHit);
    const picks = [{ term: anchor.term, hit: aHit }];
    let ok = true;
    for (const o of others) {
      let best = null, bestD = Infinity;
      for (const h of o.hits) { const d = Math.abs(centerOf(h) - aC); if (d < bestD) { bestD = d; best = h; } }
      if (!best) { ok = false; break; }
      picks.push({ term: o.term, hit: best });
    }
    if (!ok) continue;
    const allPos = picks.flatMap(p => p.hit.positions);
    clusters.push({ picks, span: Math.max(...allPos) - Math.min(...allPos), anchorHit: aHit });
  }
  clusters.sort((a, b) => a.span - b.span);
  return { clusters: clusters.slice(0, 20), terms: allTerms, anchorTerm: anchor.term, missing: [] };
}

self.onmessage = (e) => {
  const { reqId, letters, lettersKey, kind, terms, opts } = e.data;
  if (letters != null) cache = { key: lettersKey, letters };   // רענון מטמון
  const L = cache.key === lettersKey ? cache.letters : (letters || "");
  const post = m => self.postMessage({ reqId, ...m });
  const base = {
    winFrom: opts.winFrom, winTo: opts.winTo, skipMin: opts.skipMin,
    skipMax: opts.skipMax === "inf" ? Infinity : opts.skipMax,   // "inf" = בלי הגבלה
    dir: opts.dir, cap: opts.cap ?? 5000,
    skipSet: opts.skipSet ? new Set(opts.skipSet) : null,
  };
  try {
    if (kind === "cluster") {
      const r = buildClusters(L, terms, base, pct => post({ type: "progress", pct }));
      post({ type: "done", mode: "cluster", ...r });
    } else {
      const r = elsFind(L, terms[0], { ...base, onProgress: pct => post({ type: "progress", pct }) });
      post({ type: "done", mode: "single", hits: r.hits, capped: r.capped, target: r.target, N: base.winTo - base.winFrom });
    }
  } catch (err) {
    post({ type: "error", message: String(err && err.message || err) });
  }
};
