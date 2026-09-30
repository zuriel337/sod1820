#!/usr/bin/env node
// ELS multi-strategy benchmark runner (branch-only prototype). Usage:
//   node --expose-gc tools/els/benchmark/run.mjs [--runs 7] [--deadline 60000] [--out results] [--quick]
import { Worker } from 'node:worker_threads';
import { writeFileSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import { loadCorpus, scopeView, TORAH_LEN, norm } from './corpus.mjs';
import { STRATEGIES, skipBands, STRATEGY_VERSION } from './strategies.mjs';
import { replayVerify, hitKey, canonicalCompare } from './verify.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? true : arr[i + 1]] : []).filter((x) => x.length));
const RUNS = Number(args.runs ?? 7), DEADLINE = Number(args.deadline ?? 60000), OUT = new URL(`./${args.out ?? 'results'}/`, import.meta.url).pathname, QUICK = !!args.quick;
const CAPS = [16, 400, 3000, 4000];

// term matrix: category → terms (Hebrew, normalised by the same rule as the engine)
const TERMS = [
  ['short_common', 'אל'], ['short_common', 'שדי'],
  ['medium', 'תורה'], ['medium', 'יונה'], ['medium', 'אליהו'],
  ['rare', 'תורהקדשה'], ['rare', 'ירושלים'],
  ['palindrome', 'אבא'], ['palindrome', 'אמא'],
  ['reverse_sensitive', 'משיח'], ['reverse_sensitive', 'דוד'],
  ['no_result', 'צקצקצקצקצק'], ['no_result', 'זזזזזזזז'],
].filter((_, i) => !QUICK || i % 2 === 0);
const GOLDENS = [ // scripted Goldens (test/fixtures/els-runtime-goldens.mjs): exact skip domain, must contain the recorded start
  { id: 'torah-50-fwd', term: 'תורה', scope: 'torah', skip: 50, dir: 1, start: 5 },
  { id: 'torah-kedosha-10065-fwd', term: 'תורהקדשה', scope: 'torah', skip: 10065, dir: 1, start: 50890 },
  { id: 'eliyahu-1820-fwd', term: 'אליהו', scope: 'torah', skip: 1820, dir: 1, start: 27914 },
  { id: 'eliyahu-1820-back', term: 'אליהו', scope: 'torah', skip: 1820, dir: -1, start: 37550 },
];
const DOMAINS = [{ id: 'B40', min: 1, max: 40 }, { id: 'B500', min: 1, max: 500 }, { id: 'FULL', min: 1, max: null }];

const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const median = (a) => pct(a, 0.5);
const round = (x, d = 3) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);

function diversity(view, hits, lo, hi) {
  const posBins = new Set(hits.map((h) => Math.min(15, Math.floor(h.start / (view.N / 16)))));
  const bands = skipBands(lo, hi), skipBands_ = new Set(hits.map((h) => bands.findIndex(([a, b]) => h.skip >= a && h.skip <= b)));
  return { pos_bins16: posBins.size, distinct_skips: new Set(hits.map((h) => h.skip)).size, skip_bands4: skipBands_.size, dirs: new Set(hits.map((h) => h.dir)).size };
}

function timeIt(fn, runs, budgetMs) {
  const times = []; let last;
  for (let r = 0; r < runs; r++) {
    global.gc?.(); const h0 = process.memoryUsage().heapUsed; const t0 = performance.now();
    last = fn(); const ms = performance.now() - t0; times.push(ms);
    last._heapDelta = Math.max(0, process.memoryUsage().heapUsed - h0);
    if (last.timeout || times.reduce((a, b) => a + b, 0) > budgetMs) break;
  }
  return { times, last };
}

async function legacyRun(letters, scope, term, cap, timeoutMs, runs) {
  const w = new Worker(new URL('./legacy-worker.mjs', import.meta.url), { workerData: { letters, scope } });
  try {
    await new Promise((res, rej) => { w.once('message', res); w.once('error', rej); });
    const times = []; let last = null;
    for (let r = 0; r < runs; r++) {
      const p = new Promise((res, rej) => { w.once('message', res); w.once('error', rej); });
      w.postMessage({ term, cap });
      const to = new Promise((res) => setTimeout(() => res({ timeout: true }), timeoutMs));
      const m = await Promise.race([p, to]);
      if (m.timeout) { return { timeout: true, times }; }
      times.push(m.ms); last = m;
    }
    return { times, last };
  } finally { await w.terminate(); }
}

const corpus = loadCorpus();
const rows = [], truthTable = [];
const started = new Date().toISOString();

