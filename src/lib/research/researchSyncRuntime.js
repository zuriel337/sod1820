// Lifecycle/IO helper of the existing ResearchProvider, NOT a second Research OS/store.
// Same research_items/user_research. A fixed principal, immutable queued batches, one in-flight
// request, server revision CAS and durable receipts prevent stale/duplicate destructive replay.
import { applyResearchOps, assertCloudSnapshot, emptyResearchState, normalizeResearchState,
  newResearchId, principalToken, principalStateKey, principalContextKey, LEGACY_UNSCOPED_KEY,
  LEGACY_CONTEXT_SESSION_KEY } from './researchSyncState.js';
import { normalizeResearchContext } from './researchContext.js';
import { HEARTBEAT_MS, planPersist, planReap } from './researchJournalLifecycle.js';

const clone = value => JSON.parse(JSON.stringify(value));
const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
function read(storage, key, fallback) {
  const raw = storage?.getItem(key);
  return raw == null ? fallback : JSON.parse(raw);
}
// Pre-migration guest context lived unscoped in sessionStorage. Bounded, one-way, guest-only:
// a malformed/foreign shape is simply not adopted, never thrown, so a bad legacy value cannot
// break the current read.
function readLegacyContext(session) {
  try {
    const raw = session?.getItem(LEGACY_CONTEXT_SESSION_KEY);
    if (raw == null) return null;
    const value = JSON.parse(raw);
    if (!object(value) || !object(value.subject)) return null;
    return value;
  } catch { return null; }
}
export function createResearchSyncRuntime({ userId = null, storage, session, readCloud, writeCloud,
  onContext = () => {}, idFactory = newResearchId, delay = 350, disabled = false, cloudEnabled = true,
  resumePendingOnStart = true, now = () => Date.now(), heartbeatMs = HEARTBEAT_MS } = {}) {
  const principal = principalToken(userId), key = principalStateKey(principal);
  const pointerKey = `${key}:journal`, selfId = idFactory();
  // Journal ownership (see researchJournalLifecycle.js): the journal key is claimed lazily, only when this tab has pending work to persist.
  let journalKey = null, restoredSnapshot = null, touched = false, heartbeatTimer = null;
  const contextKey = principalContextKey(principal);
  let restoredFrom = null, restoredRaw = null, storageFault = false;
  let cached = {}, journal = { revision: null, queue: [], inflight: null }, activeContext = null;
  let legacyContextKeyToRetire = null;
  try {
    if (disabled) { storage = null; session = null; }
    cached = read(storage, key, {});
    if (!object(cached)) throw new Error('RESEARCH_LOCAL_RECOVERY_REQUIRED');
    activeContext = read(session, contextKey, null);
    // Guest only, and only when the current principal key is empty: the new key always wins.
    // Never adopt the unscoped legacy context into an authenticated principal.
    if (principal === 'guest' && activeContext == null) {
      const legacy = readLegacyContext(session);
      if (legacy) { activeContext = legacy; legacyContextKeyToRetire = LEGACY_CONTEXT_SESSION_KEY; }
    }
    restoredFrom = session?.getItem(pointerKey);
    if (restoredFrom?.startsWith(`${key}:pending:`)) {
      restoredRaw = storage?.getItem(restoredFrom);
      if (restoredRaw) {
        journal = JSON.parse(restoredRaw);
        restoredSnapshot = { revision: journal.revision, queue: clone(journal.queue || []), inflight: journal.inflight ? clone(journal.inflight) : null };
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
  } catch { storageFault = true; journal = { revision: null, queue: [], inflight: null }; cached = {}; activeContext = null; legacyContextKeyToRetire = null; }
  let state = { ...normalizeResearchState(cached.state || cached), context: activeContext };
  let mode = cached.mode === 'discovery' ? 'discovery' : 'reader';
  let revision = journal.revision ?? (Number.isSafeInteger(cached.revision) ? cached.revision : null);
  let queue = clone(journal.queue), inflight = journal.inflight ? clone(journal.inflight) : null;
  let active = false, generation = 0, cloudReady = false, timer = null, operation = null, resolving = false;
  // A reading deployment may admit private reads without replaying a journal on login.
  // Only an explicit edit/retry authorizes its existing queue; route context/history do not.
  let writeIntent = resumePendingOnStart;
  let status = disabled ? 'auth_loading' : storageFault ? 'local_recovery_required' : userId && cloudEnabled ? 'loading' : 'local_only';
  const listeners = new Set();
  let snapshot;
  let legacyRecoveryAvailable = false;
  try { legacyRecoveryAvailable = !disabled && !!storage?.getItem(LEGACY_UNSCOPED_KEY); } catch { /* unavailable */ }
  const notify = () => {
    snapshot = Object.freeze({ ...state, mode, syncStatus: status, syncPending: queue.length,
      syncRevision: revision, syncAwaitingAction: Boolean(userId && cloudEnabled && queue.length && !writeIntent),
      legacyRecoveryAvailable, recoveryJournals: listRecoveryJournals() });
    for (const fn of listeners) fn();
  };
  function listRecoveryJournals() {
    if (disabled || !storage) return [];
    const out = [];
    try {
      for (let i = 0; i < storage.length; i += 1) {
        const name = storage.key(i);
        if (!name?.startsWith(`${key}:pending:`) || name === journalKey || name === restoredFrom) continue;
        // Disputed/explicitly-set-aside copies are provenance, not unattended active work.
        if (name.includes(':conflict:')) continue;
        try {
          const record = JSON.parse(storage.getItem(name));
          if (record?.principal === principal && Array.isArray(record.queue) && record.queue.length) {
            out.push({ key: name, pendingBatches: record.queue.length, revision: record.revision ?? null });
          }
        } catch { out.push({ key: name, invalid: true }); }
      }
    } catch { /* storage remains unavailable; do not inspect other principal keys */ }
    return out;
  }
  // Every mounted tab owns a separate journal. Copy-on-resume retains exact batch IDs/revisions;
  // duplicated tabs cannot overwrite another tab's pending operations. Version conflicts fail closed.
  const readRecord = name => { try { const raw = storage?.getItem(name); return raw == null ? null : JSON.parse(raw); } catch { return null; } };
  const ownedRecord = () => { const record = journalKey ? readRecord(journalKey) : null; return record?.owner?.id === selfId ? record : null; };
  // Claim (or re-claim) the journal this tab writes: its own, the one it restored from if that is free and unchanged, else a new copy.
  function claimJournal() {
    const plan = planPersist({ ownKey: journalKey, ownRecord: journalKey ? readRecord(journalKey) : null, pointerKey: restoredFrom, pointerRecord: restoredFrom ? readRecord(restoredFrom) : null,
      restoredRecord: restoredSnapshot, now: now(), selfId, newKey: `${key}:pending:${idFactory()}` });
    if (plan.action === 'adopt') { restoredFrom = null; restoredRaw = null; }
    restoredSnapshot = null; journalKey = plan.key;
  }
  function writeJournal() {
    claimJournal();
    storage.setItem(journalKey, JSON.stringify({ principal, revision, queue, inflight, owner: { id: selfId, at: now(), released: false } }));
    session.setItem(pointerKey, journalKey);
  }
  // Every mounted tab with pending work owns a separate journal. Copy-on-resume retains exact batch IDs/revisions;
  // duplicated tabs cannot overwrite another tab's pending operations. Version conflicts fail closed.
  // A tab with nothing to persist writes no journal at all (and removes its own once it drains).
  function persist() {
    if (disabled || storageFault) return false;
    try {
      if (!storage || !session) throw new Error('RESEARCH_STORAGE_UNAVAILABLE');
      const hasWork = queue.length > 0 || Boolean(inflight);
      if (hasWork && (touched || journalKey)) writeJournal();
      else if (!hasWork && journalKey) {
        if (ownedRecord()) { storage.removeItem(journalKey); session.removeItem(pointerKey); }
        journalKey = null;
      }
      storage.setItem(key, JSON.stringify({ state, mode, revision }));
      if (state.context == null) session.removeItem(contextKey);
      else session.setItem(contextKey, JSON.stringify(state.context));
      // Retire the legacy unscoped key only once its content is durably persisted under the
      // principal-scoped key, so a mid-write failure leaves the recoverable original in place.
      if (legacyContextKeyToRetire) {
        session.removeItem(legacyContextKeyToRetire);
        legacyContextKeyToRetire = null;
      }
      return true;
    } catch { status = 'local_error'; return false; }
  }
  // Lease upkeep: only the owner touches `owner.at`; `released` is set when the page goes away so a reload can continue the journal in place.
  function heartbeat() {
    if (disabled || storageFault || !storage || !journalKey) return;
    try { const record = ownedRecord(); if (record && !record.owner.released) { record.owner.at = now(); storage.setItem(journalKey, JSON.stringify(record)); } } catch { /* the next persist re-claims */ }
  }
  function release() {
    clearInterval(heartbeatTimer); heartbeatTimer = null;
    if (disabled || storageFault || !storage || !journalKey) return;
    try { const record = ownedRecord(); if (record) { record.owner.released = true; record.owner.at = now(); storage.setItem(journalKey, JSON.stringify(record)); } } catch { /* a stale lease simply expires */ }
  }
  // Remove only journals that hold nothing, or whose every batch (id, ops, revision) is also held by another free journal that stays.
  function reapRedundant() {
    if (disabled || storageFault || !storage) return;
    try {
      const rows = [];
      for (let i = 0; i < storage.length; i += 1) {
        const name = storage.key(i);
        if (!name?.startsWith(`${key}:pending:`) || name.includes(':conflict:')) continue;
        const record = readRecord(name);
        if (record?.principal === principal && Array.isArray(record.queue)) rows.push({ key: name, record });
      }
      const { reap } = planReap(rows, { now: now(), selfId, protectedKeys: new Set([journalKey, restoredFrom].filter(Boolean)) });
      for (const name of reap) storage.removeItem(name);
    } catch { /* leftover journals are safer than lost state */ }
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
    if (active && cloudEnabled && writeIntent && cloudReady && queue.length && !operation && !['conflict', 'local_error', 'local_recovery_required', 'error'].includes(status)) {
      timer = setTimeout(() => { void flush(); }, delay);
    }
  }
  function markError(error) {
    status = String(error?.message || error).includes('RESEARCH_SYNC_CONFLICT') ? 'conflict' : 'error';
    notify();
  }
  async function hydrate() {
    if (!active || disabled || !cloudEnabled || !userId || storageFault) return;
    if (operation) return operation;
    const epoch = generation;
    status = 'loading'; notify();
    const run = (async () => {
      try {
        const cloud = assertCloudSnapshot(await readCloud(userId));
        if (!active || generation !== epoch) return;
        // Never reset an uncertain pending journal's revision from a fresh read.
        if (!queue.length || revision == null) revision = cloud.revision;
        const hasQueuedContextIntent = queue.some(batch => batch.ops.some(op => op?.kind === 'context_set'));
        const cloudContext = normalizeResearchContext(cloud.context);
        // A mounted tab owns its active navigation. A genuinely fresh browser origin has no
        // session Context, so it may resume the same principal's private cloud Context. This is
        // what lets an exact-SHA Preview change without making the user's Life Journey disappear.
        const hydratedContext = state.context ?? (hasQueuedContextIntent ? null : cloudContext);
        state = { ...applyResearchOps(cloud, queue.flatMap(b => b.ops)), context: hydratedContext };
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
    if (!active || disabled || !cloudEnabled || !writeIntent || !userId || !cloudReady || !queue.length || operation || storageFault) return;
    if (status === 'conflict' || revision == null) return;
    clearTimeout(timer);
    const epoch = generation;
    // Commit the exact immutable request to local storage BEFORE sending it.
    touched = true;
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
    if (!active || disabled || storageFault || resolving) return false;
    touched = true;
    const safe = clone(ops);
    if (!safe.length || safe.length > 100) throw new Error('RESEARCH_OPS_BATCH_TOO_LARGE');
    state = applyResearchOps(state, safe);
    if (userId && cloudEnabled) {
      queue = [...queue, { batch_id: idFactory(), ops: safe }];
      if (safe.some(op => !['context_set', 'history_add'].includes(op.kind))) writeIntent = true;
      if (!['error', 'conflict', 'local_error'].includes(status)) status = 'pending';
    }
    const ok = persist(); notify();
    if (safe.some(op => op.kind === 'context_set')) onContext(state.context);
    if (ok) schedule();
    return ok;
  }
  async function retry() {
    if (!active || disabled || !cloudEnabled || storageFault || resolving || status === 'conflict') return false;
    const epoch = generation;
    if (operation) await operation;
    if (!active || !cloudEnabled || generation !== epoch) return false;
    writeIntent = true; touched = true;
    if (!persist()) { notify(); return false; }
    if (!cloudReady) await hydrate();
    else { status = 'pending'; await flush(); }
    return status !== 'error' && status !== 'conflict' && status !== 'local_error';
  }
  async function resolveConflict({ confirm = false, action } = {}) {
    if (!active || !cloudEnabled || !userId || !confirm || resolving || operation || status !== 'conflict' || !['reapply', 'keep_remote'].includes(action)) return false;
    const epoch = generation;
    writeIntent = true; touched = true;
    resolving = true; status = 'resolving'; notify();
    try {
      const cloud = assertCloudSnapshot(await readCloud(userId));
      if (!active || epoch !== generation) return false;
      // Preserve the disputed batch in its old journal for explicit recovery/provenance.
      storage.setItem(`${journalKey || `${key}:pending:${selfId}`}:conflict:${idFactory()}`, JSON.stringify({ principal, revision, queue, inflight }));
      if (action === 'keep_remote') queue = [];
      else queue = queue.map(b => ({ ...b, batch_id: idFactory() }));
      inflight = null; revision = cloud.revision;
      state = { ...applyResearchOps(cloud, queue.flatMap(b => b.ops)), context: state.context };
      status = queue.length ? 'pending' : 'synced';
      persist(); notify(); schedule(); return true;
    } catch (e) { if (active && epoch === generation) markError(e); return false; }
    finally { resolving = false; }
  }
  async function recoverJournal({ key: sourceKey, confirm = false } = {}) {
    if (!active || disabled || !cloudEnabled || !userId || !confirm || resolving || operation || queue.length || inflight || storageFault) return false;
    // A closed tab loses sessionStorage but its durable journal is still selectable, not orphaned.
    if (!listRecoveryJournals().some(row => row.key === sourceKey && !row.invalid)) return false;
    try {
      const raw = storage.getItem(sourceKey), record = JSON.parse(raw);
      if (record.principal !== principal || !Number.isSafeInteger(record.revision) || record.revision < 0) return false;
      if (record.queue.some(b => !b.batch_id || !Array.isArray(b.ops) || !b.ops.length || b.ops.length > 100)) return false;
      applyResearchOps(emptyResearchState(), record.queue.flatMap(b => b.ops));
      if (record.inflight && (record.inflight.batch_id !== record.queue[0].batch_id ||
        JSON.stringify(record.inflight.ops) !== JSON.stringify(record.queue[0].ops) ||
        !Number.isSafeInteger(record.inflight.expected_revision) || record.inflight.expected_revision < 0)) return false;
      restoredFrom = sourceKey; restoredRaw = raw; restoredSnapshot = { revision: record.revision, queue: clone(record.queue), inflight: record.inflight ? clone(record.inflight) : null };
      writeIntent = true; touched = true;
      queue = clone(record.queue); inflight = record.inflight ? clone(record.inflight) : null;
      revision = record.revision; cloudReady = false;
      if (!persist()) { notify(); return false; }
      await hydrate();
      return cloudReady;
    } catch (e) { markError(e); return false; }
  }
  notify();
  return {
    principal, getSnapshot: () => snapshot,
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    start() {
      if (active || disabled) return;
      active = true; generation += 1;
      persist(); onContext(state.context); reapRedundant();
      if (heartbeatMs > 0) { clearInterval(heartbeatTimer); heartbeatTimer = setInterval(heartbeat, heartbeatMs); heartbeatTimer.unref?.(); }
      if (userId && cloudEnabled && !storageFault) {
        // React StrictMode replays effects while the prior read may still be pending.
        const epoch = generation;
        if (operation) void operation.finally(() => { if (active && generation === epoch) void hydrate(); });
        else void hydrate();
      } else notify();
    },
    stop() {
      active = false; generation += 1; clearTimeout(timer); release();
      // Logout/account-key unmount ends the active session, never the saved workspace.
      try { session?.removeItem(contextKey); } catch { /* preserve other principal */ }
      onContext(null);
    },
    setCloudAccess(enabled) {
      const next = enabled === true;
      if (cloudEnabled === next) return;
      cloudEnabled = next;
      generation += 1;
      clearTimeout(timer);
      cloudReady = false;
      writeIntent = resumePendingOnStart;
      // Revoking access invalidates late reads/acks, while retaining the same principal's
      // context, immutable request and durable journal for explicit recovery/retry.
      status = disabled ? 'auth_loading' : storageFault ? 'local_recovery_required' : userId && next ? 'loading' : 'local_only';
      notify();
      if (!active || disabled || !next || !userId || storageFault) return;
      const epoch = generation;
      if (operation) void operation.finally(() => { if (active && generation === epoch) void hydrate(); });
      else void hydrate();
    },
    commit, flush, retry, resolveConflict, recoverJournal, heartbeat, release,
    listRecoveryJournals,
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
