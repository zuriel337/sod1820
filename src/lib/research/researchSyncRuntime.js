// Lifecycle/IO helper of the existing ResearchProvider, NOT a second Research OS/store.
// Same research_items/user_research. A fixed principal, immutable queued batches, one in-flight
// request, server revision CAS and durable receipts prevent stale/duplicate destructive replay.
import { applyResearchOps, assertCloudSnapshot, emptyResearchState, normalizeResearchState,
  newResearchId, principalToken, principalStateKey, principalContextKey, LEGACY_UNSCOPED_KEY } from './researchSyncState.js';

const clone = value => JSON.parse(JSON.stringify(value));
const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
function read(storage, key, fallback) {
  const raw = storage?.getItem(key);
  return raw == null ? fallback : JSON.parse(raw);
}
export function createResearchSyncRuntime({ userId = null, storage, session, readCloud, writeCloud,
  onContext = () => {}, idFactory = newResearchId, delay = 350, disabled = false } = {}) {
  const principal = principalToken(userId), key = principalStateKey(principal);
  const pointerKey = `${key}:journal`, journalKey = `${key}:pending:${idFactory()}`;
  const contextKey = principalContextKey(principal);
  let restoredFrom = null, restoredRaw = null, storageFault = false;
  let cached = {}, journal = { revision: null, queue: [], inflight: null }, activeContext = null;
  try {
    if (disabled) { storage = null; session = null; }
    cached = read(storage, key, {});
    activeContext = read(session, contextKey, null);
    restoredFrom = session?.getItem(pointerKey);
    if (restoredFrom?.startsWith(`${key}:pending:`)) {
      restoredRaw = storage?.getItem(restoredFrom);
      if (restoredRaw) {
        journal = JSON.parse(restoredRaw);
        if (journal.principal !== principal || !Array.isArray(journal.queue) ||
          (journal.revision !== null && (!Number.isSafeInteger(journal.revision) || journal.revision < 0)) ||
          journal.queue.some(b => !b.batch_id || !Array.isArray(b.ops) || !b.ops.length || b.ops.length > 100)) {
          throw new Error('RESEARCH_LOCAL_RECOVERY_REQUIRED');
        }
        // Validate operations BEFORE any network call. Never silently discard an invalid journal.
        applyResearchOps(emptyResearchState(), journal.queue.flatMap(b => b.ops));
        if (journal.inflight && (!journal.queue[0] || journal.inflight.batch_id !== journal.queue[0].batch_id ||
          JSON.stringify(journal.inflight.ops) !== JSON.stringify(journal.queue[0].ops) ||
          !Number.isSafeInteger(journal.inflight.expected_revision) || journal.inflight.expected_revision < 0)) {
          throw new Error('RESEARCH_LOCAL_RECOVERY_REQUIRED');
        }
      }
    }
  } catch { storageFault = true; journal = { revision: null, queue: [], inflight: null }; cached = {}; activeContext = null; }
  let state = { ...normalizeResearchState(cached.state || cached), context: activeContext };
  let mode = cached.mode === 'discovery' ? 'discovery' : 'reader';
  let revision = journal.revision ?? (Number.isSafeInteger(cached.revision) ? cached.revision : null);
  let queue = clone(journal.queue), inflight = journal.inflight ? clone(journal.inflight) : null;
  let active = false, generation = 0, cloudReady = false, timer = null, operation = null;
  let status = disabled ? 'auth_loading' : storageFault ? 'local_recovery_required' : userId ? 'loading' : 'local_only';
  const listeners = new Set();
  let snapshot;
  let legacyRecoveryAvailable = false;
  try { legacyRecoveryAvailable = !disabled && !!storage?.getItem(LEGACY_UNSCOPED_KEY); } catch { /* unavailable */ }
  const notify = () => {
    snapshot = Object.freeze({ ...state, mode, syncStatus: status, syncPending: queue.length,
      syncRevision: revision, legacyRecoveryAvailable });
    for (const fn of listeners) fn();
  };
  // Every mounted tab owns a separate journal. Copy-on-resume retains exact batch IDs/revisions;
  // duplicated tabs cannot overwrite another tab's pending operations. Version conflicts fail closed.
  function persist() {
    if (disabled || storageFault) return false;
    try {
      if (!storage || !session) throw new Error('RESEARCH_STORAGE_UNAVAILABLE');
      storage.setItem(journalKey, JSON.stringify({ principal, revision, queue, inflight }));
      session.setItem(pointerKey, journalKey);
      storage.setItem(key, JSON.stringify({ state, mode, revision }));
      if (state.context == null) session.removeItem(contextKey);
      else session.setItem(contextKey, JSON.stringify(state.context));
      return true;
    } catch { status = 'local_error'; return false; }
  }
  function cleanRecoveredCopy() {
    if (queue.length || inflight || !restoredFrom || !restoredRaw) return;
    try {
      // Do not remove a journal that its still-open original tab has since changed.
      if (storage.getItem(restoredFrom) === restoredRaw) storage.removeItem(restoredFrom);
      restoredFrom = null; restoredRaw = null;
    } catch { /* a leftover recovery copy is safer than lost state */ }
  }
  function schedule() {
    clearTimeout(timer);
    if (active && cloudReady && queue.length && !operation && !['conflict', 'local_error', 'local_recovery_required', 'error'].includes(status)) {
      timer = setTimeout(() => { void flush(); }, delay);
    }
  }
  function markError(error) {
    status = String(error?.message || error).includes('RESEARCH_SYNC_CONFLICT') ? 'conflict' : 'error';
    notify();
  }
  async function hydrate() {
    if (!active || disabled || !userId || storageFault) return;
    if (operation) return operation;
    const epoch = generation;
    status = 'loading'; notify();
    const run = (async () => {
      try {
        const cloud = assertCloudSnapshot(await readCloud(userId));
        if (!active || generation !== epoch) return;
        // Never reset an uncertain pending journal's revision from a fresh read.
        if (!queue.length || revision == null) revision = cloud.revision;
        state = { ...applyResearchOps(cloud, queue.flatMap(b => b.ops)), context: state.context };
        cloudReady = true; status = queue.length ? 'pending' : 'synced';
        persist(); notify();
      } catch (e) { if (active && generation === epoch) { cloudReady = false; markError(e); } }
    })();
    operation = run;
    await run;
    if (operation === run) operation = null;
    if (active && generation === epoch) schedule();
  }
  async function flush() {
    if (!active || disabled || !userId || !cloudReady || !queue.length || operation || storageFault) return;
    if (status === 'conflict' || revision == null) return;
    clearTimeout(timer);
    const epoch = generation;
    // Commit the exact immutable request to local storage BEFORE sending it.
    if (!inflight) inflight = { ...clone(queue[0]), expected_revision: revision };
    const sent = clone(inflight);
    status = 'syncing';
    if (!persist()) { notify(); return; }
    notify();
    const run = (async () => {
      try {
        const response = await writeCloud(userId, sent.ops, { batchId: sent.batch_id, expectedRevision: sent.expected_revision });
        if (!active || generation !== epoch) return;
        const cloud = assertCloudSnapshot(response?.snapshot);
        if (!response?.ok || response.batch_id !== sent.batch_id || !Number.isSafeInteger(response.applied_revision)) {
          throw new Error('RESEARCH_ACK_INVALID');
        }
        queue = queue.filter(b => b.batch_id !== sent.batch_id);
        inflight = null;
        // A duplicate ACK can refer to an older revision. Remaining local intentions may not
        // silently overwrite intervening remote edits; next CAS then reports an explicit conflict.
        revision = queue.length ? response.applied_revision : cloud.revision;
        state = { ...applyResearchOps(cloud, queue.flatMap(b => b.ops)), context: state.context };
        status = queue.length ? 'pending' : 'synced';
        persist(); cleanRecoveredCopy(); notify();
      } catch (e) { if (active && generation === epoch) markError(e); }
    })();
    operation = run;
    await run;
    if (operation === run) operation = null;
    if (active && generation === epoch) schedule();
  }
  function commit(ops) {
    if (!active || disabled || storageFault) return false;
    const safe = clone(ops);
    if (!safe.length || safe.length > 100) throw new Error('RESEARCH_OPS_BATCH_TOO_LARGE');
    state = applyResearchOps(state, safe);
    if (userId) {
      queue = [...queue, { batch_id: idFactory(), ops: safe }];
      if (!['error', 'conflict', 'local_error'].includes(status)) status = 'pending';
    }
    const ok = persist(); notify();
    if (safe.some(op => op.kind === 'context_set')) onContext(state.context);
    if (ok) schedule();
    return ok;
  }
  async function retry() {
    if (!active || disabled || storageFault || status === 'conflict') return false;
    if (operation) await operation;
    if (!active) return false;
    if (!persist()) { notify(); return false; }
    if (!cloudReady) await hydrate();
    else { status = 'pending'; await flush(); }
    return status !== 'error' && status !== 'conflict' && status !== 'local_error';
  }
  async function resolveConflict({ confirm = false, action } = {}) {
    if (!active || !userId || !confirm || status !== 'conflict' || !['reapply', 'keep_remote'].includes(action)) return false;
    const epoch = generation;
    try {
      const cloud = assertCloudSnapshot(await readCloud(userId));
      if (!active || epoch !== generation) return false;
      // Preserve the disputed batch in its old journal for explicit recovery/provenance.
      storage.setItem(`${journalKey}:conflict:${idFactory()}`, JSON.stringify({ principal, revision, queue, inflight }));
      if (action === 'keep_remote') queue = [];
      else queue = queue.map(b => ({ ...b, batch_id: idFactory() }));
      inflight = null; revision = cloud.revision;
      state = { ...applyResearchOps(cloud, queue.flatMap(b => b.ops)), context: state.context };
      status = queue.length ? 'pending' : 'synced';
      persist(); notify(); schedule(); return true;
    } catch (e) { if (active && epoch === generation) markError(e); return false; }
  }
  notify();
  return {
    principal, getSnapshot: () => snapshot,
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    start() {
      if (active || disabled) return;
      active = true; generation += 1;
      persist(); onContext(state.context);
      if (userId && !storageFault) {
        // React StrictMode replays effects while the prior read may still be pending.
        const epoch = generation;
        if (operation) void operation.finally(() => { if (active && generation === epoch) void hydrate(); });
        else void hydrate();
      } else notify();
    },
    stop() {
      active = false; generation += 1; clearTimeout(timer);
      // Logout/account-key unmount ends the active session, never the saved workspace.
      try { session?.removeItem(contextKey); } catch { /* preserve other principal */ }
      onContext(null);
    },
    commit, flush, retry, resolveConflict,
    setMode(value) { if (!active || disabled) return; mode = value === 'discovery' ? 'discovery' : 'reader'; persist(); notify(); },
    // Export is caller-initiated, principal-bound and never publishes or auto-adopts unscoped v1 data.
    exportPending: () => clone({ principal, revision, queue, inflight }),
    exportLegacy({ confirmLocalAccess = false } = {}) {
      if (!active || disabled || !confirmLocalAccess) return null;
      // Explicit recovery export only. Old v1 mixed guest/account data, so ownership is UNKNOWN.
      // Never seed a guest or account from it, even when that account's cloud happens to be empty.
      const raw = storage?.getItem(LEGACY_UNSCOPED_KEY);
      return raw == null ? null : { source: LEGACY_UNSCOPED_KEY, owner: 'unknown', raw };
    },
  };
}
