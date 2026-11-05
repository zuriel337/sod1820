import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as tick } from 'node:timers/promises';
import { supabase } from '../src/lib/supabase.js';
import { fetchEntityHubProjection } from '../src/lib/research/entityHubProjection.js';

// Number page projection: (1) the reads that depend only on the numeric value start in parallel with the node lookup
// instead of after it, (2) fn_number_lookup is read once and shared by the families and the number_lookup lens, and
// (3) every guard that keeps the result identical (cap fallback, error fallback, node mismatch, identity terms, rejected
// node read) is pinned. The real projection runs over a local read-only fixture: no network, no writes.
const NODE = { id: 'n-878', type: 'number', label: '878', description: null, metadata: {}, identity_key: '878', is_active: true, created_at: '2026-01-01T00:00:00Z' };
const row = (method, phrase, i, extra = {}) => ({
  method, phrase, value: 878, source: 's', vip_source: null, is_verified: true, dna_status: null, node_id: null, category: 'atomic', tags: null,
  mathematical_family: null, order_sensitive: false, word_boundary_sensitive: false, final_letter_sensitive: false,
  atomic_or_composite: 'atomic', component_methods: null, component_values: null, operator: null, provenance: 'p',
  method_evidence_class: 'governed', method_governed: true, method_active: true, method_scannable: true, method_executable: true,
  method_engine_verified: true, row_provenance_state: 'verified', bid_id: `b-${method}-${i}`, word_id: `w-${i}`, method_version: 1,
  dependency_version_snapshot: null, computed_at: null, engine_run_id: null, verified_at: null, verified_run_id: null,
  verified_method_version: null, verified_mismatch_value: null, total_count: 0, ...extra,
});
const rowsFor = (n, method = 'רגיל') => Array.from({ length: n }, (_, i) => row(method, `ביטוי ${i}`, i));

