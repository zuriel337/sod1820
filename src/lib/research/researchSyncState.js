// G3 2029 personal research sync helpers.
// Pure/local helpers only: no truth, identity, graph or cloud authority lives here.
// Cloud authority remains the existing Research OS tables/RLS + bounded RPCs.

export const RESEARCH_LOCAL_PREFIX = "sod_research_v2";
export const RESEARCH_CONTEXT_PREFIX = "sod_research_context_v2";
export const LEGACY_UNSCOPED_KEY = "sod_research_v1";
export const MAX_RESEARCH_OPS_PER_BATCH = 100;

export function principalToken(userId = null) {
  const id = String(userId || "").trim();
  return id ? `user:${id}` : "guest";
}

export function principalStateKey(principal) {
  return `${RESEARCH_LOCAL_PREFIX}:${String(principal || "guest")}`;
}

export function principalContextKey(principal) {
  return `${RESEARCH_CONTEXT_PREFIX}:${String(principal || "guest")}`;
}

export function emptyResearchState() {
  return {
    cart: [], saved: [], pinned: [], history: [], collections: [], journeys: [],
    context: null,
  };
}

export function normalizeResearchState(value) {
  const v = value && typeof value === "object" ? value : {};
  return {
    cart: Array.isArray(v.cart) ? v.cart : [],
    saved: Array.isArray(v.saved) ? v.saved : [],
    pinned: Array.isArray(v.pinned) ? v.pinned : [],
    history: Array.isArray(v.history) ? v.history : [],
    collections: Array.isArray(v.collections) ? v.collections : [],
    journeys: Array.isArray(v.journeys) ? v.journeys : [],
    context: v.context ?? null,
  };
}

export function entityRef(entity) {
  if (!entity || typeof entity !== "object") return "";
  return String(entity.ref ?? entity.id ?? entity.title ?? "").trim();
}

export function entityIdentity(entity) {
  const type = String(entity?.type || "").trim();
  const ref = entityRef(entity);
  return type && ref ? `${type}|${ref}` : "";
}

export function makeResearchOp(kind, payload = {}) {
  const suffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { op_id: suffix, kind, ...payload };
}

function opDedupeKey(op) {
  if (!op?.kind) return null;
  if (op.kind === "context_set") return "context";
  if (op.kind === "history_add") return `history:${op.entity?.id || ""}`;
  if (op.kind === "history_clear") return "history:clear";
  if (op.kind === "collection_add" || op.kind === "collection_update" || op.kind === "collection_remove") {
    return `collection:${op.collection?.id || op.id || ""}`;
  }
  if (op.kind === "journey_add" || op.kind === "journey_remove") {
    return `journey:${op.journey?.id || op.id || ""}`;
  }
  if (op.kind === "journey_clear") return "journey:clear";
  if (op.kind === "item_upsert") return `item:${op.bucket}:${entityIdentity(op.entity)}`;
  if (op.kind === "item_delete") return `item:${op.bucket}:${op.entity_type || ""}|${op.entity_ref || ""}`;
  if (op.kind === "collection_assign") return `assign:${op.entity_type || ""}|${op.entity_ref || ""}`;
  return null;
}

export function appendResearchOp(existing, op) {
  const list = Array.isArray(existing) ? existing : [];
  if (!op?.kind) return list;

  // Add + update before a cloud flush must remain an ADD with the final fields, otherwise an
  // update against a collection that does not exist yet would be a no-op on the server.
  if (op.kind === "collection_update" && op.id) {
    const addIndex = list.findIndex(x => x?.kind === "collection_add" && x?.collection?.id === op.id);
    if (addIndex >= 0) {
      return list.map((x, i) => i === addIndex
        ? { ...x, collection: { ...x.collection, ...(op.patch || {}) } }
        : x);
    }
  }

  let next = list;
  if (op.kind === "item_clear_bucket") {
    next = list.filter(x => !(x?.bucket === op.bucket && ["item_upsert", "item_delete", "item_clear_bucket"].includes(x.kind)));
  } else if (op.kind === "history_clear") {
    next = list.filter(x => !String(x?.kind || "").startsWith("history_"));
  } else if (op.kind === "journey_clear") {
    next = list.filter(x => !String(x?.kind || "").startsWith("journey_"));
  }

  const key = opDedupeKey(op);
  if (key) next = next.filter(x => opDedupeKey(x) !== key);
  return [...next, op];
}

function replaceEntity(list, entity) {
  const id = entityIdentity(entity);
  if (!id) return list;
  const rest = (list || []).filter(x => entityIdentity(x) !== id);
  return [entity, ...rest];
}

function deleteEntity(list, type, ref) {
  const id = `${String(type || "").trim()}|${String(ref || "").trim()}`;
  return (list || []).filter(x => entityIdentity(x) !== id);
}

export function applyResearchOps(base, ops) {
  let state = normalizeResearchState(base);
  for (const op of Array.isArray(ops) ? ops : []) {
    switch (op?.kind) {
      case "item_upsert": {
        const key = op.bucket === "library" ? "saved" : op.bucket;
        if (!["cart", "saved", "pinned"].includes(key)) break;
        state = { ...state, [key]: replaceEntity(state[key], op.entity) };
        break;
      }
      case "item_delete": {
        const key = op.bucket === "library" ? "saved" : op.bucket;
        if (!["cart", "saved", "pinned"].includes(key)) break;
        state = { ...state, [key]: deleteEntity(state[key], op.entity_type, op.entity_ref) };
        break;
      }
      case "item_clear_bucket": {
        const key = op.bucket === "library" ? "saved" : op.bucket;
        if (["cart", "saved", "pinned"].includes(key)) state = { ...state, [key]: [] };
        break;
      }
      case "history_add": {
        const entity = op.entity;
        if (!entity?.id) break;
        state = { ...state, history: [entity, ...state.history.filter(x => x?.id !== entity.id)].slice(0, 50) };
        break;
      }
      case "history_clear":
        state = { ...state, history: [] };
        break;
      case "collection_add": {
        const c = op.collection;
        if (!c?.id) break;
        state = { ...state, collections: [...state.collections.filter(x => x?.id !== c.id), c] };
        break;
      }
      case "collection_update": {
        const id = op.id;
        if (!id) break;
        state = { ...state, collections: state.collections.map(c => c?.id === id ? { ...c, ...(op.patch || {}) } : c) };
        break;
      }
      case "collection_remove": {
        const id = op.id;
        if (!id) break;
        state = {
          ...state,
          collections: state.collections.filter(c => c?.id !== id),
          saved: state.saved.map(e => e?.coll === id ? { ...e, coll: undefined } : e),
        };
        break;
      }
      case "collection_assign": {
        const id = `${String(op.entity_type || "").trim()}|${String(op.entity_ref || "").trim()}`;
        state = {
          ...state,
          saved: state.saved.map(e => entityIdentity(e) === id
            ? { ...e, ...(op.coll_id ? { coll: op.coll_id } : { coll: undefined }) }
            : e),
        };
        break;
      }
      case "journey_add": {
        const j = op.journey;
        if (!j?.id) break;
        const sameRoot = x => String(x?.root ?? "") === String(j.root ?? "");
        state = { ...state, journeys: [j, ...state.journeys.filter(x => !sameRoot(x))].slice(0, 30) };
        break;
      }
      case "journey_remove":
        state = { ...state, journeys: state.journeys.filter(j => j?.id !== op.id) };
        break;
      case "journey_clear":
        state = { ...state, journeys: [] };
        break;
      case "context_set":
        state = { ...state, context: op.context ?? null };
        break;
      default:
        break;
    }
  }
  return state;
}
