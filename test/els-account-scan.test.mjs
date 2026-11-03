import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { buildElsSavedScan, readElsSavedScan, elsSavedScanLoad, elsSavedScanMatchesState } from '../src/lib/research/elsLexiconSavedScan.js';
import { saveElsAccountScan, loadElsAccountScan, listElsAccountScans, compareAndSetElsAccountMatrix } from '../src/lib/research/elsLexiconAccount.js';

export function fixture() {
  const state = { status: 'ok', term: 'אמנהטיס', termRaw: 'אמן הטיס', scope: 'torah', corpusLetters: 304805,
    axis: { hitId: '16_1_1000', start: 1000, skip: 16, dir: 1, length: 7 },
    verification: { state: 'MATCH', corpus_id: 'fixture-corpus' }, findings: [],
    geometry: { S: 16, r0: 60, r1: 75, c0: 0, cw: 16 }, ui: { ctxR: 2 } };
  const data = { ok: true, pending: false, origin: { term: 'אמנהטיס', corpus: 'torah', corpusId: 'fixture-corpus', start: 1000, skip: 16, dir: 1 },
    plan: { minLength: 5, maxLength: 10, maxDistance: 120, minMembers: 2 },
    coverage: { complete: false, stop: 'RESULT_CAP', completedRays: 4, totalRays: 20, windows: 120 },
    box: { S: 16, r0: 60, r1: 75, c0: 0, c1: 15 }, lexicon: { entryCount: 41835 },
    items: [{ term: 'ישראל', label: 'ישראל', hitId: '16_1_1001', start: 1001, skip: 16, dir: 1,
      positions: [1001, 1017, 1033, 1049, 1065], kind: 'els', status: 'CANDIDATE', lexiconSources: ['canonical_tanakh_words'] }] };
  const entity = buildElsSavedScan(state, data, { id: 'fixture-scan', now: 10000 });
  return { state, data, entity };
}

test('round trip retains full bounded results/partial coverage and exact return, no authority', () => {
  const { state, data, entity } = fixture(); assert(entity);
  const scan = readElsSavedScan(JSON.parse(JSON.stringify(entity)));
  assert.deepEqual(scan.data.coverage, data.coverage); assert.deepEqual(scan.data.items, data.items);
  assert.equal(scan.data.truthPromotion, false); assert.equal(scan.verification, undefined);
  assert.equal(elsSavedScanLoad(scan).start, 1000); assert(elsSavedScanMatchesState(scan, state));
  assert(!elsSavedScanMatchesState(scan, { ...state, verification: { state: 'PENDING' } }));
  assert(!elsSavedScanMatchesState(scan, { ...state, geometry: { ...state.geometry, c0: 1 } }));
});
test('reject missing/stale/forged identity, unverified state and coordinate changes', () => {
  const { state, data, entity } = fixture();
  assert.equal(buildElsSavedScan({ ...state, verification: {} }, data), null);
  assert.equal(buildElsSavedScan(state, { ...data, pending: true }), null);
  for (const mutate of [s => s.origin.start++, s => s.returnSnapshot.axis.hitId = '16_1_999',
    s => s.data.items[0].positions[1]++, s => s.data.box.c1 = 99, s => s.version = 99]) {
    const e = structuredClone(entity); mutate(e.elsLexiconScan); assert.equal(readElsSavedScan(e), null);
  }
});
test('strip credentials/unrelated source fields and refuse oversized archive', () => {
  const { state, data } = fixture();
  const e = buildElsSavedScan(state, { ...data, access_token: 'SECRET', matrix: 'DO_NOT_SAVE',
    plan: { ...data.plan, authorization: 'SECRET' } });
  assert(!JSON.stringify(e).includes('SECRET')); assert(!JSON.stringify(e).includes('DO_NOT_SAVE'));
  assert.equal(buildElsSavedScan(state, { ...data, lexicon: { x: 'x'.repeat(10001) } }), null);
});

