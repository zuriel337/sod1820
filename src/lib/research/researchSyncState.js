// Implementation helpers for the ONE ResearchProvider. No graph/truth/identity authority.
export const RESEARCH_LOCAL_PREFIX = 'sod_research_v2';
export const RESEARCH_CONTEXT_PREFIX = 'sod_research_context_v2';
export const LEGACY_UNSCOPED_KEY = 'sod_research_v1';
export const MAX_RESEARCH_OPS_PER_BATCH = 100;
export const principalToken = id => id ? `user:${String(id).trim()}` : 'guest';
export const principalStateKey = p => `${RESEARCH_LOCAL_PREFIX}:${p || 'guest'}`;
export const principalContextKey = p => `${RESEARCH_CONTEXT_PREFIX}:${p || 'guest'}`;
export const entityRef = e => String(e?.ref ?? e?.id ?? e?.title ?? '').trim();
export const entityIdentity = e => e?.type && entityRef(e) ? JSON.stringify([String(e.type).trim(), entityRef(e)]) : '';
export const newResearchId = () => globalThis.crypto.randomUUID();
export const makeResearchOp = (kind, payload = {}) => ({ ...payload, kind, op_id: newResearchId() });
const fields = ['cart', 'saved', 'pinned', 'history', 'collections', 'journeys'];
export const emptyResearchState = () => ({ cart: [], saved: [], pinned: [], history: [], collections: [], journeys: [], context: null });
export function normalizeResearchState(input) {
  const x = input && typeof input === 'object' ? input : {};
  return { ...Object.fromEntries(fields.map(k => [k, Array.isArray(x[k]) ? x[k] : []])), context: x.context ?? null };
}
export function assertCloudSnapshot(x) {
  if (!x || fields.some(k => !Array.isArray(x[k])) || !Number.isSafeInteger(x.revision) || x.revision < 0) {
    throw new Error('RESEARCH_SNAPSHOT_INVALID');
  }
  return x;
}
// Order is data. In particular add/update/remove and clear/add must NEVER be coalesced by kind.
// Immutable op ids are assigned outside React state updaters and are retained on retry.
export const appendResearchOp = (ops, op) => [...(ops || []), op];
function bucketKey(bucket) {
  if (!['cart', 'library', 'pinned'].includes(bucket)) throw new Error('RESEARCH_BAD_BUCKET');
  return bucket === 'library' ? 'saved' : bucket;
}
function requiredId(x) {
  if (typeof x !== 'string' || !x.trim()) throw new Error('RESEARCH_ID_REQUIRED');
  return x;
}
function object(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
export function applyResearchOps(base, ops) {
  let s = normalizeResearchState(base);
  for (const op of ops || []) {
    switch (op?.kind) {
      case 'item_upsert': {
        const key = bucketKey(op.bucket), id = entityIdentity(op.entity);
        if (!id) throw new Error('RESEARCH_ENTITY_IDENTITY_REQUIRED');
        const list = s[key], at = list.findIndex(e => entityIdentity(e) === id);
        // Preserve existing position and unrelated metadata on an explicit save.
        const next = at < 0 ? (key === 'cart' ? [...list, op.entity] : [op.entity, ...list])
          : list.map((e, i) => i === at ? { ...e, ...op.entity } : e);
        s = { ...s, [key]: next };
        break;
      }
      case 'item_delete': {
        const key = bucketKey(op.bucket);
        const id = JSON.stringify([requiredId(op.entity_type), requiredId(op.entity_ref)]);
        s = { ...s, [key]: s[key].filter(e => entityIdentity(e) !== id) }; break;
      }
      case 'item_clear_bucket': s = { ...s, [bucketKey(op.bucket)]: [] }; break;
      case 'history_add': {
        const e = op.entity; requiredId(e?.id);
        s = { ...s, history: [e, ...s.history.filter(x => x.id !== e.id)].slice(0, 50) }; break;
      }
      case 'history_clear': s = { ...s, history: [] }; break;
      case 'collection_add': {
        const c = op.collection; requiredId(c?.id);
        s = { ...s, collections: [...s.collections.filter(x => x.id !== c.id), c] }; break;
      }
      case 'collection_update': {
        requiredId(op.id);
        if (!object(op.patch) || ('id' in op.patch && op.patch.id !== op.id)) throw new Error('RESEARCH_COLLECTION_PATCH_INVALID');
        s = { ...s, collections: s.collections.map(c => c.id === op.id ? { ...c, ...op.patch, id: c.id } : c) }; break;
      }
      case 'collection_remove': {
        requiredId(op.id);
        s = { ...s, collections: s.collections.filter(c => c.id !== op.id), saved: s.saved.map(e => {
          if (e.coll !== op.id) return e;
          const { coll, ...rest } = e; return rest;
        }) }; break;
      }
      case 'collection_assign': {
        const id = JSON.stringify([requiredId(op.entity_type), requiredId(op.entity_ref)]);
        s = { ...s, saved: s.saved.map(e => {
          if (entityIdentity(e) !== id) return e;
          const { coll, ...rest } = e; return op.coll_id ? { ...rest, coll: op.coll_id } : rest;
        }) }; break;
      }
      case 'journey_add': {
        const j = op.journey; requiredId(j?.id);
        if (j.root == null) throw new Error('RESEARCH_JOURNEY_ROOT_REQUIRED');
        s = { ...s, journeys: [j, ...s.journeys.filter(x => String(x.root) !== String(j.root))].slice(0, 30) }; break;
      }
      case 'journey_remove': requiredId(op.id); s = { ...s, journeys: s.journeys.filter(j => j.id !== op.id) }; break;
      case 'journey_clear': s = { ...s, journeys: [] }; break;
      case 'context_set':
        if (op.context != null && !object(op.context)) throw new Error('RESEARCH_CONTEXT_INVALID');
        s = { ...s, context: op.context ?? null }; break;
      default: throw new Error('RESEARCH_UNKNOWN_OP');
    }
  }
  return s;
}
