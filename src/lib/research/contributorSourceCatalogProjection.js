import {
  CONTRIBUTOR_LOAD_PROFILE,
  fetchContributorFindingsProjection,
  readableSourceTitle,
} from "./contributorFindingsProjection.js";
import { buildContributorSourceResearchFacets } from "./contributorSourceResearchFacets.js";
import { contributorSourceLocator } from "./worldContributorSourceLocator.js";

const clean = (value) => value == null ? "" : String(value).trim();
const uniq = (values) => [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
const PLACEHOLDER_SOURCE_COPY = new Set(["📷 עדכון", "🎬 עדכון וידאו", "עדכון", "מקור ללא טקסט"]);
const VIDEO_URL_RE = /\.(?:mp4|mov|webm|m4v)(?:[?#]|$)/iu;

export const CONTRIBUTOR_SOURCE_FORMAT = Object.freeze({
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  EXTERNAL_LINK: "external_link",
  PAIRED_MEDIA: "paired_media",
});

export const CONTRIBUTOR_SOURCE_CATALOG_STATE = Object.freeze({
  EXPLICIT_TOPICS: "explicit_topics",
  UNCATALOGUED: "uncatalogued",
});

function sourceOccurrences(group) {
  const occurrences = Array.isArray(group?.sourceOccurrences) && group.sourceOccurrences.length
    ? group.sourceOccurrences
    : [group?.source, group?.mediaSource];
  const seen = new Set();
  return occurrences.filter((source) => {
    const key = clean(source?.sourceRef) || clean(source?.id);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readableText(source) {
  const text = clean(source?.text);
  return text && !PLACEHOLDER_SOURCE_COPY.has(text) ? text : null;
}

function sourceMedia(source) {
  const url = clean(source?.imageUrl || source?.thumbUrl);
  if (!url) return null;
  return {
    url,
    type: VIDEO_URL_RE.test(url) ? CONTRIBUTOR_SOURCE_FORMAT.VIDEO : CONTRIBUTOR_SOURCE_FORMAT.IMAGE,
    thumbUrl: clean(source?.thumbUrl) || null,
  };
}

function sourceCatalogItem(group, slug, { researchDeferred = false } = {}) {
  const occurrences = sourceOccurrences(group);
  const primary = group?.source || occurrences.find((source) => readableText(source)) || occurrences[0] || null;
  const text = readableText(primary) || occurrences.map(readableText).find(Boolean) || null;
  const media = sourceMedia(group?.mediaSource)
    || sourceMedia(primary)
    || occurrences.map(sourceMedia).find(Boolean)
    || null;
  const linkUrl = clean(primary?.linkUrl)
    || occurrences.map((source) => clean(source?.linkUrl)).find(Boolean)
    || null;
  const sourceTopics = uniq(occurrences.flatMap((source) => source?.topics || []));
  const formats = [];
  if (text) formats.push(CONTRIBUTOR_SOURCE_FORMAT.TEXT);
  if (media) formats.push(media.type);
  if (linkUrl) formats.push(CONTRIBUTOR_SOURCE_FORMAT.EXTERNAL_LINK);
  if (group?.mediaPair) formats.push(CONTRIBUTOR_SOURCE_FORMAT.PAIRED_MEDIA);
  const catalogState = sourceTopics.length
    ? CONTRIBUTOR_SOURCE_CATALOG_STATE.EXPLICIT_TOPICS
    : CONTRIBUTOR_SOURCE_CATALOG_STATE.UNCATALOGUED;
  const locator = contributorSourceLocator(group?.sourceRef, { slug });

  return Object.freeze({
    id: clean(group?.id || group?.sourceRef),
    sourceRef: clean(group?.sourceRef),
    title: clean(group?.title) || readableSourceTitle(primary),
    text,
    createdAt: group?.createdAt || primary?.createdAt || null,
    publicationState: group?.publicationState || primary?.status || null,
    credit: clean(primary?.credit) || null,
    channel: clean(primary?.channel) || null,
    sourceName: clean(primary?.source) || null,
    sourceTopics,
    catalogState,
    semanticCategories: sourceTopics,
    formats: uniq(formats),
    media,
    linkUrl,
    locator,
    href: locator.href,
    exactLocator: locator.exact,
    sourceRecordCount: Number(group?.sourceRecordCount || occurrences.length || 1),
    linkedSourceRefs: uniq([
      ...(Array.isArray(group?.linkedSourceRefs) ? group.linkedSourceRefs : []),
      ...occurrences.map((source) => source?.sourceRef),
    ]),
    mediaPair: group?.mediaPair || null,
    researchFacets: buildContributorSourceResearchFacets(group?.rows, { deferred: researchDeferred }),
    evidence: Object.freeze({
      categoryBasis: sourceTopics.length ? "channel_updates.topics" : null,
      mediaBasis: media ? (group?.mediaPair?.basis || "source_media_url") : null,
      sourceOccurrenceRefs: uniq(occurrences.map((source) => source?.sourceRef)),
    }),
  });
}

function compareNewestStable(left, right) {
  const dateOrder = clean(right?.createdAt).localeCompare(clean(left?.createdAt));
  return dateOrder || clean(left?.sourceRef).localeCompare(clean(right?.sourceRef));
}

/**
 * Writer/source-home catalog built only from the canonical contributor source projection.
 *
 * It is intentionally format-first and conservative: a semantic category exists only when the
 * source row carries an explicit topic. Language, cipher, gematria, spatial and tree claims must
 * be added by a structured exact-occurrence enrichment, never inferred from free text here.
 */
export function buildContributorSourceCatalogProjection(sourceProjection, { recentLimit = 20 } = {}) {
  if (!sourceProjection?.contributor?.slug) return null;
  const researchDeferred = sourceProjection?.loadState?.researchObjectsDeferred === true;
  const items = (Array.isArray(sourceProjection.sourceGroups) ? sourceProjection.sourceGroups : [])
    .map((group) => sourceCatalogItem(group, sourceProjection.contributor.slug, { researchDeferred }))
    .sort(compareNewestStable);
  const boundedRecentLimit = Math.max(0, Math.min(100, Number(recentLimit) || 20));
  const count = (predicate) => items.filter(predicate).length;

  return Object.freeze({
    contributor: sourceProjection.contributor,
    items,
    recentItems: items.slice(0, boundedRecentLimit),
    counts: Object.freeze({
      sourceRecords: Number(sourceProjection?.counts?.sourceRecords || 0),
      publications: items.length,
      withText: count((item) => item.formats.includes(CONTRIBUTOR_SOURCE_FORMAT.TEXT)),
      withImages: count((item) => item.formats.includes(CONTRIBUTOR_SOURCE_FORMAT.IMAGE)),
      withVideo: count((item) => item.formats.includes(CONTRIBUTOR_SOURCE_FORMAT.VIDEO)),
      withExternalLinks: count((item) => item.formats.includes(CONTRIBUTOR_SOURCE_FORMAT.EXTERNAL_LINK)),
      pairedMediaPublications: count((item) => item.formats.includes(CONTRIBUTOR_SOURCE_FORMAT.PAIRED_MEDIA)),
      explicitlyTopicTagged: count((item) => item.catalogState === CONTRIBUTOR_SOURCE_CATALOG_STATE.EXPLICIT_TOPICS),
      uncatalogued: count((item) => item.catalogState === CONTRIBUTOR_SOURCE_CATALOG_STATE.UNCATALOGUED),
    }),
    filters: Object.freeze({
      chronological: ["newest"],
      formats: Object.values(CONTRIBUTOR_SOURCE_FORMAT),
      catalogStates: Object.values(CONTRIBUTOR_SOURCE_CATALOG_STATE),
      explicitTopics: uniq(items.flatMap((item) => item.sourceTopics)).sort((a, b) => a.localeCompare(b, "he")),
    }),
    availability: sourceProjection.availability || null,
    loadState: sourceProjection.loadState || null,
    researchState: sourceProjection?.loadState?.researchObjectsDeferred ? "deferred_until_exact_occurrence" : "loaded",
    truthBoundary: "Source format and explicit topic tags are catalog axes, not truth, strength, verification or Topic admission.",
    categoryPolicy: "Semantic categories are emitted only from structured source topics. Rich research facets require exact-occurrence enrichment.",
  });
}

export async function fetchContributorSourceCatalogProjection(slug, {
  findingsReader = fetchContributorFindingsProjection,
  recentLimit = 20,
  ...readerOptions
} = {}) {
  const projection = await findingsReader(slug, {
    ...readerOptions,
    loadProfile: CONTRIBUTOR_LOAD_PROFILE.SOURCE_LIBRARY,
  });
  return buildContributorSourceCatalogProjection(projection, { recentLimit });
}

export default fetchContributorSourceCatalogProjection;