for (const scope of ['torah', 'tanakh']) {
  const view = scopeView(corpus, scope);
  const cases = [];
  for (const [cat, term] of TERMS) for (const d of DOMAINS) cases.push({ cat, term, dom: d, gold: null });
  if (scope === 'torah') for (const g of GOLDENS) cases.push({ cat: 'golden', term: g.term, dom: { id: `G${g.skip}`, min: g.skip, max: g.skip }, gold: g });
  for (const c of cases) {
    const t = norm(c.term), lo = c.dom.min, hi = c.dom.max;
    // ── ground truth + strategy A (canonical exhaustive); cap-independent so it is timed once per case
    const A = timeIt(() => STRATEGIES.EXACT_EXHAUSTIVE_V1(view, t, { cap: Infinity, skipMin: lo, skipMax: hi, deadlineMs: DEADLINE }), Math.min(RUNS, 5), DEADLINE * 2);
    const truthOk = !A.last.timeout;
    const truth = truthOk ? A.last.hits : null; // full canonical order
    const truthKeys = truthOk ? new Set(truth.map(hitKey)) : null;
    truthTable.push({ scope, cat: c.cat, term: t, domain: c.dom.id, truth_count: truthOk ? truth.length : 'TIMEOUT/UNBOUNDED_COST', exhaustive_ms_median: round(median(A.times), 2), timeout: !truthOk });
    // ── legacy (observational; unbounded skip domain only — legacy has no skip bound; per cap)
    for (const cap of CAPS) {
      const perStrategy = {};
      const common = { scope, cat: c.cat, term: t, domain: c.dom.id, cap, truth_count: truthOk ? truth.length : null };
      const evalRun = (name, res, times, extra = {}) => {
        const hs = res.hits ?? [];
        let fp = 0, replayOk = 0, inTruth = 0;
        for (const h of hs) { if (replayVerify(view, t, h) === 'MATCH') replayOk++; else fp++; if (truthKeys?.has(hitKey(h))) inTruth++; }
        const want = truthOk ? Math.min(cap, truth.length) : null;
        const goldHit = c.gold ? hs.some((h) => h.start === c.gold.start && h.dir === c.gold.dir && h.skip === c.gold.skip) : null;
        const canonicalPrefix = truthOk ? hs.length === want && hs.every((h, i) => hitKey(h) === hitKey(truth[i])) : null;
        const meta = res.meta ?? {};
        return {
          ...common, strategy: name, version: STRATEGY_VERSION, runs: times.length,
          median_ms: round(median(times), 2), p95_ms: round(pct(times, 0.95), 2), min_ms: round(Math.min(...times), 2),
          hits_returned: hs.length, candidates_examined: res.candidates ?? null, heap_delta_kb: res._heapDelta != null ? Math.round(res._heapDelta / 1024) : null,
          false_positives: fp, replay_success: hs.length ? round(replayOk / hs.length, 4) : null, in_truth_rate: truthOk && hs.length ? round(inTruth / hs.length, 4) : null,
          fill_ratio: want != null ? (want ? round(hs.length / want, 4) : 1) : null,
          set_recall: truthOk && truth.length <= cap ? round(inTruth / Math.max(1, truth.length), 4) : null, // only meaningful when truth fits in cap
          canonical_prefix_identity: canonicalPrefix,
          completeness: meta.completeness ?? extra.completeness ?? null, exhaustive: meta.exhaustive ?? null, not_found_authoritative: meta.not_found_authoritative ?? null,
          timeout: !!res.timeout, golden_present: goldHit,
          diversity: diversity(view, hs, Math.max(1, lo), hi ?? Math.floor((view.N - 1) / Math.max(1, t.length - 1))),
          truth_diversity: truthOk ? diversity(view, truth, Math.max(1, lo), hi ?? Math.floor((view.N - 1) / Math.max(1, t.length - 1))) : null,
        };
      };
      // A at this cap (canonical first-N of the cached full result; latency = full exhaustive latency)
      if (truthOk) rows.push(evalRun('EXACT_EXHAUSTIVE_V1', { hits: truth.slice(0, cap), meta: A.last.meta, candidates: A.last.candidates, _heapDelta: A.last._heapDelta }, A.times));
      else rows.push({ ...common, strategy: 'EXACT_EXHAUSTIVE_V1', version: STRATEGY_VERSION, runs: A.times.length, timeout: true, completeness: A.last.meta.completeness === 'UNBOUNDED_COST' ? 'UNBOUNDED_COST' : 'TIMEOUT', median_ms: null, p95_ms: null, deadline_ms: DEADLINE, hits_returned: 0 });
      for (const name of ['ANCHOR_FAST_V1', 'HYBRID_COVERAGE_V1']) {
        const r = timeIt(() => STRATEGIES[name](view, t, { cap, skipMin: lo, skipMax: hi, deadlineMs: DEADLINE }), RUNS, DEADLINE * 2);
        const row = evalRun(name, r.last, r.times);
        if (r.last.strata) row.strata = r.last.strata;
        rows.push(row); perStrategy[name] = r.last;
      }
      if (c.dom.id === 'FULL' && !c.gold) {
        const L = await legacyRun(corpus.letters, scope, t, cap, Math.min(DEADLINE, 30000), Math.min(RUNS, 3));
        if (L.timeout) rows.push({ ...common, strategy: 'LEGACY_BROWSER_BASELINE', timeout: true, completeness: 'TIMEOUT', median_ms: null, p95_ms: null });
        else {
          const row = evalRun('LEGACY_BROWSER_BASELINE', { hits: L.last.hits, meta: { completeness: L.last.capped ? 'LEGACY_CAPPED' : 'LEGACY_COMPLETE', exhaustive: null } }, L.times);
          rows.push(row);
        }
      }
    }
    process.stderr.write(`${scope} ${c.cat} ${t} ${c.dom.id} truth=${truthOk ? truth.length : 'TIMEOUT'} A=${round(median(A.times), 1)}ms\n`);
  }
}
mkdirSync(OUT, { recursive: true });
const env = { node: process.version, cpu: os.cpus()[0]?.model, cores: os.cpus().length, runs: RUNS, deadline_ms: DEADLINE, started, corpus: corpus.admission, quick: QUICK, strategy_version: STRATEGY_VERSION };
writeFileSync(`${OUT}benchmark-results.json`, JSON.stringify({ env, truth: truthTable, rows }, null, 1));
console.log(`wrote ${rows.length} rows to ${OUT}benchmark-results.json`);
