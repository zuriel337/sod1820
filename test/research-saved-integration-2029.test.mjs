import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchSyncRuntime } from '../src/lib/research/researchSyncRuntime.js';
import { makeResearchOp, emptyResearchState, applyResearchOps, principalStateKey, principalToken } from '../src/lib/research/researchSyncState.js';

class Store { d = new Map(); mode = 'ok'; failKeys = [];
  getItem(k) { if (this.mode === 'throwAll') throw new Error('SecurityError'); return this.d.get(k) ?? null; }
  setItem(k, v) { if (this.mode !== 'ok' || this.failKeys.some(x => k.includes(x))) throw new Error('blocked'); this.d.set(k, String(v)); }
  removeItem(k) { if (this.mode === 'throwAll') throw new Error('SecurityError'); this.d.delete(k); }
  get length() { return this.d.size; } key(i) { return [...this.d.keys()][i]; } }
const tick = () => new Promise(r => setTimeout(r, 8));
const settle = async () => { for (let i = 0; i < 5; i++) await tick(); };
const ent = (n) => ({ id: `number:${n}`, ref: n, type: 'number', title: String(n) });
class Server { data = new Map(); writes = 0; down = false;
  st(u) { if (!this.data.has(u)) this.data.set(u, { ...emptyResearchState(), revision: 0 }); return this.data.get(u); }
  read = async u => JSON.parse(JSON.stringify(this.st(u)));
  write = async (u, ops, { batchId, expectedRevision }) => { if (this.down) throw new Error('offline'); const s = this.st(u); if (expectedRevision !== s.revision) throw new Error('RESEARCH_SYNC_CONFLICT');
    this.writes++; const next = { ...applyResearchOps(s, ops), revision: s.revision + 1 }; this.data.set(u, next);
    return { ok: true, batch_id: batchId, applied_revision: next.revision, snapshot: JSON.parse(JSON.stringify(next)) }; }; }
function make({ uid = 'A', server, storage, session, cloudEnabled = true } = {}) {
  const runtime = createResearchSyncRuntime({ userId: uid, storage, session: session ?? new Store(), delay: 1, resumePendingOnStart: false, cloudEnabled,
    readCloud: server.read, writeCloud: server.write });
  runtime.start(); return runtime; }
const save = (r, n) => r.commit([makeResearchOp('item_upsert', { bucket: 'library', entity: ent(n) })]);

test('save -> refresh -> still saved and confirmed by the server', async () => {
  const server = new Server(), storage = new Store();
  const a = make({ server, storage }); await settle(); assert.equal(save(a, 776), true); await settle();
  assert.equal(a.getSnapshot().syncStatus, 'synced'); a.stop();
  const b = make({ server, storage, session: new Store() }); await settle();
  assert.equal(b.getSnapshot().saved.length, 1); assert.equal(b.getSnapshot().syncStatus, 'synced');
  assert.deepEqual(await b.localOnly('list'), []);
});

test('hydrate keeps unconfirmed local items aside: nothing deleted, nothing sent', async () => {
  const server = new Server(), storage = new Store();
  const off = make({ server, storage, cloudEnabled: false }); assert.equal(save(off, 776), true); save(off, 533); off.stop();
  const on = make({ server, storage, session: new Store() }); await settle();
  assert.equal(on.getSnapshot().saved.length, 0);            // the account is the truth for confirmed state
  assert.equal(server.writes, 0);                            // never auto-synced
  const rows = await on.localOnly('list');
  assert.deepEqual(rows.map(r => r.entity.ref).sort(), [533, 776]); assert.ok(rows.every(r => r.inAccount === false));
});

test('explicit confirmation is required; then items sync through the one journal and leave the list', async () => {
  const server = new Server(), storage = new Store();
  const off = make({ server, storage, cloudEnabled: false }); save(off, 776); off.stop();
  const on = make({ server, storage, session: new Store() }); await settle();
  assert.equal(await on.localOnly('confirm', { ids: undefined }), 0); assert.equal(server.writes, 0);   // no confirm flag
  assert.equal(await on.localOnly('confirm', { confirm: true }), 1); await settle();
  assert.equal(server.st('A').saved.length, 1); assert.equal(on.getSnapshot().syncStatus, 'synced');
  assert.deepEqual(await on.localOnly('list'), []);
});

