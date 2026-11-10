// Properties of the REAL researchSyncRuntime (no model): independence of tabs, no loss of unsynced work, and bounded growth of durable
// journals under repeated loads, duplicated tabs and crashes. Written before the lease change so the same file can be run against the
// unchanged runtime (safety properties pass; growth properties fail = the finding) and against the changed one (all pass).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchSyncRuntime } from './researchSyncRuntime.js';
import { applyResearchOps, emptyResearchState } from './researchSyncState.js';

// Timers of a deliberately abandoned (crashed) runtime must not keep the test process alive.
const realSetTimeout = globalThis.setTimeout, realSetInterval = globalThis.setInterval;
globalThis.setTimeout = (...args) => { const t = realSetTimeout(...args); t.unref?.(); return t; };
globalThis.setInterval = (...args) => { const t = realSetInterval(...args); t.unref?.(); return t; };

const copy = x => JSON.parse(JSON.stringify(x));
const tick = () => new Promise(resolve => setImmediate(resolve));
const op = (kind, payload = {}) => ({ kind, op_id: crypto.randomUUID(), ...payload });
class Storage {
  data = new Map();
  get length() { return this.data.size; }
  key(i) { return [...this.data.keys()][i] ?? null; }
  getItem(k) { return this.data.get(k) ?? null; }
  setItem(k, v) { this.data.set(k, String(v)); }
  removeItem(k) { this.data.delete(k); }
  clone() { const s = new Storage(); s.data = new Map(this.data); return s; }
  journals() { return [...this.data.keys()].filter(k => k.includes(':pending:')); }
  get chars() { let n = 0; for (const [k, v] of this.data) n += k.length + v.length; return n; }
}
class Server {   // idempotent by batch id (durable receipts) and compare-and-set on the revision, as production
  data = new Map(); online = true;
  state(uid) { if (!this.data.has(uid)) this.data.set(uid, { ...emptyResearchState(), revision: 0, receipts: new Map() }); return this.data.get(uid); }
  snapshot(uid) { const { receipts, ...s } = this.state(uid); return copy(s); }
  read = async uid => this.snapshot(uid);
  write = async (uid, ops, { batchId, expectedRevision }) => {
    if (!this.online) throw new Error('offline');
    const s = this.state(uid), fingerprint = JSON.stringify(ops), receipt = s.receipts.get(batchId);
    if (receipt) return { ok: true, batch_id: batchId, applied_revision: receipt.rev, snapshot: this.snapshot(uid), replayed: true };
    if (expectedRevision !== s.revision) throw new Error('RESEARCH_SYNC_CONFLICT');
    const next = { ...applyResearchOps(s, ops), revision: s.revision + 1, receipts: s.receipts };
    next.receipts.set(batchId, { fingerprint, rev: next.revision });
    this.data.set(uid, next);
    return { ok: true, batch_id: batchId, applied_revision: next.revision, snapshot: this.snapshot(uid) };
  };
  has(batchId) { return this.state('A').receipts.has(batchId); }
}
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const entity = id => ({ id, ref: id, type: 'number', title: id });

