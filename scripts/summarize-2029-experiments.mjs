// usage: node sum3.mjs x-d.jsonl x-m.jsonl  -> per (profile, scenario, visit): each variant vs base (median, range) + integrity check
import fs from 'node:fs';
const rows = process.argv.slice(2).flatMap(f => fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l))).filter(r => !r.kind);
const med = a => { a = a.filter(x => x != null && x >= 0 && !Number.isNaN(x)).sort((x, y) => x - y); return a.length ? a[a.length >> 1] : NaN; };
const g = {}; for (const r of rows) (g[[r.prof, r.scen, r.label.split('#')[0]].join(' ')] ??= {})[r.variant] ??= [], g[[r.prof, r.scen, r.label.split('#')[0]].join(' ')][r.variant].push(r);
const M = [['ready', 'ready'], ['lcp', 'LCP'], ['fcp', 'FCP'], ['cls', 'CLS'], ['inp', 'click ms'], ['tbt', 'TBT'], ['cpuTaskMs', 'cpu'], ['restApi', 'api'], ['preflights', 'preflt'], ['restDupGets', 'dup']];
const out = [];
for (const k of Object.keys(g).sort()) {
  const base = g[k].base; if (!base) continue; out.push('\n## ' + k);
  const bsig = base[0].sig || {};
  out.push('variant'.padEnd(8) + ' n  ' + M.map(m => m[1].padStart(9)).join('') + '  integrity');
  for (const v of Object.keys(g[k])) {
    const a = g[k][v]; const cells = M.map(([f]) => { const x = med(a.map(r => r[f])), b = med(base.map(r => r[f])); const d = v === 'base' ? '' : (f === 'cls' ? (x - b).toFixed(3) : Math.round(x - b)); return (f === 'cls' ? x.toFixed(3) : String(Math.round(x))).padStart(5) + (d === '' ? '    ' : (String(d >= 0 ? '+' + d : d)).padStart(4)); });
    const okAll = a.every(r => r.ok); const capsSame = a.every(r => r.sig?.caps === bsig.caps && r.sig?.h1 === bsig.h1 && Math.abs((r.sig?.len || 0) - (bsig.len || 1)) < .15 * (bsig.len || 1));
    out.push(v.padEnd(8) + String(a.length).padStart(2) + ' ' + cells.join('') + '  ' + (okAll ? 'ready' : 'NOT-READY') + (capsSame ? ' same-content' : ' CONTENT-DIFF'));
  }
}
console.log(out.join('\n'));
