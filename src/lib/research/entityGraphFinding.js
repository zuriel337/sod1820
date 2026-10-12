import { supabase } from "../supabase.js";
import { makeUniversalFinding } from "./universalFinding.js";

const NODE_FIELDS = "id,type,label,description,metadata,identity_key,is_active,created_at";
const EDGE_FIELDS = "id,from_node,to_node,relation_type,metadata,created_at";

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function nodeRef(id) {
  return id ? `node:${id}` : null;
}

function edgeRef(id) {
  return id ? `edge:${id}` : null;
}

// Bounded href for an already-existing endpoint: only a post node with a stored slug.
function postHref(node, metadata) {
  const slug = node?.type === "post" ? clean(metadata?.slug) : "";
  return slug ? `/post/${slug}` : null;
}

function projectedNodeContext(node) {
  const metadata = node?.metadata && typeof node.metadata === "object" ? node.metadata : {};
  const meter = Number(metadata.meter);
  const importance = Number(metadata.importance);
  return Object.freeze({
    id: node?.id ? String(node.id) : null,
    type: node?.type || "entity",
    label: clean(node?.label) || (node?.id ? String(node.id) : ""),
    space: clean(metadata.space) || "core",
    href: postHref(node, metadata),
    curation: Object.freeze({
      tier: clean(metadata.tier),
      role: clean(metadata.role),
    }),
    signal: Object.freeze({
      meter: Number.isFinite(meter) ? meter : null,
      importance: Number.isFinite(importance) ? importance : null,
    }),
  });
}

/**
 * Read-only projection of one canonical Reality Graph node into Universal Finding.
 * Graph existence is identity/structure, not verification, governance, or publication.
 */
export function graphNodeToUniversalFinding(node, { relations = [] } = {}) {
  if (!node?.id) return null;
  const id = String(node.id);
  const label = clean(node.label) || `${node.type || "node"} ${id}`;

  return makeUniversalFinding({
    kind: "graph-entity",
    stage: null,
    status: null,
    subject: {
      type: node.type || "entity",
      key: node.identity_key || id,
      label,
      lang: null,
      value: node.type === "number" && Number.isFinite(Number(node.label)) ? Number(node.label) : null,
    },
    source: {
      engine: null,
      adapter: "entity-graph-v1",
      sourceRef: nodeRef(id),
      method: null,
      corpus: "reality-graph",
      lang: null,
    },
    identity: {
      sourceIdentity: { nodeId: id },
      entityRef: nodeRef(id),
      relationRef: null,
    },
    verification: { verification_state: null },
    evidence: {
      refs: [nodeRef(id)],
      facts: node.description ? [{ type: "source-description", value: node.description }] : [],
      score: null,
      confidence: null,
    },
    access: { tier: null, reason: null },
    provenance: {
      createdAt: node.created_at || undefined,
      inputRef: nodeRef(id),
    },
    projection: {
      anchors: [{ space: "reality-graph", id }],
      relations,
      dimensions: { graphNodeType: node.type || null },
    },
  });
}

/**
 * One canonical edge becomes a relation Finding. The edge itself is source evidence;
 * the adapter never upgrades it to a claim/fact/match/canonical state.
 * `from`/`to` below are bounded display context only: no raw metadata leaves this adapter.
 */
export function graphEdgeToUniversalFinding(edge, nodesById = new Map()) {
  if (!edge?.id || !edge?.from_node || !edge?.to_node) return null;
  const id = String(edge.id);
  const fromId = String(edge.from_node);
  const toId = String(edge.to_node);
  const from = nodesById.get(fromId);
  const to = nodesById.get(toId);
  const relationType = clean(edge.relation_type) || "related";
  const fromLabel = clean(from?.label) || fromId;
  const toLabel = clean(to?.label) || toId;

  return makeUniversalFinding({
    kind: "graph-relation",
    stage: null,
    status: null,
    subject: {
      type: "relation",
      key: id,
      label: `${fromLabel} — ${relationType} → ${toLabel}`,
      lang: null,
      value: null,
    },
    source: {
      engine: null,
      adapter: "entity-graph-v1",
      sourceRef: edgeRef(id),
      method: relationType,
      corpus: "reality-graph",
      lang: null,
    },
    identity: {
      sourceIdentity: { edgeId: id, fromNodeId: fromId, toNodeId: toId },
      entityRef: null,
      relationRef: edgeRef(id),
    },
    verification: { verification_state: null },
    evidence: {
      refs: [edgeRef(id), nodeRef(fromId), nodeRef(toId)],
      facts: [],
      score: null,
      confidence: null,
    },
    access: { tier: null, reason: null },
    provenance: {
      createdAt: edge.created_at || undefined,
      inputRef: edgeRef(id),
    },
    projection: {
      anchors: [
        { space: "reality-graph", id: fromId },
        { space: "reality-graph", id: toId },
      ],
      relations: [{
        id,
        fromNodeId: fromId,
        toNodeId: toId,
        relationType,
        from: projectedNodeContext(from),
        to: projectedNodeContext(to),
      }],
      dimensions: { relationFamily: relationType },
    },
  });
}

