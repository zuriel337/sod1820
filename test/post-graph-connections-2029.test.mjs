import test from "node:test";
import assert from "node:assert/strict";
import { postGraphNodeLookup, graphConnectionCandidates, readPostGraphConnections, GRAPH_CONNECTION_LIMIT } from "../src/lib/research/postGraphConnections2029.js";

const ANCHOR = "00000000-0000-4000-8000-000000000001";
const rel = (id, other, type = "mentions", anchorIsFrom = true) => ({
  kind: "graph-relation",
  projection: { relations: [{ id, fromNodeId: anchorIsFrom ? ANCHOR : other.id, toNodeId: anchorIsFrom ? other.id : ANCHOR, relationType: type,
    from: anchorIsFrom ? { id: ANCHOR, type: "post", label: "this" } : other, to: anchorIsFrom ? other : { id: ANCHOR, type: "post", label: "this" } }] },
});
const num = (n) => ({ id: `n-${n}`, type: "number", label: String(n) });

test("a Post is found by its archive identity, or by its own id for a native Post", () => {
  assert.deepEqual(postGraphNodeLookup({ wp_id: 37044, id: 5112 }), { column: "identity_key", value: "wp:37044" });
  assert.deepEqual(postGraphNodeLookup({ id: 5113 }), { column: "metadata->>post_id", value: "5113" });
  assert.equal(postGraphNodeLookup({}), null);
});

test("only counterparts with a public address become connections; the rest are counted, never shown", () => {
  const findings = [
    rel("e1", num(747)), rel("e2", num(747), "documents"), rel("e3", { id: "p1", type: "post", label: "פוסט קשור", href: "/post/other" }, "related", false),
    rel("e4", { id: "x1", type: "entity", label: "אדם" }), rel("e5", { id: "ev", type: "event", label: "אירוע" }, "documents"),
    rel("e6", { id: "p2", type: "post", label: "this post", href: "/post/self" }, "related"),
    { kind: "graph-entity", projection: {} },
  ];
  const { items, unlinked } = graphConnectionCandidates(findings, ANCHOR, { selfSlug: "self" });
  assert.equal(items.length, 2, "the same number twice is one connection; the Post itself is never its own connection");
  assert.match(items[0].href, /\/number\/747$/);
  assert.equal(items[0].label, "מספר");
  assert.equal(items[0].value, "747");
  assert.equal(items[1].href, "/post/other");
  assert.match(items[0].reason, /^קשר בגרף המציאות/, "a graph edge is structure, never claimed as verified");
  assert.doesNotMatch(items[0].reason, /אומת|מאומת/);
  assert.equal(unlinked, 2, "entities and events have no public page today: counted, not shown");
});

test("the reader is bounded", () => {
  const findings = Array.from({ length: 40 }, (_, i) => rel(`e${i}`, num(1000 + i)));
  assert.equal(graphConnectionCandidates(findings, ANCHOR).items.length, GRAPH_CONNECTION_LIMIT);
});

test("the reader uses the one graph reader and the one admission resolver; a Post with no node has none", async () => {
  const calls = [];
  const ok = await readPostGraphConnections({ wp_id: 1, slug: "s" }, {
    readNode: async (look) => { calls.push(["node", look.value]); return { id: ANCHOR, is_active: true }; },
    readFindings: async (id) => { calls.push(["graph", id]); return [rel("e1", num(5)), rel("e2", { id: "p1", type: "post", label: "P", href: "/post/private-draft" })]; },
    resolve: async (connections) => { calls.push(["admit", connections.length]); return { connections: connections.map(item => item.href.startsWith("/post/") ? { ...item, href: null } : item) }; },
  });
  assert.deepEqual(calls.map(call => call[0]), ["node", "graph", "admit"]);
  assert.equal(ok.items.length, 1, "a Post the resolver does not admit (private, draft) is dropped");
  assert.equal(ok.status, "partial");
  const none = await readPostGraphConnections({ wp_id: 2 }, { readNode: async () => null });
  assert.deepEqual(none, { status: "ready", items: [], unlinked: 0 });
  const inactive = await readPostGraphConnections({ wp_id: 3 }, { readNode: async () => ({ id: ANCHOR, is_active: false }) });
  assert.equal(inactive.items.length, 0);
});
