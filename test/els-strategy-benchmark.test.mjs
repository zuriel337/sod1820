import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus, scopeView, norm, TORAH_LEN } from '../tools/els/benchmark/corpus.mjs';
import { STRATEGIES, skipBands } from '../tools/els/benchmark/strategies.mjs';
import { replayVerify, hitKey, canonicalCompare } from '../tools/els/benchmark/verify.mjs';
import { loadLegacy } from '../tools/els/benchmark/legacy.mjs';
import { ELS_GOLDENS } from './fixtures/els-runtime-goldens.mjs';

const corpus = loadCorpus();
const torah = scopeView(corpus, 'torah'), tanakh = scopeView(corpus, 'tanakh');
const L = corpus.letters;

// naive oracle over the raw string (same shape as els-tanakh-canonical-stream.test.mjs; NOT an engine)
function oracle(view, term, smin, smax) {
  const n = term.length, out = [], N = view.N;
  for (let skip = smin; skip <= smax; skip++) for (let st = 0; st < N; st++) {
    if (L[st] !== term[0]) continue;
    let f = st + (n - 1) * skip < N, b = st - (n - 1) * skip >= 0;
    for (let k = 1; k < n && (f || b); k++) { if (f && L[st + k * skip] !== term[k]) f = false; if (b && L[st - k * skip] !== term[k]) b = false; }
    if (f) out.push({ skip, dir: 1, start: st }); if (b) out.push({ skip, dir: -1, start: st });
  }
  return out.sort(canonicalCompare);
}

test('corpus admission: canonical hashes gate the benchmark', () => {
  assert.equal(corpus.admission.ok, true);
  assert.equal(corpus.admission.letters, 1204583);
});

test('A (exact exhaustive) equals the naive oracle in canonical order — torah and tanakh, bounded skips', () => {
  for (const [view, term, lo, hi] of [[torah, 'שדי', 1, 12], [torah, 'אבא', 1, 6], [tanakh, 'יונה', 2, 9], [torah, 'אליהו', 1, 200]]) {
    const r = STRATEGIES.EXACT_EXHAUSTIVE_V1(view, term, { skipMin: lo, skipMax: hi });
    const want = oracle(view, term, lo, hi);
    assert.deepEqual(r.hits, want, `${view.scope}:${term}`);
    assert.equal(r.meta.exhaustive, true); assert.equal(r.meta.els_count, want.length);
  }
});

test('Tanakh Golden: יונה skips 2..40 first canonical hits match the admitted oracle constants', () => {
  const r = STRATEGIES.EXACT_EXHAUSTIVE_V1(tanakh, 'יונה', { skipMin: 2, skipMax: 40, cap: 2 });
  assert.deepEqual(r.hits, [{ skip: 2, dir: -1, start: 13876 }, { skip: 2, dir: 1, start: 44400 }]);
});

test('every strategy: zero false positives, exact replay, coordinates inside scope, no duplicates', () => {
  for (const view of [torah, tanakh]) for (const term of ['תורה', 'אבא', 'יונה', 'אל']) for (const cap of [16, 400]) {
    for (const [name, fn] of Object.entries(STRATEGIES)) {
      const r = fn(view, term, { cap, skipMax: 60, deadlineMs: 20000 });
      assert.ok(r.hits.length <= cap, name);
      assert.equal(new Set(r.hits.map(hitKey)).size, r.hits.length, `${name} duplicates`);
      for (const h of r.hits) assert.equal(replayVerify(view, term, h), 'MATCH', `${name} ${term} ${JSON.stringify(h)}`);
    }
  }
});

test('sampled strategies are a subset of exact truth; complete scans equal truth in canonical order', () => {
  for (const term of ['יונה', 'שדי']) {
    const truth = STRATEGIES.EXACT_EXHAUSTIVE_V1(torah, term, { skipMax: 40 }).hits, keys = new Set(truth.map(hitKey));
    for (const name of ['ANCHOR_FAST_V1', 'HYBRID_COVERAGE_V1']) {
      const small = STRATEGIES[name](torah, term, { cap: 50, skipMax: 40 });
      assert.equal(small.meta.exhaustive, false); assert.match(small.meta.completeness, /^SAMPLED_PARTIAL/);
      assert.ok(small.hits.every((h) => keys.has(hitKey(h))));
      const big = STRATEGIES[name](torah, term, { cap: truth.length + 10, skipMax: 40 });
      assert.equal(big.meta.exhaustive, true); assert.equal(big.meta.completeness, 'EXHAUSTIVE_COMPLETE');
      assert.deepEqual(big.hits, truth, `${name} complete scan must equal canonical truth`);
    }
  }
});