const MEDIA_NODE_TYPES = ["image", "media"];
const MEDIA_TYPE_LIST = `(${MEDIA_NODE_TYPES.join(",")})`;
const FROM_TYPE = "src:nodes!edges_from_node_fkey!inner(type)";
const TO_TYPE = "dst:nodes!edges_to_node_fkey!inner(type)";

function edgeRowsOf(result) {
  if (result.error) throw result.error;
  return (Array.isArray(result.data) ? result.data : [])
    .map(({ src, dst, ...edge }) => edge);
}

/**
 * Exact node-id read path for the Entity/Graph Lens. Returns the entity Finding plus
 * relation Findings for its adjacent canonical edges. No graph writes and no truth inference.
 *
 * Media endpoints (one image usually carries both a contains and a mentions edge) are read in
 * their own bounded window, so a recent gallery batch can never push a node's posts,
 * convergences, entities or numbers out of its relation window. Retired (inactive) counterparts
 * are not projected as live relations unless a caller explicitly asks for them.
 */
export async function fetchCanonicalGraphEntityFindings(nodeId, {
  relationLimit = 50,
  mediaRelationLimit = null,
  includeInactive = false,
} = {}) {
  const id = clean(nodeId);
  if (!id) return [];
  const safeLimit = Math.max(1, Math.min(Number(relationLimit) || 50, 200));
  const mediaLimit = Math.max(1, Math.min(Number(mediaRelationLimit) || safeLimit, 200));

  const { data: node, error: nodeError } = await supabase
    .from("nodes")
    .select(NODE_FIELDS)
    .eq("id", id)
    .maybeSingle();
  if (nodeError) throw nodeError;
  if (!node) return [];

  const anchorIsMedia = MEDIA_NODE_TYPES.includes(node.type);
  const semantic = anchorIsMedia
    ? supabase
      .from("edges")
      .select(EDGE_FIELDS)
      .or(`from_node.eq.${id},to_node.eq.${id}`)
    : supabase
      .from("edges")
      .select(`${EDGE_FIELDS},${FROM_TYPE},${TO_TYPE}`)
      .or(`from_node.eq.${id},to_node.eq.${id}`)
      .not("src.type", "in", MEDIA_TYPE_LIST)
      .not("dst.type", "in", MEDIA_TYPE_LIST);
  const mediaWindow = (column, embed, alias) => supabase
    .from("edges")
    .select(`${EDGE_FIELDS},${embed}`)
    .eq(column, id)
    .in(`${alias}.type`, MEDIA_NODE_TYPES)
    .order("created_at", { ascending: false })
    .limit(mediaLimit);
  const [semanticResult, incomingMedia, outgoingMedia] = await Promise.all([
    semantic.order("created_at", { ascending: false }).limit(safeLimit),
    anchorIsMedia ? { data: [] } : mediaWindow("to_node", FROM_TYPE, "src"),
    anchorIsMedia ? { data: [] } : mediaWindow("from_node", TO_TYPE, "dst"),
  ]);
  const mediaEdges = [...edgeRowsOf(incomingMedia), ...edgeRowsOf(outgoingMedia)]
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, mediaLimit);
  const fetchedEdges = [...edgeRowsOf(semanticResult), ...mediaEdges]
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

  const nodeIds = [...new Set(fetchedEdges.flatMap(edge => [edge.from_node, edge.to_node]).filter(Boolean).map(String))];
  // Bounded id lists keep each GET request URL well under proxy limits.
  const idChunks = [];
  for (let i = 0; i < nodeIds.length; i += 100) idChunks.push(nodeIds.slice(i, i + 100));
  const relatedRows = (await Promise.all(idChunks.map(async (chunk) => {
    const { data, error } = await supabase.from("nodes").select(NODE_FIELDS).in("id", chunk);
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }))).flat();
  const inactiveIds = new Set(relatedRows
    .filter(row => row.is_active === false && String(row.id) !== String(node.id))
    .map(row => String(row.id)));
  const edgeRows = includeInactive
    ? fetchedEdges
    : fetchedEdges.filter(edge => !inactiveIds.has(String(edge.from_node)) && !inactiveIds.has(String(edge.to_node)));

  const nodesById = new Map(relatedRows.map(row => [String(row.id), row]));
  nodesById.set(String(node.id), node);

  const relationSummaries = edgeRows.map(edge => ({
    id: String(edge.id),
    relationRef: edgeRef(edge.id),
    fromNodeId: String(edge.from_node),
    toNodeId: String(edge.to_node),
    relationType: edge.relation_type || null,
  }));

  return [
    graphNodeToUniversalFinding(node, { relations: relationSummaries }),
    ...edgeRows.map(edge => graphEdgeToUniversalFinding(edge, nodesById)).filter(Boolean),
  ].filter(Boolean);
}

export default fetchCanonicalGraphEntityFindings;