test('items already queued are not duplicated into the local-only list', async () => {
  const server = new Server(), storage = new Store();
  const a = make({ server, storage }); await settle();
  server.down = true;
  assert.equal(save(a, 776), true); await settle();
  assert.equal(a.getSnapshot().syncPending, 1); assert.deepEqual(await a.localOnly('list'), []);
});

test('sessionStorage blocked: save, refresh and recovery list all work', async () => {
  const server = new Server(), storage = new Store(), blocked = new Store(); blocked.mode = 'throwAll';
  const a = make({ server, storage, session: blocked }); await settle(); assert.equal(save(a, 776), true); await settle();
  assert.equal(server.st('A').saved.length, 1); a.stop();
  const b = make({ server, storage, session: blocked }); await settle();
  assert.equal(b.getSnapshot().saved.length, 1); assert.deepEqual(await b.localOnly('list'), []);
});

test('durable storage failure while setting items aside is fail-closed: cloud not applied, local cache intact, nothing sent', async () => {
  const server = new Server(), storage = new Store();
  const off = make({ server, storage, cloudEnabled: false }); save(off, 776); off.stop();
  const cacheKey = principalStateKey(principalToken('A')); const before = storage.getItem(cacheKey);
  storage.failKeys = [':localonly'];
  const on = make({ server, storage, session: new Store() }); await settle();
  assert.equal(on.getSnapshot().syncStatus, 'error'); assert.equal(on.getSnapshot().saved.length, 1);
  assert.equal(storage.getItem(cacheKey), before); assert.equal(server.writes, 0);
});

test('a corrupted local-only record fails closed instead of being overwritten', async () => {
  const server = new Server(), storage = new Store();
  const off = make({ server, storage, cloudEnabled: false }); save(off, 776); off.stop();
  const rk = principalStateKey(principalToken('A')) + ':localonly'; storage.d.set(rk, '{not json');
  const on = make({ server, storage, session: new Store() }); await settle();
  assert.equal(on.getSnapshot().syncStatus, 'error'); assert.equal(storage.getItem(rk), '{not json');
});

test('accounts are isolated: B never sees or syncs A\'s local items', async () => {
  const server = new Server(), storage = new Store();
  const offA = make({ uid: 'A', server, storage, cloudEnabled: false }); save(offA, 776); offA.stop();
  const onA = make({ uid: 'A', server, storage, session: new Store() }); await settle();
  assert.equal((await onA.localOnly('list')).length, 1); onA.stop();
  const onB = make({ uid: 'B', server, storage, session: new Store() }); await settle();
  assert.deepEqual(await onB.localOnly('list'), []); assert.equal(onB.getSnapshot().saved.length, 0);
  assert.equal(await onB.localOnly('confirm', { confirm: true }), 0); assert.equal(server.st('B').saved.length, 0);
  const keys = [...storage.d.keys()].filter(k => k.endsWith(':localonly')); assert.equal(keys.length, 1);
});

test('two tabs: concurrent hydrate keeps one record without loss, and double confirm never duplicates', async () => {
  const server = new Server(), storage = new Store();
  const off = make({ server, storage, cloudEnabled: false }); save(off, 776); save(off, 533); off.stop();
  const t1 = make({ server, storage, session: new Store() }), t2 = make({ server, storage, session: new Store() }); await settle();
  assert.equal((await t1.localOnly('list')).length, 2); assert.equal((await t2.localOnly('list')).length, 2);
  await Promise.all([t1.localOnly('confirm', { confirm: true }), t2.localOnly('confirm', { confirm: true })]); await settle();
  const saved = server.st('A').saved; assert.equal(saved.length, 2);
  assert.equal(new Set(saved.map(e => e.ref)).size, 2);
});
