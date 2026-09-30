#!/usr/bin/env node
// Branch-only ELS multi-strategy benchmark harness. Reads the canonical local stream; NO database / network.
// usage: node run-benchmark.mjs [--scope torah|tanakh] [--domain bounded|full] [--reps 5]
//        [--budget-ms 15000] [--truth-ms 40000] [--term אור] [--out results/x.json] [--no-legacy]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getScope, normalizeTerm } from './lib/corpus.mjs';
import { runStrategy, enumerateViaAnchor, unpackKey, bandEdges, SEGMENTS, STRATEGY } from './lib/strategies.mjs';
import { replayResult } from './lib/verify.mjs';
import { runLegacy } from './lib/legacy.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] ?? true); };
const matrix = JSON.parse(readFileSync(join(HERE, 'fixtures', 'matrix.json'), 'utf8'));
const REPS = Number(opt('reps', 5));
const BUDGET = Number(opt('budget-ms', 15000));
const TRUTH = Number(opt('truth-ms', 40000));
const scopes = opt('scope') ? [opt('scope')] : matrix.scopes;
const domains = opt('domain') ? [opt('domain')] : Object.keys(matrix.domains);
const terms = (opt('term') ? matrix.terms.filter(t => t.term === opt('term')) : matrix.terms).map(t => ({ ...t, term: normalizeTerm(t.term) }));   // canonical normalization (folds final letters) before any verification
const withLegacy = !argv.includes('--no-legacy');
const SLOW_MS = 1500;   // a strategy that takes longer than this on its first run is not repeated

const median = a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const p95 = a => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)]; };
const r2 = x => (x == null ? null : Math.round(x * 100) / 100);

const hasKey = (sorted, k) => { let lo = 0, hi = sorted.length; while (lo < hi) { const m = (lo + hi) >>> 1; if (sorted[m] < k) lo = m + 1; else hi = m; } return lo < sorted.length && sorted[lo] === k; };
const keyOf = h => (h.skip * 2 ** 21 + h.start) * 2 + (h.dir === 1 ? 0 : 1);
const segOf = (start, n) => Math.min(SEGMENTS - 1, Math.floor(start * SEGMENTS / n));
const bandOf = (skip, edges) => { let b = 0; for (let i = 0; i < edges.length; i++) if (skip >= edges[i].lo) b = i; return b; };

function diversity(hitsLike, n, smax) {
  const edges = bandEdges(smax);
  return { bands: new Set(hitsLike.map(h => bandOf(h.skip, edges))).size, segments: new Set(hitsLike.map(h => segOf(h.start, n))).size };
}

async function timedRuns(fn) {
  const samples = []; let last = null;
  for (let r = 0; r < REPS; r++) {
    last = fn();
    samples.push(last.ms);
    if (last.result?.status === 'TIMEOUT' || (r === 0 && last.ms > SLOW_MS)) break;
  }
  return { samples, last };
}

