// Post -> One Reality Graph intake (POST_TO_ONE_TREE_INTAKE_GOLDEN_V1) — EXTEND_EXISTING, pure, no I/O.
// Runs AFTER postPublishPreflight returned READY. It consumes FACTS the caller already read from the existing
// public.nodes / public.edges (no new store, registry or publisher) and returns a bounded, deterministic PLAN of
// resolve-before-create operations. It never writes: an injected writer may apply the plan under a separate release gate.
// Node identity follows the live unique index nodes_identity_canonical_uidx = (type, COALESCE(identity_key,label));
// edge identity follows edges_identity_uidx = (from_node, to_node, relation_type, metadata.period).
// Tags are compatibility only (never produce links). Translation never mutates the graph. Gematria values are
// never computed here: they stay source claims unless a canonical-engine receipt is supplied by the caller.

const s = (v) => String(v ?? "").trim();

export const TRUTH_CLASSES = Object.freeze(["extraction", "source_claim", "interpretation", "calculation", "fact"]);
// A source claim / interpretation may never be promoted to fact by this adapter (Human Gate owns canonicalization).
const NEVER_FACT_ORIGINS = new Set(["source", "creator", "ai"]);
const RELATION_BY_KIND = { number: "mentions", date_event: "documents" };

export const numberIdentity = (value) => ({ type: "number", label: s(Number(String(value).replace(/,/g, ""))) });
export const dateEventIdentity = (date, calendar = "unspecified") => {
  const d = s(date);
  return { type: "event", identity_key: `date:${s(calendar)}:${d}`, label: `date ${d}` };
};
export const nodeKey = (n) => `${n.type}\u0000${s(n.identity_key) || s(n.label)}`;

// Post identity: reuse any existing post node found by identity_key post:<id>, wp:<wp_id>, metadata.post_id or slug.
export function resolvePostNode(post, nodes) {
  const id = String(post.post_id);
  const hits = (nodes || []).filter((n) => n.type === "post" && (
    n.identity_key === `post:${id}` || (post.wp_id && n.identity_key === `wp:${post.wp_id}`) ||
    String(n.metadata?.post_id ?? "") === id || (post.slug && n.metadata?.slug === post.slug)));
  return hits;
}

function itemIdentity(it) {
  if (it.kind === "number") {
    const v = Number(String(it.value).replace(/,/g, ""));
    return Number.isFinite(v) ? numberIdentity(v) : null;
  }
  if (it.kind === "date_event") return s(it.date) ? dateEventIdentity(it.date, it.calendar) : null;
  return null;
}

