import test from 'node:test';
import assert from 'node:assert/strict';
import { decideSaveClick, saveLabelState } from '../src/lib/research/personalSaveDecision.js';
import { createResearchSyncRuntime } from '../src/lib/research/researchSyncRuntime.js';
import { makeResearchOp, emptyResearchState, applyResearchOps } from '../src/lib/research/researchSyncState.js';

class Store { d = new Map(); fail = false;
  getItem(k) { return this.d.get(k) ?? null; } setItem(k, v) { if (this.fail) throw new Error('blocked'); this.d.set(k, String(v)); }
  removeItem(k) { this.d.delete(k); } get length() { return this.d.size; } key(i) { return [...this.d.keys()][i]; } }
const tick = () => new Promise(r => setTimeout(r, 5));
const ent = { id: 'number:776', ref: 776, type: 'number', title: '776' };
function make({ session = new Store(), cloudEnabled = false } = {}) {
  const server = { rev: 0, items: [], writes: 0 };
  const runtime = createResearchSyncRuntime({ userId: 'U', storage: new Store(), session, delay: 1, resumePendingOnStart: false, cloudEnabled,
    readCloud: async () => ({ ...emptyResearchState(), saved: [...server.items], revision: server.rev }),
    writeCloud: async (_u, ops, { batchId }) => { server.writes++; server.items = applyResearchOps({ ...emptyResearchState(), saved: server.items }, ops).saved; server.rev++;
      return { ok: true, batch_id: batchId, applied_revision: server.rev, snapshot: { ...emptyResearchState(), saved: server.items, revision: server.rev } }; } });
  runtime.start();
  return { runtime, server };
}
const upsert = r => r.commit([makeResearchOp('item_upsert', { bucket: 'library', entity: ent })]);

test('decision table: a local item is never reported as confirmed', () => {
  assert.equal(decideSaveClick({ saved: false, syncStatus: 'synced', syncPending: 0 }), 'save');
  assert.equal(decideSaveClick({ saved: true, syncStatus: 'synced', syncPending: 0 }), 'confirm');
  assert.equal(decideSaveClick({ saved: true, syncStatus: 'local_only', syncPending: 0 }), 'resave');
  assert.equal(decideSaveClick({ saved: true, syncStatus: 'error', syncPending: 1 }), 'retry');
  assert.equal(decideSaveClick({ saved: true, syncStatus: 'local_error', syncPending: 1 }), 'retry');
  assert.equal(decideSaveClick({ saved: true, syncStatus: 'conflict', syncPending: 1 }), 'blocked');
  assert.equal(decideSaveClick({ saved: true, syncStatus: 'syncing', syncPending: 1 }), 'wait');
  assert.equal(saveLabelState({ saved: true, syncStatus: 'local_only', syncPending: 0 }), 'local');
  assert.equal(saveLabelState({ saved: true, syncStatus: 'synced', syncPending: 0 }), 'confirmed');
});

test('local-only item (cloud was off) reaches the server on re-save, and nothing is removed', async () => {
  const { runtime, server } = make({ cloudEnabled: false });
  assert.equal(upsert(runtime), true);
  assert.deepEqual(decideSaveClick({ saved: true, ...pick(runtime) }), 'resave');
  runtime.setCloudAccess(true); await tick();
  upsert(runtime); await tick(); await tick(); await tick();
  assert.equal(server.items.length, 1);
  assert.deepEqual(decideSaveClick({ saved: true, ...pick(runtime) }), 'confirm');
  assert.equal(runtime.getSnapshot().saved.length, 1);
});

test('blocked sessionStorage no longer strands the item: it syncs and is confirmed', async () => {
  const session = new Store(); session.fail = true;
  const { runtime, server } = make({ session, cloudEnabled: true }); await tick();
  assert.equal(upsert(runtime), true);
  await tick(); await tick(); await tick();
  assert.equal(server.items.length, 1);
  assert.equal(decideSaveClick({ saved: true, ...pick(runtime) }), 'confirm');
});
test('blocked durable storage keeps the item queued (fail-closed) and retry works once storage recovers', async () => {
  const storage = new Store();
  const server = { rev: 0, items: [] };
  const runtime = createResearchSyncRuntime({ userId: 'U', storage, session: new Store(), delay: 1, resumePendingOnStart: false, cloudEnabled: true,
    readCloud: async () => ({ ...emptyResearchState(), saved: [...server.items], revision: server.rev }),
    writeCloud: async (_u, ops, { batchId }) => { server.items = applyResearchOps({ ...emptyResearchState(), saved: server.items }, ops).saved; server.rev++;
      return { ok: true, batch_id: batchId, applied_revision: server.rev, snapshot: { ...emptyResearchState(), saved: server.items, revision: server.rev } }; } });
  runtime.start(); await tick();
  storage.fail = true;
  assert.equal(upsert(runtime), false);
  assert.equal(decideSaveClick({ saved: true, ...pick(runtime) }), 'retry');
  storage.fail = false;
  assert.equal(await runtime.retry(), true); await tick(); await tick();
  assert.equal(server.items.length, 1);
  assert.equal(decideSaveClick({ saved: true, ...pick(runtime) }), 'confirm');
});
function pick(r) { const s = r.getSnapshot(); return { syncStatus: s.syncStatus, syncPending: s.syncPending }; }
