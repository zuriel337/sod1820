// Focused fixtures for G3_WORLD_CONVERGENCE_PR591_SERIAL_REPAIR_A3 — run with:
//   node --test src/lib/research/worldConvergencePr591SerialRepairA3.test.js
// Node's built-in runner (node:test + assert/strict), same convention as sibling research tests.
//
// Scope: worldContextualProminence.js only. Every fixture below is SYNTHETIC — no real
// research_objects/graph/topic row is copied.
//
// Regression: the same governed Convergence artifact projected once via a direct Graph
// relation and once via a Topic card survived as 2 prominence candidates after the A2
// stableKey-only dedup (stableKeys differ: `graph:<id>:<relationType>` vs `topic:<id>`).
// A3 adds a narrow identity-aware merge: Graph + Topic candidates may merge ONLY when both
// explicitly resolve the same governed node/entity identity (shared groupKey
// `graph-counterpart:<nodeId>`). It must never restore generic groupKey dedup: distinct
// research-dependency:* members stay separate, and nothing merges by number/title/author/value.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWorldContextualProminence } from "./worldContextualProminence.js";

const graphRelation = ({ anchorNodeId, id, label, type = "entity", relationType = "related", meter = null }) => ({
  id,
  projection: { relations: [{
    id,
    fromNodeId: anchorNodeId,
    toNodeId: `${id}-node`,
    relationType,
    from: { id: anchorNodeId, type: "number", label: anchorNodeId.replace("-node", ""), curation: {}, signal: {} },
    to: { id: `${id}-node`, type, label, curation: {}, signal: { meter } },
  }] },
  source: { sourceRef: `edge:${id}` },
  evidence: { refs: [`edge:${id}`] },
});

const topicFinding = (cardId, nodeId) => ({
  identity: { sourceIdentity: { owner: "topic_cards", id: cardId }, entityRef: nodeId ? `node:${nodeId}` : null },
  source: { sourceRef: `topic_cards:${cardId}` },
  evidence: { refs: [`topic_cards:${cardId}`] },
  verification: { verification_state: null },
});

// ── (1) graph + topic, same node identity => one representative ────────────────────────────────
test("graph and topic candidates naming the same explicit node identity merge into one representative", () => {
  const data = {
    identity: { nodeId: "anchor-1", type: "number", label: "1820" },
    graph: { relations: [graphRelation({ anchorNodeId: "anchor-1", id: "conv", label: "התכנסות", type: "convergence", relationType: "contains", meter: null })] },
    research: { rows: [], findings: [] },
    topics: {
      rows: [{ id: "card-1", slug: "ateret", title: "התכנסות", subtitle: "פרטי הענין", status: "approved", meter_score: 88, quality: 7 }],
      findings: [topicFinding("card-1", "conv-node")],
    },
    sources: [],
  };
  const built = buildWorldContextualProminence(data, {}, { limit: 7 });
  assert.equal(built.items.length, 1, "same explicit node identity via Graph + Topic must not inflate to two rows");
  assert.equal(built.items[0].kind, "graph-relation", "the direct graph relation stays the representative");
  assert.equal(built.items[0].summary, "פרטי הענין", "topic summary enriches the representative as presentation-only");
  assert.equal(built.items[0].explainWhy.signalOnly.meter, 88, "topic meter survives as a late same-family signal");
});

// ── (2) graph + topic, different node identity => two separate rows ────────────────────────────
test("graph and topic candidates naming different explicit node identities stay two separate rows", () => {
  const data = {
    identity: { nodeId: "anchor-2", type: "number", label: "1820" },
    graph: { relations: [graphRelation({ anchorNodeId: "anchor-2", id: "conv", label: "התכנסות א", type: "convergence", relationType: "contains" })] },
    research: { rows: [], findings: [] },
    topics: {
      rows: [{ id: "card-2", slug: "other", title: "התכנסות ב", subtitle: "ענין נפרד", status: "approved" }],
      findings: [topicFinding("card-2", "other-node")],
    },
    sources: [],
  };
  const built = buildWorldContextualProminence(data, {}, { limit: 7 });
  assert.equal(built.items.length, 2, "distinct explicit node identities must never be merged just because both are Graph+Topic candidates");
  const kinds = built.items.map((item) => item.kind).sort();
  assert.deepEqual(kinds, ["graph-relation", "topic"]);
});

// ── (3) topic with no linked node identity never merges into an unrelated graph candidate ──────
test("a topic candidate with no explicit node identity stays its own row rather than merging by presentation similarity", () => {
  const data = {
    identity: { nodeId: "anchor-3", type: "number", label: "1820" },
    graph: { relations: [graphRelation({ anchorNodeId: "anchor-3", id: "conv", label: "התכנסות", type: "convergence", relationType: "contains" })] },
    research: { rows: [], findings: [] },
    topics: {
      rows: [{ id: "card-3", slug: "unlinked", title: "התכנסות", subtitle: "ללא זיהוי צומת", status: "approved" }],
      findings: [],
    },
    sources: [],
  };
  const built = buildWorldContextualProminence(data, {}, { limit: 7 });
  assert.equal(built.items.length, 2, "no shared explicit node identity means no merge, even with matching labels/titles");
});

// ── (4) research parent + 2 children stay three inspectable rows (unaffected by the merge) ─────
test("research dependency members stay three separate rows, unaffected by the graph+topic merge", () => {
  const data = {
    identity: { nodeId: "anchor-4", type: "number", label: "1820" },
    graph: { relations: [] },
    topics: { rows: [], findings: [] },
    sources: [],
    research: {
      rows: [
        { id: "parent-1", statement: "root claim", engine_detail: { verification_state: "not_tested" } },
        { id: "child-1", parent_id: "parent-1", statement: "child A", engine_detail: { verification_state: "match" } },
        { id: "child-2", parent_id: "parent-1", statement: "child B", engine_detail: { verification_state: "not_tested" } },
      ],
      findings: [],
    },
  };
  const built = buildWorldContextualProminence(data, {}, { limit: 7 });
  const ids = built.items.map((item) => item.id).sort();
  assert.deepEqual(ids, ["research:child-1", "research:child-2", "research:parent-1"].sort(), "DO NOT collapse research-dependency:* members");
  for (const item of built.items) {
    assert.equal(item.explainWhy.dependency.memberCount, 3);
  }
});

// ── (5) same numeric value, unrelated graph nodes => stay separate (no group-by-value) ─────────
test("candidates sharing a numeric value but naming different node identities never merge", () => {
  const data = {
    identity: { nodeId: "anchor-5", type: "number", label: "1080" },
    graph: {
      relations: [
        graphRelation({ anchorNodeId: "anchor-5", id: "star", label: "כוכב 1080", type: "number", relationType: "equals" }),
        graphRelation({ anchorNodeId: "anchor-5", id: "cube", label: "קובייה 1080", type: "number", relationType: "equals" }),
      ],
    },
    topics: { rows: [], findings: [] },
    research: { rows: [], findings: [] },
    sources: [],
  };
  const built = buildWorldContextualProminence(data, {}, { limit: 7 });
  const graphItems = built.items.filter((item) => item.kind === "graph-relation");
  assert.equal(graphItems.length, 2, "1080 star/cube: independently-derived same-number candidates must never merge by value");
});
