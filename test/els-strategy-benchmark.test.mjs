import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as S from '../tools/els/bench/strategies.mjs';

const corpus = S.loadCorpus();
const md5 = (s) => createHash('md5').update(s).digest('hex');
const ctxT = S.makeCtx(corpus, 'torah');
const ctxK = S.makeCtx(corpus, 'tanakh');
const key = (h) => S.hitKey(h);

test('benchmark reads the canonical Tanakh stream (hash-pinned, 1204583 letters)', () => {
  assert.equal(corpus.text.length, S.TANAKH_LEN);
  assert.equal(md5(corpus.text), 'baf161858c0b4dc57b5b96990bea18db');
  assert.equal(md5(corpus.text.slice(0, S.TORAH_LEN)), '0066c2431821863d258745e664d3883e');
});

test('A EXACT_EXHAUSTIVE_V1 reproduces the canonical Tanakh Goldens (יונה skips 2..40)', () => {
  const r = S.runExact(ctxK, { term: 'יונה', maxskip: 40, cap: 8, budgetMs: 20000 });
  assert.deepEqual(r.hits.slice(0, 2), [{ skip: 2, dir: -1, start: 13876 }, { skip: 2, dir: 1, start: 44400 }]);
  assert.equal(r.completion.state, 'TRUNCATED_ORDERED_PREFIX');
  assert.equal(r.completion.sampled, false);
});

test('anchor exhaustive equals skip-major exhaustive (independent algorithms) on bounded domains, both scopes', () => {
  for (const [ctx] of [[ctxT], [ctxK]]) for (const term of ['יונה', 'אבא', 'הבל', 'אמר', 'טטטטטטטט']) {
    const a = S.groundTruth(ctx, term, 40, 30000, true), b = S.groundTruth(ctx, term, 40, 30000, false);
    assert.equal(a.status, 'OK'); assert.equal(b.status, 'OK');
    assert.deepEqual(b.hits, a.hits, term);
  }
});

test('B and C: every returned occurrence replays exactly, is a true canonical occurrence, no duplicates (FP = 0)', () => {
  for (const [ctx, scope] of [[ctxT, 'torah'], [ctxK, 'tanakh']]) for (const term of ['אמר', 'ישראל', 'אבא', 'נון', 'הבל', 'יונה']) for (const cap of [16, 400]) {
    const q = { term, scope, maxskip: 40, cap, budgetMs: 20000 };
    const gt = new Set(S.groundTruth(ctx, term, 40, 30000, true).hits.map(key));
    for (const fn of [S.runAnchorFast, S.runHybrid]) {
      const r = fn(ctx, q); const seen = new Set();
      assert.ok(r.hits.length <= cap);
      for (const h of r.hits) { assert.ok(S.replay(corpus.text, term, h, S.scopeLen(scope))); assert.ok(gt.has(key(h))); assert.ok(!seen.has(key(h))); seen.add(key(h)); }
      assert.deepEqual([...r.hits].sort(S.canonicalCmp), r.hits);
    }
  }
});

test('B and C are exact-complete when the result fits under the cap (same set as exhaustive)', () => {
  for (const term of ['ישראל', 'נבוכדנצר', 'טטטטטטטט']) {
    const gt = S.groundTruth(ctxK, term, 40, 30000, true).hits;
    for (const fn of [S.runAnchorFast, S.runHybrid]) {
      const r = fn(ctxK, { term, scope: 'tanakh', maxskip: 40, cap: gt.length + 50, budgetMs: 20000 });
      assert.equal(r.completion.state, 'COMPLETE_EXACT'); assert.deepEqual(r.hits, gt);
    }
  }
});

test('sampled/partial results never claim canonical negative or exhaustiveness; timeouts are TIMEOUT not NOT_FOUND', () => {
  const capped = S.runHybrid(ctxK, { term: 'אמר', scope: 'tanakh', maxskip: 40, cap: 16, budgetMs: 20000 });
  assert.equal(capped.completion.state, 'PARTIAL_SAMPLED'); assert.equal(capped.completion.sampled, true);
  assert.equal(capped.completion.negative, false); assert.equal(capped.completion.selection_policy, 'stratified_anchor_v1');
  const to = S.runExact(ctxK, { term: 'טטטטטטטט', maxskip: S.fullMaxSkip(S.TANAKH_LEN, 8), cap: 16, budgetMs: 30 });
  assert.equal(to.completion.state, 'TIMEOUT_UNBOUNDED_COST'); assert.equal(to.completion.negative, false);
  const empty = S.runAnchorFast(ctxK, { term: 'טטטטטטטט', scope: 'tanakh', maxskip: 40, cap: 16, budgetMs: 20000 });
  assert.equal(empty.completion.negative, empty.hits.length === 0 && empty.completion.state === 'COMPLETE_EXACT');
});

test('hybrid coverage: spans more corpus deciles than anchor-prefix on a capped common term', () => {
  const dec = (hits) => new Set(hits.map((h) => Math.floor(h.start / S.TANAKH_LEN * 10))).size;
  const q = { term: 'אמר', scope: 'tanakh', maxskip: S.fullMaxSkip(S.TANAKH_LEN, 3), cap: 400, budgetMs: 20000 };
  const b = S.runAnchorFast(ctxK, q), c = S.runHybrid(ctxK, q);
  assert.ok(dec(c.hits) >= dec(b.hits)); assert.ok(dec(c.hits) >= 8);
});

test('result envelope preserves corpus_id, zero-based coordinates, contract, dependency group and strategy provenance', () => {
  const q = { term: 'יונה', scope: 'tanakh', maxskip: 40, cap: 8, budgetMs: 20000 };
  const env = S.toResultV1(ctxK, q, S.runHybrid(ctxK, q));
  assert.equal(env.contract, 'els_search_result_v1'); assert.equal(env.corpus_id, S.CORPUS_IDS.tanakh);
  assert.equal(env.coordinate.position_base, 0); assert.match(env.dependency_group, /^els:0b022e8e/);
  assert.equal(env.completion.strategy, 'HYBRID_COVERAGE_V1'); assert.equal(env.completion.sampled, true);
  for (const h of env.hits) assert.equal(h.end, h.start + h.dir * h.skip * 3);
});

test('legacy browser findAll baseline is runnable from the template extraction', () => {
  const legacy = S.loadLegacy(corpus, 'torah'); const r = legacy.run('יונה', 16, 20000);
  assert.equal(r.timedOut, false); assert.ok(r.hits.length > 0);
  for (const h of r.hits) assert.ok(S.replay(corpus.text, 'יונה', h, S.TORAH_LEN, 1));
});

test('final-letter terms are normalised (ירושלים / נון) and replay-verified in every strategy', () => {
  for (const raw of ['ירושלים', 'נון']) {
    const term = S.normalize(raw); assert.ok(!/[ךםןףץ]/.test(term));
    for (const fn of [S.runExact, S.runAnchorFast, S.runHybrid]) {
      const r = fn(ctxK, { term: raw, scope: 'tanakh', maxskip: 40, cap: 50, budgetMs: 20000 });
      for (const h of r.hits) assert.ok(S.replay(corpus.text, term, h, S.TANAKH_LEN));
    }
  }
});
