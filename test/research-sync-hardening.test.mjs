import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  acknowledgeResearchOps,
  appendResearchOp,
  applyResearchOps,
  hasMeaningfulResearchState,
  legacySnapshotToResearchOps,
} from '../src/lib/research/researchSyncState.js';

function op(id, kind, payload = {}) {
  return { op_id: id, kind, ...payload };
}

test('collection_update merges partial patches instead of dropping earlier fields', () => {
  let pending = [];
  pending = appendResearchOp(pending, op('u1', 'collection_update', { id: 'c1', patch: { name: 'A' } }));
  pending = appendResearchOp(pending, op('u2', 'collection_update', { id: 'c1', patch: { topic: 'B' } }));
  assert.equal(pending.length, 1);
  assert.equal(pending[0].op_id, 'u2');
  assert.deepEqual(pending[0].patch, { name: 'A', topic: 'B' });
});

test('in-flight acknowledgment cannot erase a newer merged collection update', () => {
  const first = op('u1', 'collection_update', { id: 'c1', patch: { name: 'A' } });
  let pending = [first];
  const sentIds = new Set(['u1']);

  pending = appendResearchOp(pending, op('u2', 'collection_update', { id: 'c1', patch: { topic: 'B' } }));
  pending = acknowledgeResearchOps(pending, sentIds);

  assert.equal(pending.length, 1);
  assert.equal(pending[0].op_id, 'u2');
  assert.deepEqual(pending[0].patch, { name: 'A', topic: 'B' });
});

test('collection add followed by update uses newest op id so old ack cannot erase update', () => {
  let pending = [op('a1', 'collection_add', { collection: { id: 'c1', name: 'A' } })];
  const sentIds = new Set(['a1']);

  pending = appendResearchOp(pending, op('u2', 'collection_update', { id: 'c1', patch: { topic: 'B' } }));
  assert.equal(pending.length, 1);
  assert.equal(pending[0].kind, 'collection_add');
  assert.equal(pending[0].op_id, 'u2');
  assert.deepEqual(pending[0].collection, { id: 'c1', name: 'A', topic: 'B' });

  pending = acknowledgeResearchOps(pending, sentIds);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].op_id, 'u2');
});

test('acknowledgment removes only exact sent operation ids', () => {
  const pending = [
    op('1', 'context_set', { context: { subject: 'A' } }),
    op('2', 'context_set', { context: { subject: 'B' } }),
  ];
  const next = acknowledgeResearchOps(pending, new Set(['1']));
  assert.deepEqual(next.map(x => x.op_id), ['2']);
});

test('legacy recovery is additive only and never adopts legacy context automatically', () => {
  const legacy = {
    cart: [{ id: 'n358', ref: '358', type: 'number', title: '358' }],
    saved: [{ id: 'n1820', ref: '1820', type: 'number', title: '1820' }],
    pinned: [],
    history: [{ id: 'h1', type: 'number', ref: '1' }],
    collections: [{ id: 'c1', name: 'old' }],
    journeys: [{ id: 'j1', root: 358, path: [] }],
    context: { subject: { id: 'legacy-context' } },
  };

  assert.equal(hasMeaningfulResearchState(legacy), true);
  const ops = legacySnapshotToResearchOps(legacy);
  assert.ok(ops.length > 0);
  assert.equal(ops.some(x => x.kind === 'item_delete' || x.kind === 'item_clear_bucket'), false);
  assert.equal(ops.some(x => x.kind === 'context_set'), false);

  const current = {
    cart: [],
    saved: [{ id: 'keep', ref: '26', type: 'number', title: '26' }],
    pinned: [], history: [], collections: [], journeys: [], context: null,
  };
  const merged = applyResearchOps(current, ops);
  assert.equal(merged.saved.some(x => x.id === 'keep'), true);
  assert.equal(merged.saved.some(x => x.id === 'n1820'), true);
});

test('flush response is invalidated by principal switch, not by pendingOps effect cleanup', () => {
  const source = readFileSync(new URL('../src/lib/research/ResearchProvider.jsx', import.meta.url), 'utf8');
  assert.match(source, /if \(!mountedRef\.current \|\| principalRef\.current !== expectedPrincipal\) return;/);
  assert.doesNotMatch(source, /if \(!alive \|\| principalRef\.current !== expectedPrincipal\) return;/);
});
