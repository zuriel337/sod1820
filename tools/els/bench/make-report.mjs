#!/usr/bin/env node
// Merge raw benchmark JSON files into results/BENCHMARK.md (deterministic formatting).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const HERE = dirname(fileURLToPath(import.meta.url));
const dir = join(HERE, 'results');
const files = readdirSync(dir).filter(f => f.startsWith('raw-') && f.endsWith('.json'));
let rows = []; let meta = null;
for (const f of files) { const j = JSON.parse(readFileSync(join(dir, f), 'utf8')); meta ??= j; rows = rows.concat(j.rows); }
const short = s => s.startsWith('EXACT') ? 'A EXACT' : s.startsWith('ANCHOR') ? 'B ANCHOR' : s.startsWith('HYBRID') ? 'C HYBRID' : 'L legacy';
const fmt = r => r.state === 'TIMEOUT' ? `TIMEOUT(>${meta.budgetMs}ms)` : `${r.medianMs}/${r.p95Ms}`;
const out = [];
out.push('# ELS multi-strategy benchmark — raw results (branch-only, local Node, no DB)');
out.push(`\nGenerated from ${files.join(', ')} · reps≤${meta.reps} · per-run budget ${meta.budgetMs}ms · truth budget ${meta.truthMs}ms · node ${meta.node}`);
out.push('\nCell format: `median/p95 ms` over repeated runs (p95 of ≤5 samples ≈ max). A strategy whose first run exceeds 1.5 s is not repeated (reps=1). EXACT latency is cap-independent (full count, then LIMIT).\n');
const bySection = new Map();
for (const r of rows) { const k = `${r.scope} · ${r.domain}${r.maxskip ? ' (skip≤' + r.maxskip + ')' : ' (full skip domain)'}`; (bySection.get(k) ?? bySection.set(k, []).get(k)).push(r); }
for (const [sec, rs] of [...bySection].sort()) {
  out.push(`\n## ${sec}\n`);
  out.push('| term | class | cap | truth total | A EXACT | B ANCHOR | C HYBRID | L legacy | B/C returned | B/C cov vs truth | B/C canon-overlap | B/C bands (avail) | B/C segs (avail) |');
  out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  const keys = [...new Set(rs.map(r => `${r.term}|${r.cap}`))];
  for (const k of keys) {
    const g = rs.filter(r => `${r.term}|${r.cap}` === k); const by = s => g.find(r => short(r.strategy).startsWith(s));
    const A = by('A'), B = by('B'), C = by('C'), Lg = by('L');
    out.push(`| ${A.term} | ${A.class} | ${A.cap} | ${A.truthTotal ?? 'UNBOUNDED_COST'} | ${fmt(A)} | ${fmt(B)} | ${fmt(C)} | ${Lg ? fmt(Lg) : 'n/a'} | ${B.returned}/${C.returned} | ${B.coverageVsTruth ?? '—'}/${C.coverageVsTruth ?? '—'} | ${B.canonicalOverlap ?? '—'}/${C.canonicalOverlap ?? '—'} | ${B.bandsHit}/${C.bandsHit} (${C.bandsAvailable ?? '—'}) | ${B.segmentsHit}/${C.segmentsHit} (${C.segmentsAvailable ?? '—'}) |`);
  }
}
// Aggregates
const agg = { fp: 0, dup: 0, checked: 0, replayFail: 0, negOnPartial: 0 };
for (const r of rows) { agg.fp += r.falsePositives; agg.dup += r.duplicates; agg.checked += r.returned; if (!r.replayOk) agg.replayFail++; if (r.partial && r.negativeClaimed) agg.negOnPartial++; }
out.push('\n## Correctness aggregate\n');
out.push(`- result rows: ${rows.length}; occurrences replay-checked: ${agg.checked}`);
out.push(`- exact-hit false positives: **${agg.fp}**; duplicates: **${agg.dup}**; rows failing replay/provenance gate: **${agg.replayFail}**; sampled rows claiming negative: **${agg.negOnPartial}**`);
const prec = rows.filter(r => r.precisionVsTruth != null); out.push(`- rows with ground truth: ${prec.length}; min precision vs truth: ${Math.min(...prec.map(r => r.precisionVsTruth))}`);
const s = new Map();
for (const r of rows) { const k = short(r.strategy); const e = s.get(k) ?? { n: 0, to: 0 }; e.n++; if (r.state === 'TIMEOUT') e.to++; s.set(k, e); }
out.push('- timeouts by strategy: ' + [...s].map(([k, e]) => `${k}: ${e.to}/${e.n}`).join(' · '));
writeFileSync(join(dir, 'BENCHMARK.md'), out.join('\n') + '\n');
console.error('wrote results/BENCHMARK.md');
