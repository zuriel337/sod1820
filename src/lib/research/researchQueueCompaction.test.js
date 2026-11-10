// The passive-queue bound must be LOSSLESS: for every queue and every starting state the final state is identical with and without it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyResearchOps, emptyResearchState } from './researchSyncState.js';
import { compactPassiveQueue, HISTORY_LIMIT } from './researchQueueCompaction.js';

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ent = id => ({ id: `e${id}`, ref: `e${id}`, type: 'number', title: `t${id}` });
function randomOp(random, pool) {
  const r = random();
  if (r < 0.55) return { kind: 'history_add', op_id: `o${random()}`, entity: { ...ent(Math.floor(random() * pool)), seq: random() } };
  if (r < 0.62) return { kind: 'history_clear', op_id: `o${random()}` };
  if (r < 0.77) return { kind: 'context_set', op_id: `o${random()}`, context: random() < 0.2 ? null : { subject: { id: `c${Math.floor(random() * 5)}` }, n: random() } };
  if (r < 0.87) return { kind: 'item_upsert', op_id: `o${random()}`, bucket: 'library', entity: ent(1000 + Math.floor(random() * 6)) };
  if (r < 0.92) return { kind: 'item_delete', op_id: `o${random()}`, bucket: 'library', entity_type: 'number', entity_ref: `e${1000 + Math.floor(random() * 6)}` };
  if (r < 0.96) return { kind: 'collection_add', op_id: `o${random()}`, collection: { id: `k${Math.floor(random() * 4)}`, name: 'c' } };
  return { kind: 'journey_add', op_id: `o${random()}`, journey: { id: `j${Math.floor(random() * 4)}`, root: `r${Math.floor(random() * 4)}` } };
}
function randomQueue(random, pool) {
  const queue = [], batches = 1 + Math.floor(random() * 160);
  for (let i = 0; i < batches; i++) {
    const n = random() < 0.8 ? 1 : 1 + Math.floor(random() * 3);
    queue.push({ batch_id: `b${i}`, ops: Array.from({ length: n }, () => randomOp(random, pool)) });
  }
  return queue;
}
const flat = queue => queue.flatMap(b => b.ops);
function randomBase(random, pool) {
  let base = emptyResearchState();
  if (random() < 0.7) base = applyResearchOps(base, Array.from({ length: Math.floor(random() * 70) }, () => ({ kind: 'history_add', entity: ent(Math.floor(random() * pool)) })));
  if (random() < 0.5) base = { ...base, context: { subject: { id: 'base' } } };
  return base;
}

test('lossless: the final state is identical with and without compaction (4000 random queues x 3 starting states, history pools of 8 and 120 ids)', () => {
  let dropped = 0, total = 0;
  for (let seed = 1; seed <= 4000; seed++) {
    const random = rng(seed), pool = seed % 2 ? 8 : 120, queue = randomQueue(random, pool);
    const protectedBatchId = random() < 0.3 ? queue[0].batch_id : null;
    const compact = compactPassiveQueue(queue, { protectedBatchId });
    total += queue.length; dropped += queue.length - compact.length;
    if (protectedBatchId) assert.ok(compact.some(b => b.batch_id === protectedBatchId), 'the in-flight batch is never dropped');
    for (let k = 0; k < 3; k++) {
      const base = randomBase(random, pool);
      assert.deepEqual(applyResearchOps(base, flat(compact)), applyResearchOps(base, flat(queue)), `seed ${seed}`);
    }
    // order and identity of what is kept
    assert.deepEqual(compact.map(b => b.batch_id), queue.map(b => b.batch_id).filter(id => compact.some(b => b.batch_id === id)));
    // batches with any non-passive op are never dropped
    for (const b of queue) if (b.ops.some(op => !['history_add', 'context_set'].includes(op.kind))) assert.ok(compact.some(c => c.batch_id === b.batch_id), `seed ${seed}: ${b.batch_id} kept`);
  }
  assert.ok(dropped > total * 0.25, `compaction actually removes work (${dropped}/${total})`);
});

test('bound: any number of page loads keeps at most 50 history batches and 1 context batch; real research batches are never touched', () => {
  const random = rng(7); let queue = [];
  for (let i = 0; i < 5000; i++) {
    queue = compactPassiveQueue([...queue, { batch_id: `h${i}`, ops: [{ kind: 'history_add', op_id: `a${i}`, entity: ent(Math.floor(random() * 400)) }] }]);
    if (i % 3 === 0) queue = compactPassiveQueue([...queue, { batch_id: `c${i}`, ops: [{ kind: 'context_set', op_id: `x${i}`, context: { subject: { id: `s${i}` } } }] }]);
    if (i % 500 === 0) queue = compactPassiveQueue([...queue, { batch_id: `w${i}`, ops: [{ kind: 'item_upsert', op_id: `w${i}`, bucket: 'library', entity: ent(9000 + i) }] }]);
  }
  const history = queue.filter(b => b.batch_id.startsWith('h')).length, context = queue.filter(b => b.batch_id.startsWith('c')).length, real = queue.filter(b => b.batch_id.startsWith('w')).length;
  assert.ok(history <= HISTORY_LIMIT, `history batches ${history}`); assert.equal(context, 1); assert.equal(real, 10, 'all 10 real research batches kept');
});

test('a mixed batch (history + research item) keeps its history op: nothing is partially rewritten', () => {
  const mixed = { batch_id: 'm', ops: [{ kind: 'history_add', entity: ent(1) }, { kind: 'item_upsert', bucket: 'library', entity: ent(2) }] };
  const queue = [mixed, { batch_id: 'later', ops: [{ kind: 'history_add', entity: ent(1) }] }];
  const compact = compactPassiveQueue(queue);
  assert.deepEqual(compact, queue, 'the mixed batch is untouched even though its history op is overwritten');
});

test('boundary: the 50th newest distinct entry is kept, the 51st is dropped; entries before a history_clear are dropped', () => {
  const adds = n => Array.from({ length: n }, (_, i) => ({ batch_id: `b${i}`, ops: [{ kind: 'history_add', entity: ent(i) }] }));
  assert.equal(compactPassiveQueue(adds(50)).length, 50, '50 distinct entries all remain visible: nothing may be dropped');
  const fifty1 = compactPassiveQueue(adds(51));
  assert.equal(fifty1.length, 50); assert.equal(fifty1[0].batch_id, 'b1', 'only the oldest (the 51st newest) goes');
  const withClear = [...adds(5), { batch_id: 'clear', ops: [{ kind: 'history_clear' }] }, ...adds(3).map((b, i) => ({ ...b, batch_id: `after${i}` }))];
  assert.deepEqual(compactPassiveQueue(withClear).map(b => b.batch_id), ['clear', 'after0', 'after1', 'after2'], 'the clear itself is kept; what it wiped is dropped');
});
