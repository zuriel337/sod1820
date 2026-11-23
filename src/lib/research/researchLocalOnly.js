// Recovery of device-local research items that the server never confirmed.
// Loaded on demand only (dynamic import): never part of the always-loaded graph.
//
// Rules (ZURIEL 23.11.2026): never delete, overwrite or auto-sync an unverified item.
//  - hydrate() calls preserve() BEFORE the cloud snapshot replaces local state; if preserving fails, hydrate fails closed.
//  - the record is principal-scoped (key carries the principal) and is only ever read back for that principal.
//  - an item leaves the record only when it is present in the confirmed state (cloud + queued ops), i.e. nothing is lost.
//  - syncing is an explicit, caller-confirmed commit of ordinary item_upsert ops through the one journal.
import { entityIdentity, makeResearchOp } from './researchSyncState.js';

const BUCKETS = [['library', 'saved'], ['cart', 'cart'], ['pinned', 'pinned']];
const recordKey = key => `${key}:localonly`;
const rowsOf = s => BUCKETS.flatMap(([bucket, field]) => (s?.[field] || []).filter(e => entityIdentity(e)).map(entity => ({ bucket, entity })));
export const rowId = r => `${r.bucket}|${entityIdentity(r.entity)}`;

// Collections, journeys and history have no item_upsert recovery path. They are only PRESERVED (never deleted, never auto-synced),
// by id, so a hydrate that replaces them with the account state cannot lose them. Restoring them is a separate, explicit step.
const EXTRA = ['collections', 'journeys', 'history'];
const idOf = x => String(x?.id ?? x?.root ?? '');

function readFull(storage, key, principal) {
  const raw = storage?.getItem(recordKey(key));
  if (raw == null) return { items: [], extras: {} };
  const record = JSON.parse(raw);
  if (record?.principal !== principal || !Array.isArray(record.items)) throw new Error('RESEARCH_LOCALONLY_INVALID');
  return { items: record.items, extras: record.extras && typeof record.extras === 'object' ? record.extras : {} };
}
const readRecord = (storage, key, principal) => readFull(storage, key, principal).items;

// local: state before hydration. after: state that will replace it (cloud + queued ops).
export function preserve({ storage, key, principal, local, after }) {
  if (!storage) throw new Error('RESEARCH_STORAGE_UNAVAILABLE');
  const confirmed = new Set(rowsOf(after).map(rowId));
  const merged = new Map();
  for (const row of [...readRecord(storage, key, principal), ...rowsOf(local)]) {
    const id = rowId(row);
    if (!confirmed.has(id) && !merged.has(id)) merged.set(id, row);
  }
  const extras = {};
  const prior = readFull(storage, key, principal).extras;
  for (const f of EXTRA) {
    const have = new Set((after?.[f] || []).map(idOf));
    const m = new Map();
    for (const x of [...(prior[f] || []), ...(local?.[f] || [])]) {
      const id = idOf(x);
      if (id && !have.has(id) && !m.has(id)) m.set(id, x);
    }
    if (m.size) extras[f] = [...m.values()];
  }
  const extraCount = Object.values(extras).reduce((n, a) => n + a.length, 0);
  if (!merged.size && !extraCount && storage.getItem(recordKey(key)) == null) return 0;
  storage.setItem(recordKey(key), JSON.stringify({ principal, items: [...merged.values()], extras, at: Date.now() }));
  return merged.size;
}

// Items the device holds that the account does not (compared with what is confirmed/queued right now).
export function list({ storage, key, principal, current }) {
  const present = new Set(rowsOf(current).map(rowId));
  return readRecord(storage, key, principal).filter(row => !present.has(rowId(row)))
    .map(row => ({ id: rowId(row), bucket: row.bucket, entity: row.entity, inAccount: false }));
}

export function opsFor({ storage, key, principal, current, ids }) {
  const wanted = Array.isArray(ids) ? new Set(ids) : null;
  return list({ storage, key, principal, current }).filter(row => !wanted || wanted.has(row.id))
    .map(row => makeResearchOp('item_upsert', { bucket: row.bucket, entity: row.entity }));
}

