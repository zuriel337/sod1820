// Usage: node --expose-gc tools/els/bench/run-benchmark.mjs [--runs=5] [--budget=5000] [--quick]
// Writes raw JSON + markdown table to tools/els/bench/results/. Local only: no DB, no network.
import { writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import * as S from './strategies.mjs';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? Number(a.split('=')[1]) : d; };
const RUNS = arg('runs', 5), BUDGET = arg('budget', 5000), GT_BUDGET = arg('gtbudget', 20000), QUICK = process.argv.includes('--quick');
const OUT = new URL('./results/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });

const TERMS = [
  ['short_common', 'אמר'], ['short_common', 'ויהי'], ['medium', 'ישראל'], ['medium', 'ירושלים'],
  ['rare', 'אחשורוש'], ['rare', 'נבוכדנצר'], ['palindrome', 'אבא'], ['palindrome', 'נון'],
  ['reverse_sensitive', 'הבל'], ['no_result', 'טטטטטטטט'], ['golden', 'יונה'], ['golden', 'תורה'],
];
const CAPS = QUICK ? [16, 400] : [16, 400, 3000, 4000];
const SCOPES = QUICK ? ['torah'] : ['torah', 'tanakh'];
const DOMAINS = ['bounded40', 'full'];
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const med = (a) => pct(a, 0.5);
const BOOK_BUCKETS = 10;

function diversity(hits, SN) {
  const sk = new Set(hits.map((h) => h.skip)), pos = new Set(hits.map((h) => Math.min(BOOK_BUCKETS - 1, Math.floor(h.start / SN * BOOK_BUCKETS))));
  const bands = new Set(hits.map((h) => S.skipBands(1e9).findIndex(([lo, hi]) => h.skip >= lo && h.skip <= hi)));
  const dirs = new Set(hits.map((h) => h.dir));
  return { distinctSkips: sk.size, positionDecilesCovered: pos.size, skipBandsCovered: bands.size, directions: dirs.size };
}

function timed(fn, runs, budget) {
  const ms = []; let last;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now(); last = fn(); const d = performance.now() - t0; ms.push(d);
    if (last.timedOut || d > budget * 0.4) break; // don't repeat slow/timed-out cases
  }
  return { last, ms };
}
function heapDelta(fn) { global.gc?.(); const b = process.memoryUsage().heapUsed; const r = fn(); const a = process.memoryUsage().heapUsed; return { r, kb: Math.round((a - b) / 1024) }; }

const rows = []; const meta = { node: process.version, runs: RUNS, budgetMs: BUDGET, gtBudgetMs: GT_BUDGET, startedAt: new Date().toISOString() };
const corpus = S.loadCorpus(); meta.corpusLetters = corpus.text.length; meta.indexBuildMs = {};

