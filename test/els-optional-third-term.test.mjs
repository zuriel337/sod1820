import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../tools/els/els-code.template.html', import.meta.url), 'utf8');
const implementation = source.slice(source.indexOf('  async function runCrossThree('), source.indexOf('  async function continueNativeCross('));
const terms = ['אבג', 'דהו', 'זחט'];

function fixture({ extra = false, rejectThird = false, throwThird = false, failRequired = false, supersede = false, more = false, sourcePair = false, sourceThird = false } = {}) {
  const calls = { prefetch: [], axes: [], verify: [], status: [] };
  const hit = { skip: 31, dir: 1, start: 20, positions: [20, 51, 82], v: 'MATCH' };
  const detail = term => ({ t: term, skip: 30, dir: 1, p0: 19, cost: 1 });
  const context = vm.createContext({ Date, Map, Set, DOMException,
    _matrixRequestSeq: 1, _nativeTripleScanSeq: 0, _nativeTripleScan: null, st: { scope: 'torah' },
    norm: value => value, scopeN: () => 1000, nativeWindow: () => ({ ctxR: 3, windowColumns: 41 }),
    prefetchVerified: async axes => { calls.prefetch.push([...axes]); },
    faMemo: term => { assert.ok(calls.prefetch.some(axes => axes.includes(term)), 'no undeclared full-corpus lookup'); return { hits: [hit] }; },
    crossFindBounded: async (axis, others, pure, window, op, progress, epoch, previous) => {
      calls.axes.push({ axis, others: [...others], gap: window.maxLetterGap });
      return { resA: { hits: [hit] }, meetings: [{ occ: 0, detail: others.map(t => ({ ...detail(t), skip: sourcePair ? 1 : 30 })), score: 1, skip: 31 }], scanned: previous ? 2 : 1, available: more ? 2 : 1 };
    },
    crossFindMultiHit: () => extra ? { detail: [{ ...detail(terms[2]), skip: sourceThird ? 1 : 30 }] } : null,
    isSourceHit: h => h.skip === 1,
    isGov: value => value?.v === 'MATCH', hasGov: () => true,
    hitKey: h => `${h.skip}_${h.dir}_${h.start}`, occ: () => hit,
    verifyBatch: async (term, hits) => {
      calls.verify.push(term);
      if (supersede) context._matrixRequestSeq++;
      if (term === terms[2] && throwThird) throw new Error('verification unavailable');
      if (term !== terms[2] && failRequired) return { ok: false };
      return { ok: true, verified: new Set(term === terms[2] && rejectThird ? [] : hits.map(h => `${h.skip}_${h.dir}_${h.start}`)) };
    },
    openZone: () => {}, healGoverned: async () => {},
    operationStatus: (op, status, message, progress) => { calls.status.push({ status, message, progress }); },
  });
  vm.runInContext(implementation, context);
  return { context, calls, async run(operation = { thirdRequired: false, maxLetterGap: 0 }, prior = null) {
    await context.runCrossThree(terms, 18, operation, prior);
    return { operation, rows: context.st.crossMeetings || [], last: calls.status.at(-1) };
  } };
}

test('optional third retains verified pairs when absent and only scans the first two axes', async () => {
  const f = fixture(), result = await f.run();
  assert.equal(result.last.status, 'done');
  assert.deepEqual(f.calls.prefetch, [terms.slice(0, 2)]);
  assert.deepEqual(f.calls.axes.map(x => x.axis), terms.slice(0, 2));
  assert.ok(result.rows.every(x => x.detail.length === 1 && x.optionalThird.status === 'NOT_FOUND_IN_WINDOW'));
  assert.equal(result.last.progress.thirdRequired, false);
});

test('optional third is added only after replay; failed replay keeps the pair without the third', async () => {
  for (const options of [{ extra: true }, { extra: true, rejectThird: true }, { extra: true, throwThird: true }]) {
    const f = fixture(options), result = await f.run();
    const valid = !options.rejectThird && !options.throwThird;
    assert.equal(result.last.status, 'done');
    assert.ok(result.rows.every(x => x.detail.length === (valid ? 2 : 1)));
    assert.ok(result.rows.every(x => x.optionalThird.status === (valid ? 'VERIFIED' : 'UNVERIFIED')));
    assert.ok(f.calls.verify.includes(terms[2]));
    assert.equal(result.last.progress.pendingCandidates, 0, 'enrichment must not change the continuation identity');
    assert.equal(result.last.progress.canContinue, false);
    if (valid) assert.ok(result.rows.every(x => x.detail.at(-1).rar === null), 'local verification is not a global frequency count');
  }
});

test('omitted flag preserves existing Guided all-three contract; mandatory verification fails closed', async () => {
  const f = fixture(), result = await f.run({ maxLetterGap: 2 });
  assert.deepEqual(f.calls.prefetch, [terms]);
  assert.equal(f.calls.axes.length, 3);
  assert.ok(result.rows.every(x => x.detail.length === 2 && !x.optionalThird));
  assert.equal(result.last.progress.thirdRequired, true);
  assert.ok(f.calls.axes.every(x => x.gap === 2));
  const failed = await fixture({ failRequired: true }).run();
  assert.equal(failed.last.status, 'error');assert.equal(failed.rows.length, 0);
});

test('continuation preserves optional semantics, exact geometry and admitted results', async () => {
  const f = fixture({ more: true });
  const first = await f.run({ thirdRequired: false, maxLetterGap: 2 });
  const prior = f.context._nativeTripleScan;
  assert.equal(first.last.progress.canContinue, true);
  const next = await f.run({}, prior);
  assert.equal(f.calls.prefetch.length, 1);
  assert.equal(next.last.progress.thirdRequired, false);
  assert.equal(next.last.progress.token, first.last.progress.token);
  assert.equal(next.last.progress.scanned, 4);
  assert.equal(next.rows.length, first.rows.length, 'no repeated admission of the same pair');
  assert.ok(f.calls.axes.every(x => x.gap === 2));
});

test('superseded verification never commits a stale pair or optional finding', async () => {
  const result = await fixture({ supersede: true, extra: true }).run();
  assert.equal(result.rows.length, 0);assert.equal(result.operation.committed, undefined);
});

test('optional term does not discard source-text pairs or label literal source as ELS', async () => {
  const f = fixture({ sourcePair: true, sourceThird: true, extra: true }), result = await f.run();
  assert.equal(result.last.status, 'done');
  assert.ok(result.rows.every(x => x.detail.length === 2 && x.optionalThird.status === 'SOURCE_EXACT'));
  assert.deepEqual(f.calls.verify, [], 'ordinary text is not presented as ELS replay');
  const strict = await fixture({ sourcePair: true }).run({ thirdRequired: true });
  assert.equal(strict.last.status, 'empty', 'existing strict Guided semantics remain unchanged');
});