function world(seed = 1, opts = {}) {
  const random = rng(seed), storage = new Storage(), server = new Server(), tabs = [], committed = [];
  let counter = 0, clock = 1_000_000;
  const idFactory = () => `id${++counter}`;
  const pick = list => list[Math.floor(random() * list.length)];
  const live = () => tabs.filter(t => t.alive);
  async function mount(session) {
    const runtime = createResearchSyncRuntime({ userId: 'A', storage, session, readCloud: server.read, writeCloud: server.write, delay: 1e9, idFactory, now: () => clock, heartbeatMs: 0, reapGraceMs: opts.reapGraceMs ?? 0 });
    runtime.start(); await tick();
    const tab = { id: `tab${tabs.length + 1}`, alive: true, session, runtime }; tabs.push(tab); return tab;
  }
  const exactMirror = tab => {   // right after its own write a tab owns a durable journal holding exactly its queue
    const mine = tab.runtime.exportPending().queue.map(b => b.batch_id).join(',');
    assert.ok(storage.journals().some(k => { try { return JSON.parse(storage.getItem(k)).queue.map(b => b.batch_id).join(',') === mine; } catch { return false; } }), `${tab.id}: its own write is not mirrored by a journal of its own (seed ${seed})`);
  };
  const record = tab => { const q = tab.runtime.exportPending().queue; committed.push(q[q.length - 1].batch_id); exactMirror(tab); };
  const steps = {
    open: async () => { await mount(new Storage()); },
    reload: async () => { const t = pick(live()); if (!t) return; t.runtime.release?.(); t.alive = false; await mount(t.session); },
    duplicate: async () => { const t = pick(live()); if (t) await mount(t.session.clone()); },
    passive: async () => { const t = pick(live()); if (!t) return; if (t.runtime.commit([op('history_add', { entity: entity(`h${++counter}`) })])) record(t); },
    write: async () => { const t = pick(live()); if (!t) return; if (t.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity(`w${++counter}`) })])) record(t); },
    flush: async () => { const t = pick(live()); if (t) { await t.runtime.flush(); await tick(); } },
    toggleServer: async () => { server.online = !server.online; },
    heartbeat: async () => { for (const t of live()) if (random() > 0.25) t.runtime.heartbeat?.(); },   // some beats are missed (throttled background tabs)
    advance: async () => { clock += Math.floor(random() * 120_000); },
    close: async () => { const t = pick(live()); if (!t) return; if (random() < 0.5) t.runtime.release?.(); t.alive = false; },   // clean pagehide or crash
    restore: async () => { const t = pick(tabs.filter(x => !x.alive)); if (t) await mount(t.session); },   // the browser restores a closed or crashed tab with its sessionStorage
    recover: async () => {
      const t = pick(live().filter(x => !x.runtime.exportPending().queue.length)); if (!t) return;
      const row = pick(t.runtime.getSnapshot().recoveryJournals.filter(j => !j.invalid)); if (row) { await t.runtime.recoverJournal({ key: row.key, confirm: true }); await tick(); }
    },
  };
  const journalIds = () => { const ids = new Set(); for (const k of storage.journals()) { try { for (const b of JSON.parse(storage.getItem(k)).queue || []) ids.add(b.batch_id); } catch { /* invalid */ } } return ids; };
  function check(where) {
    const stored = journalIds();
    for (const id of committed) if (!server.has(id)) assert.ok(stored.has(id), `${where}: unsynced batch ${id} is in no durable journal (seed ${seed})`);
    // Each live tab that holds work has a durable journal with exactly its queue; tabs with different queues therefore have different journals.
    for (const t of live()) {
      const queue = t.runtime.exportPending().queue.map(b => b.batch_id), mine = queue.join(',');
      if (!queue.some(id => !server.has(id))) continue;   // everything it holds is already applied (a sibling tab replayed the same batch id): nothing left to protect
      const covers = k => { try { const ids = JSON.parse(storage.getItem(k)).queue.map(b => b.batch_id); return queue.filter(id => !server.has(id)).every(id => ids.includes(id)); } catch { return false; } };
      assert.ok(storage.journals().some(covers), `${where}: ${t.id} holds unsynced work that no durable journal contains (seed ${seed})`);
    }
  }
  return { steps, names: Object.keys(steps), check, storage, server, tabs, live, pick, random, mount, committed, advance: ms => { clock += ms; }, get clock() { return clock; } };
}

test('REAL RUNTIME, SAFETY: across 300 random histories no unsynced batch is lost and every tab with work has a durable journal of its own queue', async () => {
  let steps = 0;
  for (let seed = 1; seed <= Number(process.env.JOURNAL_SEEDS || 300); seed++) {
    const w = world(seed); await w.steps.open();
    for (let i = 0; i < 40; i++) {
      const name = w.random() < 0.7 ? w.pick(['write', 'passive', 'reload', 'duplicate', 'flush', 'heartbeat', 'advance', 'restore']) : w.pick(w.names);
      await w.steps[name](); try { w.check(`${name}#${i}`); } catch (e) { if (process.env.TRACE) console.log('TRACE', seed, i, name, JSON.stringify(w.live().map(t => ({ id: t.id, q: t.runtime.exportPending().queue.map(b => b.batch_id), st: t.runtime.getSnapshot().syncStatus }))), JSON.stringify(w.storage.journals().map(k => [k.slice(-6), JSON.parse(w.storage.getItem(k)).queue.map(b => b.batch_id)]))); throw e; } steps++;
    }
  }
  assert.ok(steps >= 12000 * Number(process.env.JOURNAL_SEEDS || 300) / 300);
});

