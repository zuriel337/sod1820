import test from 'node:test';
import assert from 'node:assert/strict';
import { supabase } from '../src/lib/supabase.js';
import { fetchCanonicalGraphEntityFindings } from '../src/lib/research/entityGraphFinding.js';
import { fetchEntityHubProjection } from '../src/lib/research/entityHubProjection.js';

// The Entity Hub reads the anchor node and then the graph. The graph reader used to read the very same row again
// before its edge reads, one sequential round trip on the critical path of every Number page and entity hub. These tests
// run the real readers against a local read-only fixture (no network, no writes) and pin both halves of the contract:
// a matching anchor removes the repeated read and changes nothing in the result; anything else is read as before.
const ANCHOR = { id: 'n-1', type: 'number', label: '878', description: 'd', metadata: { value: 878 }, identity_key: '878', is_active: true, created_at: '2026-01-01T00:00:00Z' };
const OTHER = { id: 'n-2', type: 'entity', label: 'דמעות משיח', description: null, metadata: {}, identity_key: 'x', is_active: true, created_at: '2026-01-02T00:00:00Z' };
const EDGE = { id: 'e-1', from_node: 'n-1', to_node: 'n-2', relation_type: 'equals', metadata: {}, created_at: '2026-01-03T00:00:00Z' };
const NODES = new Map([[ANCHOR.id, ANCHOR], [OTHER.id, OTHER]]);

function withFixture(run) {
  const original = { from: supabase.from, rpc: supabase.rpc };
  const calls = [];
  supabase.from = (table) => {
    const ops = [];
    const result = (single) => {
      calls.push({ table, ops: ops.map(([name, args]) => [name, ...args]) });
      const eq = (column) => ops.find(([name, args]) => name === 'eq' && args[0] === column)?.[1][1];
      const inList = (column) => ops.find(([name, args]) => name === 'in' && args[0] === column)?.[1][1];
      if (table === 'nodes') {
        if (eq('id') !== undefined) { const row = NODES.get(eq('id')) || null; return { data: single ? row : (row ? [row] : []), error: null }; }
        if (Array.isArray(inList('id'))) return { data: inList('id').map((id) => NODES.get(id)).filter(Boolean), error: null };
        if (eq('type') === 'number' && (eq('identity_key') === '878' || eq('label') === '878')) return { data: single ? ANCHOR : [ANCHOR], error: null };
        return { data: single ? null : [], error: null };
      }
      if (table === 'edges') return { data: ops.some(([name]) => name === 'or') ? [EDGE] : [], error: null };
      if (table === 'entity_types') return { data: single ? { type: 'number', label: 'fixture', tabs: [] } : [], error: null };
      return { data: single ? null : [], error: null, count: 0 };
    };
    const query = new Proxy({}, { get(_t, key) {
      if (key === 'then') return (resolve, reject) => Promise.resolve(result(false)).then(resolve, reject);
      if (key === 'maybeSingle' || key === 'single') return () => Promise.resolve(result(true));
      return (...args) => { ops.push([String(key), args]); return query; };
    } });
    return query;
  };
  supabase.rpc = (name, args) => { calls.push({ rpc: name, args }); return Promise.resolve({ data: [], error: null }); };
  return Promise.resolve(run(calls)).finally(() => { supabase.from = original.from; supabase.rpc = original.rpc; });
}
const anchorReads = (calls) => calls.filter((call) => call.table === 'nodes' && call.ops.some(([name, column]) => name === 'eq' && column === 'id')).length;

test('a matching anchor removes the repeated node read and leaves the findings identical', async () => {
  const plain = await withFixture(async (calls) => ({ findings: await fetchCanonicalGraphEntityFindings('n-1'), reads: anchorReads(calls) }));
  const reused = await withFixture(async (calls) => ({ findings: await fetchCanonicalGraphEntityFindings('n-1', { anchorNode: ANCHOR }), reads: anchorReads(calls) }));
  assert.equal(plain.reads, 1, 'without an anchor the graph reader reads the node by id');
  assert.equal(reused.reads, 0, 'with the resolved anchor it does not read the same row again');
  assert.ok(plain.findings.length >= 2, 'fixture must exercise the entity and relation findings');
  assert.deepEqual(reused.findings, plain.findings);
});

test('an anchor for a different node is ignored and the requested node is read as before', async () => {
  const plain = await withFixture(async () => fetchCanonicalGraphEntityFindings('n-1'));
  const mismatched = await withFixture(async (calls) => ({ findings: await fetchCanonicalGraphEntityFindings('n-1', { anchorNode: OTHER }), reads: anchorReads(calls) }));
  assert.equal(mismatched.reads, 1);
  assert.deepEqual(mismatched.findings, plain);
  for (const bad of [null, undefined, 'n-1', 7, { label: 'no id' }, { id: null }]) {
    const out = await withFixture(async (calls) => ({ findings: await fetchCanonicalGraphEntityFindings('n-1', { anchorNode: bad }), reads: anchorReads(calls) }));
    assert.equal(out.reads, 1, `unusable anchor ${JSON.stringify(bad)} must fall back to the read`);
    assert.deepEqual(out.findings, plain);
  }
});

test('an unknown node still yields no findings, with or without an anchor argument', async () => {
  assert.deepEqual(await withFixture(() => fetchCanonicalGraphEntityFindings('missing')), []);
  assert.deepEqual(await withFixture(() => fetchCanonicalGraphEntityFindings('missing', { anchorNode: ANCHOR })), []);
});

test('the Number page projection no longer reads its stored node a second time', async () => {
  const run = (calls) => fetchEntityHubProjection({ type: 'number', key: '878', allowUnstoredNumber: true, parallelNumberReads: true, includeMedia: false })
    .then((value) => ({ value, reads: anchorReads(calls) }));
  const out = await withFixture(run);
  assert.equal(out.reads, 0, 'the resolved Number node is handed to the graph reader');
  assert.equal(out.value.identity.nodeId, 'n-1');
  assert.ok(out.value.graph.relations.length >= 1, 'the stored node still projects its relations');
  const unstored = await withFixture((calls) => fetchEntityHubProjection({ type: 'number', key: '9999', allowUnstoredNumber: true, parallelNumberReads: true, includeMedia: false })
    .then((value) => ({ value, reads: anchorReads(calls) })));
  assert.equal(unstored.value.identity.nodeId, null, 'an unstored numeric root is still projected without a node');
  assert.equal(unstored.reads, 0);
});