// Explicit, caller-confirmed sync: ordinary item_upsert ops through the one journal (commit), in batches of at most 100.
// Nothing is sent unless the runtime is live and the caller passed confirm:true.
function confirm({ ids, commit, live, confirm: confirmed, ...ctx }) {
  if (!live || confirmed !== true) return 0;
  const ops = opsFor({ ...ctx, ids });
  for (let i = 0; i < ops.length; i += 100) if (!commit(ops.slice(i, i + 100))) return i;
  return ops.length;
}
// Read-only view of preserved collections/journeys/history that the account state does not hold.
export function extras({ storage, key, principal, current }) {
  const out = {};
  const kept = readFull(storage, key, principal).extras;
  for (const f of EXTRA) {
    const have = new Set((current?.[f] || []).map(idOf));
    const rows = (kept[f] || []).filter(x => !have.has(idOf(x)));
    if (rows.length) out[f] = rows;
  }
  return out;
}
// The only operations the runtime hands out.
// Journals of ONE principal that no live tab owns and that hold ONLY passive operations (history_add / context_set).
// Their recent history is archived before removal (bounded to the last 100 entries); older passive
// history may be discarded only on an explicit reclaim. Never mistake these for confirmed cloud writes.
// (saves, cart, pins, collections, journeys, history_clear, an in-flight batch, a conflict copy, another principal) is never touched.
const PASSIVE_KINDS = new Set(['history_add', 'context_set']);
const STALE_MS = 10 * 60 * 1000;
function passiveJournals({ storage, key, principal, now = Date.now() }) {
  const out = [];
  for (let i = 0; i < storage.length; i += 1) {
    const name = storage.key(i);
    if (!name?.startsWith(`${key}:pending:`) || name.includes(':conflict:')) continue;
    let record;
    try { record = JSON.parse(storage.getItem(name)); } catch { continue; }
    if (record?.principal !== principal || !Array.isArray(record.queue) || record.inflight) continue;
    const owner = record.owner;
    if (!owner || typeof owner !== 'object') continue;
    if (owner.released !== true && !(Number.isFinite(owner.at) && now - owner.at > STALE_MS)) continue;
    if (!record.queue.every(batch => Array.isArray(batch?.ops) && batch.ops.every(op => PASSIVE_KINDS.has(op?.kind)))) continue;
    const raw = storage.getItem(name);
    if (raw == null || JSON.stringify(record) !== raw) continue;
    out.push({ name, raw, bytes: name.length + raw.length, at: Number.isFinite(owner.at) ? owner.at : 0, record });
  }
  return out;
}
// Read-only unless confirm === true. Returns { count, bytes } of what is (or was) removable.
// Before anything is removed, the history entries the journals hold (newest 100, by id) are archived in the recovery record
// (extras.history, readable through the 'extras' op), because the state key does not hold earlier launches' history. If the archive write
// fails on a full device, the OLDEST journal is dropped to make room (its entries are the oldest, beyond the history window) and the write is retried.
export function reclaim({ storage, key, principal, confirm: confirmed, now }) {
  if (!storage) return { count: 0, bytes: 0, archived: 0 };
  const rows = passiveJournals({ storage, key, principal, now });
  const bytes = rows.reduce((n, r) => n + r.bytes, 0);
  if (confirmed !== true || !rows.length) return { count: rows.length, bytes, archived: 0 };
  rows.sort((x, y) => x.at - y.at);
  const seen = new Map();
  for (const r of rows) for (const batch of r.record.queue) for (const op of batch.ops) {
    const id = op.kind === 'history_add' ? idOf(op.entity) : '';
    if (id) { seen.delete(id); seen.set(id, op.entity); }
  }
  const prior = readFull(storage, key, principal);
  const merged = new Map();
  for (const x of [...(prior.extras.history || []), ...seen.values()]) { const id = idOf(x); if (id) { merged.delete(id); merged.set(id, x); } }
  const history = [...merged.values()].slice(-100);
  const extras = { ...prior.extras, history };
  const write = () => storage.setItem(recordKey(key), JSON.stringify({ principal, items: prior.items, extras, at: Date.now() }));
  let removed = 0, freedBytes = 0;
  const queue = [...rows];
  // A full origin cannot allocate even a recovery record. The user explicitly requested
  // removal of passive history, not account saves: trim oldest eligible passive journals
  // first, and preserve the most recent 100 history entries once storage permits writing.
  for (;;) {
    try { write(); break; } catch (error) {
      const oldest = queue.shift();
      if (!oldest) return { count: removed, bytes: freedBytes, archived: 0, error: String(error?.name || 'write_failed') };
      // A different tab may have revived or rewritten a lease after the dry run.
      // Never delete its new version, even if it occupies the same key.
      if (storage.getItem(oldest.name) !== oldest.raw) continue;
      storage.removeItem(oldest.name);
      removed += 1; freedBytes += oldest.bytes;
    }
  }
  for (const r of queue) {
    if (storage.getItem(r.name) !== r.raw) continue;
    storage.removeItem(r.name);
    removed += 1; freedBytes += r.bytes;
  }
  return { count: removed, bytes: freedBytes, archived: history.length };
}
export const api = { list, confirm, extras, reclaim };
