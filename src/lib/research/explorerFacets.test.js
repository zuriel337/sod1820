// Tests for the Explorer v1 facet registry — run with:
//   node --test src/lib/research/explorerFacets.test.js
// Pure functions only (no supabase/network) — EXPLORER_FACETS, its per-facet toCard mappers, and
// normalizePageResult are all plain data/pure logic; fetchExplorerFacetPage's network call is not
// exercised here, matching this codebase's existing pure/thin-wrapper testing convention.
// UNIVERSAL_EXPLORER_V1_SLICE2_SHELL_AND_FACET_COMPOSITION (work_log dispatch 0b70e0f9).

import { test } from "node:test";
import assert from "node:assert/strict";
import { EXPLORER_FACETS, getExplorerFacet, normalizePageResult } from "./explorerFacets.js";
import { EXPLORER_LIST_MODE_TYPES } from "./entityHubProjection.js";

// ── Route-guard invariant: the UI registry cannot drift from what the reader allows ───────────

test("route guard: every node-backed facet key is drawn from EXPLORER_LIST_MODE_TYPES itself, not a hand-copied list", () => {
  const nodeFacetKeys = EXPLORER_FACETS.filter(f => f.key !== "topic" && f.key !== "book").map(f => f.key);
  assert.deepEqual([...nodeFacetKeys].sort(), [...EXPLORER_LIST_MODE_TYPES].sort());
});

test("route guard: exactly 10 facets total (8 node types + topic + book), no empty-registry type ever included", () => {
  assert.equal(EXPLORER_FACETS.length, 10);
  const keys = EXPLORER_FACETS.map(f => f.key);
  assert.ok(keys.includes("topic") && keys.includes("book"));
  for (const emptyType of ["verse", "name", "person", "place", "object", "research", "fieldmap", "relationship"]) {
    assert.ok(!keys.includes(emptyType), `${emptyType} must never appear as a facet — zero real nodes`);
  }
  for (const nonFacetType of ["rule", "post", "image", "contribution", "convergence"]) {
    assert.ok(!keys.includes(nonFacetType), `${nonFacetType} is a real node family but not a v1 Explorer facet`);
  }
});

test("getExplorerFacet: returns the exact facet for a known key, null for unknown/empty", () => {
  assert.equal(getExplorerFacet("number")?.key, "number");
  assert.equal(getExplorerFacet("topic")?.key, "topic");
  assert.equal(getExplorerFacet("verse"), null);
  assert.equal(getExplorerFacet("rule"), null);
  assert.equal(getExplorerFacet(""), null);
  assert.equal(getExplorerFacet(), null);
});

// ── Card normalization: minimal, identity-only, correct hrefs into EXISTING routes only ───────

test("number facet cards link to the canonical public /number/:value page, not the internal hub", () => {
  const card = getExplorerFacet("number").toCard({ id: "n1", label: "1111", description: "  " });
  assert.equal(card.href, "/number/1111");
  assert.equal(card.facet, "number");
  assert.equal(card.sub, null, "blank/whitespace-only description normalizes to null, not an empty string");
});

test("other node-backed facets (no public route_pattern) link to the existing internal entity-hub-preview, keyed by identity_key when present else label", () => {
  const withIdentity = getExplorerFacet("entity").toCard({ id: "e1", label: "שם", identity_key: "gw:abc", description: "תיאור קצר" });
  assert.equal(withIdentity.href, `/entity-hub-preview/entity/${encodeURIComponent("gw:abc")}`);
  assert.equal(withIdentity.sub, "תיאור קצר");
  const withoutIdentity = getExplorerFacet("event").toCard({ id: "ev1", label: "אירוע" });
  assert.equal(withoutIdentity.href, `/entity-hub-preview/event/${encodeURIComponent("אירוע")}`);
});

test("topic facet cards link to the existing canonical /topic/:slug page", () => {
  const card = getExplorerFacet("topic").toCard({ id: "t1", slug: "tzvi-conv-1111", title: "1111", subtitle: "כותרת-משנה" });
  assert.equal(card.href, "/topic/tzvi-conv-1111");
  assert.equal(card.label, "1111");
  assert.equal(card.sub, "כותרת-משנה");
});

test("book facet cards link to /book/:slug when the node carries one, else the bare /book index — never a fabricated slug", () => {
  const withSlug = getExplorerFacet("book").toCard({ id: "b1", label: "ספר א", metadata: { slug: "sefer-a" }, description: "תיאור" });
  assert.equal(withSlug.href, "/book/sefer-a");
  const withoutSlug = getExplorerFacet("book").toCard({ id: "b2", label: "ספר ב", metadata: {} });
  assert.equal(withoutSlug.href, "/book");
});

test("a long description is truncated with an ellipsis; a short one passes through unchanged", () => {
  const long = "א".repeat(200);
  const card = getExplorerFacet("word").toCard({ id: "w1", label: "מילה", description: long });
  assert.ok(card.sub.length <= 141);
  assert.ok(card.sub.endsWith("…"));
  const shortCard = getExplorerFacet("word").toCard({ id: "w2", label: "מילה", description: "קצר" });
  assert.equal(shortCard.sub, "קצר");
});

// ── normalizePageResult: reconciles fetchBookEntities' bare-array shape with the {rows,hasMore}
// shape the two Slice-1 list functions return, at the one seam where it matters ────────────────

test("normalizePageResult: bare array (fetchBookEntities' shape) infers hasMore from a full page", () => {
  const full = normalizePageResult([{ id: 1 }, { id: 2 }], 2);
  assert.deepEqual(full.rows, [{ id: 1 }, { id: 2 }]);
  assert.equal(full.hasMore, true, "a full page (rows.length >= limit) leaves open whether more exist");

  const partial = normalizePageResult([{ id: 1 }], 2);
  assert.equal(partial.hasMore, false, "fewer rows than the requested limit means this was the last page");
});

test("normalizePageResult: {rows,hasMore} object shape (the Slice-1 list functions) passes through unchanged", () => {
  const result = normalizePageResult({ rows: [{ id: 1 }], hasMore: true }, 24);
  assert.deepEqual(result, { rows: [{ id: 1 }], hasMore: true });
});

test("normalizePageResult: null/undefined input never throws, returns an empty page", () => {
  assert.deepEqual(normalizePageResult(null, 24), { rows: [], hasMore: false });
  assert.deepEqual(normalizePageResult(undefined, 24), { rows: [], hasMore: false });
});