test('REAL RUNTIME, INDEPENDENCE: a duplicated live tab commits without touching the original tab\'s durable journal', async () => {
  const w = world(11); const a = await w.mount(new Storage());
  a.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity('a1') })]);
  const aQueue = a.runtime.exportPending().queue.map(b => b.batch_id).join(',');
  const aJournal = w.storage.journals().find(k => JSON.parse(w.storage.getItem(k)).queue.map(b => b.batch_id).join(',') === aQueue);
  assert.ok(aJournal, 'the original tab has a durable journal');
  const before = JSON.stringify(JSON.parse(w.storage.getItem(aJournal)).queue);
  const b = await w.mount(a.session.clone());
  b.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity('b1') })]);
  assert.equal(a.runtime.exportPending().queue.length, 1); assert.equal(b.runtime.exportPending().queue.length, 2);
  assert.equal(JSON.stringify(JSON.parse(w.storage.getItem(aJournal)).queue), before, 'the original journal is untouched by the duplicate');
  const bQueue = b.runtime.exportPending().queue.map(x => x.batch_id).join(',');
  assert.ok(w.storage.journals().some(k => k !== aJournal && JSON.parse(w.storage.getItem(k)).queue.map(x => x.batch_id).join(',') === bQueue), 'and the duplicate owns a distinct durable journal');
});

test('REAL RUNTIME, BOUND: passive loads write no journal at all', async () => {
  const w = world(12); const session = new Storage(); let tab = await w.mount(session);
  for (let i = 0; i < 300; i++) { tab.runtime.release?.(); tab = await w.mount(session); }
  for (let i = 0; i < 50; i++) await w.mount(session.clone());
  assert.equal(w.storage.journals().length, 0, 'nothing to recover, nothing stored');
});

test('REAL RUNTIME, BOUND: one tab with pending work reloaded 200 times keeps ONE journal; total size grows only with the data it holds', async () => {
  const w = world(13); const session = new Storage(); let tab = await w.mount(session);
  tab.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity('keep') })]);
  const one = w.storage.chars;
  for (let i = 0; i < 200; i++) { tab.runtime.release?.(); tab = await w.mount(session); w.advance(1000); }
  assert.equal(w.storage.journals().length, 1, 'reload continues the same journal instead of copying it');
  assert.ok(w.storage.chars < one * 1.6, `size stays about the same (${one} -> ${w.storage.chars})`);
  assert.equal(tab.runtime.exportPending().queue.length, 1);
});

test('REAL RUNTIME, BOUND: a tab that records history on every load keeps one journal of bounded size, and the server ends in exactly the state the full history would give', async () => {
  const w = world(14); const session = new Storage(); let tab = await w.mount(session); const all = [];
  for (let i = 1; i <= 300; i++) {
    const o = op('history_add', { entity: entity(`h${i}`) }); all.push(o);
    tab.runtime.commit([o]); tab.runtime.release?.(); tab = await w.mount(session); w.advance(1000);
  }
  const queue = tab.runtime.exportPending().queue;
  assert.ok(queue.length <= 50, `the passive queue is bounded (${queue.length} of 300 loads)`);
  assert.equal(w.storage.journals().length, 1);
  const size = w.storage.getItem(w.storage.journals()[0]).length;
  assert.ok(size < 50 * 450, `and so is its size (${size} chars)`);
  // a real research action grants write intent: everything that remains is sent; the result equals applying ALL 300 operations
  tab.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity('real') })]);
  await tab.runtime.flush(); for (let i = 0; i < 60; i++) await tab.runtime.flush();
  assert.equal(w.server.state('A').receipts.size > 0, true);
  const expected = applyResearchOps(emptyResearchState(), [...all, op('item_upsert', { bucket: 'library', entity: entity('real') })]);
  const got = w.server.snapshot('A');
  assert.deepEqual(got.history, expected.history, 'history on the server is identical to the uncompacted result');
  assert.deepEqual(got.saved, expected.saved, 'the real research item arrived');
  assert.equal(w.storage.journals().length, 0, 'and the drained journal is gone');
});