for (const scope of SCOPES) {
  const ctx = S.makeCtx(corpus, scope); const SN = S.scopeLen(scope); meta.indexBuildMs[scope] = +ctx.idx.buildMs.toFixed(1);
  const legacy = S.loadLegacy(corpus, scope);
  for (const [cls, rawTerm] of TERMS) { const term = S.normalize(rawTerm);
    const L = term.length; const full = S.fullMaxSkip(SN, L);
    const legacyCache = new Map();
    for (const domain of DOMAINS) {
      const maxskip = domain === 'full' ? full : Math.min(40, full);
      // Ground truth (exhaustive canonical set): bounded -> independent skip-major; full -> anchor-exhaustive w/ budget.
      const gtT0 = performance.now(); const gt = S.groundTruth(ctx, term, maxskip, GT_BUDGET, domain === 'bounded40'); const gtMs = performance.now() - gtT0;
      let gtCross = null;
      if (domain === 'bounded40' && gt.status === 'OK') { const g2 = S.groundTruth(ctx, term, maxskip, GT_BUDGET, false); gtCross = g2.status === 'OK' && JSON.stringify(g2.hits) === JSON.stringify(gt.hits); }
      const gtSet = gt.hits ? new Set(gt.hits.map(S.hitKey)) : null;
      rows.push({ kind: 'ground_truth', scope, class: cls, term, domain, maxskip, status: gt.status, total: gt.hits?.length ?? null, ms: +gtMs.toFixed(1), work: gt.work, crossCheckAnchorEqualsExact: gtCross });
      for (const cap of CAPS) {
        const q = { term, scope, maxskip, cap, budgetMs: BUDGET };
        const canonPrefix = gt.hits ? gt.hits.slice(0, cap) : null; const canonSet = canonPrefix ? new Set(canonPrefix.map(S.hitKey)) : null;
        const evalRow = (name, res, ms, extra = {}) => {
          const hits = res.hits; let fp = 0, replayOk = 0, inGt = 0;
          for (const h of hits) { const ok = S.replay(corpus.text, term, h, SN, name === 'LEGACY_BROWSER_FINDALL' ? 1 : 2); if (ok) replayOk++; else fp++; if (gtSet?.has(S.hitKey(h))) inGt++; }
          const gtN = gt.hits?.length ?? null; const div = diversity(hits, SN); const gdiv = canonPrefix ? diversity(gt.hits, SN) : null;
          rows.push({
            kind: 'case', strategy: name, scope, class: cls, term, domain, maxskip, cap,
            state: res.completion?.state ?? (res.timedOut ? 'TIMEOUT_UNBOUNDED_COST' : (res.capped ? 'LEGACY_CAPPED' : 'LEGACY_UNCAPPED')),
            negativeClaimAllowed: res.completion?.negative ?? false,
            medianMs: +med(ms).toFixed(2), p95Ms: +pct(ms, 0.95).toFixed(2), runs: ms.length,
            candidates: res.candidates ?? null, work: res.work, returned: hits.length,
            falsePositiveHits: fp, falsePositiveRate: hits.length ? fp / hits.length : 0, replaySuccess: hits.length ? replayOk / hits.length : null,
            groundTruthTotal: gtN, groundTruthStatus: gt.status,
            recallOfCapNormalized: gtN != null ? (Math.min(gtN, cap) ? inGt / Math.min(gtN, cap) : 1) : null, // share of the best-possible min(cap,|GT|) filled by true occurrences
            legacyCompatCanonicalPrefixOverlap: canonSet ? hits.filter((h) => canonSet.has(S.hitKey(h))).length / Math.max(1, canonPrefix.length) : null,
            ...div, gtDistinctSkipsInPrefix: gdiv?.distinctSkips ?? null, gtDeciles: gdiv?.positionDecilesCovered ?? null,
            ...extra,
          });
        };
        for (const [name, fn] of Object.entries(S.STRATEGIES)) {
          const { last, ms } = timed(() => fn(ctx, q), RUNS, BUDGET);
          const { kb } = heapDelta(() => fn(ctx, q));
          const env = S.toResultV1(ctx, q, last);
          evalRow(name, last, ms, { heapDeltaKb: kb, envelopeHits: env.hits.length, envelopeCorpusId: env.corpus_id.slice(0, 8), sampledFlag: last.completion.sampled });
        }
        // Legacy is domain-independent (always full skip domain, includes skip 1): run once per (term,scope,cap).
        if (domain === 'full') {
          const key = cap; if (!legacyCache.has(key)) {
            const { last, ms } = timed(() => legacy.run(term, cap, BUDGET), RUNS, BUDGET); legacyCache.set(key, 1);
            evalRow('LEGACY_BROWSER_FINDALL', last, ms, { note: 'observational baseline; includes skip=1, rebuilds letter index per call' });
          }
        }
      }
      process.stderr.write(`done ${scope} ${term} ${domain}\n`);
    }
  }
}
meta.finishedAt = new Date().toISOString();
writeFileSync(OUT + 'benchmark-raw.json', JSON.stringify({ meta, rows }, null, 1));

// Markdown summary
const cases = rows.filter((r) => r.kind === 'case');
let md = `# ELS multi-strategy benchmark (branch-only prototype)\n\nnode ${meta.node} · runs≤${RUNS} · per-case budget ${BUDGET}ms · GT budget ${GT_BUDGET}ms · index build ms ${JSON.stringify(meta.indexBuildMs)}\n\n`;
md += '| scope | class | term | domain | cap | strategy | state | med ms | p95 ms | cand | returned | FP | replay | recall(cap-norm) | compat-prefix | skips | deciles | GT total |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
for (const r of cases) md += `| ${r.scope} | ${r.class} | ${r.term} | ${r.domain} | ${r.cap} | ${r.strategy} | ${r.state} | ${r.medianMs} | ${r.p95Ms} | ${r.candidates ?? '-'} | ${r.returned} | ${r.falsePositiveHits} | ${r.replaySuccess ?? '-'} | ${r.recallOfCapNormalized == null ? 'n/a' : r.recallOfCapNormalized.toFixed(2)} | ${r.legacyCompatCanonicalPrefixOverlap == null ? 'n/a' : r.legacyCompatCanonicalPrefixOverlap.toFixed(2)} | ${r.distinctSkips} | ${r.positionDecilesCovered} | ${r.groundTruthTotal ?? r.groundTruthStatus} |\n`;
writeFileSync(OUT + 'benchmark-table.md', md);
console.log('rows', rows.length, 'FP total', cases.reduce((a, r) => a + r.falsePositiveHits, 0));
