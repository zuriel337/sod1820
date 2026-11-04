import {
  PUBLIC_WORLD_CONTENT_PROJECTION_CONTRACT_VERSION,
  composePublicWorldContentProjectionPagesV1,
} from "./publicWorldContentProjectionV1.js";

const clean = (value) => value == null ? "" : String(value).trim();
const unique = (values) => [...new Set(values.filter(Boolean))];

function landingSection(key, label, coverage, total, extra = {}) {
  return Object.freeze({
    key,
    label,
    available: coverage?.available === true,
    total: coverage?.available === true ? total : null,
    ...extra,
  });
}

/**
 * Read-only screen model for the next World landing surface.
 *
 * It deliberately composes only material pages that a visitor has already
 * requested. The people index is lightweight and global; source/finding totals
 * remain unknown until their existing public readers actually supplied a page.
 * This prevents a new landing page from reintroducing an eager N+1 catalogue
 * load merely to display a large number.
 */
export function buildWorldUnifiedPublicContentLanding({ peopleIndex = null, contentPages = [] } = {}) {
  const suppliedPages = (Array.isArray(contentPages) ? contentPages : [])
    .filter((page) => page?.contractVersion === PUBLIC_WORLD_CONTENT_PROJECTION_CONTRACT_VERSION);
  const content = composePublicWorldContentProjectionPagesV1(suppliedPages);
  const people = Array.isArray(peopleIndex?.people) ? peopleIndex.people : [];
  const contributorSlugs = unique(content.sources.map((source) => clean(source?.contributor?.slug)));
  const sections = Object.freeze([
    landingSection("people", "אנשים ציבוריים", { available: Boolean(peopleIndex) }, people.length),
    landingSection("sources", "מקורות", content.coverage.sources, content.metrics.corpusSources),
    landingSection("series", "סדרות וקטגוריות", content.coverage.seriesCategories, content.metrics.seriesCategories),
    landingSection("findings", "ממצאים", content.coverage.findings, content.metrics.findings),
    landingSection("tree", "חיבורים מתועדים לעץ", content.coverage.treeRelations, content.metrics.treeRelations),
    landingSection("legacy-topics", "נושאים קיימים", content.coverage.legacyTopics, content.metrics.legacyTopics, {
      compatibilityOnly: true,
    }),
  ]);
  return Object.freeze({
    contractVersion: PUBLIC_WORLD_CONTENT_PROJECTION_CONTRACT_VERSION,
    people: Object.freeze({
      available: Boolean(peopleIndex),
      total: peopleIndex ? people.length : null,
      rows: Object.freeze(people),
    }),
    content,
    supplied: Object.freeze({
      contentPages: suppliedPages.length,
      contributorSlugs: Object.freeze(contributorSlugs),
      completeCorpus: false,
      rule: "No source, finding or relation total is presented as global before its canonical public pages were actually supplied.",
    }),
    sections,
  });
}
