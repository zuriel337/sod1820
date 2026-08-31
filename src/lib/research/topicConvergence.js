import { supabase } from "../supabase.js";
import { makeUniversalFinding } from "./universalFinding.js";

// Canonical Topic/Convergence/Reality-Graph -> Universal Finding adapter.
//
// ONE TREE LAW: this is a READ-ONLY projection of the existing canonical graph/editorial
// sources. It does not create a second graph, does not copy topic_cards into a new store,
// does not create research_objects, and does not promote/canonicalize/publish anything.
//
// Ownership:
//   topic_cards = edited convergence source (when present)
//   nodes/edges  = canonical Reality Graph projection
//   Universal Finding = research envelope only, never storage owner
//
// Truth discipline:
//   - editorial approval is source governance, NOT epistemic stage
//   - graph presence is NOT verification of an interpretation/claim
//   - therefore stage/status/verification_state remain null here
//   - exact source-native identities and graph relation refs are preserved

const nonEmpty = (v) => String(v ?? "").trim();

function graphRelationRef(edge) {
  const id = nonEmpty(edge?.id);
  return id ? `edge:${id}` : null;
}

function targetIndex(targets) {
  return Object.fromEntries((Array.isArray(targets) ? targets : [])
    .filter(t => t?.id)
    .map(t => [String(t.id), t]));
}

export function topicConvergenceToUniversalFinding(
  { card = null, node = null, edges = [], targets = [] } = {},
  { createdAt = null } = {},
) {
  const cardId = nonEmpty(card?.id);
  const nodeId = nonEmpty(node?.id || card?.node_id);
  const slug = nonEmpty(card?.slug || node?.metadata?.slug);
  const label = nonEmpty(card?.title || node?.label);

  // A convergence must have a source-native identity from at least one canonical owner.
  if ((!cardId && !nodeId) || !label) return null;

  // If a graph node is supplied, refuse to reinterpret an unrelated node type as convergence.
  if (node && node.type !== "convergence") return null;

  const sourceIdentity = cardId
    ? { owner: "topic_cards", id: cardId }
    : { owner: "nodes", id: nodeId };

  const sourceRef = cardId ? `topic_cards:${cardId}` : `nodes:${nodeId}`;
  const byTarget = targetIndex(targets);
  const relationFacts = (Array.isArray(edges) ? edges : []).flatMap((edge) => {
    if (!edge?.id || !edge?.to_node || !edge?.relation_type) return [];
    const target = byTarget[String(edge.to_node)] || null;
    return [{
      type: "graph-relation",
      edge_id: String(edge.id),
      relation_type: String(edge.relation_type),
      from_node: String(edge.from_node || nodeId || "") || null,
      to_node: String(edge.to_node),
      target_type: target?.type || null,
      target_label: target?.label || null,
    }];
  });

  const relationRefs = (Array.isArray(edges) ? edges : [])
    .map(graphRelationRef)
    .filter(Boolean);

  const numbers = Array.isArray(card?.numbers)
    ? card.numbers.filter(Number.isFinite)
    : Array.isArray(node?.metadata?.numbers)
      ? node.metadata.numbers.filter(Number.isFinite)
      : [];

  return makeUniversalFinding({
    kind: "convergence",
    // Projection adapter does not own epistemic/governance state.
    stage: null,
    status: null,
    subject: {
      type: "convergence",
      // Already source-native (slug/nodeId/cardId), never derived from the display label —
      // stays stable regardless of subject.lang (Multilingual Identity Foundation Closure
      // contract §C).
      key: slug || nodeId || cardId,
      label,
      // topic_cards.title is Hebrew-only today (single column, no lang field yet — see
      // contract Gate 5). Declared explicitly so a future multilingual title does not
      // silently default this to the wrong language.
      lang: "he",
      value: null,
    },
    source: {
      engine: null,
      adapter: "topic-convergence-v1",
      sourceRef,
      method: null,
      corpus: null,
      lang: "he",
    },
    identity: {
      sourceIdentity,
      occurrence: null,
      entityRef: nodeId ? `node:${nodeId}` : null,
      relationRef: null,
    },
    // Graph/editorial projection does not itself perform a claim-vs-engine test.
    // Missing stays honestly unknown under truth_axes_foundation_law PR3.
    verification: { verification_state: null },
    evidence: {
      refs: [sourceRef, ...(nodeId ? [`nodes:${nodeId}`] : []), ...relationRefs],
      facts: [
        ...(cardId ? [{
          type: "topic-card-source",
          card_id: cardId,
          slug: slug || null,
          editorial_status: card?.status ?? null,
          quality: card?.quality ?? null,
          meter_score: card?.meter_score ?? null,
          approved_at: card?.approved_at ?? null,
        }] : []),
        ...(nodeId ? [{
          type: "convergence-node",
          node_id: nodeId,
          active: node?.is_active ?? null,
          weight: node?.weight ?? null,
        }] : []),
        ...relationFacts,
      ],
      score: card?.meter_score ?? null,
      confidence: null,
    },
    access: {
      tier: null,
      reason: null,
    },
    provenance: {
      createdBy: "ADAPTER:topic-convergence-v1",
      createdAt: createdAt || new Date().toISOString(),
      inputRef: sourceRef,
      parentFindingIds: [],
    },
    projection: {
      anchors: numbers.map(value => ({ type: "number", value })),
      relations: relationFacts.map(f => ({
        ref: `edge:${f.edge_id}`,
        relation_type: f.relation_type,
        target: f.target_label || f.to_node,
      })),
      dimensions: {
        graph: {
          node_id: nodeId || null,
          slug: slug || null,
          source_owner: cardId ? "topic_cards" : "nodes",
          source_status: card?.status ?? null,
        },
      },
    },
    view: { rendererHints: { role: "convergence" } },
  });
}

// Read-only canonical fetch path. Approved topic_cards are the edited source; the linked
// convergence node/edges are the graph projection. No writes occur in this function.
export async function fetchCanonicalTopicConvergenceFinding(slug) {
  const cleanSlug = nonEmpty(slug);
  if (!cleanSlug) return null;

  const { data: card, error: cardError } = await supabase
    .from("topic_cards")
    .select("id,slug,title,subtitle,numbers,highlight_numbers,status,quality,meter_score,created_at,approved_at,node_id")
    .eq("slug", cleanSlug)
    .eq("status", "approved")
    .maybeSingle();
  if (cardError) throw cardError;
  if (!card) return null;

  let node = null;
  let edges = [];
  let targets = [];

  if (card.node_id) {
    const { data: nodeRow, error: nodeError } = await supabase
      .from("nodes")
      .select("id,type,label,description,metadata,is_active,weight,created_at")
      .eq("id", card.node_id)
      .eq("type", "convergence")
      .maybeSingle();
    if (nodeError) throw nodeError;
    node = nodeRow || null;

    if (node) {
      const { data: edgeRows, error: edgeError } = await supabase
        .from("edges")
        .select("id,from_node,to_node,relation_type,metadata,created_at")
        .eq("from_node", node.id);
      if (edgeError) throw edgeError;
      edges = edgeRows || [];

      const targetIds = [...new Set(edges.map(e => e.to_node).filter(Boolean))];
      if (targetIds.length) {
        const { data: targetRows, error: targetError } = await supabase
          .from("nodes")
          .select("id,type,label,metadata,is_active")
          .in("id", targetIds);
        if (targetError) throw targetError;
        targets = targetRows || [];
      }
    }
  }

  return topicConvergenceToUniversalFinding({ card, node, edges, targets });
}
