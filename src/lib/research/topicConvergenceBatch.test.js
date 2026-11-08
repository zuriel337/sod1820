// node --test src/lib/research/topicConvergenceBatch.test.js
// PF4: entity hubs resolve their topic cards with one read per stage (card, node, edges, targets) instead of four
// sequential reads PER card. The batched findings must equal the per-slug findings exactly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { supabase } from "../supabase.js";
import { fetchCanonicalTopicConvergenceFinding, fetchCanonicalTopicConvergenceFindings } from "./topicConvergence.js";

// provenance.createdAt is the wall clock at build time (the adapter takes no source timestamp), so it is the one field that
// legitimately differs between two builds of the same finding.
const stable = (finding) => (finding ? { ...finding, provenance: { ...finding.provenance, createdAt: "<build-time>" } } : finding);
const stableAll = (list) => list.map(stable);

// ---- in-memory PostgREST over three tables ---------------------------------------------------------------------------
function install(tables, log, { fail = null } = {}) {
  const original = supabase.from;
  supabase.from = (table) => {
    const state = { table, columns: null, filters: [], limit: null };
    const rows = () => {
      let out = (tables[table] || []).filter((row) => state.filters.every(([kind, col, value]) => (kind === "in" ? value.includes(row[col]) : row[col] === value)));
      if (state.limit != null) out = out.slice(0, state.limit);
      return out.map((row) => (state.columns ? Object.fromEntries(state.columns.filter((c) => c in row).map((c) => [c, row[c]])) : row));
    };
    const builder = {
      select(columns) { state.columns = String(columns).split(","); return builder; },
      in(col, value) { state.filters.push(["in", col, value]); return builder; },
      eq(col, value) { state.filters.push(["eq", col, value]); return builder; },
      limit(n) { state.limit = n; return builder; },
      maybeSingle() { log.push(state); const out = rows(); return Promise.resolve(fail === table ? { data: null, error: { message: "boom" } } : { data: out[0] || null, error: null }); },
      then(resolve, reject) { log.push(state); return Promise.resolve(fail === table ? { data: null, error: { message: "boom" } } : { data: rows(), error: null }).then(resolve, reject); },
    };
    return builder;
  };
  return () => { supabase.from = original; };
}

const card = (slug, node_id, extra = {}) => ({
  id: `card-${slug}`, slug, title: `כותרת ${slug}`, subtitle: "תת", numbers: [18, 20], highlight_numbers: [1820], status: "approved", quality: "gold", meter_score: 70,
  created_at: "2026-10-01T10:00:00Z", approved_at: "2026-10-02T10:00:00Z", node_id, findings: { phrases: [{ phrase: "א", n: 1 }] }, created_by: "SOD1820",
  search_terms: ["א"], image_ids: [], occurred_at: null, ...extra,
});
const node = (id, extra = {}) => ({ id, type: "convergence", label: `התכנסות ${id}`, description: "d", metadata: { k: 1 }, is_active: true, weight: 3, created_at: "2026-10-01T10:00:00Z", ...extra });
const target = (id, label) => ({ id, type: "number", label, metadata: {}, is_active: true });
const edge = (id, from, to) => ({ id, from_node: from, to_node: to, relation_type: "contains", metadata: {}, created_at: "2026-10-01T10:00:00Z" });

function world() {
  return {
    topic_cards_public: [
      card("plain-a", "n1"), card("plain-b", "n2"), card("no-node", null), card("ghost-node", "n-missing"), card("wrong-type", "n-wt"),
      card("tzvi-conv-613", "n3"),                                  // pre-migration row: requested by NEW slug, stored under OLD slug
      card("613-hashem-elohai-yisrael", "n3b"), card("tzvi-conv-620", "n4"),
      card("tzvi-conv-996", "n5"), card("996-tishmerun", "n5b"),     // both rows present: canonical wins
      card("shared-target", "n6"),
    ],
    nodes: [
      node("n1"), node("n2"), node("n3"), node("n3b"), node("n4"), node("n5"), node("n5b"), node("n6"),
      node("n-wt", { type: "number" }),
      target("t1", "18"), target("t2", "20"), target("t3", "1820"), target("t4", "42"),
    ],
    edges: [edge("e1", "n1", "t1"), edge("e2", "n1", "t2"), edge("e3", "n1", "t-gone"), edge("e4", "n2", "t3"), edge("e5", "n3", "t1"),
      edge("e6", "n3b", "t4"), edge("e7", "n6", "t3"), edge("e8", "n6", "t1"), edge("e9", "n5", "t2"), edge("e10", "n5b", "t3")],
  };
}

const LIST = ["plain-a", "plain-b", "no-node", "ghost-node", "wrong-type", "613-hashem-elohai-yisrael", "tzvi-conv-620", "996-tishmerun", "tzvi-conv-996",
  "shared-target", "does-not-exist", "", null, undefined, "plain-a", "  plain-b  "];

