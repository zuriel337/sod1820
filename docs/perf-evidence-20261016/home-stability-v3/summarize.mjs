// (runner v4: usableMs = visible and usable, on a return the departure control itself; composedMs = real content in the DOM)
// Summarizes one runner output: per arm medians/ranges and, for a base/candidate pair, paired differences with a bootstrap 95% CI
// of the median difference (seeded, deterministic). Only samples that are valid in BOTH arms of a pair are compared.
// usage: node summarize.mjs --in out.json --base A --cand B [--md out.md] [--json out.json]
import fs from 'node:fs';
const argv = process.argv.slice(2); const A = Object.fromEntries(argv.reduce((a, v, i, r) => v.startsWith('--') ? [...a, [v.slice(2), r[i + 1]]] : a, []));
const data = JSON.parse(fs.readFileSync(A.in, 'utf8')); const runs = data.runs; const arms = [...new Set(runs.map(r => r.arm))];
const BASE = A.base || arms[0], CAND = A.cand || arms[arms.length - 1];
const med = (v) => { const s = v.filter(x => x != null && !Number.isNaN(x)).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const boot = (d) => { if (d.length < 3) return null; const r = rng(12345), ms = []; for (let i = 0; i < 10000; i++) ms.push(med(Array.from(d, () => d[Math.floor(r() * d.length)]))); ms.sort((a, b) => a - b); return [ms[Math.floor(0.025 * ms.length)], ms[Math.floor(0.975 * ms.length)]]; };
const r3 = (x) => x == null ? null : Math.round(x * 1000) / 1000;
const mode = runs[0]?.mode || 'back';
const metrics = mode === 'load'
  ? { cls: r => r.cls, shiftSum: r => r.shiftSum, usableMs: r => r.readyMs?.usable, composedMs: r => r.readyMs?.composed, heroMs: r => r.readyMs?.hero, dgSettledMs: r => r.readyMs?.dgSettled, fcpMs: r => r.fcp, lcpMs: r => r.lcp?.t, requests: r => r.reqCount }
  : { cls: r => r.cls, actionWindowShiftSum: r => r.actionWindowShiftSum, usableMs: r => r.readyAfterBack?.usable, composedMs: r => r.readyAfterBack?.composed, heroMs: r => r.readyAfterBack?.hero, dgSettledMs: r => r.readyAfterBack?.dgSettled, anchorFinalDispPx: r => r.anchor?.finalDisp, anchorMaxDispAfterPx: r => r.anchor?.maxDispAfter, readsBack: r => r.reqCount?.back, finalDocH: r => r.finalDocH };
const out = { profile: data.profile, mode, base: BASE, cand: CAND, arms: {}, pairs: {} };
for (const arm of arms) { const rs = runs.filter(r => r.arm === arm), v = rs.filter(r => r.valid);
  out.arms[arm] = { attempts: rs.length, valid: v.length, invalid: rs.filter(r => !r.valid).map(r => ({ idx: r.idx, why: r.error || r.invalid.join(';') || `misses=${r.misses} errors=${r.pageErrors?.length}` })),
    blockedWrites: [...new Set(rs.map(r => r.blockedWrites))], misses: rs.reduce((s, r) => s + r.misses, 0), pageErrors: rs.reduce((s, r) => s + (r.pageErrors?.length || 0), 0),
    metrics: Object.fromEntries(Object.entries(metrics).map(([k, f]) => { const x = v.map(f).filter(y => y != null); return [k, { n: x.length, median: r3(med(x)), min: r3(Math.min(...x)), max: r3(Math.max(...x)), values: x.map(r3) }]; })) }; }
const byIdx = (arm) => Object.fromEntries(runs.filter(r => r.arm === arm && r.valid).map(r => [r.idx, r]));
const b = byIdx(BASE), c = byIdx(CAND); const idxs = Object.keys(b).filter(i => c[i]);
out.pairs = { n: idxs.length, idxs, metrics: Object.fromEntries(Object.entries(metrics).map(([k, f]) => {
  const d = idxs.map(i => [f(b[i]), f(c[i])]).filter(([x, y]) => x != null && y != null).map(([x, y]) => y - x); const bm = med(idxs.map(i => f(b[i])).filter(x => x != null)), cm = med(idxs.map(i => f(c[i])).filter(x => x != null));
  return [k, { baseMedian: r3(bm), candMedian: r3(cm), diffMedian: r3(med(d)), pct: bm ? r3(100 * (cm - bm) / bm) : null, ci95: boot(d)?.map(r3) ?? null, n: d.length }]; })) };
if (A.json) fs.writeFileSync(A.json, JSON.stringify(out, null, 1));
const lines = [`| arm | valid/attempts | ${Object.keys(metrics).join(' | ')} |`, `| --- | --- | ${Object.keys(metrics).map(() => '---').join(' | ')} |`];
for (const arm of arms) { const a = out.arms[arm]; lines.push(`| ${arm} | ${a.valid}/${a.attempts} | ${Object.keys(metrics).map(k => `${a.metrics[k].median} [${a.metrics[k].min}..${a.metrics[k].max}]`).join(' | ')} |`); }
lines.push('', `Paired ${CAND} − ${BASE} (n=${out.pairs.n} pairs valid in both arms): median difference, % of base median, bootstrap 95% CI of the median difference`, '', '| metric | base median | cand median | diff | % | 95% CI |', '| --- | --- | --- | --- | --- | --- |');
for (const [k, m] of Object.entries(out.pairs.metrics)) lines.push(`| ${k} | ${m.baseMedian} | ${m.candMedian} | ${m.diffMedian} | ${m.pct} | ${m.ci95 ? `[${m.ci95.join(', ')}]` : 'n<3'} |`);
if (A.md) fs.writeFileSync(A.md, lines.join('\n') + '\n'); else console.log(lines.join('\n'));
