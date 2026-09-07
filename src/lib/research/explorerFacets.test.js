// Tests for the Explorer v1 facet registry — run with:
//   node --test src/lib/research/explorerFacets.test.js
// Pure functions only (no supabase/network) — EXPLORER_FACETS, its per-facet toCard mappers, and
// normalizePageResult are all plain data/pure logic. fetchExplorerFacetPage's real network path
// (a known facet + a reader call) is NOT exercised here, matching this codebase's existing
// pure/thin-wrapper testing convention — only its fail-closed unknown-facet short-circuit is
// (Slice 7), which never reaches the network.
// UNIVERSAL_EXPLORER_V1_SLICE2_SHELL_AND_FACET_COMPOSITION (work_log dispatch 0b70e0f9).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EXPLORER_FACETS,
  getExplorerFacet,
  normalizePageResult,
  parseExplorerUrlState,
  explorerUrlSearch,
  explorerReopenWindow,
  explorerCardSelection,
  facetHasDetail,
  facetSupportsDimension,
  fetchExplorerFacetDetail,
  fetchExplorerFacetPage,
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

// ── Slice 3: card refId — the reference a Research Context selection carries forward. The final
// DB-id fallback (when a node has neither identity_key nor label) is a last-resort TECHNICAL
// address only — not a claim that a bare DB id is a stable/canonical cross-surface identity
// (wording corrected per GPT challenge 8fc2d310, dispatch 3d04a64b) ────────────────────────────

test("refId: number card uses its label (the canonical /number/:value key), same as its href", () => {
  const card = getExplorerFacet("number").toCard({ id: "n1", label: "1111" });
  assert.equal(card.refId, "1111");
});

test("refId: other node cards prefer identity_key, fall back to label, then the DB id as a last-resort technical address", () => {
  const withIdentity = getExplorerFacet("entity").toCard({ id: "e1", label: "שם", identity_key: "gw:abc" });
  assert.equal(withIdentity.refId, "gw:abc");
  const withoutIdentity = getExplorerFacet("event").toCard({ id: "ev1", label: "אירוע" });
  assert.equal(withoutIdentity.refId, "אירוע");
  const withNeither = getExplorerFacet("event").toCard({ id: "ev2" });
  assert.equal(withNeither.refId, "ev2", "DB id used only because nothing else exists — not claimed as a stable identity");
});

test("refId: topic uses its slug, book uses its slug when present else the DB id as a last-resort technical address", () => {
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
  assert.deepEqual(state, { facet: "topic", offset: 48, q: null, number: null, from: null, to: null });
});

test("parseExplorerUrlState: unknown/missing facet falls back to fallbackFacet; never throws", () => {
  assert.deepEqual(parseExplorerUrlState(new URLSearchParams("facet=rule&offset=10"), "number"), { facet: "number", offset: 10, q: null, number: null, from: null, to: null });
  assert.deepEqual(parseExplorerUrlState(new URLSearchParams(""), "book"), { facet: "book", offset: 0, q: null, number: null, from: null, to: null });
  assert.deepEqual(parseExplorerUrlState(undefined, "number"), { facet: "number", offset: 0, q: null, number: null, from: null, to: null });
});

test("parseExplorerUrlState: negative/fractional/non-numeric offset clamps to 0, never NaN or negative", () => {
  assert.equal(parseExplorerUrlState(new URLSearchParams("offset=-5"), "number").offset, 0);
  assert.equal(parseExplorerUrlState(new URLSearchParams("offset=abc"), "number").offset, 0);
  assert.equal(parseExplorerUrlState(new URLSearchParams("offset=12.9"), "number").offset, 12);
  assert.equal(parseExplorerUrlState(new URLSearchParams("offset=Infinity"), "number").offset, 0);
});

test("parseExplorerUrlState: also accepts a plain object (not just URLSearchParams)", () => {
  assert.deepEqual(parseExplorerUrlState({ facet: "word", offset: "24" }, "number"), { facet: "word", offset: 24, q: null, number: null, from: null, to: null });
});

