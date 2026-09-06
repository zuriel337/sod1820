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
  });
}

function topicRowToCard(row) {
  return {
    id: String(row.id),
    facet: "topic",
    label: row.title || row.slug || "",
    sub: truncate(row.subtitle),
    href: `/topic/${encodeURIComponent(row.slug)}`,
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
