import {
  fetchEntityListByType,
  EXPLORER_LIST_MODE_TYPES,
} from "./entityHubProjection.js";
import { fetchTopicCardList } from "./topicConvergence.js";
import { fetchBookEntities } from "./bookResearchProjection.js";

// ── UNIVERSAL_EXPLORER_V1_SLICE2_SHELL_AND_FACET_COMPOSITION (work_log dispatch 0b70e0f9) ──
// The v1 facet registry: ONE list of what the Explorer shell may browse, each entry pairing an
// EXISTING Slice-1 reader with a pure card-normalizer. This file coordinates readers — it owns
// no data, computes no truth, and fetches nothing beyond what Slice 1 already exposes. Card
// composition is deliberately minimal (identity + a short subtitle only); full detail stays a
// later slice, so a facet list never does a per-row Universal Finding/graph fetch (no N+1).
//
// Route-guard invariant (tested): the node-type facet keys below are EXACTLY
// EXPLORER_LIST_MODE_TYPES, imported from the reader itself — the UI cannot drift from what
// fetchEntityListByType actually allows, because it is not a second, hand-copied list.
//
// Empty registry-only entity_types (verse/name/person/place/object/research/fieldmap/
// relationship — 0 real nodes per audit 77d82836 / reality_graph_law v4) are absent from this
// registry entirely, not merely hidden — per Rank-Don't-Hide, an empty facet is not "ranked
// last", it does not exist as a browsable facet yet.

const HUB_ROUTE = "/entity-hub-preview";

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function truncate(text, max = 140) {
  const t = clean(text);
  return t.length > max ? `${t.slice(0, max).trim()}…` : t || null;
}

function hubHref(type, key) {
  return `${HUB_ROUTE}/${encodeURIComponent(type)}/${encodeURIComponent(key)}`;
}

// Node-backed facets with no dedicated public route (entity_types.route_pattern is null for all
// of these) link into the existing internal Entity Hub preview — the one generic per-entity view
// this codebase already has. `number` is the one node-backed facet with its own canonical public
// page (/number/:value, entity_types.route_pattern) and links there instead.
function nodeCardHref(type, row) {
  if (type === "number") return `/number/${encodeURIComponent(row.label)}`;
  return hubHref(type, row.identity_key || row.label);
}

function nodeRowToCard(type) {
  return (row) => ({
    id: String(row.id),
    facet: type,
    label: row.label || "",
    sub: truncate(row.description),
    href: nodeCardHref(type, row),
    // refId: the identity a Research Context selection can carry forward (number → its value,
    // as nodeCardHref already routes on; anything else → identity_key, falling back to label —
    // the same precedence nodeCardHref itself uses for the hub link).
    refId: type === "number" ? row.label : (row.identity_key || row.label || String(row.id)),
  });
}

function topicRowToCard(row) {
  return {
    id: String(row.id),
    facet: "topic",
    label: row.title || row.slug || "",
    sub: truncate(row.subtitle),
    href: `/topic/${encodeURIComponent(row.slug)}`,
    refId: row.slug || String(row.id),
  };
}

function bookRowToCard(row) {
  const slug = clean(row?.metadata?.slug);
  return {
    id: String(row.id),
    facet: "book",
    label: row.label || "",
    sub: truncate(row.description),
    href: slug ? `/book/${encodeURIComponent(slug)}` : "/book",
    refId: slug || String(row.id),
  };
}

const NODE_FACET_LABELS = Object.freeze({
  number: "מספרים",
  entity: "ישויות",
  event: "אירועים",
  year: "שנים",
  word: "מילים",
  phrase: "ביטויים",
  foreign_word: "מילים לועזיות",
  language_bridge: "גשרי שפה",
});

// One registry entry per facet: { key, label, fetchPage(params) -> {rows,hasMore}, toCard(row) }.
export const EXPLORER_FACETS = Object.freeze([
  ...EXPLORER_LIST_MODE_TYPES.map((type) => Object.freeze({
    key: type,
    label: NODE_FACET_LABELS[type] || type,
    fetchPage: (params) => fetchEntityListByType({ ...params, type }),
    toCard: nodeRowToCard(type),
  })),
  Object.freeze({
    key: "topic",
    label: "התכנסויות",
    fetchPage: (params) => fetchTopicCardList(params),
    toCard: topicRowToCard,
  }),
  Object.freeze({
    key: "book",
    label: "ספרים",
    fetchPage: (params) => fetchBookEntities(params),
    toCard: bookRowToCard,
  }),
]);

