// Evidence for the journal lifecycle PROPOSAL (researchJournalLifecycle.js is not wired into the runtime).
//  1. BASELINE on the unchanged runtime: passive loads grow keys and bytes without bound. (When the runtime adopts the proposal this
//     block is inverted; it exists so the finding is reproducible, not as a desired behaviour.)
//  2. MODEL: thousands of random histories (tabs opening, reloading, duplicating, committing, acknowledging, closing cleanly or
//     crashing, background throttling that expires leases, reaping, explicit recovery) against the planner. After EVERY step:
//     no unsynced batch exists only outside durable journals (no data loss), and a tab that persisted holds a journal of its own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchSyncRuntime } from './researchSyncRuntime.js';
import { emptyResearchState, applyResearchOps } from './researchSyncState.js';
import { LEASE_TTL_MS, MAX_UNOWNED, leaseState, planPersist, planReap, isEmptyJournal } from './researchJournalLifecycle.js';

const copy = x => JSON.parse(JSON.stringify(x));
const tick = () => new Promise(resolve => setImmediate(resolve));
class Storage {
  data = new Map();
  get length() { return this.data.size; }
  key(i) { return [...this.data.keys()][i] ?? null; }
  getItem(k) { return this.data.get(k) ?? null; }
  setItem(k, v) { this.data.set(k, String(v)); }
  removeItem(k) { this.data.delete(k); }
  get chars() { let n = 0; for (const [k, v] of this.data) n += k.length + v.length; return n; }
  pending() { return [...this.data.keys()].filter(k => k.includes(':pending:')); }
}
const server = () => ({ read: async () => ({ ...emptyResearchState(), revision: 0 }), write: async () => { throw new Error('offline'); } });
async function load(storage, session, { commit = 0 } = {}) {
  const s = server();
  const runtime = createResearchSyncRuntime({ userId: 'A', storage, session, readCloud: s.read, writeCloud: s.write, delay: 60000 });
  runtime.start(); await tick();
  for (let i = 0; i < commit; i++) runtime.commit([{ kind: 'history_add', op_id: crypto.randomUUID(), entity: { id: `h${Math.random()}`, ref: 'x', type: 'number', title: 't' } }]);
  runtime.stop();
}

test('BASELINE (unchanged runtime): passive loads of one tab create one durable journal per load', async () => {
  const storage = new Storage(), session = new Storage();
  for (let i = 0; i < 30; i++) await load(storage, session);
  assert.equal(storage.pending().length, 30, 'one empty journal per page load, none ever reclaimed');
});

test('BASELINE (unchanged runtime): a passive tab that records history on each load copies a growing queue into every new journal', async () => {
  const storage = new Storage(), session = new Storage(); const chars = [];
  for (let i = 0; i < 12; i++) { await load(storage, session, { commit: 1 }); chars.push(storage.chars); }
  assert.equal(storage.pending().length, 12);
  const sizes = storage.pending().map(k => storage.getItem(k).length).sort((a, b) => a - b);
  assert.ok(sizes[sizes.length - 1] > sizes[0] * 6, 'each journal carries the whole queue so far');
  assert.ok(chars[11] > chars[5] * 2.5, `total bytes grow faster than linearly (${chars[5]} -> ${chars[11]})`);
});

// ------------------------------------------------------------------------------------------------------------------ model
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const batchOf = n => ({ batch_id: `b${n}`, ops: [{ kind: 'history_add', n }] });