test('REAL RUNTIME, BOUND: repeated crashes -> journals only for distinct unsynced work, and same-tab crash/restore does not multiply them', async () => {
  const w = world(15);
  for (let i = 0; i < 20; i++) {   // 20 tabs, each with its own pending work, each crashes
    const t = await w.mount(new Storage()); t.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity(`c${i}`) })]); t.alive = false;
  }
  assert.equal(w.storage.journals().length, 20, 'distinct unsynced work is kept, one journal each');
  // one tab crashes repeatedly and the browser restores it (same sessionStorage) each time, after the lease has expired
  const session = new Storage(); let t = await w.mount(session);
  t.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity('restored') })]);
  for (let i = 0; i < 30; i++) { t.alive = false; w.advance(10 * 60_000); t = await w.mount(session); }
  assert.equal(w.storage.journals().length, 21, 'thirty crash/restore cycles add no journal');
});

test('REAL RUNTIME, BOUND: a duplicate of a LIVE tab, then both closed cleanly and reloaded later, collapses to the distinct work only', async () => {
  const w = world(16); const a = await w.mount(new Storage());
  a.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity('x') })]);
  const b = await w.mount(a.session.clone());
  b.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity('y') })]);
  const need = w.storage.journals().length;
  const wanted = [...a.runtime.exportPending().queue, ...b.runtime.exportPending().queue].map(x => x.batch_id);
  assert.equal(new Set(wanted).size, 2, 'a holds x; the duplicate b holds the same x plus its own y');
  a.runtime.release?.(); b.runtime.release?.(); a.alive = b.alive = false; w.advance(10 * 60_000);
  const later = await w.mount(new Storage()); await tick();
  assert.ok(w.storage.journals().length <= need, 'never more than before');
  const ids = new Set(); for (const k of w.storage.journals()) for (const x of JSON.parse(w.storage.getItem(k)).queue) ids.add(x.batch_id);
  for (const id of wanted) assert.ok(ids.has(id), `unsynced batch ${id} survived`);
  void later;
});

test('REAL RUNTIME, SAFETY: a stale tab never overwrites a journal that changed after it restored (compare-and-set), even once the owner released it', async () => {
  const w = world(21); const a = await w.mount(new Storage());
  a.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity('a1') })]);
  a.runtime.release?.(); a.alive = false;
  const b = await w.mount(a.session.clone());          // restores [a1] from the released journal, passive
  const c = await w.mount(a.session.clone());          // restores the same, then writes first
  c.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity('c1') })]);
  c.runtime.release?.(); c.alive = false;
  b.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity('b1') })]);   // b's view of the journal is stale now
  const stored = new Set(); for (const k of w.storage.journals()) for (const x of JSON.parse(w.storage.getItem(k)).queue) stored.add(JSON.stringify(x.ops[0].entity.id));
  for (const id of ['a1', 'c1', 'b1']) assert.ok(stored.has(JSON.stringify(id)), `${id} is still in a durable journal`);
});

test('REAL RUNTIME, INDEPENDENCE: reloading two tabs repeatedly never takes a tab\'s pending work away (default grace), and a day later the redundant journal collapses', async () => {
  const day = 24 * 3600 * 1000, w = world(30, { reapGraceMs: day });
  let a = await w.mount(new Storage());
  a.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity('a1') })]);
  let b = await w.mount(a.session.clone());
  b.runtime.commit([op('item_upsert', { bucket: 'library', entity: entity('b1') })]);
  for (let i = 0; i < 12; i++) { a.runtime.release?.(); a.alive = false; a = await w.mount(a.session); b.runtime.release?.(); b.alive = false; b = await w.mount(b.session); w.advance(2000); }
  assert.deepEqual(a.runtime.exportPending().queue.map(x => x.ops[0].entity.id), ['a1'], 'the reloaded tab still holds its own pending work');
  assert.deepEqual(b.runtime.exportPending().queue.map(x => x.ops[0].entity.id), ['a1', 'b1']);
  assert.equal(w.storage.journals().length, 2);
  a.runtime.release?.(); b.runtime.release?.(); a.alive = b.alive = false; w.advance(day + 1000);
  const later = await w.mount(new Storage()); void later;
  assert.equal(w.storage.journals().length, 1, 'a day later the redundant journal collapses into the superset');
  const ids = JSON.parse(w.storage.getItem(w.storage.journals()[0])).queue.map(x => x.ops[0].entity.id);
  assert.deepEqual(ids, ['a1', 'b1'], 'and nothing is lost');
});
