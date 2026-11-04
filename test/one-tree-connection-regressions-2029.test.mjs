import test from "node:test";
import assert from "node:assert/strict";
import { buildTopicGoldenProjection } from "../src/lib/research/topicGoldenProjection.js";
import { createCanonicalRelationOpener, normalizeOpenedRelations } from "../src/lib/research/worldGraphRelationOpener2029.js";
import { graphNodeToUniversalFinding, graphEdgeToUniversalFinding } from "../src/lib/research/entityGraphFinding.js";

const edgeId = "30000000-0000-4000-8000-000000000001";
const otherEdgeId = "30000000-0000-4000-8000-000000000002";
const anchor = "10000000-0000-4000-8000-000000000001";
const target = "20000000-0000-4000-8000-000000000001";
function relationFinding(id = edgeId, from = anchor, to = target) {
  return { kind: "graph-relation", identity: { relationRef: `edge:${id}` }, source: { sourceRef: `edge:${id}` },
    projection: { relations: [{ id, relationType: "related", fromNodeId: from, toNodeId: to,
      from: { id: from, label: "עוגן" }, to: { id: to, label: "יעד" } }] } };
}
const anchorFinding = () => ({ kind: "graph-entity", identity: { entityRef: `node:${anchor}`, sourceIdentity: { nodeId: anchor } },
  source: { sourceRef: `node:${anchor}` } });

test("a Topic cannot inherit another Topic's media, source context, relations or prominence", () => {
  const projection = { slug: "new-topic", entityRef: `node:${target}`, createdBy: "מחבר", authoredFactsCount: 1 };
  const hub = { identity: { nodeId: anchor },
    sourceContext: { topicSlug: "old-topic", items: [{ galleryImageId: "old-image", label: "OLD_TOPIC_SOURCE", imageUrl: "https://example.invalid/public.jpg" }] },
    sources: [{ label: "OLD_TOPIC_BOOK", ref: "book:old" }], research: { findings: [{ id: "old-finding" }] } };
  const out = buildTopicGoldenProjection(projection, { hub, prominence: { items: [{ id: "old-ranked", label: "OLD_TOPIC_RANK" }] } });
  assert.equal(out.media.length, 0);
  assert.equal(out.sources.length, 0);
  assert.equal(out.researchCount, 0);
  assert.equal(out.prominenceItems.length, 0);
  assert.equal(out.sourceContext, null);
  assert.deepEqual(out.people, ["מחבר"], "current source attribution remains available");
});

test("a relation reference must agree with the exact source and projected edge id", () => {
  const mismatchedSource = relationFinding(); mismatchedSource.source.sourceRef = `edge:${otherEdgeId}`;
  const mismatchedId = relationFinding(); mismatchedId.projection.relations[0].id = otherEdgeId;
  const badRef = relationFinding(); badRef.identity.relationRef = "edge:not-an-id";
  const out = normalizeOpenedRelations([mismatchedSource, mismatchedId, badRef], { anchorNodeId: anchor });
  assert.deepEqual(out.relations, []);
  assert.equal(out.status, "partial", "rejected upstream rows are not evidence of an empty graph");
});

test("the existing opener rejects unrelated endpoints and deduplicates exact repeated edges", async () => {
  const good = relationFinding();
  const unrelated = relationFinding(otherEdgeId, target, "40000000-0000-4000-8000-000000000001");
  const open = createCanonicalRelationOpener({ fetcher: async () => [anchorFinding(), good, good, unrelated] });
  const out = await open({ nodeId: anchor });
  assert.equal(out.anchorNodeId, anchor);
  assert.deepEqual(out.relations.map(row => row.edgeRef), [`edge:${edgeId}`]);
  assert.equal(out.status, "partial");
});

test("missing or unavailable anchor is not an invented empty graph", async () => {
  for (const findings of [[], null, [relationFinding()]]) {
    const out = await createCanonicalRelationOpener({ fetcher: async () => findings })({ nodeId: anchor });
    assert.equal(out.status, "unavailable"); assert.deepEqual(out.relations, []);
  }
  const out = await createCanonicalRelationOpener({ fetcher: async () => [anchorFinding()] })({ nodeId: anchor });
  assert.equal(out.status, "ok"); assert.deepEqual(out.relations, []);
});

test("conflicting copies of an edge and disagreeing endpoint identity fail closed", () => {
  const conflicting = relationFinding(); conflicting.projection.relations[0].toNodeId = anchor;
  conflicting.projection.relations[0].to = { id: anchor, label: "שונה" };
  const endpointMismatch = relationFinding(otherEdgeId); endpointMismatch.projection.relations[0].to.id = anchor;
  const out = normalizeOpenedRelations([relationFinding(), conflicting, endpointMismatch], { anchorNodeId: anchor });
  assert.equal(out.status, "partial"); assert.deepEqual(out.relations, []);
});

test("Topic connections use only exact edges adjacent to the current Topic, not a fallback endpoint", () => {
  const unrelated = relationFinding(otherEdgeId, target, "40000000-0000-4000-8000-000000000001");
  unrelated.projection.relations[0].to.type = "number";
  unrelated.projection.relations[0].to.label = "45";
  const hub = { identity: { nodeId: anchor }, graph: { relations: [relationFinding(), unrelated, relationFinding()] } };
  const out = buildTopicGoldenProjection({ slug: "current-topic", entityRef: `node:${anchor}` }, { hub });
  assert.equal(out.graphConnections.length, 1);
  assert.equal(out.graphConnections[0].sourceRef, `edge:${edgeId}`);
  assert.equal(out.graphConnections[0].href, null);
});

test("the unchanged canonical graph adapters satisfy the tightened opener contract", async () => {
  const node = { id: anchor, type: "convergence", label: "הציר", identity_key: "topic:current" };
  const endpoint = { id: target, type: "number", label: "1237" };
  const entity = graphNodeToUniversalFinding(node);
  const edge = graphEdgeToUniversalFinding({ id: edgeId, from_node: anchor, to_node: target, relation_type: "related" }, new Map([[anchor, node], [target, endpoint]]));
  const out = await createCanonicalRelationOpener({ fetcher: async () => [entity, edge] })({ nodeId: anchor });
  assert.equal(out.status, "ok"); assert.equal(out.relations.length, 1);
  assert.equal(out.relations[0].edgeRef, `edge:${edgeId}`);
  const golden = buildTopicGoldenProjection({ slug: "current-topic", entityRef: `node:${anchor}` },
    { hub: { identity: { nodeId: anchor }, graph: { relations: [edge] } } });
  assert.equal(golden.graphConnections[0].href, "/2029/number/1237");
});
