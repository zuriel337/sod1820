import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchSyncRuntime } from '../src/lib/research/researchSyncRuntime.js';
import { makeResearchOp, emptyResearchState, applyResearchOps } from '../src/lib/research/researchSyncState.js';

class Store { d = new Map(); mode = 'ok';
  getItem(k) { if (this.mode === 'throwAll') throw new Error('SecurityError'); return this.d.get(k) ?? null; }
  setItem(k, v) { if (this.mode !== 'ok') throw new Error('blocked'); this.d.set(k, String(v)); }
  removeItem(k) { if (this.mode === 'throwAll') throw new Error('SecurityError'); this.d.delete(k); }
  get length() { return this.d.size; } key(i) { return [...this.d.keys()][i]; } }
const tick = () => new Promise(r => setTimeout(r, 5));
const ent = { id: 'number:2521', ref: 2521, type: 'number', title: '2521' };
function make({ storage = new Store(), session = new Store() } = {}) {
  const server = { rev: 0, items: [] };
  const runtime = createResearchSyncRuntime({ userId: 'U', storage, session, delay: 1, resumePendingOnStart: false,
    readCloud: async () => ({ ...emptyResearchState(), saved: [...server.items], revision: server.rev }),
    writeCloud: async (_u, ops, { batchId }) => { server.items = applyResearchOps({ ...emptyResearchState(), saved: server.items }, ops).saved; server.rev++;
      return { ok: true, batch_id: batchId, applied_revision: server.rev, snapshot: { ...emptyResearchState(), saved: server.items, revision: server.rev } }; } });
  runtime.start();
  return { runtime, server };
}
const save = r => r.commit([makeResearchOp('item_upsert', { bucket: 'library', entity: ent })]);

for (const [name, mode] of [['writes blocked', 'blocked'], ['every call throws', 'throwAll']]) {
  test(`sessionStorage ${name}: save still starts and reaches the server`, async () => {
    const session = new Store(); session.mode = mode;
    const { runtime, server } = make({ session }); await tick();
    assert.equal(runtime.getSnapshot().syncStatus, 'synced');
    assert.equal(save(runtime), true);
    await tick(); await tick(); await tick();
    assert.equal(server.items.length, 1);
    assert.equal(runtime.getSnapshot().syncStatus, 'synced');
    assert.equal(runtime.getSnapshot().syncPending, 0);
  });
}
test('sessionStorage missing entirely (null): save reaches the server', async () => {
  const { runtime, server } = make({ session: null }); await tick();
  assert.equal(save(runtime), true); await tick(); await tick(); await tick();
  assert.equal(server.items.length, 1);
});
test('navigation context survives in memory while sessionStorage is blocked', async () => {
  const session = new Store(); session.mode = 'blocked';
  const { runtime } = make({ session }); await tick();
  const context = { subject: { id: '2521', type: 'number', label: '2521' } };
  assert.equal(runtime.commit([makeResearchOp('context_set', { context })]), true);
  assert.equal(runtime.getSnapshot().context?.subject?.id, '2521');
});
test('durable storage failure is still fail-closed: nothing is sent', async () => {
  const storage = new Store();
  const { runtime, server } = make({ storage }); await tick();
  storage.mode = 'blocked';
  assert.equal(save(runtime), false);
  await tick(); await tick();
  assert.equal(server.items.length, 0);
  assert.equal(runtime.getSnapshot().syncStatus, 'local_error');
});