function createWorld(seed, { throttle = 0.2 } = {}) {
  const random = rng(seed), journals = new Map(), acked = new Set(), created = [], tabs = []; let now = 1_000_000, nBatch = 0, nKey = 0, nTab = 0;
  const pick = list => list[Math.floor(random() * list.length)];
  const live = () => tabs.filter(t => t.alive);
  const record = key => journals.get(key) ? copy(journals.get(key)) : null;
  function restore(pointer) { const rec = pointer ? record(pointer) : null; return { mem: rec ? copy(rec.queue) : [], restoredRecord: rec ? copy({ revision: rec.revision, queue: rec.queue, inflight: rec.inflight }) : null }; }
  function newTab(pointer) {
    const { mem, restoredRecord } = restore(pointer);
    const tab = { id: `t${++nTab}`, alive: true, pointer, mem, restoredRecord, ownKey: null, restoredFrom: pointer && mem.length ? pointer : null };
    tabs.push(tab); return tab;
  }
  function persist(tab) {   // what the runtime would do on commit / ack / retry / recovery
    const plan = planPersist({ ownKey: tab.ownKey, ownRecord: tab.ownKey ? record(tab.ownKey) : null, pointerKey: tab.pointer, pointerRecord: tab.pointer ? record(tab.pointer) : null, restoredRecord: tab.restoredRecord, now, selfId: tab.id, newKey: `j${++nKey}` });
    journals.set(plan.key, { principal: 'A', revision: 0, queue: copy(tab.mem), inflight: null, owner: { id: tab.id, at: now } });
    tab.ownKey = plan.key; tab.pointer = plan.key; tab.restoredRecord = null;
  }
  const release = tab => { const rec = tab.ownKey && journals.get(tab.ownKey); if (rec?.owner?.id === tab.id) rec.owner.released = true; };
  const steps = {
    open: () => { newTab(null); },
    reload: () => { const t = pick(live()); if (!t) return; release(t); t.alive = false; newTab(t.ownKey || t.pointer); },
    duplicate: () => { const t = pick(live()); if (t) newTab(t.ownKey || t.pointer); },
    commit: () => { const t = pick(live()); if (!t) return; const b = batchOf(++nBatch); created.push(b.batch_id); t.mem.push(b); persist(t); },
    ack: () => { const t = pick(live().filter(x => x.mem.length)); if (!t) return; acked.add(t.mem.shift().batch_id); persist(t); },
    heartbeat: () => { for (const t of live()) { if (random() < throttle) continue; const rec = t.ownKey && journals.get(t.ownKey); if (rec?.owner?.id === t.id) rec.owner.at = now; } },   // throttled background tabs miss beats
    close: () => { const t = pick(live()); if (!t) return; if (random() < 0.5) release(t); t.alive = false; },   // clean pagehide or crash
    advance: () => { now += Math.floor(random() * 120_000); },
    reap: () => {
      const protectedKeys = new Set(live().flatMap(t => [t.ownKey, t.pointer, t.restoredFrom].filter(Boolean)));
      const entries = [...journals].map(([key, rec]) => ({ key, record: copy(rec) }));
      for (const key of planReap(entries, { now, selfId: '-', protectedKeys }).reap) journals.delete(key);
    },
    recover: () => {   // explicit recovery by the person: a tab with nothing pending takes a non-empty unowned journal
      const t = pick(live().filter(x => !x.mem.length)); if (!t) return;
      const source = pick([...journals].filter(([k, r]) => !isEmptyJournal(r) && ['free', 'legacy'].includes(leaseState(r, now, t.id))));
      if (!source) return; t.mem = copy(source[1].queue); t.restoredFrom = source[0]; t.ownKey = null; t.pointer = null; persist(t);
    },
  };
  const names = Object.keys(steps);
  function check(where) {
    const inJournals = new Set([...journals.values()].flatMap(r => r.queue.map(b => b.batch_id)));
    for (const id of created) if (!acked.has(id)) assert.ok(inJournals.has(id), `${where}: unsynced batch ${id} exists in no durable journal (seed ${seed})`);
    for (const t of live()) {
      const rec = t.ownKey && journals.get(t.ownKey);
      if (rec && rec.owner.id === t.id) assert.deepEqual(rec.queue.map(b => b.batch_id), t.mem.map(b => b.batch_id), `${where}: a tab's own journal mirrors what it holds (seed ${seed})`);
      for (const other of live()) if (other !== t && rec && rec.owner.id === t.id) assert.notEqual(other.ownKey && journals.get(other.ownKey)?.owner.id === other.id ? other.ownKey : null, t.ownKey, `${where}: two tabs own the same journal (seed ${seed})`);
    }
  }
  return { steps, names, journals, tabs, live, check, pick, random, setNow: v => { now = v; }, get now() { return now; }, created, acked };
}

test('MODEL: no unsynced batch is ever lost and two active tabs never own the same journal, across 3000 random histories incl. crashes and expired leases', () => {
  let steps = 0;
  for (let seed = 1; seed <= 3000; seed++) {
    const world = createWorld(seed);
    world.steps.open();
    for (let i = 0; i < 60; i++) {
      const name = world.random() < 0.75 ? world.pick(['commit', 'reload', 'duplicate', 'open', 'ack', 'heartbeat', 'advance']) : world.pick(world.names);
      world.steps[name](); world.check(`${name}#${i}`); steps++;
    }
  }
  assert.ok(steps >= 180000);
});

test('MODEL: after everything is closed and the leases are gone, nothing is empty and nothing is redundant; unsynced work is still all there', () => {
  for (let seed = 1; seed <= 1500; seed++) {
    const world = createWorld(seed);
    world.steps.open();
    for (let i = 0; i < 50; i++) world.steps[world.pick(world.names)]();
    for (const t of world.tabs) t.alive = false;
    world.setNow(world.now + 10 * LEASE_TTL_MS); world.steps.reap(); world.check('final');
    const rows = [...world.journals].map(([key, record]) => ({ key, record }));
    assert.equal(rows.some(r => isEmptyJournal(r.record)), false, `empty journals reclaimed (seed ${seed})`);
    const again = planReap(rows, { now: world.now, selfId: '-' });
    assert.deepEqual(again.reap, [], `reaping is idempotent: a second pass finds nothing redundant (seed ${seed})`);
    assert.ok(rows.length <= world.created.length, 'never more journals than batches ever created');
  }
});

