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

function readRecord(storage, key, principal) {
  const raw = storage?.getItem(recordKey(key));
  if (raw == null) return [];
  const record = JSON.parse(raw);
  if (record?.principal !== principal || !Array.isArray(record.items)) throw new Error('RESEARCH_LOCALONLY_INVALID');
  return record.items;
}

// local: state before hydration. after: state that will replace it (cloud + queued ops).
export function preserve({ storage, key, principal, local, after }) {
  if (!storage) throw new Error('RESEARCH_STORAGE_UNAVAILABLE');
  const confirmed = new Set(rowsOf(after).map(rowId));
  const merged = new Map();
  for (const row of [...readRecord(storage, key, principal), ...rowsOf(local)]) {
    const id = rowId(row);
    if (!confirmed.has(id) && !merged.has(id)) merged.set(id, row);
  }
  if (!merged.size && storage.getItem(recordKey(key)) == null) return 0;
  storage.setItem(recordKey(key), JSON.stringify({ principal, items: [...merged.values()], at: Date.now() }));
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
// The only operations the runtime hands out.
export const api = { list, confirm };
