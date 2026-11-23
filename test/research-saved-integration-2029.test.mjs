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

test('local collections/journeys/history are set aside on hydrate: never deleted, never sent', async () => {
  const server = new Server(), storage = new Store();
  const off = make({ server, storage, cloudEnabled: false });
  off.commit([makeResearchOp('collection_add', { collection: { id: 'c1', name: 'אוסף' } })]);
  off.commit([makeResearchOp('history_add', { entity: { id: 'h1', title: 'x' } })]);
  const before = off.getSnapshot(); off.stop();
  const on = make({ server, storage, session: new Store() }); await settle();
  assert.equal(server.writes, 0);
  const ex = await on.localOnly('extras');
  const kept = [...(ex.collections || []), ...(ex.history || [])];
  assert.equal(kept.length, before.collections.length + before.history.length);
  assert.ok(kept.length >= 1);
  const raw = [...storage.d.entries()].find(([k]) => k.endsWith(':localonly'));
  assert.ok(raw, 'record persisted');
});

test('snapshot.cloudConfirmed is true only when synced with an empty queue (single shared definition)', async () => {
  const server = new Server(), storage = new Store();
  const off = make({ server, storage, cloudEnabled: false }); save(off, 776);
  assert.equal(off.getSnapshot().cloudConfirmed, false); off.stop();
  const a = make({ server, storage: new Store() }); await settle();
  save(a, 533); await settle();
  assert.equal(a.getSnapshot().cloudConfirmed, true);
  a.stop();
});

test('100 public launches do not accumulate passive-only journals; an explicit save still reaches the server', async () => {
  const server = new Server(), storage = new Store();
  for (let i = 0; i < 100; i++) {
    const tab = make({ server, storage, session: new Store() });
    await settle();
    assert.equal(tab.commit([makeResearchOp('history_add', { entity: ent(1000 + i) })]), true);
    assert.equal(tab.commit([makeResearchOp('context_set', { context: { subject: { type: 'number', id: String(1000 + i) } } })]), true);
    tab.release(); tab.stop();
  }
  const journals = [...storage.d.keys()].filter(k => k.includes(':pending:'));
  assert.equal(journals.length, 0, 'passive browsing cannot generate a new journal on every launch');
  assert.equal(server.writes, 0, 'passive browsing does not automatically submit account mutations');

  const next = make({ server, storage, session: new Store() });
  await settle();
  assert.equal(save(next, 776), true, 'explicit save remains admitted');
  await settle();
  assert.ok(server.st('A').saved.some(x => x.ref === 776), 'saved number reached the server');
  assert.equal(next.getSnapshot().syncPending, 0);
  next.release(); next.stop();
});

// Reproduce journals created by older public builds. New public visits must not
// create these, so seeding them through the corrected runtime would hide the regression.
function seedLegacyPassive(storage, { uid = 'A', n, released = true, title = String(n) }) {
  const principal = principalToken(uid);
  const name = `${principalStateKey(principal)}:pending:legacy-${uid}-${n}`;
  storage.setItem(name, JSON.stringify({
    principal, revision: 0,
    queue: [{ batch_id: `old-${uid}-${n}`, ops: [makeResearchOp('history_add', {
      entity: { id: `number:${n}`, type: 'number', ref: n, title }
    })] }],
    inflight: null,
    owner: { id: `old-tab-${n}`, at: released ? Date.now() - 11 * 60 * 1000 : Date.now(), released }
  }));
  return name;
}

test('reclaim: only passive, unowned journals of this principal are removed; saves, pending intent, live and foreign journals stay', async () => {
  const server = new Server(), storage = new Store();
  for (let s = 0; s < 5; s++) seedLegacyPassive(storage, { n: s });
  // A real pending save remains protected even if its tab is gone.
  const intent = make({ server, storage, session: new Store() });
  await settle(); server.down = true; save(intent, 776); await settle(); intent.release(); intent.stop();
  seedLegacyPassive(storage, { uid: 'B', n: 1 });
  seedLegacyPassive(storage, { n: 999, released: false }); // Another active tab.
  const journals = () => [...storage.d.keys()].filter(k => k.includes(':pending:'));
  const before = journals().length;
  const live = make({ server, storage, session: new Store() }); await settle();
  const probe = await live.localOnly('reclaim');
  assert.equal(journals().length, before, 'dry run is strictly read-only');
  assert.equal(probe.count, 5, 'only released passive same-principal journals are eligible');
  const done = await live.localOnly('reclaim', { confirm: true });
  assert.equal(done.count, 5);
  const left = journals();
  assert.equal(left.length, before - 5);
  assert.ok(left.some(k => JSON.parse(storage.d.get(k)).principal === principalToken('B')), 'foreign principal journal survives');
  assert.ok(left.some(k => k.endsWith(':legacy-A-999')), 'live tab journal survives');
  assert.ok(left.some(k => JSON.stringify(JSON.parse(storage.d.get(k)).queue).includes('item_upsert')), 'pending save survives');
  assert.equal(server.writes, 0);
  live.stop();
});

test('reclaim archives history before removal, including when storage is full', async () => {
  const server = new Server(), storage = new Store();
  for (let s = 0; s < 40; s++) seedLegacyPassive(storage, { n: s, title: 'x'.repeat(300) });
  const live = make({ server, storage, session: new Store() }); await settle();
  const size = () => [...storage.d].reduce((n, [k, v]) => n + k.length + v.length, 0);
  const CAP = size() + 100; // Not enough headroom to archive history without reclaiming older journals.
  const baseSet = storage.setItem.bind(storage);
  storage.setItem = (k, v) => {
    const old = storage.d.get(k) ?? '';
    const next = String(v);
    if (size() - old.length + next.length + (storage.d.has(k) ? 0 : k.length) > CAP)
      throw new Error('QuotaExceededError');
    baseSet(k, v);
  };
  const dry = await live.localOnly('reclaim');
  assert.equal(dry.count, 40);
  const out = await live.localOnly('reclaim', { confirm: true });
  assert.equal(out.error, undefined);
  assert.equal(out.count, 40);
  assert.ok(out.bytes > 0, 'only actually deleted bytes are reported');
  const ex = await live.localOnly('extras');
  const ids = new Set((ex.history || []).map(h => h.id));
  assert.ok(ids.has('number:39'), 'newest history entry archived');
  assert.ok(![...storage.d.keys()].some(k => k.includes(':pending:')), 'legacy passive journals were reclaimed');
  assert.equal(server.writes, 0);
  live.stop();
});