test("batched findings equal the per-slug findings for every case (aliases, missing node/card, shared targets, duplicates, blanks)", async () => {
  const restore = install(world(), []);
  try {
    const single = await Promise.all(LIST.map((slug) => fetchCanonicalTopicConvergenceFinding(slug)));
    const batched = await fetchCanonicalTopicConvergenceFindings(LIST);
    assert.equal(batched.length, LIST.length);
    assert.deepEqual(stableAll(batched), stableAll(single));
    assert.ok(single.filter(Boolean).length >= 9, "fixture must exercise real findings");
    assert.equal(batched[LIST.indexOf("does-not-exist")], null);
    assert.equal(batched[LIST.indexOf("")], null);
  } finally { restore(); }
});

test("7 cards (number 1820) cost 4 requests batched versus 28 per slug", async () => {
  const slugs = ["plain-a", "plain-b", "tzvi-conv-613", "tzvi-conv-620", "tzvi-conv-996", "shared-target", "no-node"];
  const singleLog = [], batchLog = [];
  let restore = install(world(), singleLog);
  try { await Promise.all(slugs.map((slug) => fetchCanonicalTopicConvergenceFinding(slug))); } finally { restore(); }
  restore = install(world(), batchLog);
  try { await fetchCanonicalTopicConvergenceFindings(slugs); } finally { restore(); }
  assert.equal(batchLog.length, 4);
  assert.deepEqual(batchLog.map((q) => q.table), ["topic_cards_public", "nodes", "edges", "nodes"]);
  assert.ok(singleLog.length >= 20, `per-slug path issued ${singleLog.length}`);
  assert.ok(batchLog.length * 5 <= singleLog.length);
});

test("large lists are chunked, never one oversized request", async () => {
  const tables = { topic_cards_public: [], nodes: [], edges: [] };
  for (let i = 0; i < 100; i += 1) {
    tables.topic_cards_public.push(card(`bulk-${i}`, `bn${i}`));
    tables.nodes.push(node(`bn${i}`), target(`bt${i}`, String(i)));
    tables.edges.push(edge(`be${i}`, `bn${i}`, `bt${i}`));
  }
  const log = [];
  const restore = install(tables, log);
  const slugs = tables.topic_cards_public.map((c) => c.slug);
  let batched, batchRequests;
  try {
    batched = await fetchCanonicalTopicConvergenceFindings(slugs);
    batchRequests = log.slice();
    const single = await Promise.all(slugs.map((slug) => fetchCanonicalTopicConvergenceFinding(slug)));
    assert.deepEqual(stableAll(batched), stableAll(single));
  } finally { restore(); }
  const perTable = (table) => batchRequests.filter((q) => q.table === table).length;
  assert.equal(perTable("topic_cards_public"), 3, "40 + 40 + 20 slugs");
  assert.equal(perTable("edges"), 3, "40 + 40 + 20 nodes");
  assert.equal(batchRequests.filter((q) => q.table === "nodes").length, 3 + 1, "3 convergence-node chunks + 1 target chunk of 100");
  assert.equal(batchRequests.length, 10);
  assert.ok(batchRequests.every((q) => q.filters.every(([, , value]) => !Array.isArray(value) || value.length <= 100)));
});

test("a possibly truncated edge page falls back to the per-slug path and still returns the same findings", async () => {
  const w = world();
  for (let i = 0; i < 1000; i += 1) w.edges.push(edge(`big-${i}`, "n2", i % 2 ? "t1" : "t2"));
  const log = [];
  const restore = install(w, log);
  try {
    const slugs = ["plain-a", "plain-b"];
    const single = await Promise.all(slugs.map((slug) => fetchCanonicalTopicConvergenceFinding(slug)));
    const before = log.length;
    const batched = await fetchCanonicalTopicConvergenceFindings(slugs);
    assert.deepEqual(stableAll(batched), stableAll(single));
    assert.ok(log.length - before > 4, "fell back to per-slug reads");
  } finally { restore(); }
});

test("a failing stage rejects the whole list like Promise.all over the single-slug reads", async () => {
  for (const failing of ["topic_cards_public", "edges"]) {
    const restore = install(world(), [], { fail: failing });
    try {
      await assert.rejects(() => fetchCanonicalTopicConvergenceFindings(["plain-a", "plain-b"]));
      await assert.rejects(() => Promise.all(["plain-a", "plain-b"].map((slug) => fetchCanonicalTopicConvergenceFinding(slug))));
    } finally { restore(); }
  }
});

test("an empty or blank list makes no request", async () => {
  const log = [];
  const restore = install(world(), log);
  try {
    assert.deepEqual(await fetchCanonicalTopicConvergenceFindings([]), []);
    assert.deepEqual(await fetchCanonicalTopicConvergenceFindings([null, "", "  "]), [null, null, null]);
    assert.deepEqual(await fetchCanonicalTopicConvergenceFindings(undefined), []);
  } finally { restore(); }
  assert.equal(log.length, 0);
});
