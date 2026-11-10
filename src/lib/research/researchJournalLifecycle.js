// PROPOSAL (not wired into researchSyncRuntime.js, changes no behaviour): ownership, lifecycle and bounds for durable pending journals.
//
// Problem (measured on the unchanged runtime): every page load creates a new journal key `<state>:pending:<id>` and writes it immediately,
// even with an empty queue, and a restored queue is copied into it. Nothing ever removes the previous one unless a flush happens, so
// passive loads grow the key count without bound and (with a stuck queue) the size of every key.
//
// Contract kept: two ACTIVE tabs that hold pending work own distinct durable journals; a journal is never overwritten by a tab that does
// not own it; nothing unsynced is ever deleted; the exact batch ids/ops/revisions are preserved (the server dedupes by batch id).
//
// Rules
//  1. LAZY: a tab writes a journal only when it has something to persist (a commit, an explicit retry or a recovery). A passive load
//     with an empty queue writes nothing; a passive load that merely restored a queue leaves the original journal where it is.
//  2. OWNERSHIP: a journal carries `owner: { id, at, released }` (an unknown extra field: older runtimes ignore it). The owner refreshes
//     `at` (heartbeat) while it has pending work and sets `released: true` on pagehide. A tab that needs to persist what it restored
//     ADOPTS the journal in place only if it is its own, released, or its lease expired; if another live tab holds it (a duplicated tab
//     copies sessionStorage, so the pointer is shared), it COPIES into a new key — exactly the existing copy-on-resume.
//  3. REAPING (lossless only): a journal that is not live/own can be removed iff it holds nothing (empty queue, no inflight) or every
//     batch in it (id and ops) is also in another FREE journal that stays, with the same revision. Everything else is kept for the existing
//     explicit recovery UI. Journals written by an older runtime (no owner) are treated as legacy: never adopted, only reaped if empty.
//  4. BOUND: past MAX_UNOWNED non-reapable unowned journals nothing is deleted; `overCap` tells the UI to ask the person to recover or
//     discard (an explicit, confirmed action), and no further copies are made by passive loads (rule 1 already makes none).
export const LEASE_TTL_MS = 45_000;
export const HEARTBEAT_MS = 15_000;
export const MAX_UNOWNED = 24;
// A journal that is merely redundant (every batch also held by another free journal) is removed only after it has been idle this long: a
// reloading tab, or a browser restoring a closed tab, still points at it through sessionStorage. Empty journals hold nothing and go at once.
export const REAP_GRACE_MS = 24 * 60 * 60 * 1000;

const sig = batch => `${batch.batch_id}\u0000${JSON.stringify(batch.ops)}`;
export const isEmptyJournal = record => !record?.queue?.length && !record?.inflight;

// 'own' | 'live' (another tab holds it) | 'free' (released or expired) | 'legacy' (no owner field)
export function leaseState(record, now, selfId, ttl = LEASE_TTL_MS) {
  const owner = record?.owner;
  if (!owner || typeof owner !== 'object') return 'legacy';
  if (owner.id === selfId) return 'own';
  if (owner.released === true) return 'free';
  return Number.isFinite(owner.at) && now - owner.at < ttl ? 'live' : 'free';
}

const sameContent = (a, b) => Boolean(a && b) && a.revision === b.revision && JSON.stringify(a.queue || []) === JSON.stringify(b.queue || []) && JSON.stringify(a.inflight || null) === JSON.stringify(b.inflight || null);

// Where does a tab that must persist now write?
//  ownKey/ownRecord: the journal this tab wrote earlier in this page life and what is stored there now (it may have been taken over or reaped).
//  pointerKey/pointerRecord: the journal named by this tab's sessionStorage pointer, restoredRecord: what this tab read from it at load.
// Adopting in place also requires the stored content to be exactly what this tab restored (compare-and-set): if anyone changed it since,
// this tab copies instead of overwriting.
export function planPersist({ ownKey = null, ownRecord = null, pointerKey = null, pointerRecord = null, restoredRecord = null, now, selfId, newKey, ttl = LEASE_TTL_MS }) {
  if (ownKey && ownRecord?.owner?.id === selfId) return { action: 'write-own', key: ownKey };
  if (!ownKey && pointerKey && pointerRecord) {
    const state = leaseState(pointerRecord, now, selfId, ttl);
    if ((state === 'free' || state === 'own') && sameContent(pointerRecord, restoredRecord)) return { action: 'adopt', key: pointerKey };
  }
  return { action: 'copy', key: newKey };
}

const covers = (keeper, journal) => {
  if (keeper.revision !== journal.revision) return false;
  const have = new Set((keeper.queue || []).map(sig));
  if (!(journal.queue || []).every(batch => have.has(sig(batch)))) return false;
  return !journal.inflight || (keeper.queue || []).some(batch => batch.batch_id === journal.inflight.batch_id);
};

// journals: [{ key, record }] of ONE principal. protectedKeys: keys that must not be reaped (this tab's own and restored-from keys).
export function planReap(journals, { now, selfId, protectedKeys = new Set(), ttl = LEASE_TTL_MS, graceMs = REAP_GRACE_MS } = {}) {
  const reaped = new Set();
  const ordered = [...journals].sort((a, b) => (a.key < b.key ? -1 : 1));
  const removable = entry => !protectedKeys.has(entry.key) && ['free', 'legacy'].includes(leaseState(entry.record, now, selfId, ttl));
  for (const entry of ordered) {
    if (!removable(entry)) continue;
    if (isEmptyJournal(entry.record)) { reaped.add(entry.key); continue; }
    if (leaseState(entry.record, now, selfId, ttl) === 'legacy') continue;   // an older runtime may still use it: never collapse
    // The keeper must itself be stable (free): a live tab may legitimately drop its batches (ack, or an explicit conflict resolution).
    if (now - (Number.isFinite(entry.record.owner?.at) ? entry.record.owner.at : now) < graceMs) continue;   // recently used: its tab may still point at it
    const keeper = ordered.find(other => other.key !== entry.key && !reaped.has(other.key) && !isEmptyJournal(other.record) && leaseState(other.record, now, selfId, ttl) === 'free' && covers(other.record, entry.record));
    if (keeper) reaped.add(entry.key);
  }
  const kept = ordered.filter(entry => !reaped.has(entry.key) && !isEmptyJournal(entry.record) && !['own', 'live'].includes(leaseState(entry.record, now, selfId, ttl)));
  return { reap: [...reaped], unowned: kept.length, overCap: kept.length > MAX_UNOWNED };
}