export function getExplorerFacet(key) {
  const safeKey = clean(key);
  return EXPLORER_FACETS.find((f) => f.key === safeKey) || null;
}

// fetchBookEntities() returns a bare array (no hasMore), unlike the two Slice-1 list functions —
// this normalizes that difference at the one seam where it matters, without changing
// bookResearchProjection.js (reused as-is, per the Slice 1 "coordinate existing readers, don't
// force one storage path" instruction). hasMore is inferred the same way a caller of the bare
// array always could: exactly `limit` rows back leaves open whether more exist.
export function normalizePageResult(raw, limit) {
  if (Array.isArray(raw)) return { rows: raw, hasMore: raw.length >= limit };
  return { rows: Array.isArray(raw?.rows) ? raw.rows : [], hasMore: Boolean(raw?.hasMore) };
}

/**
 * Fetches one page of one facet and normalizes it to the common card shape. Returns
 * { cards, hasMore } or null for an unknown facet key — never throws on a bad key, never
 * fabricates a facet that isn't in the registry.
 */
export async function fetchExplorerFacetPage(facetKey, { limit = 24, offset = 0 } = {}) {
  const facet = getExplorerFacet(facetKey);
  if (!facet) return null;
  const raw = await facet.fetchPage({ limit, offset });
  const { rows, hasMore } = normalizePageResult(raw, limit);
  return { cards: rows.map(facet.toCard), hasMore };
}

// ── UNIVERSAL_EXPLORER_V1_SLICE3_RESEARCH_CONTEXT_REOPEN (work_log dispatch ff9c3f2a) ──
// Pure helpers only: URL ⇄ {facet,offset} round-trip, a bounded single-request "replay" limit for
// reopening a deep link past page 1, and the Research Context selection a facet/card resolves to.
// No new store, no network here — these just make the existing page-size accumulation exactly
// reconstructible from a URL, and exactly resumable from Research Context's flat dimensions bag
// (researchContext.js normalizeDimensions accepts only scalars/primitive-arrays per key — nested
// objects are silently dropped, so Explorer state lives as two flat keys, not one nested one).

export const EXPLORER_REPLAY_MAX_LIMIT = 100; // matches each reader's own hard cap (Slice 1)

/** Reads ?facet=&offset= from a URLSearchParams (or plain object). Unknown/invalid facet falls
 * back to fallbackFacet; offset is clamped to a non-negative integer, invalid → 0. Never throws. */
export function parseExplorerUrlState(searchParams, fallbackFacet) {
  const get = (key) => (typeof searchParams?.get === "function" ? searchParams.get(key) : searchParams?.[key]);
  const rawFacet = clean(get("facet"));
  const facet = getExplorerFacet(rawFacet) ? rawFacet : (fallbackFacet ?? null);
  const rawOffset = Number(get("offset"));
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;
  return { facet, offset };
}

/** Builds the ?facet=&offset= query string for a given state — offset omitted at 0 so the root
 * page-1 URL of any facet stays clean. Pure string building, no navigation. */
export function explorerUrlSearch({ facet, offset = 0 } = {}) {
  const params = new URLSearchParams();
  const safeFacet = clean(facet);
  if (safeFacet) params.set("facet", safeFacet);
  const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Math.floor(Number(offset))) : 0;
  if (safeOffset > 0) params.set("offset", String(safeOffset));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** How many rows to request in ONE bounded call to reconstruct the same accumulated card list a
 * user had reached at `offset` (i.e. offset+pageSize rows from position 0) — capped at the
 * reader's own hard limit so a deep link can never force an unbounded read. Non-finite/negative/
 * fractional input is treated as 0 (page 1). */
export function replayLimitFor(offset, pageSize = 24) {
  const safeOffset = Number.isFinite(Number(offset)) && Number(offset) > 0 ? Math.floor(Number(offset)) : 0;
  const safePageSize = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Math.floor(Number(pageSize)) : 24;
  return Math.min(EXPLORER_REPLAY_MAX_LIMIT, safeOffset + safePageSize);
}

/** The Research Context `selection` a facet card resolves to when the user leaves the Explorer
 * through it — entityId is the card's refId (never the internal `id`, which for node rows is a
 * DB id, not a stable cross-surface reference), entityType is the facet key. Returns null for a
 * card with no refId (never fabricates a selection). */
export function explorerCardSelection(card) {
  if (!card || !clean(card.refId)) return null;
  return { entityId: String(card.refId), entityType: clean(card.facet) };
}
