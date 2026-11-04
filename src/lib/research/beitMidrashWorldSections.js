import { filterWorldAllResearchRows } from "./worldAllResearchProjection.js";
import { isPublishedScope } from "./researchViewMode.js";

const clean = (value) => value == null ? "" : String(value).trim();
const PUBLIC_GOVERNANCE = new Set(["approved", "canonical"]);
const HTTP_URL = /^https?:\/\//i;

export const BEIT_MIDRASH_WORLD_SECTION = Object.freeze({
  CROSSES: "crosses",
  ATLAS: "atlas",
  CONVERGENCE: "convergence",
});

export const BEIT_MIDRASH_WORLD_AUDIENCE = Object.freeze({
  PUBLIC: "public",
  ADMIN: "admin",
});

const SECTION_FILTERS = Object.freeze({
  [BEIT_MIDRASH_WORLD_SECTION.CROSSES]: Object.freeze({ family: "research_object" }),
  [BEIT_MIDRASH_WORLD_SECTION.ATLAS]: Object.freeze({ family: "research_object", tree: "matched" }),
  [BEIT_MIDRASH_WORLD_SECTION.CONVERGENCE]: Object.freeze({ family: "research_object", meter: "metered" }),
});

function finiteOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cloneArray(value) {
  return Array.isArray(value) ? value.map((item) => (
    item && typeof item === "object" ? { ...item } : item
  )) : [];
}

function verifiedSourceHref(value) {
  const href = clean(value);
  return HTTP_URL.test(href) ? href : null;
}

function verifiedWorldFindingHref(value, sourceId, { allowAdmin = false } = {}) {
  const href = clean(value);
  const id = sourceIdOf({ sourceId });
  if (!href || !id || !href.startsWith("/world")) return null;
  try {
    const url = new URL(href, "https://sod1820.invalid");
    if (url.origin !== "https://sod1820.invalid" || url.pathname !== "/world") return null;
    if (!allowAdmin && url.searchParams.has("admin")) return null;
    if (url.searchParams.get("finding") !== id) return null;
    if (url.hash !== `#finding-${encodeURIComponent(id)}`) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function sourceIdOf(row) {
  return clean(row?.sourceId || row?.id).replace(/^research:/, "");
}

function projectAdminTriage(value) {
  if (!value || typeof value !== "object") return null;
  return {
    rank: finiteOrNull(value.rank),
    strength: clean(value.strength) || null,
    recommendation: clean(value.recommendation) || null,
    evidenceReason: clean(value.evidenceReason) || null,
    proposedTreeTarget: clean(value.proposedTreeTarget) || null,
    recommendedKeepId: clean(value.recommendedKeepId) || null,
    duplicateIds: cloneArray(value.duplicateIds).map(clean).filter(Boolean),
  };
}

export function beitMidrashWorldSectionHref(section, sourceId = null) {
  const safeSection = SECTION_FILTERS[section] ? section : BEIT_MIDRASH_WORLD_SECTION.CROSSES;
  const params = new URLSearchParams({ tab: safeSection });
  const id = sourceIdOf({ sourceId });
  if (id) params.set("finding", id);
  return `/beit-midrash?${params.toString()}${id ? `#finding-${encodeURIComponent(id)}` : ""}`;
}

function isPublicFinding(row) {
  return row?.family === "research_object"
    && isPublishedScope(row?.access)
    && PUBLIC_GOVERNANCE.has(clean(row?.status).toLowerCase());
}

function publicRows(rows) {
  // The public World reader and RLS remain the authority. This is a fail-closed
  // presentation boundary so a projection accidentally loaded with an admin
  // session cannot render candidate/private material in Beit Midrash.
  return rows.filter(isPublicFinding);
}

function projectFinding(row, { admin }) {
  const sourceId = sourceIdOf(row);
  const dto = {
    id: clean(row?.id) || (sourceId ? `research:${sourceId}` : null),
    sourceId: sourceId || null,
    statement: clean(row?.statement) || null,
    secondary: clean(row?.secondary) || null,
    kind: clean(row?.kind) || null,
    values: cloneArray(row?.values),
    sourceLabel: clean(row?.sourceLabel) || null,
    sourceRef: clean(row?.sourceRef) || null,
    sourceRefs: cloneArray(row?.sourceRefs).map(clean).filter(Boolean),
    sourceHref: verifiedSourceHref(row?.sourceHref),
    contributor: clean(row?.contributor) || null,
    createdAt: clean(row?.createdAt) || null,
    verification: clean(row?.verification) || null,
    status: clean(row?.status) || null,
    access: clean(row?.access) || null,
    confidence: finiteOrNull(row?.confidence),
    evidenceQuality: row?.evidenceQuality && typeof row.evidenceQuality === "object"
      ? { ...row.evidenceQuality }
      : null,
    independentSourceCount: finiteOrNull(row?.independentSourceCount),
    treeMatches: cloneArray(row?.treeMatches),
    linkedTopicRating: row?.linkedTopicRating && typeof row.linkedTopicRating === "object"
      ? { ...row.linkedTopicRating }
      : null,
    occurrenceCount: finiteOrNull(row?.occurrenceCount),
    occurrences: cloneArray(row?.occurrences),
    // World owns the canonical route. Beit Midrash only preserves a verified
    // upstream route and never constructs a finding URL from a locator or id.
    canonicalFindingHref: verifiedWorldFindingHref(
      row?.canonicalFindingHref,
      sourceId,
      { allowAdmin: admin },
    ),
  };

  if (admin) {
    dto.triage = projectAdminTriage(row?.triage);
  }
  return Object.freeze(dto);
}

function projectionRows(input) {
  if (Array.isArray(input?.rows)) return input.rows;
  if (Array.isArray(input?.projection?.rows)) return input.projection.rows;
  return [];
}

/**
 * Three Beit Midrash lenses over an already-loaded canonical World projection.
 *
 * This function intentionally performs no fetch. Public callers pass the World
 * public/RLS projection; admin callers pass `fetchWorldFindingReviewPage(...).projection`.
 * Dedup, ordering, Reality Graph matches and target ratings stay owned by World.
 */
export function buildBeitMidrashWorldSections(input, {
  audience = BEIT_MIDRASH_WORLD_AUDIENCE.PUBLIC,
} = {}) {
  const admin = audience === BEIT_MIDRASH_WORLD_AUDIENCE.ADMIN;
  const authorizedRows = admin ? projectionRows(input) : publicRows(projectionRows(input));
  const sections = {};

  for (const [section, filters] of Object.entries(SECTION_FILTERS)) {
    sections[section] = Object.freeze(
      filterWorldAllResearchRows(authorizedRows, filters)
        .map((row) => projectFinding(row, { admin })),
    );
  }

  return Object.freeze({
    audience: admin ? BEIT_MIDRASH_WORLD_AUDIENCE.ADMIN : BEIT_MIDRASH_WORLD_AUDIENCE.PUBLIC,
    sections: Object.freeze(sections),
    nonDestructiveDedup: input?.duplicateProjection?.nonDestructive
      ?? input?.projection?.duplicateProjection?.nonDestructive
      ?? null,
    source: "worldAllResearchProjection",
  });
}
