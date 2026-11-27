// Lifecycle/IO helper of the existing ResearchProvider, NOT a second Research OS/store.
// Same research_items/user_research. A fixed principal, immutable queued batches, one in-flight
// request, server revision CAS and durable receipts prevent stale/duplicate destructive replay.
import { applyResearchOps, assertCloudSnapshot, emptyResearchState, normalizeResearchState,
  newResearchId, principalToken, principalStateKey, principalContextKey, LEGACY_UNSCOPED_KEY,
  LEGACY_CONTEXT_SESSION_KEY } from './researchSyncState.js';
import { normalizeResearchContext } from './researchContext.js';
import { HEARTBEAT_MS, LEASE_TTL_MS, REAP_GRACE_MS, planPersist, planReap } from './researchJournalLifecycle.js';
import { compactPassiveQueue } from './researchQueueCompaction.js';
// Why the durable local journal could not be used. It is exposed so the person is told the real cause, never a guess.
const isQuota = e => e?.name === 'QuotaExceededError' || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e?.code === 22 || e?.code === 1014 || /quota/i.test(String(e?.message || ''));
// A full or a denied store (the two causes that must never stop the account from being written).
const storageCause = e => isQuota(e) ? 'quota' : e?.name === 'SecurityError' ? 'blocked' : null;
import { isCloudConfirmed } from './personalSaveDecision.js';

