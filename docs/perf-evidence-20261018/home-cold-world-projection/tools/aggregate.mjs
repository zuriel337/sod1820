import fs from 'node:fs';
const dir = process.argv[2];
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
// Mann–Whitney U, normal approximation with tie correction (two-sided)
function mwu(a, b) {
  const all = [...a.map((v) => ({ v, g: 0 })), ...b.map((v) => ({ v, g: 1 }))].sort((x, y) => x.v - y.v);
  let i = 0; const ranks = new Array(all.length); let tieTerm = 0;
  while (i < all.length) { let j = i; while (j + 1 < all.length && all[j + 1].v === all[i].v) j++; const r = (i + j) / 2 + 1; for (let k = i; k <= j; k++) ranks[k] = r; const t = j - i + 1; tieTerm += t ** 3 - t; i = j + 1; }
  const n1 = a.length, n2 = b.length; const R1 = all.reduce((s, x, k) => s + (x.g === 0 ? ranks[k] : 0), 0);
  const U1 = R1 - n1 * (n1 + 1) / 2; const mu = n1 * n2 / 2; const N = n1 + n2;
  const sd = Math.sqrt(n1 * n2 / 12 * ((N + 1) - tieTerm / (N * (N - 1))));
  const z = sd ? (U1 - mu) / sd : 0; const p = 2 * (1 - Phi(Math.abs(z)));
  return { U: U1, z, p };
}
function Phi(x) { const t = 1 / (1 + 0.2316419 * x); const d = 0.3989423 * Math.exp(-x * x / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return 1 - p; }
const out = {};
for (const profile of ['mobile', 'desktop']) {
  const rows = {}; const dropped = { before: 0, after: 0 };
  for (const v of ['before', 'after']) {
    const all = fs.readdirSync(dir).filter((f) => f.startsWith(`${profile}-${v}-`) && f.endsWith('.json')).sort().flatMap((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')).samples.map((s) => ({ ...s, file: f })));
    rows[v] = all.filter((s) => s.ready != null && s.dcl > 0); dropped[v] = all.length - rows[v].length;
  }
  const metrics = {
    requests: (s) => s.requests, transferKB: (s) => s.totalBytes / 1024, jsRequests: (s) => s.jsRequests, jsWireKB: (s) => s.jsBytes / 1024,
    fcpMs: (s) => s.fcp, lcpMs: (s) => s.lcp, readyMs: (s) => s.ready, readyHeroMs: (s) => s.readyHero, tbtMs: (s) => s.tbtMs, longTasks: (s) => s.longTasks, longTaskTotalMs: (s) => s.longTaskTotalMs, cls: (s) => s.cls,
  };
  const routeWave = (s) => { const st = Math.min(...s.list.filter((x) => /Home2029Page-.*\.js/.test(x.url)).map((x) => x.start)); const en = Math.max(...s.list.filter((x) => x.kind === 'js' && x.start >= st - 5 && x.start < st + 400).map((x) => x.end)); return en - st; };
  metrics.routeWaveMs = routeWave;
  out[profile] = { n: { before: rows.before.length, after: rows.after.length }, dropped, metrics: {} };
  console.log(`\n## ${profile}  n(before)=${rows.before.length} n(after)=${rows.after.length} dropped(failed page loads)=${JSON.stringify(dropped)}`);
  for (const [name, f] of Object.entries(metrics)) {
    const b = rows.before.map(f), a = rows.after.map(f);
    const m = mwu(b, a);
    const st = (x) => ({ median: +q(x, .5).toFixed(name === 'cls' ? 3 : 1), p25: +q(x, .25).toFixed(1), p75: +q(x, .75).toFixed(1), min: +Math.min(...x).toFixed(1), max: +Math.max(...x).toFixed(1) });
    out[profile].metrics[name] = { before: st(b), after: st(a), deltaMedian: +(q(a, .5) - q(b, .5)).toFixed(name === 'cls' ? 3 : 1), mannWhitneyP: +m.p.toFixed(4), samples: { before: b.map((x) => +x.toFixed(2)), after: a.map((x) => +x.toFixed(2)) } };
    const sb = st(b), sa = st(a);
    console.log(`${name.padEnd(16)} before ${String(sb.median).padStart(8)} [IQR ${sb.p25}–${sb.p75}]  after ${String(sa.median).padStart(8)} [IQR ${sa.p25}–${sa.p75}]  Δmedian ${(q(a, .5) - q(b, .5)).toFixed(name === 'cls' ? 3 : 1).padStart(8)}  MWU p=${m.p.toFixed(3)}`);
  }
  for (const v of ['before', 'after']) {
    const s = rows[v];
    out[profile][v + 'Checks'] = { worldModuleFetchesPerRun: s.map((x) => x.worldish.length), temporalSignatureRequests: s.map((x) => x.list.filter((r) => /fn_method_value|gematria_words|\/nodes|research_contributions\?[^#]*target_type=eq\.number|timeFlow|dayContext|hebcal/i.test(r.url)).length), nowTextShown: s.map((x) => x.textHasNow), scrollY: [...new Set(s.map((x) => x.scrollY))], beacons: s.map((x) => x.beacons.length), blockedWrites: s.map((x) => x.blocked.length), hero: [...new Set(s.map((x) => x.h1))] };
    console.log(v, 'temporal-signature reqs per run', JSON.stringify(out[profile][v + 'Checks'].temporalSignatureRequests), '| world-module fetches per run', JSON.stringify(out[profile][v + 'Checks'].worldModuleFetchesPerRun), '| now-text', JSON.stringify([...new Set(out[profile][v + 'Checks'].nowTextShown)]), '| scrollY', JSON.stringify(out[profile][v + 'Checks'].scrollY), '| beacons', JSON.stringify([...new Set(out[profile][v + 'Checks'].beacons)]));
  }
}
fs.writeFileSync(`${dir}/summary.json`, JSON.stringify(out, null, 1));