// ── Slice 7 (UNIVERSAL_EXPLORER_V1_SLICE7_SEARCH_COMPOSITION, work_log dispatch c0612463): `q` as
// a first-class URL-state field, same trim/round-trip discipline as facet/offset ─────────────────

test("parseExplorerUrlState: reads q, trimmed; absent/whitespace-only q normalizes to null", () => {
  assert.equal(parseExplorerUrlState(new URLSearchParams("facet=number&q=%20%D7%94%D7%AA%D7%92%D7%9C%D7%95%D7%AA%20"), "number").q, "התגלות");
  assert.equal(parseExplorerUrlState(new URLSearchParams("facet=number"), "number").q, null);
  assert.equal(parseExplorerUrlState(new URLSearchParams("facet=number&q=%20%20"), "number").q, null);
  assert.equal(parseExplorerUrlState(new URLSearchParams("facet=number&q=1237"), "number").q, "1237");
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

test("explorerUrlSearch: q is included when non-empty; empty/whitespace/null q omits it entirely", () => {
  const qs = explorerUrlSearch({ facet: "topic", offset: 24, q: "התגלות" });
  assert.equal(new URLSearchParams(qs).get("q"), "התגלות");
  assert.equal(explorerUrlSearch({ facet: "number", q: "" }), "?facet=number");
  assert.equal(explorerUrlSearch({ facet: "number", q: "   " }), "?facet=number");
  assert.equal(explorerUrlSearch({ facet: "number", q: null }), "?facet=number");
});

// ── Slice 8 (UNIVERSAL_EXPLORER_V1_SLICE8_COMBINABLE_DIMENSION_FILTERS, work_log dispatch
// 0302a83d): number/from/to as three MORE URL-state fields, same discipline as q ─────────────────

test("parseExplorerUrlState: reads number/from/to, trimmed; absent normalizes to null", () => {
  const state = parseExplorerUrlState(new URLSearchParams("facet=topic&number=1820&from=2020-01-01&to=2021-12-31"), "number");
  assert.equal(state.number, "1820");
  assert.equal(state.from, "2020-01-01");
  assert.equal(state.to, "2021-12-31");
  const empty = parseExplorerUrlState(new URLSearchParams("facet=topic"), "number");
  assert.equal(empty.number, null);
  assert.equal(empty.from, null);
  assert.equal(empty.to, null);
});

test("explorerUrlSearch: number/from/to are included when non-empty; empty/null omits each independently", () => {
  const qs = explorerUrlSearch({ facet: "topic", number: 1820, from: "2020-01-01", to: "2021-12-31" });
  assert.equal(qs, "?facet=topic&number=1820&from=2020-01-01&to=2021-12-31");
  assert.equal(explorerUrlSearch({ facet: "topic", number: "" }), "?facet=topic");
  assert.equal(explorerUrlSearch({ facet: "topic", from: null, to: undefined }), "?facet=topic");
  // Combinable: q + number + from all present together, to omitted
  const combined = explorerUrlSearch({ facet: "topic", q: "אור", number: 45, from: "2021-01-01" });
  assert.equal(combined, "?facet=topic&q=%D7%90%D7%95%D7%A8&number=45&from=2021-01-01");
});

test("URL round-trip: parseExplorerUrlState(explorerUrlSearch(x)) reconstructs the same state", () => {
  for (const input of [
    { facet: "number", offset: 0, q: null, number: null, from: null, to: null },
    { facet: "topic", offset: 48, q: null, number: null, from: null, to: null },
    { facet: "book", offset: 96, q: null, number: null, from: null, to: null },
    { facet: "number", offset: 0, q: "1237", number: null, from: null, to: null },
    { facet: "topic", offset: 24, q: "התגלות", number: null, from: null, to: null },
    { facet: "topic", offset: 0, q: null, number: "1820", from: null, to: null },
    { facet: "topic", offset: 0, q: null, number: null, from: "2020-01-01", to: "2021-12-31" },
    { facet: "topic", offset: 0, q: "אור", number: "45", from: "2016-01-01", to: "2022-01-01" },
  ]) {
    const qs = explorerUrlSearch(input);
    const parsed = parseExplorerUrlState(new URLSearchParams(qs), "number");
    assert.deepEqual(parsed, input);
  }
});

test("explorerUrlSearch: changing q alongside offset:0 is exactly reopenable together with facet", () => {
  const qs = explorerUrlSearch({ facet: "word", offset: 0, q: "אור" });
  assert.equal(qs, "?facet=word&q=%D7%90%D7%95%D7%A8");
  assert.deepEqual(parseExplorerUrlState(new URLSearchParams(qs), "number"), { facet: "word", offset: 0, q: "אור", number: null, from: null, to: null });
});

// ── Slice 3 CORRECTION (dispatch 3d04a64b, GPT challenge 8fc2d310): explorerReopenWindow ────────
// The prior replayLimitFor() capped a "replay from position 0" at 100 rows (the reader's own
// per-request hard cap) — so a URL/returnTo past offset≈76 silently reconstructed a TRUNCATED
// list while the URL still claimed the larger offset. explorerReopenWindow replaces it with
// PAGE-WINDOW semantics: reopening always fetches exactly ONE page's worth of rows starting at
// `offset`, so it is exact for ANY offset (including well past the old 100-row cap) with no hard
// cap needed at all — proven below at 120, 240 and 1000.

test("explorerReopenWindow: offset 0 is the first page window", () => {
  assert.deepEqual(explorerReopenWindow(0, 24), { offset: 0, limit: 24 });
  assert.deepEqual(explorerReopenWindow(0), { offset: 0, limit: 24 }, "default pageSize is 24");
});

test("explorerReopenWindow: the window is always exactly {offset,pageSize} — never larger, never accumulated from 0 — for offsets well past the old 100-row cap", () => {
  assert.deepEqual(explorerReopenWindow(48, 24), { offset: 48, limit: 24 });
  assert.deepEqual(explorerReopenWindow(120, 24), { offset: 120, limit: 24 }, "past the old cap: still one exact bounded page, not truncated");
  assert.deepEqual(explorerReopenWindow(240, 24), { offset: 240, limit: 24 }, "same for a much larger offset — one bounded request either way");
  assert.deepEqual(explorerReopenWindow(1000, 24), { offset: 1000, limit: 24 }, "no hard cap: the request size never grows with offset");
});

test("explorerReopenWindow: negative/fractional/non-finite offset or pageSize normalizes, never throws or inflates the request", () => {
  assert.deepEqual(explorerReopenWindow(-5, 24), { offset: 0, limit: 24 }, "negative offset is not finite-positive, treated as 0");
  assert.deepEqual(explorerReopenWindow(Infinity, 24), { offset: 0, limit: 24 }, "non-finite offset treated as 0, not an unbounded window");
  assert.deepEqual(explorerReopenWindow(NaN, 24), { offset: 0, limit: 24 });
  assert.deepEqual(explorerReopenWindow(12.9, 24), { offset: 12, limit: 24 }, "fractional offset floors");
  assert.deepEqual(explorerReopenWindow(240, 0), { offset: 240, limit: 24 }, "non-positive pageSize falls back to the default 24");
  assert.deepEqual(explorerReopenWindow(240, Infinity), { offset: 240, limit: 24 }, "non-finite pageSize falls back to the default 24 — window size never inflates");
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

// ── Slice 4 (UNIVERSAL_EXPLORER_V1_SLICE4_DETAIL_COMPOSITION_REUSE, work_log dispatch 6871d978):
// facetHasDetail / fetchExplorerFacetDetail — proves the "no fabricated detail" contract at the
// registry level: ONLY topic (which has a genuinely reusable adapter+component pair) gets an
// on-demand detail path; every node-backed facet and book stay route-only, exactly as the
// dispatch's own anticipated fallback requires. No network is exercised — fetchExplorerFacetDetail
// short-circuits to null before ever calling a facet's fetchDetail when there isn't one. ─────────

test("facetHasDetail: true only for topic — no other facet has a fabricated inline detail", () => {
  const withDetail = EXPLORER_FACETS.filter(f => facetHasDetail(f.key)).map(f => f.key);
  assert.deepEqual(withDetail, ["topic"]);
});

test("facetHasDetail: false for an unknown/empty key, never throws", () => {
  assert.equal(facetHasDetail("verse"), false);
  assert.equal(facetHasDetail(""), false);
  assert.equal(facetHasDetail(), false);
});

test("EXPLORER_FACETS: exactly one entry (topic) exposes a fetchDetail function; every other entry has none", () => {
  const withFetchDetail = EXPLORER_FACETS.filter(f => typeof f.fetchDetail === "function").map(f => f.key);
  assert.deepEqual(withFetchDetail, ["topic"]);
});

test("fetchExplorerFacetDetail: resolves to null for an unknown facet key — never throws, no network", async () => {
  assert.equal(await fetchExplorerFacetDetail("rule", { refId: "x" }), null);
  assert.equal(await fetchExplorerFacetDetail("", { refId: "x" }), null);
});

test("fetchExplorerFacetDetail: resolves to null for a real facet with no fetchDetail (e.g. number) — never fabricates one, no network", async () => {
  assert.equal(await fetchExplorerFacetDetail("number", { refId: "1111" }), null);
  assert.equal(await fetchExplorerFacetDetail("book", { refId: "sefer-a" }), null);
  assert.equal(await fetchExplorerFacetDetail("entity", { refId: "gw:abc" }), null);
});

// ── Slice 8 (UNIVERSAL_EXPLORER_V1_SLICE8_COMBINABLE_DIMENSION_FILTERS, work_log dispatch
// 0302a83d): facetSupportsDimension — mirrors facetHasDetail's "only topic, never fabricated"
// shape exactly, proving the UI can only ever offer a filter a reader truly understands ─────────

test("facetSupportsDimension: true only for topic's number/time — no other facet declares support it doesn't have", () => {
  const withNumber = EXPLORER_FACETS.filter(f => facetSupportsDimension(f.key, "number")).map(f => f.key);
  const withTime = EXPLORER_FACETS.filter(f => facetSupportsDimension(f.key, "time")).map(f => f.key);
  assert.deepEqual(withNumber, ["topic"]);
  assert.deepEqual(withTime, ["topic"]);
});

test("facetSupportsDimension: false for an unsupported dimension name, an unknown facet, or empty input — never throws", () => {
  assert.equal(facetSupportsDimension("topic", "method"), false, "topic never claimed a dimension it doesn't implement");
  assert.equal(facetSupportsDimension("number", "number"), false, "the node-backed 'number' FACET is not the same thing as the Slice-8 number DIMENSION filter");
  assert.equal(facetSupportsDimension("verse", "number"), false);
  assert.equal(facetSupportsDimension("", "number"), false);
  assert.equal(facetSupportsDimension(), false);
});

// ── Slice 7 (UNIVERSAL_EXPLORER_V1_SLICE7_SEARCH_COMPOSITION, work_log dispatch c0612463):
// fetchExplorerFacetPage stays fail-closed for an unsupported facet key even with a `q` present —
// getExplorerFacet(facetKey) short-circuits to null BEFORE any reader/network call is made, so
// this is exercisable with no supabase mock, same as the existing null-facet tests above ────────

test("fetchExplorerFacetPage: resolves to null for an unknown/empty facet key even with q set — never throws, no network, no silent fallback to another facet", async () => {
  assert.equal(await fetchExplorerFacetPage("verse", { q: "התגלות", limit: 24, offset: 0 }), null);
  assert.equal(await fetchExplorerFacetPage("rule", { q: "1237" }), null);
  assert.equal(await fetchExplorerFacetPage("", { q: "x" }), null);
});

test("fetchExplorerFacetPage: same fail-closed short-circuit holds with Slice-8 number/from/to set too — no network", async () => {
  assert.equal(await fetchExplorerFacetPage("verse", { number: "1820", from: "2020-01-01", to: "2021-01-01" }), null);
});