const rows = [];
for (const scope of scopes) {
  const view = getScope(scope);
  for (const domain of domains) {
    const maxskip = matrix.domains[domain];
    for (const t of terms) {
      const group = { scope, domain, term: t.term, class: t.class, maxskip };
      globalThis.gc?.();
      console.error(`[${scope}/${domain}] ${t.term} (${t.class})`);
      // 1) EXACT enumeration = canonical semantics; timed; also the ground-truth source when it completes.
      let exactRun = await timedRuns(() => runStrategy('EXACT', { scope, term: t.term, maxskip, cap: 1e9, budgetMs: BUDGET }));
      let truthKeys = exactRun.last.keys, truthSource = truthKeys ? 'EXACT_EXHAUSTIVE_V1' : null;
      const exactTimedOut = exactRun.last.result.status === 'TIMEOUT';
      let truthNote = null;
      if (!truthKeys) {
        const alt = enumerateViaAnchor(scope, t.term, maxskip, TRUTH);
        if (alt.keys) { truthKeys = alt.keys; truthSource = 'ANCHOR_EXHAUSTIVE (independent enumeration; exact pair-join exceeded budget)'; }
        else truthNote = `UNBOUNDED_COST (no exhaustive ground truth within ${TRUTH}ms)`;
      }
      const truthTotal = truthKeys ? truthKeys.length : null;
      for (const cap of matrix.caps) {
        const capRows = [];
        // canonical first-cap set (for the compatibility metric only)
        const canonHead = truthKeys ? Array.from(truthKeys.subarray(0, cap)) : null;
        for (const sk of ['EXACT', 'ANCHOR', 'HYBRID']) {
          let samples, last;
          if (sk === 'EXACT') {
            // canonical cost is cap-independent (full count, then LIMIT): reuse the enumeration timing, slice per cap.
            samples = exactRun.samples;
            const sliced = exactRun.last.keys ? runStrategy('EXACT', { scope, term: t.term, maxskip, cap, exactKeys: exactRun.last.keys }) : exactRun.last;
            last = { ...sliced, stats: exactRun.last.stats };
          } else {
            const tr = await timedRuns(() => runStrategy(sk, { scope, term: t.term, maxskip, cap, budgetMs: BUDGET }));
            samples = tr.samples; last = tr.last;
          }
          const res = last.result;
          const replay = replayResult(res);
          const hitsLike = res.hits;
          let precision = null, coverage = null, canonOverlap = null;
          if (truthKeys && hitsLike.length) {
            const inTruth = hitsLike.filter(h => hasKey(truthKeys, keyOf(h))).length;
            precision = inTruth / hitsLike.length;
            coverage = inTruth / Math.min(cap, truthTotal);
          } else if (truthKeys && !hitsLike.length) { precision = 1; coverage = truthTotal === 0 ? 1 : 0; }
          if (canonHead && canonHead.length) {
            const set = new Set(canonHead); canonOverlap = hitsLike.filter(h => set.has(keyOf(h))).length / canonHead.length;
          }
          const dv = diversity(hitsLike, view.n, res.search.skip_max_executed);
          const avail = truthKeys ? diversity(Array.from(truthKeys.subarray(0, Math.min(truthKeys.length, 1e6)), unpackKey), view.n, res.search.skip_max_executed) : null;
          capRows.push({
            ...group, cap, strategy: STRATEGY[sk].id, state: res.status, coverageState: res.completion.coverage,
            partial: res.completion.partial, negativeClaimed: res.completion.negative, truncated: res.completion.truncated,
            reps: samples.length, medianMs: r2(median(samples)), p95Ms: r2(p95(samples)), samplesMs: samples.map(r2),
            candidates: last.stats.candidates, compares: last.stats.compares, rowsMaterialized: last.stats.rowsMaterialized,
            returned: hitsLike.length, totalHits: res.completion.total_hits,
            falsePositives: replay.falsePositives, duplicates: replay.duplicates, replayOk: replay.ok, replayReasons: replay.reasons,
            precisionVsTruth: precision, coverageVsTruth: r2(coverage), canonicalOverlap: r2(canonOverlap),
            bandsHit: dv.bands, segmentsHit: dv.segments, bandsAvailable: avail?.bands ?? null, segmentsAvailable: avail?.segments ?? null,
            truthTotal, truthSource: truthSource ?? truthNote,
          });
        }
        // 2) legacy browser baseline: full-domain semantics only (its findAll has no bounded skip domain).
        if (withLegacy && domain === 'full') {
          const runs = []; let lastL = null;
          for (let r = 0; r < REPS; r++) {
            lastL = await runLegacy({ text: view.text, n: view.n, term: t.term, cap, budgetMs: BUDGET });
            runs.push(lastL.ms ?? BUDGET);
            if (lastL.state !== 'OK' || (r === 0 && lastL.ms > SLOW_MS)) break;
          }
          const canon = lastL.hits.filter(h => h.skip >= 2).map(h => ({ skip: h.skip, dir: h.dir, start: h.start }));
          const L = t.term.length;
          const fake = { scope, input: { normalized: t.term }, corpus_id: view.corpusId, coordinate: { position_base: 0 }, search: { skip_max_executed: 1e9 }, completion: { coverage: 'sampled_partial', negative: false, scan_complete: false }, execution_strategy: { id: 'LEGACY_BROWSER_ANCHOR_DISPERSE', version: 0, exhaustive: false }, hits: [] };
          let fp = 0;
          for (const h of canon) { const p = Array.from({ length: L }, (_, k) => h.start + h.dir * h.skip * k); const ok = p.every((q, k) => q >= 0 && q < view.n && view.text[q] === t.term[k]); if (!ok) fp++; }
          const cs = canonHead ? new Set(canonHead) : null;
          capRows.push({
            ...group, cap, strategy: 'LEGACY_BROWSER_ANCHOR_DISPERSE (observational)', state: lastL.state, coverageState: 'legacy_capped',
            partial: lastL.capped ? true : false, negativeClaimed: null, truncated: !!lastL.capped, reps: runs.length,
            medianMs: r2(median(runs)), p95Ms: r2(p95(runs)), samplesMs: runs.map(r2), candidates: null, compares: null, rowsMaterialized: null,
            returned: canon.length, plainSkip1Excluded: lastL.hits.length - canon.length, totalHits: null,
            falsePositives: fp, duplicates: 0, replayOk: fp === 0, replayReasons: [],
            precisionVsTruth: truthKeys && canon.length ? canon.filter(h => hasKey(truthKeys, keyOf(h))).length / canon.length : null,
            coverageVsTruth: truthKeys && canon.length ? r2(canon.filter(h => hasKey(truthKeys, keyOf(h))).length / Math.min(cap, truthTotal)) : null,
            canonicalOverlap: cs ? r2(canon.filter(h => cs.has(keyOf(h))).length / Math.max(1, canonHead.length)) : null,
            ...(() => { const d = diversity(canon, view.n, view.n); return { bandsHit: d.bands, segmentsHit: d.segments }; })(),
            bandsAvailable: null, segmentsAvailable: null, truthTotal, truthSource: truthSource ?? truthNote,
          });
        }
        rows.push(...capRows);
      }
    }
  }
}

const out = opt('out', join(HERE, 'results', `raw-${scopes.join('+')}-${domains.join('+')}.json`));
writeFileSync(out, JSON.stringify({ generatedBy: 'tools/els/bench/run-benchmark.mjs', reps: REPS, budgetMs: BUDGET, truthMs: TRUTH, node: process.version, rows }, null, 1));
console.error('wrote', out, rows.length, 'rows');
