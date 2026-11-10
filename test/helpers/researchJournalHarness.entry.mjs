// Page-side harness bundled into the browser test: the REAL researchSyncRuntime on the REAL localStorage / sessionStorage / timers,
// wired to the fixture server over fetch, with the same pagehide wiring as ResearchProvider.jsx.
import { createResearchSyncRuntime } from '../../src/lib/research/researchSyncRuntime.js';

const post = async (path, body) => {
  const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `HTTP ${response.status}`);
  return JSON.parse(text);
};
let runtime = null;
const op = (kind, payload) => ({ kind, op_id: crypto.randomUUID(), ...payload });
const entity = id => ({ id, ref: id, type: 'number', title: id });
const ids = queue => queue.flatMap(batch => batch.ops.map(o => o.entity?.id ?? o.kind));

window.H = {
  mount(options = {}) {
    runtime = createResearchSyncRuntime({
      userId: 'A', storage: localStorage, session: sessionStorage,
      readCloud: () => post('/srv/read', {}), writeCloud: (uid, ops, meta) => post('/srv/write', { ops, batchId: meta.batchId, expectedRevision: meta.expectedRevision }),
      delay: options.delay ?? 400, heartbeatMs: options.heartbeatMs ?? 250, leaseTtlMs: options.leaseTtlMs ?? 4000,
      resumePendingOnStart: options.resumePendingOnStart ?? true,
    });
    runtime.start();
    window.addEventListener('pagehide', () => runtime.release?.());   // as in ResearchProvider.jsx
    return true;
  },
  write: id => runtime.commit([op('item_upsert', { bucket: 'library', entity: entity(id) })]),
  passive: id => runtime.commit([op('history_add', { entity: entity(id) })]),
  queue: () => ids(runtime.exportPending().queue),
  batches: () => runtime.exportPending().queue.length,
  status: () => runtime.getSnapshot().syncStatus,
  recoveryJournals: () => runtime.getSnapshot().recoveryJournals,
  async sync() {   // what the person does to resume: retry, and confirm "re-apply" when a revision conflict is reported
    for (let i = 0; i < 6; i++) {
      await runtime.retry();
      if (runtime.getSnapshot().syncStatus === 'conflict') await runtime.resolveConflict({ confirm: true, action: 'reapply' });
      if (!runtime.exportPending().queue.length) return true;
    }
    return !runtime.exportPending().queue.length;
  },
  async recoverAll() {
    for (let i = 0; i < 40; i++) {
      const row = runtime.getSnapshot().recoveryJournals.find(j => !j.invalid);
      if (!row) return true;
      if (runtime.exportPending().queue.length) { await this.sync(); continue; }
      await runtime.recoverJournal({ key: row.key, confirm: true });
    }
    return false;
  },
  journals() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i); if (!key.includes(':pending:')) continue;
      try { const r = JSON.parse(localStorage.getItem(key)); out.push({ key, ids: ids(r.queue || []), batches: (r.queue || []).length, released: r.owner?.released ?? null, owner: r.owner?.id ?? null, at: r.owner?.at ?? null }); } catch { out.push({ key, invalid: true }); }
    }
    return out;
  },
  sessionPointer: () => Object.fromEntries(Object.entries(sessionStorage)),
  setSession(entries) { for (const [k, v] of Object.entries(entries)) sessionStorage.setItem(k, v); },
};