test('BOUND: any number of passive loads writes nothing; a tab with pending work reloaded 500 times keeps ONE journal of constant size', () => {
  const world = createWorld(7);
  const first = (world.steps.open(), world.tabs[0]);
  for (let i = 0; i < 500; i++) { world.steps.open(); world.steps.duplicate(); }
  for (const t of world.tabs) assert.equal(t.ownKey, null);
  assert.equal(world.journals.size, 0, 'passive tabs never write (lazy persistence)');
  void first;
  const w = createWorld(8); w.steps.open(); w.steps.commit(); w.steps.commit();
  const body = () => JSON.stringify([...w.journals.values()].map(r => r.queue));
  const sizeAfterFirstWrite = body().length;
  for (let i = 0; i < 500; i++) { w.steps.reload(); w.steps.heartbeat(); }
  assert.equal(w.journals.size, 1, 'reload adopts the released journal in place instead of copying');
  assert.equal(body().length, sizeAfterFirstWrite, 'and its size does not grow');
});

test('CONTRACT: a duplicated tab (shared sessionStorage pointer) while the original is live gets its own distinct durable journal', () => {
  const w = createWorld(9); w.steps.open(); w.steps.commit();
  const original = w.tabs[0]; w.steps.duplicate();
  const copyTab = w.tabs[1]; w.steps.heartbeat();
  w.tabs.forEach(t => { if (t.ownKey) w.journals.get(t.ownKey).owner.at = w.now; });
  w.setNow(w.now + 1000);
  // the copy commits: it must not touch the original's journal
  const before = JSON.stringify(w.journals.get(original.ownKey));
  copyTab.mem.push({ batch_id: 'copy-b', ops: [] });
  const plan = planPersist({ ownKey: null, pointerKey: copyTab.pointer, pointerRecord: w.journals.get(copyTab.pointer), restoredRecord: copyTab.restoredRecord, now: w.now, selfId: copyTab.id, newKey: 'new' });
  assert.equal(plan.action, 'copy'); assert.notEqual(plan.key, original.ownKey);
  assert.equal(JSON.stringify(w.journals.get(original.ownKey)), before);
});

test('SAFETY: legacy journals (no owner) are never adopted or collapsed, a changed journal is never overwritten, a live keeper is never relied on', () => {
  const rec = { principal: 'A', revision: 3, queue: [{ batch_id: 'x', ops: [1] }], inflight: null };
  assert.equal(leaseState(rec, 0, 'me'), 'legacy');
  assert.equal(planPersist({ pointerKey: 'old', pointerRecord: rec, restoredRecord: rec, now: 0, selfId: 'me', newKey: 'new' }).action, 'copy');
  const released = { ...rec, owner: { id: 'gone', at: 0, released: true } };
  assert.equal(planPersist({ pointerKey: 'old', pointerRecord: released, restoredRecord: rec, now: 0, selfId: 'me', newKey: 'new' }).action, 'adopt');
  const changed = { ...released, queue: [...rec.queue, { batch_id: 'y', ops: [2] }] };
  assert.equal(planPersist({ pointerKey: 'old', pointerRecord: changed, restoredRecord: rec, now: 0, selfId: 'me', newKey: 'new' }).action, 'copy', 'someone added a batch since this tab restored: copy, do not overwrite');
  const small = { ...released, queue: rec.queue }, big = { ...released, queue: [...rec.queue, { batch_id: 'y', ops: [2] }] };
  const liveBig = { ...big, owner: { id: 'other', at: 100 } };
  assert.deepEqual(planReap([{ key: 'a', record: small }, { key: 'b', record: liveBig }], { now: 200, selfId: 'me' }).reap, [], 'a live journal is not a safe keeper');
  assert.deepEqual(planReap([{ key: 'a', record: small }, { key: 'b', record: { ...big, owner: { id: 'z', released: true } } }], { now: 200, selfId: 'me' }).reap, ['a'], 'a free superset is');
  assert.deepEqual(planReap([{ key: 'a', record: { ...small, revision: 4 } }, { key: 'b', record: big }], { now: 200, selfId: 'me' }).reap, [], 'a different revision is never collapsed');
  assert.equal(planReap(Array.from({ length: MAX_UNOWNED + 1 }, (_, i) => ({ key: `k${i}`, record: { ...released, revision: i } })), { now: 0, selfId: 'me' }).overCap, true, 'the cap only reports, it deletes nothing');
  void applyResearchOps;
});
