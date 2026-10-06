import assert from "node:assert/strict";
import test from "node:test";
import { planPostGraphIntake, applyPostGraphIntakePlan, numberIdentity, dateEventIdentity } from "../supabase/functions/_shared/postGraphIntake.js";

const READY = { state: "READY", bundle: {} };
// Live node ids observed for existing 7 / 10 / 710 number nodes (read-only evidence).
const N = (id, value) => ({ id, type: "number", label: String(value), identity_key: null, metadata: { value } });
const nodes = [N("n7", 7), N("n10", 10), N("n710", 710)];
const src = { source_ref: "video:dimension-five-continuation", lang: "he", quote: "שבע ספירות תחתונות" };

test("Golden B: 7/10 date event is distinct from numbers 7, 10, 710; reuses existing number nodes", () => {
  const plan = planPostGraphIntake({
    preflight: READY, post: { post_id: 9001, slug: "dim5-cont", title: "t" }, facts: { nodes, edges: [] },
    items: [
      { kind: "date_event", date: "7/10", calendar: "gregorian", truth_class: "source_claim", origin: "source", provenance: src },
      { kind: "number", value: 7, truth_class: "extraction", origin: "post" },
      { kind: "number", value: 10, truth_class: "extraction", origin: "post" },
      { kind: "number", value: 2027, truth_class: "source_claim", origin: "creator", role: "year_claim", provenance: src },
    ],
  });
  assert.ok(plan.ok);
  assert.notDeepEqual(dateEventIdentity("7/10", "gregorian"), numberIdentity(710));
  const edges = plan.ops.filter((o) => o.op === "create_edge");
  const creates = plan.ops.filter((o) => o.op === "create_node");
  assert.ok(!edges.some((e) => e.to.id === "n710"), "710 never linked from 7/10");
  assert.ok(edges.some((e) => e.to.id === "n7") && edges.some((e) => e.to.id === "n10"));
  assert.deepEqual(creates.map((c) => c.node.type + ":" + (c.node.identity_key || c.node.label)).sort(),
    ["event:date:gregorian:7/10", "number:2027", "post:post:9001"]);
  assert.equal(edges.find((e) => e.metadata.role === "year_claim").metadata.truth_class, "source_claim");
});

test("source claim is never promoted to fact; provenance required; translation and tags never mutate graph", () => {
  const plan = planPostGraphIntake({
    preflight: READY, post: { post_id: 9001, title: "t" }, facts: { nodes, edges: [] },
    items: [
      { kind: "number", value: 7, truth_class: "fact", origin: "creator", provenance: src },
      { kind: "number", value: 2027, truth_class: "interpretation", origin: "creator" },
      { kind: "number", value: 10, truth_class: "extraction", origin: "translation" },
      { kind: "tag", value: "710" },
    ],
  });
  const edges = plan.ops.filter((o) => o.op === "create_edge");
  assert.equal(edges.length, 1);
  assert.equal(edges[0].metadata.truth_class, "source_claim");
  assert.deepEqual(plan.skipped.map((x) => x.reason).sort(), ["PROVENANCE_REQUIRED", "TRANSLATION_NEVER_MUTATES_GRAPH"]);
  assert.deepEqual(plan.compat_tags_ignored, ["710"]);
});

test("Golden A: post 5112 reuses existing post node (no duplicate Post identity) and is idempotent on existing edges", () => {
  const post = { post_id: 5112, slug: "flydubai-fz1073-363-14000-remzei-geula", title: "FZ1073" };
  const postNode = { id: "p5112", type: "post", identity_key: null, label: "FZ1073", metadata: { post_id: 5112, slug: post.slug } };
  const items = [1073, 363, 14000].map((value) => ({ kind: "number", value, truth_class: "extraction", origin: "post" }));
  const facts = { nodes: [postNode, N("n363", 363)], edges: [{ from_node: "p5112", to_node: "n363", relation_type: "mentions", metadata: {} }] };
  const plan = planPostGraphIntake({ preflight: READY, post, items, facts });
  assert.ok(plan.ok);
  assert.ok(!plan.ops.some((o) => o.op === "create_node" && o.node.type === "post"));
  assert.deepEqual(plan.ops.filter((o) => o.op === "create_node").map((o) => o.node.label).sort(), ["1073", "14000"]);
  assert.ok(plan.skipped.some((x) => x.reason === "EDGE_EXISTS"));
  assert.ok(plan.ops.filter((o) => o.op === "create_edge").every((e) => e.from.id === "p5112"));
  // legacy wp: identity also resolves
  const dup = planPostGraphIntake({ preflight: READY, post: { ...post, wp_id: 1 }, items: [], facts: { nodes: [postNode, { ...postNode, id: "x", identity_key: "wp:1", metadata: {} }], edges: [] } });
  assert.ok(dup.blockers[0].startsWith("DUPLICATE_POST_IDENTITY"));
});

test("gematria stays a claim without a canonical engine receipt; no compute here", () => {
  const mk = (g) => planPostGraphIntake({ preflight: READY, post: { post_id: 1, title: "t" }, facts: { nodes, edges: [] },
    items: [{ kind: "number", value: 710, truth_class: "calculation", origin: "creator", provenance: src, gematria: g }] })
    .ops.find((o) => o.op === "create_edge").metadata;
  assert.equal(mk({ phrase: "x", value: 710 }).truth_class, "source_claim");
  assert.equal(mk({ phrase: "x", value: 710 }).gematria.verified, false);
  const ok = mk({ phrase: "x", value: 710, engine_receipt: { engine: "canonical", method_key: "standard" } });
  assert.equal(ok.truth_class, "calculation");
  assert.equal(ok.gematria.verified, true);
});

test("blocked unless preflight READY; apply refuses blocked plan and applies via injected writer only", async () => {
  const bad = planPostGraphIntake({ preflight: { state: "BLOCKED" }, post: { post_id: 1 }, items: [] });
  assert.deepEqual(bad.blockers, ["PREFLIGHT_NOT_READY"]);
  await assert.rejects(() => applyPostGraphIntakePlan(bad, {}), /PLAN_NOT_OK/);
  const plan = planPostGraphIntake({ preflight: READY, post: { post_id: 2, title: "t" }, facts: { nodes, edges: [] }, items: [{ kind: "number", value: 7, truth_class: "extraction", origin: "post" }] });
  const log = [];
  await applyPostGraphIntakePlan(plan, { createNode: async (n) => (log.push(["node", n.type]), "id-" + log.length), createEdge: async (e) => log.push(["edge", e.from_node, e.to_node]) });
  assert.deepEqual(log, [["node", "post"], ["edge", "id-1", "n7"]]);
});