const clone = value => JSON.parse(JSON.stringify(value));
const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
// sessionStorage only holds re-derivable tab hints (context copy, journal pointer): best-effort, never fails a save.
// The durable journal lives in `storage`, whose failures stay fail-closed.
const best = f => { try { return f(); } catch { /* best-effort */ } };
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
  resumePendingOnStart = true, now = () => Date.now(), heartbeatMs = HEARTBEAT_MS, leaseTtlMs = LEASE_TTL_MS, reapGraceMs = REAP_GRACE_MS } = {}) {
  const principal = principalToken(userId), key = principalStateKey(principal);
  const pointerKey = `${key}:journal`, selfId = idFactory();
  // Journal ownership (see researchJournalLifecycle.js): the journal key is claimed lazily, only when this tab has pending work to persist.
  let journalKey = null, restoredSnapshot = null, touched = false, heartbeatTimer = null;
  const contextKey = principalContextKey(principal);
  let restoredFrom = null, restoredRaw = null, storageFault = false, storageIssue = null;
  let cached = {}, journal = { revision: null, queue: [], inflight: null }, activeContext = null;
  let legacyContextKeyToRetire = null;
  try {
    if (disabled) { storage = null; session = null; }
    try { cached = read(storage, key, {}); } catch (e) { storageIssue = e?.name === 'SecurityError' ? 'blocked' : 'corrupt_state'; throw new Error('RESEARCH_LOCAL_RECOVERY_REQUIRED'); }
    if (!object(cached)) { storageIssue = 'corrupt_state'; throw new Error('RESEARCH_LOCAL_RECOVERY_REQUIRED'); }
    activeContext = best(() => read(session, contextKey, null)) ?? null;
    // Guest only, and only when the current principal key is empty: the new key always wins.
    // Never adopt the unscoped legacy context into an authenticated principal.
    if (principal === 'guest' && activeContext == null) {
      const legacy = readLegacyContext(session);
      if (legacy) { activeContext = legacy; legacyContextKeyToRetire = LEGACY_CONTEXT_SESSION_KEY; }
    }
    restoredFrom = best(() => session.getItem(pointerKey));
    if (restoredFrom?.startsWith(`${key}:pending:`)) {
      restoredRaw = storage?.getItem(restoredFrom);
      if (restoredRaw) {
        try { journal = JSON.parse(restoredRaw); } catch { storageIssue = 'invalid_journal'; throw new Error('RESEARCH_LOCAL_RECOVERY_REQUIRED'); }
        restoredSnapshot = { revision: journal.revision, queue: clone(journal.queue || []), inflight: journal.inflight ? clone(journal.inflight) : null };
        if (journal.principal !== principal || !Array.isArray(journal.queue) ||
          (journal.revision !== null && (!Number.isSafeInteger(journal.revision) || journal.revision < 0)) ||
          journal.queue.some(b => !b.batch_id || !Array.isArray(b.ops) || !b.ops.length || b.ops.length > 100)) {
          storageIssue = 'invalid_journal';
          throw new Error('RESEARCH_LOCAL_RECOVERY_REQUIRED');
        }
        // Validate operations BEFORE any network call. Never silently discard an invalid journal.
        try { applyResearchOps(emptyResearchState(), journal.queue.flatMap(b => b.ops)); } catch { storageIssue = 'invalid_journal'; throw new Error('RESEARCH_LOCAL_RECOVERY_REQUIRED'); }
        if (journal.inflight && (!journal.queue[0] || journal.inflight.batch_id !== journal.queue[0].batch_id ||
          JSON.stringify(journal.inflight.ops) !== JSON.stringify(journal.queue[0].ops) ||
          !Number.isSafeInteger(journal.inflight.expected_revision) || journal.inflight.expected_revision < 0)) {
          storageIssue = 'invalid_journal';
          throw new Error('RESEARCH_LOCAL_RECOVERY_REQUIRED');
        }
      }
    }
  } catch { storageFault = true; storageIssue ??= 'unavailable'; journal = { revision: null, queue: [], inflight: null }; cached = {}; activeContext = null; legacyContextKeyToRetire = null; }
  // CLOUD FIRST (stage 2): a store the browser denies outright ('blocked') holds nothing that could be lost or overwritten, so it must not stop the account from being written:
  // the work stays in memory and goes to the server. Unreadable DATA ('corrupt_state', 'invalid_journal', ...) still fails closed: it is kept untouched for recovery.
  if (storageFault && storageIssue === 'blocked') storageFault = false;
  let state = { ...normalizeResearchState(cached.state || cached), context: activeContext };
  let mode = cached.mode === 'discovery' ? 'discovery' : 'reader';
  let revision = journal.revision ?? (Number.isSafeInteger(cached.revision) ? cached.revision : null);
  let queue = clone(journal.queue), inflight = journal.inflight ? clone(journal.inflight) : null;
  let active = false, generation = 0, cloudReady = false, timer = null, operation = null, resolving = false;
  // `localFailed`: the last attempt to write the device failed (full, denied). `stateHeld`: the stored state of this principal could not be copied aside before the account's
  // snapshot replaced it, so that stored record is left exactly as it is (never overwritten) until a later load can preserve it.
  let localFailed = false, stateHeld = false;
  // A reading deployment may admit private reads without replaying a journal on login.
  // Only an explicit edit/retry authorizes its existing queue; route context/history do not.
  let writeIntent = resumePendingOnStart;
  let status = disabled ? 'auth_loading' : storageFault ? 'local_recovery_required' : userId && cloudEnabled ? 'loading' : 'local_only';
  const listeners = new Set();
  let snapshot;
  let legacyRecoveryAvailable = false;
  try { legacyRecoveryAvailable = !disabled && !!storage?.getItem(LEGACY_UNSCOPED_KEY); } catch { /* unavailable */ }
  const notify = () => {
    snapshot = Object.freeze({ ...state, mode, syncStatus: status, syncPending: queue.length, cloudConfirmed: isCloudConfirmed({ syncStatus: status, syncPending: queue.length }),
      syncRevision: revision, syncAwaitingAction: Boolean(userId && cloudEnabled && queue.length && !writeIntent),
      storageIssue,
      // Work that exists only in this tab's memory (the device copy failed): the page warns before it is closed.
      memoryOnly: localFailed && queue.length > 0,   // (an in-flight batch is always queue[0])
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
      restoredRecord: restoredSnapshot, now: now(), selfId, ttl: leaseTtlMs, newKey: `${key}:pending:${idFactory()}` });
    if (plan.action === 'adopt') { restoredFrom = null; restoredRaw = null; }
    restoredSnapshot = null; journalKey = plan.key;
  }
  function writeJournal() {
    claimJournal();
    storage.setItem(journalKey, JSON.stringify({ principal, revision, queue, inflight, owner: { id: selfId, at: now(), released: false } }));
    best(() => session.setItem(pointerKey, journalKey));
  }
  // Every mounted tab with pending work owns a separate journal. Copy-on-resume retains exact batch IDs/revisions;
  // duplicated tabs cannot overwrite another tab's pending operations. Version conflicts fail closed.
  // A tab with nothing to persist writes no journal at all (and removes its own once it drains).
  function persist(reclaimed = false) {
    if (disabled || storageFault) return false;
    try {
      if (!storage) throw new Error('RESEARCH_STORAGE_UNAVAILABLE');
      const hasWork = queue.length > 0 || Boolean(inflight);
      if (hasWork && (touched || journalKey)) writeJournal();
      else if (!hasWork && journalKey) {
        if (ownedRecord()) { storage.removeItem(journalKey); best(() => session.removeItem(pointerKey)); }
        journalKey = null;
      }
      if (!stateHeld) storage.setItem(key, JSON.stringify({ state, mode, revision }));
      best(() => state.context == null ? session.removeItem(contextKey) : session.setItem(contextKey, JSON.stringify(state.context)));
      // Retire the legacy unscoped key only once its content is durably persisted under the
      // principal-scoped key, so a mid-write failure leaves the recoverable original in place.
      if (legacyContextKeyToRetire) {
        best(() => session.removeItem(legacyContextKeyToRetire));
        legacyContextKeyToRetire = null;
      }
      // While the stored state is held (not written), the device copy is NOT healthy: the cause stays named.
      if (!stateHeld) {
        if (storageIssue === 'quota' || storageIssue === 'blocked' || storageIssue === 'unavailable') storageIssue = null;
        localFailed = false;
      }
      return true;
    } catch (e) {
      // A full browser store: first free only what is provably redundant (the existing lossless reap), then try once more. Nothing unsynced is touched.
      if (!reclaimed && isQuota(e)) { reapRedundant(); return persist(true); }
      storageIssue = storageCause(e) || 'unavailable';
      localFailed = true;
      // With an account to write to the device copy is only a cache of the intent: the status stays as it is and the batch is still sent from memory.
      if (!(userId && cloudEnabled)) status = 'local_error';   // with an account (signed in, allowed) the failed device copy only means "kept in memory", never "not sent"
      return false;
    }
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
      const { reap } = planReap(rows, { now: now(), selfId, ttl: leaseTtlMs, graceMs: reapGraceMs, protectedKeys: new Set([journalKey, restoredFrom].filter(Boolean)) });
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
        // Local items the account has not confirmed are set aside (never dropped, never auto-synced) before the replacement.
        if (state.saved.length || state.cart.length || state.pinned.length || state.collections.length || state.journeys.length || state.history.length) {
          try { (await lazyLocalOnly()).preserve({ ...localOnlyContext(), local: state, after: applyResearchOps(cloud, queue.flatMap(b => b.ops)) }); stateHeld = false; }
          catch (e) {
            // A full or denied store cannot take the copy-aside. The stored record already holds those items, so it is simply never overwritten (stateHeld) and the account is still
            // read and written; any other failure (an unreadable record) stays fail-closed.
            if (!storageCause(e)) throw e;
            stateHeld = true; localFailed = true; storageIssue = storageCause(e);
          }
          if (!active || generation !== epoch) return;
        }
        state = { ...applyResearchOps(cloud, queue.flatMap(b => b.ops)), context: state.context ?? hydratedContext };
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
    // Commit the exact immutable request to local storage BEFORE sending it, when the device allows. The device copy is a durability bonus, never a gate (CLOUD FIRST stage 2):
    // when it fails the same immutable request is sent from memory (same batch id and revision, so a repeat is idempotent), and the save is confirmed only by the server's receipt.
    touched = true;
    if (!inflight) inflight = { ...clone(queue[0]), expected_revision: revision };
    const sent = clone(inflight);
    status = 'syncing';
    persist();
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
    // Public reading intentionally does not replay passive queues on the next
    // launch. Do not create a stranded durable journal for a visit or navigation
    // event when there is no existing user-initiated write to preserve.
    // Its local history/context is still persisted in the principal state key.
    const passiveOnly = safe.every(op => op.kind === 'history_add' || op.kind === 'context_set');
    const localPassiveOnly = passiveOnly && !resumePendingOnStart && !writeIntent && !queue.length && !inflight;
    if (userId && cloudEnabled && !localPassiveOnly) {
      queue = compactPassiveQueue([...queue, { batch_id: idFactory(), ops: safe }], { protectedBatchId: inflight?.batch_id ?? null });
      if (!passiveOnly) writeIntent = true;
      if (!['error', 'conflict', 'local_error'].includes(status)) status = 'pending';
    }
    // The batch is accepted when it is durable on the device OR queued for the account (it is then sent from memory). Only a commit with nowhere to go reports false.
    const ok = persist() || Boolean(userId && cloudEnabled && !localPassiveOnly); notify();
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
    persist();
    if (!cloudReady) await hydrate();
    else { status = queue.length ? 'pending' : 'synced'; await flush(); }
    notify();   // the device copy may have been written (or failed) again just now: the snapshot must say so
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
      // When the device cannot hold the copy (full or denied store) a re-apply still goes ahead: it re-sends the very same operations to the account, so nothing is lost (only the
      // provenance copy is not kept). Dropping the queue (keep_remote) is never done without the copy.
      try { storage.setItem(`${journalKey || `${key}:pending:${selfId}`}:conflict:${idFactory()}`, JSON.stringify({ principal, revision, queue, inflight })); }
      catch (e) { if (action !== 'reapply' || !storageCause(e)) throw e; }
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
      // The source journal stays on the device until the server has confirmed its batches (cleanRecoveredCopy), so a failing device copy does not stop the upload.
      persist();
      await hydrate();
      return cloudReady;
    } catch (e) { markError(e); return false; }
  }
  const lazyLocalOnly = () => import('./researchLocalOnly.js'), localOnlyContext = () => ({ storage, key, principal, current: state });
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
      // stop() never rewrites a journal (retained as-is); only an explicit release() (pagehide) marks the lease released.
      active = false; generation += 1; clearTimeout(timer); clearInterval(heartbeatTimer); heartbeatTimer = null;
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
    localOnly: async (op, o) => (await lazyLocalOnly()).api[op]({ ...o, ...localOnlyContext(), commit, live: active && !disabled && cloudEnabled && !!userId }),
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