function server(handler) {
  const calls = [];
  const client = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      calls.push({ url: String(url), init });
      const result = await handler(String(url), init, calls.length);
      return new Response(JSON.stringify(result.body), { status: result.status || 200, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  client.auth.getSession = async () => ({ data: { session: { user: { id: 'user-A' }, access_token: 'test-user-token' } } });
  return { client, calls };
}
const owned = positions => ({ search_term: 'אמן הטיס', scope: 'torah', corpus_id: 'fixture-corpus', skip_distance: 16, direction: 'fwd', start_index: 1000, id: 'row-1', owner_user_id: 'user-A', visibility: 'private', status: 'draft', self_published: false, positions });

test('cloud save uses no-store on every request, private ownership, CAS, and confirmed ack', async () => {
  const { entity } = fixture(); const original = { findings: [{ t: 'שלום' }], sentinel: 42 };
  const { client, calls } = server((_url, init) => {
    if (init.method === 'PATCH') {
      const { positions } = JSON.parse(init.body); assert.equal(positions.sentinel, 42);
      assert.deepEqual(positions.findings, original.findings);
      return { body: { id: 'row-1', lexiconScanIndex: positions.lexiconScanIndex } };
    }
    return { body: owned(original) };
  });
  assert.deepEqual(await saveElsAccountScan(client, 'user-A', entity), { recordId: 'row-1', scanId: 'fixture-scan' });
  assert.equal(calls.length, 2); assert(calls.every(c => c.init.cache === 'no-store'));
  assert(calls.every(c => new Headers(c.init.headers).get('Authorization') === 'Bearer test-user-token'));
  const patch = new URL(calls[1].url); assert.equal(patch.searchParams.get('owner_user_id'), 'eq.user-A');
  assert.equal(patch.searchParams.get('visibility'), 'eq.private');
  assert.equal(patch.searchParams.get('start_index'), 'eq.1000');
  assert.equal(patch.searchParams.get('corpus_id'), 'eq.fixture-corpus');
  assert.equal(patch.searchParams.get('positions->findings'), 'eq.' + JSON.stringify(original.findings));
  assert.equal(patch.searchParams.get('positions->sentinel'), 'eq.42');
  assert.equal(patch.searchParams.get('positions->>lexiconScanIndex'), 'is.null');
  assert.equal(patch.searchParams.has('positions'), false);
});
test('SDK session switch is rejected even before React observes the new account', async () => {
  const { entity } = fixture(); let sessionUser = 'user-A';
  const s = server(() => { sessionUser = 'user-B'; return { body: owned({}) }; });
  s.client.auth.getSession = async () => ({ data: { session: { user: { id: sessionUser }, access_token: `token-${sessionUser}` } } });
  await assert.rejects(saveElsAccountScan(s.client, 'user-A', entity, () => true), /account_changed/);
  assert.equal(s.calls.length, 1);
  const noSession = server(() => { throw new Error('must-not-fetch'); });
  noSession.client.auth.getSession = async () => ({ data: { session: null } });
  await assert.rejects(listElsAccountScans(noSession.client, 'user-A'), /account_changed/);
  assert.equal(noSession.calls.length, 0);
});
test('wrong owner, absent matrix, concurrent write and server failure never claim save', async () => {
  const { entity } = fixture();
  for (const row of [null, { ...owned({}), owner_user_id: 'user-B' }, { ...owned({}), visibility: 'public' }]) {
    const s = server(() => ({ body: row })); await assert.rejects(saveElsAccountScan(s.client, 'user-A', entity), /save_matrix_first/);
    assert.equal(s.calls.length, 1);
  }
  const conflict = server((_u, init) => ({ body: init.method === 'PATCH' ? null : owned({}) }));
  await assert.rejects(saveElsAccountScan(conflict.client, 'user-A', entity), /scan_save_conflict/);
  const failure = server((_u, init) => init.method === 'PATCH' ? { status: 403, body: { message: 'RLS denied' } } : { body: owned({}) });
  await assert.rejects(saveElsAccountScan(failure.client, 'user-A', entity));
});
test('repeat save id is idempotent after uncertain ack; changed account cancels before write', async () => {
  const { entity } = fixture(); const scan = entity.elsLexiconScan;
  const s = server(() => ({ body: owned({ lexiconScans: [scan] }) }));
  assert.equal((await saveElsAccountScan(s.client, 'user-A', entity)).scanId, scan.id); assert.equal(s.calls.length, 1);
  const reorder = value => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reorder(v)])) : value;
  const jsonb = server(() => ({ body: owned({ lexiconScans: [reorder(scan)] }) }));
  assert.equal((await saveElsAccountScan(jsonb.client, 'user-A', entity)).scanId, scan.id);
  let current = true;
  const switched = server(() => { current = false; return { body: owned({}) }; });
  await assert.rejects(saveElsAccountScan(switched.client, 'user-A', entity, () => current), /account_changed/);
  assert.equal(switched.calls.length, 1);
});
test('private editor preserves archived snapshots and refuses public/foreign/identity edits', async () => {
  const { entity } = fixture(); const positions = { findings: [], lexiconScans: [entity.elsLexiconScan] };
  const s = server(() => ({ body: { id: 'row-1' } }));
  await assert.rejects(compareAndSetElsAccountMatrix(s.client, 'user-A', owned(positions), { positions: { findings: [] } }), /archive_preservation_required/);
  await assert.rejects(compareAndSetElsAccountMatrix(s.client, 'user-A', owned(positions), { positions, status: 'published' }), /scan_unavailable/);
  await assert.rejects(compareAndSetElsAccountMatrix(s.client, 'user-B', owned(positions), { positions }), /scan_unavailable/);
  assert.equal(s.calls.length, 0);
  await compareAndSetElsAccountMatrix(s.client, 'user-A', owned(positions), { positions: { ...positions, findings: ['new'] }, description: 'updated' });
  assert.equal(s.calls.length, 1);
});
test('large earlier scans stay in request body; CAS URL remains bounded', async () => {
  const { entity } = fixture();
  const earlier = structuredClone(entity.elsLexiconScan); earlier.id = 'earlier';
  earlier.data.lexicon.padding = 'x'.repeat(100000);
  const s = server((_u, init) => init.method === 'PATCH'
    ? { body: { id: 'row-1', lexiconScanIndex: JSON.parse(init.body).positions.lexiconScanIndex } }
    : { body: owned({ findings: [], lexiconScans: [earlier], lexiconScanIndex: [{ id: 'earlier', savedAt: 1 }] }) });
  await saveElsAccountScan(s.client, 'user-A', entity);
  assert(s.calls[1].url.length < 7000); assert(s.calls[1].init.body.length > 100000);
  assert(!s.calls[1].url.includes('padding'));
});
test('oversized matrix guard and reused id with different content fail before write', async () => {
  const { entity } = fixture();
  const huge = server(() => ({ body: owned({ findings: ['x'.repeat(10000)] }) }));
  await assert.rejects(saveElsAccountScan(huge.client, 'user-A', entity), /matrix_guard_too_large/);
  assert.equal(huge.calls.length, 1);
  const changed = structuredClone(entity.elsLexiconScan); changed.savedAt++;
  const collision = server(() => ({ body: owned({ lexiconScans: [changed] }) }));
  await assert.rejects(saveElsAccountScan(collision.client, 'user-A', entity), /scan_id_conflict/);
  assert.equal(collision.calls.length, 1);
});
test('load/list are account-scoped, no-store, and malformed records fail closed', async () => {
  const { entity } = fixture(); const s = server(() => ({ body: owned({ lexiconScans: [entity.elsLexiconScan] }) }));
  assert.equal((await loadElsAccountScan(s.client, 'user-A', 'row-1', 'fixture-scan')).id, 'fixture-scan');
  assert.equal(s.calls[0].init.cache, 'no-store');
  const list = server(() => ({ body: [{ id: 'row-1', title: 'אמן הטיס', lexiconScanIndex: [{ id: 'fixture-scan', savedAt: 10000 }] }] }));
  assert.equal((await listElsAccountScans(list.client, 'user-A'))[0].recordId, 'row-1');
  assert.equal(list.calls[0].init.cache, 'no-store');
  await assert.rejects(loadElsAccountScan(s.client, 'user-A', 'row-1', 'missing'), /scan_invalid/);
});
