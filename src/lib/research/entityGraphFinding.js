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
      relations: [{ id, fromNodeId: fromId, toNodeId: toId, relationType }],
      dimensions: { relationFamily: relationType },
    },
  });
}

/**
 * Exact node-id read path for the Entity/Graph Lens. Returns the entity Finding plus
 * relation Findings for its adjacent canonical edges. No graph writes and no truth inference.
 */
export async function fetchCanonicalGraphEntityFindings(nodeId, { relationLimit = 50 } = {}) {
  const id = clean(nodeId);
  if (!id) return [];
  const safeLimit = Math.max(1, Math.min(Number(relationLimit) || 50, 200));

  const { data: node, error: nodeError } = await supabase
    .from("nodes")
    .select(NODE_FIELDS)
    .eq("id", id)
    .maybeSingle();
  if (nodeError) throw nodeError;
  if (!node) return [];

  const { data: edges, error: edgeError } = await supabase
    .from("edges")
    .select(EDGE_FIELDS)
    .or(`from_node.eq.${id},to_node.eq.${id}`)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (edgeError) throw edgeError;

  const edgeRows = Array.isArray(edges) ? edges : [];
  const nodeIds = [...new Set(edgeRows.flatMap(edge => [edge.from_node, edge.to_node]).filter(Boolean).map(String))];
  const relatedRows = nodeIds.length
    ? (await supabase.from("nodes").select(NODE_FIELDS).in("id", nodeIds)).data || []
    : [];
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
