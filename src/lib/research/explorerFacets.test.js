// Tests for the Explorer v1 facet registry — run with:
//   node --test src/lib/research/explorerFacets.test.js
// Pure functions only (no supabase/network) — EXPLORER_FACETS, its per-facet toCard mappers, and
// normalizePageResult are all plain data/pure logic; fetchExplorerFacetPage's network call is not
// exercised here, matching this codebase's existing pure/thin-wrapper testing convention.
// UNIVERSAL_EXPLORER_V1_SLICE2_SHELL_AND_FACET_COMPOSITION (work_log dispatch 0b70e0f9).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EXPLORER_FACETS,
  getExplorerFacet,
  normalizePageResult,
  parseExplorerUrlState,
  explorerUrlSearch,
  replayLimitFor,
  explorerCardSelection,
  EXPLORER_REPLAY_MAX_LIMIT,
} from "./explorerFacets.js";
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

// ── Slice 3: card refId — the stable cross-surface reference a Research Context selection needs
// (never the row's own DB id, which for node rows is not stable/shareable across surfaces) ──────

test("refId: number card uses its label (the canonical /number/:value key), same as its href", () => {
  const card = getExplorerFacet("number").toCard({ id: "n1", label: "1111" });
  assert.equal(card.refId, "1111");
});

test("refId: other node cards prefer identity_key, fall back to label, then the DB id — never fabricated", () => {
  const withIdentity = getExplorerFacet("entity").toCard({ id: "e1", label: "שם", identity_key: "gw:abc" });
  assert.equal(withIdentity.refId, "gw:abc");
  const withoutIdentity = getExplorerFacet("event").toCard({ id: "ev1", label: "אירוע" });
  assert.equal(withoutIdentity.refId, "אירוע");
  const withNeither = getExplorerFacet("event").toCard({ id: "ev2" });
  assert.equal(withNeither.refId, "ev2");
});

test("refId: topic uses its slug, book uses its slug when present else the DB id", () => {
  const topic = getExplorerFacet("topic").toCard({ id: "t1", slug: "tzvi-conv-1111", title: "1111" });
  assert.equal(topic.refId, "tzvi-conv-1111");
  const bookWithSlug = getExplorerFacet("book").toCard({ id: "b1", label: "ספר א", metadata: { slug: "sefer-a" } });
  assert.equal(bookWithSlug.refId, "sefer-a");
  const bookNoSlug = getExplorerFacet("book").toCard({ id: "b2", label: "ספר ב", metadata: {} });
  assert.equal(bookNoSlug.refId, "b2");
});

// ── Slice 3: URL ⇄ {facet,offset} round-trip (UNIVERSAL_EXPLORER_V1_SLICE3_RESEARCH_CONTEXT_
// REOPEN, work_log dispatch ff9c3f2a) ────────────────────────────────────────────────────────────

test("parseExplorerUrlState: reads a known facet + a positive integer offset from URLSearchParams", () => {
  const state = parseExplorerUrlState(new URLSearchParams("facet=topic&offset=48"), "number");
  assert.deepEqual(state, { facet: "topic", offset: 48 });
});

test("parseExplorerUrlState: unknown/missing facet falls back to fallbackFacet; never throws", () => {
  assert.deepEqual(parseExplorerUrlState(new URLSearchParams("facet=rule&offset=10"), "number"), { facet: "number", offset: 10 });
  assert.deepEqual(parseExplorerUrlState(new URLSearchParams(""), "book"), { facet: "book", offset: 0 });
  assert.deepEqual(parseExplorerUrlState(undefined, "number"), { facet: "number", offset: 0 });
});

test("parseExplorerUrlState: negative/fractional/non-numeric offset clamps to 0, never NaN or negative", () => {
  assert.equal(parseExplorerUrlState(new URLSearchParams("offset=-5"), "number").offset, 0);
  assert.equal(parseExplorerUrlState(new URLSearchParams("offset=abc"), "number").offset, 0);
  assert.equal(parseExplorerUrlState(new URLSearchParams("offset=12.9"), "number").offset, 12);
  assert.equal(parseExplorerUrlState(new URLSearchParams("offset=Infinity"), "number").offset, 0);
});

