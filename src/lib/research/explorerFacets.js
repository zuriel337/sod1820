import {
  fetchEntityListByType,
  EXPLORER_LIST_MODE_TYPES,
} from "./entityHubProjection.js";
import { fetchCanonicalTopicConvergenceFinding, fetchTopicCardList } from "./topicConvergence.js";
import { fetchBookEntities } from "./bookResearchProjection.js";
import { topicRankMeta, neutralRankMeta } from "./explorerRanking.js";

// ── UNIVERSAL_EXPLORER_V1_SLICE2_SHELL_AND_FACET_COMPOSITION (work_log dispatch 0b70e0f9) ──
// The v1 facet registry: ONE list of what the Explorer shell may browse, each entry pairing an
// EXISTING Slice-1 reader with a pure card-normalizer. This file coordinates readers — it owns
// no data, computes no truth, and fetches nothing beyond what the Explorer projection needs.
//
// Route-guard invariant (tested): the node-type facet keys below are EXACTLY
// EXPLORER_LIST_MODE_TYPES, imported from the reader itself — the UI cannot drift from what
// fetchEntityListByType actually allows, because it is not a second, hand-copied list.
//
// Empty registry-only entity_types (verse/name/person/place/object/research/fieldmap/
// relationship — 0 real nodes per audit 77d82836 / reality_graph_law v4) are absent from this
// registry entirely, not merely hidden.

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
    refId: type === "number" ? row.label : (row.identity_key || row.label || String(row.id)),
    // Slice 5: no safe list-level ranking signal is currently present for generic node facets.
    // Rank-Don't-Hide => neutral rank, preserving each canonical reader's deterministic order.
    rank: neutralRankMeta(`nodes:${type}:reader_default`),
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
    // Slice 5: meter_score is an existing public-safe convergence/evidence-strength signal.
    // It orders DISPLAY only; it is not verification, canonicality, publication, or access.
    rank: topicRankMeta(row),
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
    rank: neutralRankMeta("book:reader_default"),
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

// Slice 5 ranking contract:
// - topic: globally ordered server-side by existing public meter_score, then approved_at, then id.
// - all other facets: neutral rank until a safe bounded list-level signal already exists.
// Missing signal never hides or demotes truth; it only means "no ranking signal available yet".
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
    // Slice 5 correction (audit AFTER 6050377d): calls the SAME canonical Slice-1 topic-list
    // reader every other caller uses, with rankByMeterScore requesting the meter_score-first
    // order — not a forked second reader.
    fetchPage: (params) => fetchTopicCardList({ ...params, rankByMeterScore: true }),
    toCard: topicRowToCard,
    fetchDetail: (card) => fetchCanonicalTopicConvergenceFinding(card?.refId),
    // Slice 8 (UNIVERSAL_EXPLORER_V1_SLICE8_COMBINABLE_DIMENSION_FILTERS, work_log dispatch
    // 0302a83d): declares which combinable dimension filters THIS facet's reader actually
    // understands — the same optional-capability pattern fetchDetail already established above
    // (facetHasDetail), not a new global filter registry/store. Only topic owns `numbers` +
    // `occurred_at` today; every other facet has neither key here, so facetSupportsDimension
    // stays false for them and the UI never offers a filter a reader would silently ignore.
    dimensions: Object.freeze({ number: true, time: true }),
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

export function facetHasDetail(key) {
  return typeof getExplorerFacet(key)?.fetchDetail === "function";
}

// Slice 8: mirrors facetHasDetail's shape exactly — a facet without a `dimensions` descriptor,
// or without this specific key set true on it, simply doesn't support that filter. No facet is
// ever assumed to support a dimension; absence is the safe default.
export function facetSupportsDimension(key, dimension) {
  return Boolean(getExplorerFacet(key)?.dimensions?.[dimension]);
}

export async function fetchExplorerFacetDetail(facetKey, card) {
  const facet = getExplorerFacet(facetKey);
  if (!facet || typeof facet.fetchDetail !== "function") return null;
  return facet.fetchDetail(card);
}

export function normalizePageResult(raw, limit) {
  if (Array.isArray(raw)) return { rows: raw, hasMore: raw.length >= limit };
  return { rows: Array.isArray(raw?.rows) ? raw.rows : [], hasMore: Boolean(raw?.hasMore) };
}