function harness({ nodeRead = () => ({ data: [NODE], error: null }), lookup = () => ({ data: rowsFor(3), error: null }), rpcFail = false } = {}) {
  const original = { from: supabase.from, rpc: supabase.rpc };
  const calls = [];
  supabase.from = (table) => {
    const ops = [];
    const result = (single) => {
      calls.push({ table, ops: ops.map(([name, args]) => [name, ...args]) });
      const eq = (column) => ops.find(([name, args]) => name === 'eq' && args[0] === column)?.[1][1];
      if (table === 'nodes' && eq('type') === 'number' && (eq('identity_key') !== undefined || eq('label') !== undefined)) {
        return Promise.resolve(nodeRead(eq('identity_key') !== undefined ? 'identity_key' : 'label')).then((out) => (out.error ? out : { data: single ? out.data?.[0] ?? null : out.data, error: null }));
      }
      if (table === 'nodes' && eq('id') !== undefined) return { data: single ? (eq('id') === NODE.id ? NODE : null) : (eq('id') === NODE.id ? [NODE] : []), error: null };
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
  supabase.rpc = (name, args) => {
    calls.push({ rpc: name, args });
    if (rpcFail) return Promise.reject(new Error('synthetic transport failure'));
    return Promise.resolve(name === 'fn_number_lookup' ? lookup(args) : { data: [], error: null });
  };
  return { calls, restore: () => { supabase.from = original.from; supabase.rpc = original.rpc; } };
}
const lookupCalls = (calls) => calls.filter((call) => call.rpc === 'fn_number_lookup');
const project = (key, over = {}) => fetchEntityHubProjection({ type: 'number', key, relationLimit: 140, researchLimit: 80, topicLimit: 24, allowUnstoredNumber: true, parallelNumberReads: true, includeMedia: false, ...over });
const families = (value) => Object.fromEntries((value.gematria?.families || []).map((family) => [family.method, family.count]));

test('value reads start in parallel with the node lookup, not after it', async () => {
  let release; const gate = new Promise((resolve) => { release = resolve; });
  const h = harness({ nodeRead: () => gate.then(() => ({ data: [NODE], error: null })) });
  try {
    const pending = project('878');
    await tick(); await tick();
    for (const name of ['fn_number_lookup', 'fn_zero_scale', 'posts_by_number_strict']) {
      assert.ok(h.calls.some((call) => call.rpc === name), `${name} must already be requested while the node lookup is still pending`);
    }
    assert.equal(h.calls.some((call) => call.rpc === 'fn_number_dossier'), false, 'the research lenses keep waiting for the node (their provenance names it)');
    release();
    const value = await pending;
    assert.equal(value.identity.nodeId, 'n-878');
    assert.equal(lookupCalls(h.calls).length, 1, 'one fn_number_lookup request for the whole projection');
    assert.deepEqual(lookupCalls(h.calls)[0].args, { p_value: 878, p_limit: 500, p_after_bid_id: null });
    assert.equal(h.calls.filter((call) => call.rpc === 'posts_by_number_strict').length, 1, 'no read is issued twice');
    assert.equal(h.calls.filter((call) => call.rpc === 'fn_zero_scale').length, 1);
  } finally { release?.(); h.restore(); }
});

test('without the Number-page option nothing starts before the node lookup (default scheduling boundary)', async () => {
  let release; const gate = new Promise((resolve) => { release = resolve; });
  const h = harness({ nodeRead: () => gate.then(() => ({ data: [NODE], error: null })) });
  try {
    const pending = project('878', { parallelNumberReads: false });
    await tick(); await tick();
    assert.equal(lookupCalls(h.calls).length, 0);
    assert.equal(h.calls.some((call) => call.rpc === 'fn_zero_scale'), false);
    release();
    const value = await pending;
    assert.equal(lookupCalls(h.calls).length, 1, 'the serial path shares the lookup too');
    assert.ok(value.gematria.families.length >= 1);
  } finally { release?.(); h.restore(); }
});

test('shared lookup leaves the families identical to the unbounded read for a complete answer', async () => {
  const h = harness({ lookup: () => ({ data: [...rowsFor(7, 'רגיל'), ...rowsFor(4, 'מילוי')], error: null }) });
  try {
    const value = await project('878');
    assert.deepEqual(families(value), { 'רגיל': 7, 'מילוי': 4 });
    assert.equal(lookupCalls(h.calls).length, 1);
  } finally { h.restore(); }
});

test('an answer that reached the window cap falls back to the original unbounded read, so counts stay whole', async () => {
  const full = [...rowsFor(620, 'רגיל'), ...rowsFor(30, 'מילוי')];
  const h = harness({ lookup: (args) => ({ data: args.p_limit ? full.slice(0, args.p_limit) : full, error: null }) });
  try {
    const value = await project('878');
    assert.deepEqual(families(value), { 'רגיל': 620, 'מילוי': 30 }, 'counts come from the unbounded read, not the 500-row window');
    const calls = lookupCalls(h.calls);
    assert.equal(calls.length, 2);
    assert.ok(calls.some((call) => call.args.p_limit === 500), 'the shared paged read for the lens');
    assert.ok(calls.some((call) => !('p_limit' in call.args)), 'the original unbounded read for the families');
  } finally { h.restore(); }
});

test('a failed paged read keeps both consumers working through their original fallbacks', async () => {
  const rows = [...rowsFor(5, 'רגיל'), ...rowsFor(2, 'מילוי')];
  const h = harness({ lookup: (args) => (args.p_limit
    ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.fn_number_lookup(p_after_bid_id, p_limit, p_value)' } }
    : { data: rows, error: null }) });
  try {
    const value = await project('878');
    assert.deepEqual(families(value), { 'רגיל': 5, 'מילוי': 2 }, 'families fall back to the plain read');
    assert.ok(lookupCalls(h.calls).some((call) => !('p_limit' in call.args)), 'the legacy one-argument contract is still used');
  } finally { h.restore(); }
});

test('a resolved node for a different number discards the speculative reads and projects the node\'s own number', async () => {
  const other = { ...NODE, id: 'n-879', label: '879', identity_key: '878' };
  const h = harness({ nodeRead: (via) => ({ data: via === 'identity_key' ? [other] : [], error: null }), lookup: (args) => ({ data: rowsFor(args.p_value === 879 ? 2 : 9), error: null }) });
  try {
    const value = await project('878');
    assert.equal(value.identity.label, '879');
    assert.deepEqual(families(value), { 'רגיל': 2 }, 'only the 879 rows may reach the projection');
    assert.ok(lookupCalls(h.calls).some((call) => call.args.p_value === 879));
  } finally { h.restore(); }
  // Same guard for the research rows when the node has no identity key of its own: they must be read for 879, not reused for 878.
  const bare = { ...NODE, id: 'n-879', label: '879', identity_key: '' };
  const h2 = harness({ nodeRead: (via) => ({ data: via === 'label' ? [bare] : [], error: null }) });
  try {
    const value = await project('878');
    assert.equal(value.identity.label, '879');
    const valueReads = h2.calls.filter((call) => call.table === 'research_objects')
      .flatMap((call) => call.ops.filter(([name, column]) => name === 'eq' && column === 'value').map((op) => op[2]));
    assert.ok(valueReads.includes(879), 'research rows are read for the resolved number');
  } finally { h2.restore(); }
});

test('a node whose identity key differs from its label still reads its identity term for the research rows', async () => {
  const keyed = { ...NODE, identity_key: 'number-878' };
  const h = harness({ nodeRead: () => ({ data: [keyed], error: null }) });
  try {
    await project('878');
    const researchReads = h.calls.filter((call) => call.table === 'research_objects');
    assert.ok(researchReads.some((call) => call.ops.some(([name, column, value]) => name === 'contains' && column === 'terms' && JSON.stringify(value) === JSON.stringify(['number-878']))),
      'the identity key is read as a term, exactly as without the speculative start');
  } finally { h.restore(); }
});

test('a rejected node read rejects the projection and leaves no unhandled rejection from the speculative reads', async () => {
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  const h = harness({ nodeRead: () => ({ data: null, error: { message: 'node read denied' } }), rpcFail: true });
  try {
    await assert.rejects(() => project('878'), (error) => { assert.equal(error?.message, 'node read denied'); return true; });
    await tick(); await tick(); await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(unhandled, []);
  } finally { process.off('unhandledRejection', onUnhandled); h.restore(); }
});
