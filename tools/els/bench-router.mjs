// Real-router benchmark: routedDiscover median/p95 (ms) per term, from any els-code template (before/after).
//   node tools/els/bench-router.mjs [templatePath] [reps]
import { loadRouter } from './router-harness.mjs';
const tpl = process.argv[2] || undefined, reps = +process.argv[3] || 7, CAP = 4000;
const A = loadRouter(tpl);
const terms = [['משיח', 'common'], ['שדי', 'common'], ['אלהימ', 'common'], ['יהוה', 'common'], ['ישראל', 'common'], ['ירושלימ', 'positive-mid'], ['תורה', 'common'],
  ['בראשית', 'positive-mid'], ['אברהמ', 'positive-mid'], ['זזזזז', 'sparse/no-hit'], ['צפנתפענח', 'sparse/no-hit'], ['קשרצ', 'sparse']];
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const rows = [];
for (const [t, kind] of terms) {
  const ms = []; let r;
  for (let i = 0; i < reps; i++) { const t0 = performance.now(); r = await A.routedDiscover(t, CAP); ms.push(performance.now() - t0); }
  rows.push({ term: t, kind, strategy: r.strategy && r.strategy.strategy, hits: r.hits.length, capped: r.capped, median_ms: +q(ms, .5).toFixed(1), p95_ms: +q(ms, .95).toFixed(1) });
}
console.table(rows);
const agg = (k) => { const v = rows.filter((r) => r.kind.startsWith(k)).map((r) => r.median_ms); return v.length ? +(v.reduce((a, b) => a + b) / v.length).toFixed(1) : null; };
console.log(JSON.stringify({ reps, cap: CAP, mean_of_medians_ms: { common: agg('common'), positive_mid: agg('positive-mid'), sparse: agg('sparse') }, rows }));
