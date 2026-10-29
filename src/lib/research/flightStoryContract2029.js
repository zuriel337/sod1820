// Existing public Post + exact existing graph node → shared public content contract.
// No new source reader, graph write, source publication, arithmetic, or UI.
import { fetchPublicWorldPostSource } from "./entityHubProjection.js";
import { fetchCanonicalGraphEntityFindings } from "./entityGraphFinding.js";
import { postRowToWorldUpdate } from "./worldDiscoveryStream.js";
import { buildPublicWorldContentProjectionV1 } from "./publicWorldContentProjectionV1.js";
import { INDIA_CAPTAIN_SOURCE, isDocumentedIndiaCaptainPost } from "./topicSourceContext.js";
import { REVIEWED_SOURCE_WITNESSES, witnessSource } from "./worldSourceConnections.js";

export const FLIGHT_POST_ID = 5112;
export const FLIGHT_POST_SLUG = "flydubai-fz1073-363-14000-remzei-geula";
export const FLIGHT_GRAPH_NODE_ID = "f42e2a16-a3d6-4b7f-ab69-e10522c8f8e2";
export const FLIGHT_GRAPH_IDENTITY = "wp:37044";
const list = (v) => Array.isArray(v) ? v : [];
const selected = new Set(["date-718", "flight-wisdom", "spoken-1202", "spoken-ofer", "flight-descent"]);
const flightWitnesses = REVIEWED_SOURCE_WITNESSES.filter((spec) => selected.has(spec.id));

function projection({ post, graphFindings = [], graphState = "unavailable" } = {}) {
  const update = postRowToWorldUpdate(post);
  if (!update || post.id !== FLIGHT_POST_ID || post.slug !== FLIGHT_POST_SLUG) {
    return { status: "source_unavailable", contentProjection: buildPublicWorldContentProjectionV1({ coverage: {
      sources: { available: false }, occurrences: { available: false }, findings: { available: false }, treeRelations: { available: false },
    } }), witnesses: [], graph: { status: "unavailable", relations: [] } };
  }
  const sourceRef = update.sourceRef;
  const occurrences = [{ occurrenceRef: `world-post:${FLIGHT_POST_ID}`, sourceRef, href: update.href,
    locator: null, times: { occurredAt: null, publishedAt: post.date || null, updatedAt: post.modified || null } }];
  const witnesses = flightWitnesses.flatMap((spec) => {
    const found = witnessSource(spec, { post });
    if (!found) return [];
    // A reviewed text search/marker does not imply the destination actually focuses that region.
    return [{ id: spec.id, sourceRef: found.sourceRef, href: found.href, routePrecision: found.routePrecision,
      relationKind: spec.relationKind, readings: spec.readings || [], calculations: spec.calculations || [],
      systemMethods: spec.relations || [], reason: spec.reason, verification: "not_reverified_here" }];
  });
  const captain = isDocumentedIndiaCaptainPost(post);
  if (captain) occurrences.push({ occurrenceRef: `media:post:${FLIGHT_POST_ID}:${INDIA_CAPTAIN_SOURCE.regionId}`,
    sourceRef, locator: `post:${post.slug}#${INDIA_CAPTAIN_SOURCE.regionId}`, href: update.href,
    times: { occurredAt: null, publishedAt: post.date || null, updatedAt: post.modified || null } });
  const node = list(graphFindings).find((item) => item?.kind === "graph-entity"
    && item?.identity?.sourceIdentity?.nodeId === FLIGHT_GRAPH_NODE_ID
    && item?.subject?.type === "post" && item?.subject?.key === FLIGHT_GRAPH_IDENTITY);
  const relations = node ? list(graphFindings).flatMap((item) => {
    if (item?.kind !== "graph-relation" || !/^edge:[0-9a-f-]{36}$/i.test(item?.identity?.relationRef || "")
      || item.identity.relationRef !== item?.source?.sourceRef) return [];
    return list(item?.projection?.relations).flatMap((relation) => {
      if (`edge:${relation.id}` !== item.identity.relationRef) return [];
      const from = relation.fromNodeId, to = relation.toNodeId;
      if (from !== FLIGHT_GRAPH_NODE_ID && to !== FLIGHT_GRAPH_NODE_ID) return [];
      const endpoint = from === FLIGHT_GRAPH_NODE_ID ? relation.to : relation.from;
      const endpointId = from === FLIGHT_GRAPH_NODE_ID ? to : from;
      if (!endpointId || endpoint?.id !== endpointId || endpointId === FLIGHT_GRAPH_NODE_ID) return [];
      return [{ edgeRef: item.identity.relationRef, relationType: relation.relationType, targetRef: `node:${endpointId}`,
        targetType: endpoint.type, targetLabel: endpoint.label, // canonical adapter does not expose edge metadata
        provenanceDetail: "edge_metadata_not_exposed_by_reader", verification: "graph_structure_not_fact_verification" }];
    });
  }) : [];
  const contentProjection = buildPublicWorldContentProjectionV1({
    sources: [{ sourceRef, title: update.label, sourceHref: update.href,
      contributor: post.author ? { label: post.author } : null }], occurrences,
    // A source or graph edge is not itself an already-approved public research finding.
    findings: [], treeRelations: [], compatibility: { legacyTopics: [] },
    coverage: { sources: { available: true }, occurrences: { available: true }, clusters: { available: false },
      seriesCategories: { available: false }, findings: { available: false }, treeRelations: { available: false }, legacyTopics: { available: false } },
  });
  return { status: "source_available", contentProjection, witnesses,
    captain: { status: captain ? "source_mention_verified" : "unavailable_or_changed", relation: "not_a_graph_edge" },
    graph: { status: graphState === "available" && node ? "available_bounded" : graphState === "failed" ? "failed" : "unavailable",
      nodeRef: node ? `node:${FLIGHT_GRAPH_NODE_ID}` : null, relations,
      note: "bounded_read_not_proof_of_complete_graph_or_finding_attachment" } };
}

export const buildFlightStoryContract2029 = projection;

/** Exact already-public post is read first. A missing/private source never triggers a graph read. */
export async function fetchFlightStoryContract2029({ postReader = fetchPublicWorldPostSource, graphReader = fetchCanonicalGraphEntityFindings } = {}) {
  let post;
  try { post = await postReader({ postId: FLIGHT_POST_ID }); }
  catch { return { ...projection(), status: "source_read_failed" }; }
  if (!postRowToWorldUpdate(post) || post?.id !== FLIGHT_POST_ID || post?.slug !== FLIGHT_POST_SLUG) return projection();
  try {
    const graphFindings = await graphReader(FLIGHT_GRAPH_NODE_ID, { relationLimit: 100 });
    return projection({ post, graphFindings, graphState: "available" });
  } catch { return projection({ post, graphState: "failed" }); }
}
