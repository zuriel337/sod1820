// 🎛️ מנהל ה-Worker של חיפוש ה-ELS — מחיים Worker יחיד, מזרים התקדמות, ומבטל חיפוש
// קודם ע"י terminate (כי אי אפשר לעצור לולאה סינכרונית ב-Worker אחרת). fallback: אם אין
// תמיכה ב-Worker (סביבה חריגה) — מריצים על ה-thread הראשי (עדיין מהיר, עלול לחסום לרגע).

import { elsFind } from "./core.js";

export function createElsRunner() {
  let worker = null, sentKey = null, cur = null, seq = 0, broken = false;

  function ensure() {
    if (worker || broken) return;
    try {
      worker = new Worker(new URL("./elsWorker.js", import.meta.url), { type: "module" });
      sentKey = null;
      worker.onmessage = (e) => {
        const m = e.data;
        if (!cur || m.reqId !== cur.reqId) return;
        if (m.type === "progress") { cur.onProgress?.(m.pct); return; }
        const c = cur; cur = null;
        if (m.type === "error") c.reject(new Error(m.message));
        else c.resolve(m);
      };
      worker.onerror = () => { broken = true; try { worker.terminate(); } catch { /**/ } worker = null;
        if (cur) { const c = cur; cur = null; c.reject(new Error("worker-error")); } };
    } catch { broken = true; }
  }

  // fallback ראשי (בלי Worker) — עדיין האלגוריתם המהיר, פשוט על ה-thread הראשי.
  async function runMain({ letters, kind, terms, opts, onProgress }) {
    const base = {
      winFrom: opts.winFrom, winTo: opts.winTo, skipMin: opts.skipMin,
      skipMax: opts.skipMax === "inf" ? Infinity : opts.skipMax,
      dir: opts.dir, cap: opts.cap ?? 5000, skipSet: opts.skipSet ? new Set(opts.skipSet) : null,
    };
    await new Promise(r => setTimeout(r, 0));
    if (kind === "cluster") {
      const centerOf = h => (Math.min(...h.positions) + Math.max(...h.positions)) / 2;
      const perTerm = terms.map(t => { const r = elsFind(letters, t, base); return { term: r.target, hits: r.hits }; });
      const allTerms = perTerm.map(p => p.term);
      const missing = perTerm.filter(p => p.hits.length === 0).map(p => p.term);
      if (missing.length) return { mode: "cluster", clusters: [], missing, terms: allTerms };
      const sorted = [...perTerm].sort((a, b) => a.hits.length - b.hits.length);
      const anchor = sorted[0], others = sorted.slice(1), clusters = [];
      for (const aHit of anchor.hits.slice(0, 200)) {
        const aC = centerOf(aHit); const picks = [{ term: anchor.term, hit: aHit }]; let ok = true;
        for (const o of others) { let best = null, bd = Infinity; for (const h of o.hits) { const d = Math.abs(centerOf(h) - aC); if (d < bd) { bd = d; best = h; } } if (!best) { ok = false; break; } picks.push({ term: o.term, hit: best }); }
        if (!ok) continue;
        const allPos = picks.flatMap(p => p.hit.positions);
        clusters.push({ picks, span: Math.max(...allPos) - Math.min(...allPos), anchorHit: aHit });
      }
      clusters.sort((a, b) => a.span - b.span);
      return { mode: "cluster", clusters: clusters.slice(0, 20), terms: allTerms, anchorTerm: anchor.term, missing: [] };
    }
    const r = elsFind(letters, terms[0], { ...base, onProgress });
    return { mode: "single", hits: r.hits, capped: r.capped, target: r.target, N: base.winTo - base.winFrom };
  }

  function run(args) {
    if (cur) cancel();          // מבטל חיפוש קודם שרץ (terminate) לפני חדש
    ensure();
    if (broken || !worker) return runMain(args);
    const reqId = ++seq;
    const p = new Promise((resolve, reject) => { cur = { reqId, onProgress: args.onProgress, resolve, reject }; });
    const msg = { reqId, kind: args.kind, terms: args.terms, opts: args.opts };
    if (args.lettersKey !== sentKey) { msg.letters = args.letters; msg.lettersKey = args.lettersKey; sentKey = args.lettersKey; }
    else { msg.lettersKey = args.lettersKey; }
    worker.postMessage(msg);
    return p;
  }

  function cancel() {
    if (worker) { try { worker.terminate(); } catch { /**/ } worker = null; sentKey = null; }
    cur = null;   // מבטל את ההבטחה הקודמת (נשארת לא-פתורה — הקורא מגן ב-alive)
  }

  return { run, cancel };
}