/**
 * Fetches one page of one facet and normalizes it to the common card shape. Ranking is supplied
 * by the facet's reader/card adapter: topic is globally server-ranked; neutral facets preserve
 * their deterministic reader order. No client-side per-page resorting, so pagination cannot lie.
 *
 * `q` (UNIVERSAL_EXPLORER_V1_SLICE7_SEARCH_COMPOSITION, work_log dispatch c0612463) and
 * `number`/`from`/`to` (UNIVERSAL_EXPLORER_V1_SLICE8_COMBINABLE_DIMENSION_FILTERS, work_log
 * dispatch 0302a83d) are all passed straight through to the facet's own `fetchPage`, which
 * already forwards its params verbatim into the facet's canonical reader (fetchEntityListByType /
 * fetchTopicCardList / fetchBookEntities — see EXPLORER_FACETS above). This coordinator never
 * inspects any of them, never knows table names, and never filters a fetched page client-side —
 * each reader decides how (or whether) each param narrows its own bounded source-side query,
 * BEFORE pagination. A facet whose reader doesn't destructure `number`/`from`/`to` (every facet
 * but topic today) simply ignores them — harmless, no behavior change, no new coordinator logic
 * needed per-facet (facetSupportsDimension above is what keeps the UI honest about this, not this
 * function).
 */
export async function fetchExplorerFacetPage(facetKey, { q = null, number = null, from = null, to = null, limit = 24, offset = 0 } = {}) {
  const facet = getExplorerFacet(facetKey);
  if (!facet) return null;
  const raw = await facet.fetchPage({ q, number, from, to, limit, offset });
  const { rows, hasMore } = normalizePageResult(raw, limit);
  return { cards: rows.map(facet.toCard), hasMore };
}

// ── UNIVERSAL_EXPLORER_V1_SLICE3_RESEARCH_CONTEXT_REOPEN ──
// Slice 7 (UNIVERSAL_EXPLORER_V1_SLICE7_SEARCH_COMPOSITION, work_log dispatch c0612463) adds `q`
// as a THIRD first-class URL-state field, trimmed and normalized to null when empty — exactly
// reopenable/round-trippable through explorerUrlSearch below, same contract as facet/offset.
// Slice 8 (UNIVERSAL_EXPLORER_V1_SLICE8_COMBINABLE_DIMENSION_FILTERS, work_log dispatch
// 0302a83d) adds `number`/`from`/`to` the SAME way — explicit, stable, human-readable URL keys
// (not opaque JSON), trimmed strings only. This layer stays deliberately dumb: it does NOT
// validate a number is really numeric or a date is really a real date — that fail-closed
// validation lives at the single source of truth (topicConvergence.buildTopicListQuery), exactly
// where `q`'s own wildcard-stripping already lives, not duplicated here.
export function parseExplorerUrlState(searchParams, fallbackFacet) {
  const get = (key) => (typeof searchParams?.get === "function" ? searchParams.get(key) : searchParams?.[key]);
  const rawFacet = clean(get("facet"));
  const facet = getExplorerFacet(rawFacet) ? rawFacet : (fallbackFacet ?? null);
  const rawOffset = Number(get("offset"));
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;
  const q = clean(get("q")) || null;
  const number = clean(get("number")) || null;
  const from = clean(get("from")) || null;
  const to = clean(get("to")) || null;
  return { facet, offset, q, number, from, to };
}

export function explorerUrlSearch({ facet, offset = 0, q = null, number = null, from = null, to = null } = {}) {
  const params = new URLSearchParams();
  const safeFacet = clean(facet);
  if (safeFacet) params.set("facet", safeFacet);
  const safeQ = clean(q);
  if (safeQ) params.set("q", safeQ);
  const safeNumber = clean(number);
  if (safeNumber) params.set("number", safeNumber);
  const safeFrom = clean(from);
  if (safeFrom) params.set("from", safeFrom);
  const safeTo = clean(to);
  if (safeTo) params.set("to", safeTo);
  const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Math.floor(Number(offset))) : 0;
  if (safeOffset > 0) params.set("offset", String(safeOffset));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// ── UNIVERSAL_EXPLORER_V1_SLICE3_EXACT_REOPEN_CORRECTION ──
export function explorerReopenWindow(offset, pageSize = 24) {
  const safeOffset = Number.isFinite(Number(offset)) && Number(offset) > 0 ? Math.floor(Number(offset)) : 0;
  const safePageSize = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Math.floor(Number(pageSize)) : 24;
  return { offset: safeOffset, limit: safePageSize };
}

export function explorerCardSelection(card) {
  if (!card || !clean(card.refId)) return null;
  return { entityId: String(card.refId), entityType: clean(card.facet) };
}