export function planPostGraphIntake({ preflight, post = {}, items = [], facts = {} } = {}) {
  const blockers = [];
  const out = { task_key: "POST_TO_ONE_TREE_INTAKE_GOLDEN_V1", ok: false, blockers, ops: [], skipped: [], compat_tags_ignored: [] };
  if (!preflight || preflight.state !== "READY" || !preflight.bundle) blockers.push("PREFLIGHT_NOT_READY");
  if (!post.post_id) blockers.push("POST_ID_REQUIRED");
  if (blockers.length) return out;

  const nodes = facts.nodes || [];
  const edges = facts.edges || [];
  const byKey = new Map();
  for (const n of nodes) {
    const k = nodeKey(n);
    byKey.set(k, [...(byKey.get(k) || []), n]);
  }
  const planned = new Map(); // nodeKey -> ref
  const ref = (identity, label) => {
    const k = nodeKey(identity);
    const existing = byKey.get(k) || [];
    if (existing.length > 1) { blockers.push(`DUPLICATE_EXISTING_NODE:${k.replace("\u0000", ":")}`); return null; }
    if (existing.length === 1) return { ref: { id: existing[0].id }, reused: true };
    if (!planned.has(k)) {
      planned.set(k, `new:${planned.size}`);
      out.ops.push({ op: "create_node", ref: planned.get(k), node: { ...identity, label: identity.label ?? label, metadata: { source: "post_graph_intake", intake_task: out.task_key } } });
    }
    return { ref: { new: planned.get(k) }, reused: false };
  };

  // Post identity first: never create a second Post node.
  const postHits = resolvePostNode(post, nodes);
  let postRef;
  if (postHits.length > 1) { blockers.push(`DUPLICATE_POST_IDENTITY:${post.post_id}`); return out; }
  if (postHits.length === 1) postRef = { id: postHits[0].id };
  else {
    planned.set(`post:${post.post_id}`, "new:post");
    out.ops.push({ op: "create_node", ref: "new:post", node: { type: "post", identity_key: `post:${post.post_id}`, label: s(post.title), metadata: { post_id: post.post_id, slug: post.slug ?? null, source_kind: "post", source: "post_graph_intake" } } });
    postRef = { new: "new:post" };
  }

  const seenEdges = new Set();
  for (const it of items) {
    if (it.kind === "tag") { out.compat_tags_ignored.push(s(it.value)); continue; }
    if (it.origin === "translation") { out.skipped.push({ item: it, reason: "TRANSLATION_NEVER_MUTATES_GRAPH" }); continue; }
    const identity = itemIdentity(it);
    if (!identity) { out.skipped.push({ item: it, reason: "UNSUPPORTED_OR_INVALID_ITEM" }); continue; }
    let truth = it.truth_class;
    if (!TRUTH_CLASSES.includes(truth)) { out.skipped.push({ item: it, reason: "TRUTH_CLASS_REQUIRED" }); continue; }
    if (truth === "fact" && NEVER_FACT_ORIGINS.has(it.origin)) truth = "source_claim"; // no auto-canonicalization
    if (truth === "source_claim" || truth === "interpretation") {
      if (!it.provenance?.source_ref) { out.skipped.push({ item: it, reason: "PROVENANCE_REQUIRED" }); continue; }
    }
    const meta = { truth_class: truth, role: it.role ?? null, provenance: it.provenance ?? null, source: "post_graph_intake" };
    if (it.gematria) {
      const verified = !!(it.gematria.engine_receipt?.engine && it.gematria.engine_receipt?.method_key);
      meta.gematria = { phrase: it.gematria.phrase, value: it.gematria.value, verified, engine_receipt: verified ? it.gematria.engine_receipt : null };
      if (!verified && truth === "calculation") meta.truth_class = "source_claim"; // only canonical engines may carry "calculation"
    }
    const target = ref(identity);
    if (!target) continue;
    const relation = RELATION_BY_KIND[it.kind];
    const ek = `${nodeKey(identity)}|${relation}`;
    if (seenEdges.has(ek)) continue;
    seenEdges.add(ek);
    const exists = postRef.id && target.reused && edges.some((e) => e.from_node === postRef.id && e.to_node === target.ref.id && e.relation_type === relation && s(e.metadata?.period) === "");
    if (exists) { out.skipped.push({ item: it, reason: "EDGE_EXISTS" }); continue; }
    out.ops.push({ op: "create_edge", from: postRef, to: target.ref, relation_type: relation, metadata: meta, reused_target: target.reused });
  }
  out.ok = blockers.length === 0;
  return out;
}

// Applies a plan through an injected writer {createNode(node)->id, createEdge(edge)}. Release-gated by the caller;
// refuses plans with blockers. This module holds no client and performs no I/O itself.
export async function applyPostGraphIntakePlan(plan, writer) {
  if (!plan?.ok) throw new Error("PLAN_NOT_OK");
  const ids = new Map();
  const resolve = (r) => (r.id ? r.id : ids.get(r.new));
  for (const op of plan.ops) {
    if (op.op === "create_node") ids.set(op.ref, await writer.createNode(op.node));
    else await writer.createEdge({ from_node: resolve(op.from), to_node: resolve(op.to), relation_type: op.relation_type, metadata: op.metadata });
  }
  return { created_nodes: ids.size };
}