test("parseExplorerUrlState: also accepts a plain object (not just URLSearchParams)", () => {
  assert.deepEqual(parseExplorerUrlState({ facet: "word", offset: "24" }, "number"), { facet: "word", offset: 24 });
});

test("explorerUrlSearch: page 1 (offset 0) omits offset entirely — clean root URL per facet", () => {
  assert.equal(explorerUrlSearch({ facet: "number", offset: 0 }), "?facet=number");
  assert.equal(explorerUrlSearch({ facet: "number" }), "?facet=number");
});

test("explorerUrlSearch: a positive offset is included; no facet + no offset yields an empty string", () => {
  assert.equal(explorerUrlSearch({ facet: "topic", offset: 48 }), "?facet=topic&offset=48");
  assert.equal(explorerUrlSearch({}), "");
});

test("explorerUrlSearch: negative/fractional offset clamps to a non-negative integer", () => {
  assert.equal(explorerUrlSearch({ facet: "book", offset: -5 }), "?facet=book");
  assert.equal(explorerUrlSearch({ facet: "book", offset: 12.9 }), "?facet=book&offset=12");
});

test("URL round-trip: parseExplorerUrlState(explorerUrlSearch(x)) reconstructs the same state", () => {
  for (const input of [{ facet: "number", offset: 0 }, { facet: "topic", offset: 48 }, { facet: "book", offset: 96 }]) {
    const qs = explorerUrlSearch(input);
    const parsed = parseExplorerUrlState(new URLSearchParams(qs), "number");
    assert.deepEqual(parsed, input);
  }
});

// ── Slice 3: replayLimitFor — one bounded request to reconstruct a deep-linked position ─────────

test("replayLimitFor: offset 0 replays exactly one page", () => {
  assert.equal(replayLimitFor(0, 24), 24);
  assert.equal(replayLimitFor(0), 24, "default pageSize is 24");
});

test("replayLimitFor: offset+pageSize is the replay size, up to the reader's own hard cap", () => {
  assert.equal(replayLimitFor(48, 24), 72);
  assert.equal(replayLimitFor(96, 24), EXPLORER_REPLAY_MAX_LIMIT, "clamped at 100 — never an unbounded read from a deep link");
  assert.equal(replayLimitFor(1000, 24), EXPLORER_REPLAY_MAX_LIMIT);
});

test("replayLimitFor: negative/fractional/non-finite offset or pageSize never inflates the request", () => {
  assert.equal(replayLimitFor(-5, 24), 24, "negative offset is not finite-positive, treated as 0");
  assert.equal(replayLimitFor(Infinity, 24), 24, "non-finite offset treated as 0, not an unbounded request");
  assert.equal(replayLimitFor(NaN, 24), 24);
  assert.equal(replayLimitFor(12.9, 24), 36, "fractional offset floors before adding");
  assert.equal(replayLimitFor(24, 0), 48, "non-positive pageSize falls back to the default 24, added to offset");
});

// ── Slice 3: explorerCardSelection — the Research Context selection a card resolves to ──────────

test("explorerCardSelection: entityId is the card's refId (not its DB id), entityType is the facet key", () => {
  const card = getExplorerFacet("number").toCard({ id: "n1", label: "1111" });
  assert.deepEqual(explorerCardSelection(card), { entityId: "1111", entityType: "number" });
});

test("explorerCardSelection: a card with no refId yields no selection — never fabricated", () => {
  assert.equal(explorerCardSelection({ facet: "number", refId: null }), null);
  assert.equal(explorerCardSelection({ facet: "number", refId: "" }), null);
  assert.equal(explorerCardSelection(null), null);
});
