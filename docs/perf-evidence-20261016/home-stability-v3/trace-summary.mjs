// Main-thread cost by event kind in the first WINDOW ms after tracing started (tracing starts right before the Back command).
// usage: node trace-summary.mjs --dir traces [--window 700] [--json out.json]
import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';
const argv = process.argv.slice(2); const A = Object.fromEntries(argv.reduce((a, v, i, r) => v.startsWith('--') ? [...a, [v.slice(2), r[i + 1]]] : a, []));
const WINDOW = (+A.window || 700) * 1000;   // trace timestamps are microseconds
const NAMES = ['RunTask', 'FunctionCall', 'EvaluateScript', 'v8.run', 'UpdateLayoutTree', 'Layout', 'PrePaint', 'Paint', 'Layerize', 'Commit', 'HitTest', 'ParseHTML', 'MinorGC', 'MajorGC', 'ResizeObserver', 'TimerFire', 'FireAnimationFrame', 'EventDispatch'];
const med = (v) => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const rows = [];
for (const f of fs.readdirSync(A.dir).filter(f => f.endsWith('.trace.json.gz')).sort()) {
  const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(A.dir, f))).toString()); const ev = Array.isArray(raw) ? raw : raw.traceEvents;
  const mains = ev.filter(e => e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain').map(e => `${e.pid}:${e.tid}`);
  const busy = {}; for (const e of ev) if (e.ph === 'X' && e.name === 'RunTask' && mains.includes(`${e.pid}:${e.tid}`)) busy[`${e.pid}:${e.tid}`] = (busy[`${e.pid}:${e.tid}`] || 0) + (e.dur || 0);
  const main = Object.entries(busy).sort((a, b) => b[1] - a[1])[0]?.[0]; if (!main) { rows.push({ file: f, error: 'no renderer main thread' }); continue; }
  const mine = ev.filter(e => e.ph === 'X' && `${e.pid}:${e.tid}` === main && e.ts != null);
  const t0 = Math.min(...mine.map(e => e.ts)); const inWin = mine.filter(e => e.ts >= t0 && e.ts < t0 + WINDOW);
  const sums = Object.fromEntries(NAMES.map(n => [n, Math.round(inWin.filter(e => e.name === n).reduce((s, e) => s + (e.dur || 0), 0) / 1000)]));
  const counts = { layouts: inWin.filter(e => e.name === 'Layout').length, styleRecalcs: inWin.filter(e => e.name === 'UpdateLayoutTree').length };
  rows.push({ file: f, arm: f.split('-')[0], sums, counts });
}
const arms = [...new Set(rows.map(r => r.arm))]; const out = { windowMs: WINDOW / 1000, arms: {}, rows };
for (const arm of arms) { const rs = rows.filter(r => r.arm === arm && r.sums); out.arms[arm] = { n: rs.length, median: Object.fromEntries(NAMES.map(n => [n, med(rs.map(r => r.sums[n]))])), layouts: med(rs.map(r => r.counts.layouts)), styleRecalcs: med(rs.map(r => r.counts.styleRecalcs)) }; }
if (A.json) fs.writeFileSync(A.json, JSON.stringify(out, null, 1));
console.log(`window=${WINDOW / 1000}ms after trace start; medians of main-thread ms by kind`);
console.log(['kind'.padEnd(20), ...arms.map(a => a.padStart(8))].join(' '));
for (const n of NAMES) console.log([n.padEnd(20), ...arms.map(a => String(out.arms[a].median[n]).padStart(8))].join(' '));
console.log(['layout count'.padEnd(20), ...arms.map(a => String(out.arms[a].layouts).padStart(8))].join(' ')); console.log(['style recalc count'.padEnd(20), ...arms.map(a => String(out.arms[a].styleRecalcs).padStart(8))].join(' '));
