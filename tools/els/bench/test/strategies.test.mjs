import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadStream, getScope, TANAKH_LETTERS, TORAH_LETTERS, CORPUS_ID } from '../lib/corpus.mjs';
import { runStrategy, enumerateViaAnchor, unpackKey, packKey } from '../lib/strategies.mjs';
import { replayResult, replayHit } from '../lib/verify.mjs';

const matrix = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'matrix.json'), 'utf8'));

test('corpus admission mirrors live tanakh_stream md5s and torah prefix', () => {
  assert.equal(loadStream().length, TANAKH_LETTERS);
  assert.equal(getScope('torah').n, TORAH_LETTERS);
  assert.equal(getScope('torah').corpusId, CORPUS_ID.torah);
});

test('key packing preserves canonical order (skip, start, fwd before back)', () => {
  const ks = [packKey(3, 5, -1), packKey(2, 9, 1), packKey(2, 9, -1), packKey(2, 4, 1)];
  ks.sort((a, b) => a - b);
  assert.deepEqual(ks.map(unpackKey), [{ skip: 2, start: 4, dir: 1 }, { skip: 2, start: 9, dir: 1 }, { skip: 2, start: 9, dir: -1 }, { skip: 3, start: 5, dir: -1 }]);
});

test('pair-join enumeration equals independent anchor enumeration (exact ground truth)', () => {
  for (const term of ['תורה', 'דוד', 'רגל', 'משיח']) {
    for (const scope of ['torah']) {
      const a = runStrategy('EXACT', { scope, term, maxskip: 300, cap: 1 });
      const b = enumerateViaAnchor(scope, term, 300, 20000);
      assert.equal(a.keys.length, b.keys.length, term);
      assert.ok(a.keys.every((k, i) => k === b.keys[i]), term);
    }
  }
});

test('golden occurrences exist, replay exactly, and are in the exhaustive canonical set', () => {
  for (const g of matrix.goldens) {
    const r = runStrategy('EXACT', { scope: g.scope, term: g.term, maxskip: g.skip, cap: 100000 });
    const hit = r.result.hits.find(h => h.skip === g.skip && h.dir === g.dir && h.start === g.start);
    assert.ok(hit, g.id);
    assert.equal(replayHit(getScope(g.scope), g.term, hit), null);
  }
});

for (const key of ['EXACT', 'ANCHOR', 'HYBRID']) {
  test(`${key}: zero false positives + replay ok across caps/classes`, () => {
    for (const term of ['תורה', 'דוד', 'רגל', 'אור', 'משיח', 'טוטפת']) {
      for (const cap of [16, 400]) {
        const { result } = runStrategy(key, { scope: 'torah', term, maxskip: 500, cap, budgetMs: 20000 });
        const v = replayResult(result);
        assert.equal(v.falsePositives, 0, `${key} ${term} ${cap}: ${v.reasons.join(';')}`);
        assert.equal(v.duplicates, 0);
        assert.ok(v.ok, v.reasons.join(';'));
        assert.ok(result.hits.length <= cap);
      }
    }
  });
}

test('every returned hit of every strategy is a member of the exhaustive truth set', () => {
  const truth = runStrategy('EXACT', { scope: 'torah', term: 'אור', maxskip: 500, cap: 1 }).keys;
  const set = new Set(truth);
  for (const key of ['ANCHOR', 'HYBRID']) {
    const { result } = runStrategy(key, { scope: 'torah', term: 'אור', maxskip: 500, cap: 400 });
    for (const h of result.hits) assert.ok(set.has(packKey(h.skip, h.start, h.dir)));
  }
});

test('sampled runs are labelled partial with strategy/policy/version and never claim exhaustive or negative', () => {
  for (const key of ['ANCHOR', 'HYBRID']) {
    const { result } = runStrategy(key, { scope: 'torah', term: 'אור', maxskip: 500, cap: 16 });
    assert.equal(result.completion.partial, true);
    assert.equal(result.completion.coverage, 'sampled_partial');
    assert.equal(result.completion.negative, false);
    assert.equal(result.completion.truncated, true);
    assert.equal(result.execution_strategy.exhaustive, false);
    assert.ok(result.execution_strategy.id && result.execution_strategy.version && result.completion.selection_policy);
    assert.equal(result.completion.total_hits, null);
  }
});

test('completed anchor/hybrid scan below cap is exhaustive and equals the canonical set (no-result is a true negative)', () => {
  for (const key of ['ANCHOR', 'HYBRID']) {
    const { result } = runStrategy(key, { scope: 'torah', term: 'זזזזזזזז', maxskip: 500, cap: 16 });
    assert.equal(result.status, 'EXECUTED_EMPTY');
    assert.equal(result.completion.negative, true);
    assert.equal(result.completion.scan_complete, true);
  }
  const exact = runStrategy('EXACT', { scope: 'torah', term: 'טוטפת', maxskip: 500, cap: 100000 });
  for (const key of ['ANCHOR', 'HYBRID']) {
    const r = runStrategy(key, { scope: 'torah', term: 'טוטפת', maxskip: 500, cap: 100000 }).result;
    assert.equal(r.completion.scan_complete, true);
    assert.deepEqual(r.hits.map(h => h.occurrence_id), exact.result.hits.map(h => h.occurrence_id));
  }
});

test('timeout is reported as TIMEOUT: never negative, never exhaustive', () => {
  const { result } = runStrategy('EXACT', { scope: 'tanakh', term: 'אל', maxskip: null, cap: 16, budgetMs: 50 });
  assert.equal(result.status, 'TIMEOUT');
  assert.equal(result.completion.negative, false);
  assert.equal(result.completion.scan_complete, false);
  assert.equal(result.completion.coverage, 'sampled_partial');
});

test('replay verifier rejects tampered hits and a sampled result claiming negative', () => {
  const { result } = runStrategy('ANCHOR', { scope: 'torah', term: 'תורה', maxskip: 500, cap: 16 });
  const bad = structuredClone(result);
  bad.hits[0].start += 1; bad.hits[0].positions = bad.hits[0].positions.map(p => p + 1);
  assert.ok(replayResult(bad).falsePositives > 0);
  const liar = structuredClone(result); liar.completion.negative = true;
  assert.equal(replayResult(liar).ok, false);
});

test('hybrid spreads a capped result across corpus segments and skip bands better than the anchor prefix', () => {
  const a = runStrategy('ANCHOR', { scope: 'torah', term: 'אור', maxskip: 500, cap: 400 }).result;
  const h = runStrategy('HYBRID', { scope: 'torah', term: 'אור', maxskip: 500, cap: 400 }).result;
  const segs = r => new Set(r.hits.map(x => Math.floor(x.start * 8 / getScope('torah').n))).size;
  assert.ok(segs(h) > segs(a));
});