test('sampled no-hit is never authoritative NOT_FOUND; only a complete scan may say so', () => {
  // budget-starved scan of a common term with a tiny work budget: sampled, zero hits allowed, must not claim NOT_FOUND
  const s = STRATEGIES.HYBRID_COVERAGE_V1(tanakh, 'ירושלים', { cap: 400, maxWork: 1000 });
  assert.equal(s.meta.exhaustive, false); assert.equal(s.meta.not_found_authoritative, false);
  const none = STRATEGIES.ANCHOR_FAST_V1(torah, 'זזזזזזזז', { cap: 400 });
  assert.equal(none.hits.length, 0); assert.equal(none.meta.exhaustive, true); assert.equal(none.meta.not_found_authoritative, true);
  const capped = STRATEGIES.ANCHOR_FAST_V1(tanakh, 'אליהו', { cap: 4000, maxWork: 500 });
  assert.equal(capped.meta.not_found_authoritative, false); assert.equal(capped.meta.exhaustive, false);
});

test('provenance: sampled results identify strategy, policy and version', () => {
  for (const name of ['ANCHOR_FAST_V1', 'HYBRID_COVERAGE_V1']) {
    const m = STRATEGIES[name](torah, 'תורה', { cap: 16 }).meta;
    assert.equal(m.strategy, name); assert.ok(m.policy && m.version === 'v1'); assert.equal(m.exhaustive, false);
  }
});

test('Goldens: all strategies return the recorded occurrence when the skip domain is the Golden skip', () => {
  for (const g of ELS_GOLDENS) for (const [name, fn] of Object.entries(STRATEGIES)) {
    const r = fn(torah, g.term, { cap: 16, skipMin: g.skip, skipMax: g.skip });
    const h = r.hits.find((x) => x.start === g.start && x.dir === g.dir && x.skip === g.skip);
    assert.ok(h, `${name}:${g.id}`);
    assert.deepEqual(Array.from({ length: norm(g.term).length }, (_, k) => h.start + h.dir * k * h.skip), g.positions);
  }
});

test('hybrid coverage: capped result spreads over corpus positions and skip bands better than anchor prefix', () => {
  const bins = (v, hs) => new Set(hs.map((h) => Math.floor(h.start / (v.N / 16)))).size;
  const a = STRATEGIES.ANCHOR_FAST_V1(tanakh, 'תורה', { cap: 400, skipMax: 500 }), h = STRATEGIES.HYBRID_COVERAGE_V1(tanakh, 'תורה', { cap: 400, skipMax: 500 });
  assert.ok(bins(tanakh, h.hits) >= 12, `hybrid bins ${bins(tanakh, h.hits)}`);
  assert.ok(bins(tanakh, h.hits) > bins(tanakh, a.hits));
  assert.equal(h.hits.length, 400);
});

test('skipBands partition the skip domain exactly', () => {
  for (const [lo, hi] of [[1, 40], [1, 500], [1, 133000], [5, 5], [1, 2]]) {
    const b = skipBands(lo, hi); assert.equal(b[0][0], lo); assert.equal(b.at(-1)[1], hi);
    for (let i = 1; i < b.length; i++) assert.equal(b[i][0], b[i - 1][1] + 1);
  }
});

test('legacy baseline extracts verbatim from the template and runs; its hits are exact', () => {
  const lg = loadLegacy(corpus.letters, 'torah');
  const r = lg.findAll('תורה', 400);
  assert.equal(r.hits.length, 400); assert.equal(r.capped, 1);
  for (const h of r.hits) assert.equal(replayVerify(torah, 'תורה', h), 'MATCH');
});

test('replay verifier rejects off-by-one, wrong direction and out-of-scope coordinates', () => {
  const g = ELS_GOLDENS[0];
  assert.equal(replayVerify(torah, g.term, { skip: g.skip, dir: 1, start: g.start }), 'MATCH');
  assert.equal(replayVerify(torah, g.term, { skip: g.skip, dir: 1, start: g.start + 1 }), 'MISMATCH');
  assert.equal(replayVerify(torah, g.term, { skip: g.skip, dir: -1, start: g.start }), 'MISMATCH');
  assert.equal(replayVerify(torah, g.term, { skip: 1, dir: 1, start: TORAH_LEN - 1 }), 'MISMATCH');
});
