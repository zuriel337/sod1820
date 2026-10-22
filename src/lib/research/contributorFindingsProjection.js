import { supabase } from "../supabase.js";
import { getPublicResearchClient, PROJECTOR_MODE } from "./researchViewMode.js";
import { fetchTopicCardList } from "./topicConvergence.js";
import { researchObjectToUniversalFinding } from "./researchObjectFinding.js";
import { normalizeWorldAllResearchRow } from "./worldAllResearchProjection.js";
import { clusterWorldResearchRows } from "./worldFindingClusters.js";
import { channelUpdateOccurrenceId } from "./worldContributorSourceLocator.js";

const PAGE = 500;
const MAX = 5000;
const RESEARCH_PAGE = 1000;
export const MAX_CONTRIBUTOR_RESEARCH = 10000;
export const CONTRIBUTOR_LOAD_PROFILE = Object.freeze({
  FULL: "full",
  SOURCE_LIBRARY: "source_library",
});
const MAX_EXPLICIT_MEDIA_GAP_MS = 10 * 60 * 1000;
const MAX_STRUCTURED_MEDIA_GAP_MS = 5 * 60 * 1000;
const SOURCE_IMAGE_REFERENCE_RE = /\[Image\s+\d+\.(?:jpe?g|png|webp)\]/iu;

const clean = (value) => value == null ? "" : String(value).trim();
const uniq = (values) => [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
const placeholderSourceCopy = (value) => ["📷 עדכון", "עדכון", "מקור ללא טקסט"].includes(clean(value));
const postgrestQuoted = (value) => `"${clean(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function researchGroupSourceRef(row) {
  const sourceRef = clean(row?.source_ref) || `research_objects:${row?.id}`;
  return sourceRef.startsWith("channel_updates:") ? sourceRef.split("#", 1)[0] : sourceRef;
}

function safeDate(value) {
  const ms = Date.parse(value || "");
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

async function paged(loader, { pageSize = PAGE, max = MAX, concurrency = 1 } = {}) {
  const rows = [];
  const firstEnd = Math.min(pageSize - 1, max - 1);
  const first = await loader(0, firstEnd, true);
  if (first?.error) throw first.error;
  const total = first?.count == null ? null : Number(first.count);
  const firstPage = Array.isArray(first?.data) ? first.data : [];
  rows.push(...firstPage);

  if (firstPage.length >= pageSize && pageSize < max) {
    const ranges = [];
    const boundedEnd = Number.isFinite(total) ? Math.min(total, max) : max;
    for (let offset = pageSize; offset < boundedEnd; offset += pageSize) {
      ranges.push([offset, Math.min(offset + pageSize - 1, max - 1)]);
    }

    if (Number.isFinite(total) && concurrency > 1) {
      for (let index = 0; index < ranges.length; index += concurrency) {
        const results = await Promise.all(ranges.slice(index, index + concurrency)
          .map(([start, end]) => loader(start, end, false)));
        for (const result of results) {
          if (result?.error) throw result.error;
          rows.push(...(Array.isArray(result?.data) ? result.data : []));
        }
      }
    } else {
      for (const [start, end] of ranges) {
        const result = await loader(start, end, false);
        if (result?.error) throw result.error;
        const page = Array.isArray(result?.data) ? result.data : [];
        rows.push(...page);
        if (page.length < pageSize) break;
      }
    }
  }
  const knownTotal = Number.isFinite(total) ? total : rows.length;
  return { rows, total: knownTotal, truncated: knownTotal > rows.length };
}

export function deriveContributorGroupFacets(rows = [], sourceRow = null, topicLinks = []) {
  const facets = new Set(["source"]);
  const safeRows = Array.isArray(rows) ? rows : [];
  if (safeRows.some((row) => Number.isFinite(Number(row?.value)))) facets.add("number");
  if (safeRows.some((row) => Array.isArray(row?.terms) && row.terms.some(Boolean))) facets.add("phrase");
  if (safeRows.some((row) => clean(row?.kind) === "relation" || (Array.isArray(row?.relates) && row.relates.some(Boolean)))) facets.add("relation");
  const hasMedia = Boolean(
    clean(sourceRow?.image_url)
    || clean(sourceRow?.thumb_url)
    || safeRows.some((row) => clean(row?.meta?.ext?.wa_channel_intake?.media_ref))
  );
  if (hasMedia) facets.add("media");
  if (Array.isArray(topicLinks) && topicLinks.length) facets.add("topic");
  return [...facets];
}

function lexicalForTerms(terms, lexicalIndex) {
  const worlds = [];
  const tags = [];
  for (const term of uniq(terms)) {
    const row = lexicalIndex?.[term];
    if (!row) continue;
    if (clean(row.world)) worlds.push(clean(row.world));
    if (Array.isArray(row.tags)) tags.push(...row.tags.map(clean).filter(Boolean));
  }
  return { worlds: uniq(worlds), tags: uniq(tags) };
}

function sourceMeta(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    sourceRef: `channel_updates:${row.id}`,
    createdAt: row.created_at || null,
    status: clean(row.status) || null,
    channel: clean(row.channel) || null,
    source: clean(row.source) || null,
    credit: clean(row.credit || row.speaker) || null,
    text: clean(row.text) || null,
    imageUrl: clean(row.image_url) || null,
    thumbUrl: clean(row.thumb_url) || null,
    linkUrl: clean(row.link_url) || null,
  };
}

const PLACEHOLDER_SOURCE_COPY = new Set(["📷 עדכון", "🎬 עדכון וידאו", "עדכון", "מקור ללא טקסט"]);

export function readableSourceTitle(source, fallback = null) {
  const sourceText = clean(source?.text);
  if (sourceText && !PLACEHOLDER_SOURCE_COPY.has(sourceText)) {
    const first = sourceText.split(/\n+/).map(clean).find(Boolean);
    if (first) return first.slice(0, 110);
  }
  const media = clean(source?.imageUrl);
  if (media) return /\.(mp4|mov|webm|m4v)(?:[?#]|$)/i.test(media) ? "סרטון מהמקור" : "תמונה מהמקור";
  if (clean(source?.linkUrl)) return "קישור מהמקור";
  return clean(fallback) || "עדכון מהמקור";
}

function groupTitle(group) {
  const first = (group?.rows || []).find((row) => clean(row?.statement));
  return readableSourceTitle(group?.source, clean(first?.statement).slice(0, 110));
}

function topicKey(topic) {
  return clean(topic?.slug) || clean(topic?.id);
}

function sourceRefForMessage(row) {
  return row?.id ? `channel_updates:${row.id}` : null;
}

function sharedCount(left = [], right = []) {
  const leftSet = new Set((left || []).map((value) => clean(value)).filter(Boolean));
  const rightSet = new Set((right || []).map((value) => clean(value)).filter(Boolean));
  return [...leftSet].filter((value) => rightSet.has(value)).length;
}

function mergeCountMaps(left = {}, right = {}) {
  const merged = { ...left };
  for (const [key, value] of Object.entries(right || {})) merged[key] = (merged[key] || 0) + Number(value || 0);
  return merged;
}

function mergeSourceGroups(textGroup, imageGroup, mediaPair) {
  const rows = [...(textGroup.rows || []), ...(imageGroup.rows || [])]
    .filter((row, index, all) => row?.id && all.findIndex((candidate) => candidate?.id === row.id) === index);
  const universalFindings = [...(textGroup.universalFindings || []), ...(imageGroup.universalFindings || [])]
    .filter((finding, index, all) => finding?.id && all.findIndex((candidate) => candidate?.id === finding.id) === index);
  const sourceOccurrences = [imageGroup.source, textGroup.source].filter(Boolean);
  return {
    ...textGroup,
    rows,
    universalFindings,
    byKind: mergeCountMaps(textGroup.byKind, imageGroup.byKind),
    findingCount: rows.length,
    verifiedCount: rows.filter((row) => row?.engine_verified === true).length,
    terms: uniq([...(textGroup.terms || []), ...(imageGroup.terms || [])]),
    values: [...new Set([...(textGroup.values || []), ...(imageGroup.values || [])])].sort((a, b) => a - b),
    relates: uniq([...(textGroup.relates || []), ...(imageGroup.relates || [])]),
    mediaRefs: uniq([...(textGroup.mediaRefs || []), ...(imageGroup.mediaRefs || [])]),
    facets: uniq([...(textGroup.facets || []), ...(imageGroup.facets || []), "media"]),
    lexicalWorlds: uniq([...(textGroup.lexicalWorlds || []), ...(imageGroup.lexicalWorlds || [])]),
    lexicalTags: uniq([...(textGroup.lexicalTags || []), ...(imageGroup.lexicalTags || [])]),
    topicLinks: [...(textGroup.topicLinks || []), ...(imageGroup.topicLinks || [])]
      .filter((topic, index, all) => topic?.id && all.findIndex((candidate) => candidate?.id === topic.id) === index),
    mediaSource: imageGroup.source,
    sourceOccurrences,
    sourceRecordCount: sourceOccurrences.length,
    linkedSourceRefs: sourceOccurrences.map((source) => source.sourceRef).filter(Boolean),
    mediaPair,
  };
}

function uniqueSourceOccurrences(groups = []) {
  const seen = new Set();
  const occurrences = [];
  for (const group of groups.filter(Boolean)) {
    const sources = Array.isArray(group.sourceOccurrences) && group.sourceOccurrences.length
      ? group.sourceOccurrences
      : [group.source];
    for (const source of sources.filter(Boolean)) {
      const key = clean(source.sourceRef) || clean(source.id);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      occurrences.push(source);
    }
  }
  return occurrences;
}

function rebuildContributorSourceGroup(group, rows) {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const byKind = {};
  for (const row of safeRows) {
    const key = clean(row.kind) || "unknown";
    byKind[key] = (byKind[key] || 0) + 1;
  }
  const terms = uniq(safeRows.flatMap((row) => Array.isArray(row.terms) ? row.terms : []));
  const values = [...new Set(safeRows.map((row) => Number(row.value)).filter(Number.isFinite))].sort((a, b) => a - b);
  const relates = uniq(safeRows.flatMap((row) => Array.isArray(row.relates) ? row.relates : []));
  const mediaRefs = uniq(safeRows.map((row) => row?.meta?.ext?.wa_channel_intake?.media_ref));
  const facets = new Set(["source"]);
  if (values.length) facets.add("number");
  if (terms.length) facets.add("phrase");
  if (safeRows.some((row) => clean(row?.kind) === "relation" || (Array.isArray(row?.relates) && row.relates.some(Boolean)))) facets.add("relation");
  if (group.mediaSource || group.source?.imageUrl || group.source?.thumbUrl || mediaRefs.length) facets.add("media");
  if (Array.isArray(group.topicLinks) && group.topicLinks.length) facets.add("topic");

  const rebuilt = {
    ...group,
    rows: safeRows,
    universalFindings: safeRows
      .map((row) => researchObjectToUniversalFinding(row, { locale: "he" }))
      .filter(Boolean),
    byKind,
    findingCount: safeRows.length,
    verifiedCount: safeRows.filter((row) => row?.engine_verified === true).length,
    terms,
    values,
    relates,
    mediaRefs,
    facets: [...facets],
  };
  rebuilt.title = groupTitle(rebuilt);
  return rebuilt;
}

/**
 * Exact duplicate suppression for the contributor/source lens.
 *
 * This reuses the canonical World duplicate partition (same claim, kind, value,
 * access, governance and verification). Durable research/source rows are never
 * changed. The longest original statement remains visible, every occurrence is
 * attached for audit, and a source card is hidden only when all its findings
 * are duplicates of findings represented by one other source card.
 */
export function deduplicateContributorSourceGroups(sourceGroups = []) {
  const groups = Array.isArray(sourceGroups) ? sourceGroups.filter(Boolean) : [];
  const originalGroupByRef = new Map(groups.map((group) => [group.sourceRef, group]));
  const groupByFindingId = new Map();
  const normalizedRows = [];

  for (const group of groups) {
    for (const row of Array.isArray(group.rows) ? group.rows : []) {
      if (!row?.id) continue;
      const id = String(row.id);
      groupByFindingId.set(id, group);
      const normalized = normalizeWorldAllResearchRow(row, "research_object");
      if (normalized) normalizedRows.push(normalized);
    }
  }

  const duplicateProjection = clusterWorldResearchRows(normalizedRows);
  const suppressedIds = new Set();
  const auditByCanonicalGroup = new Map();
  const targetGroupsBySuppressedGroup = new Map();
  const canonicalAuditByFindingId = new Map();

  for (const clustered of duplicateProjection.rows) {
    const occurrences = Array.isArray(clustered.occurrences) ? clustered.occurrences : [];
    if (occurrences.length < 2) continue;
    const canonicalId = clean(clustered.sourceId);
    const canonicalGroup = groupByFindingId.get(canonicalId);
    if (!canonicalId || !canonicalGroup) continue;

    const occurrenceAudit = occurrences.map((occurrence) => {
      const findingId = clean(occurrence.sourceId);
      const occurrenceGroup = groupByFindingId.get(findingId) || null;
      return {
        findingId,
        sourceRef: clean(occurrence.sourceRef) || null,
        sourceRefs: uniq(occurrence.sourceRefs || []),
        sourceGroupRef: occurrenceGroup?.sourceRef || null,
        source: occurrenceGroup?.source || null,
        createdAt: occurrence.createdAt || null,
        statement: occurrence.originalStatement || occurrence.statement || null,
        characterCount: occurrence.characterCount || 0,
      };
    });
    const audit = Object.freeze({
      representativeFindingId: canonicalId,
      canonicalSelection: clustered.canonicalSelection,
      occurrenceCount: occurrences.length,
      hiddenOccurrenceCount: occurrences.length - 1,
      occurrences: occurrenceAudit,
    });
    canonicalAuditByFindingId.set(canonicalId, audit);
    const audits = auditByCanonicalGroup.get(canonicalGroup.sourceRef) || [];
    audits.push(audit);
    auditByCanonicalGroup.set(canonicalGroup.sourceRef, audits);

    for (const occurrence of occurrences) {
      const findingId = clean(occurrence.sourceId);
      if (!findingId || findingId === canonicalId) continue;
      suppressedIds.add(findingId);
      const occurrenceGroup = groupByFindingId.get(findingId);
      if (!occurrenceGroup) continue;
      const targets = targetGroupsBySuppressedGroup.get(occurrenceGroup.sourceRef) || new Set();
      targets.add(canonicalGroup.sourceRef);
      targetGroupsBySuppressedGroup.set(occurrenceGroup.sourceRef, targets);
    }
  }

  const rebuilt = groups.map((group) => {
    const rows = (group.rows || [])
      .filter((row) => !suppressedIds.has(String(row?.id)))
      .map((row) => {
        const audit = canonicalAuditByFindingId.get(String(row?.id));
        return audit ? { ...row, duplicateProjection: audit } : row;
      });
    return rebuildContributorSourceGroup({
      ...group,
      duplicateFindingClusters: auditByCanonicalGroup.get(group.sourceRef) || [],
    }, rows);
  });

  const hiddenGroups = [];
  const visibleGroups = [];
  for (const group of rebuilt) {
    const original = originalGroupByRef.get(group.sourceRef);
    const targets = targetGroupsBySuppressedGroup.get(group.sourceRef) || new Set();
    const canHide = (original?.rows || []).length > 0
      && group.rows.length === 0
      && targets.size === 1
      && !targets.has(group.sourceRef);
    if (canHide) hiddenGroups.push({ group, targetRef: [...targets][0] });
    else visibleGroups.push(group);
  }

  const hiddenByTarget = new Map();
  for (const entry of hiddenGroups) {
    const entries = hiddenByTarget.get(entry.targetRef) || [];
    entries.push(entry.group);
    hiddenByTarget.set(entry.targetRef, entries);
  }

  const finalGroups = visibleGroups.map((group) => {
    const absorbed = hiddenByTarget.get(group.sourceRef) || [];
    if (!absorbed.length) return group;
    const allGroups = [group, ...absorbed];
    const sourceOccurrences = uniqueSourceOccurrences(allGroups);
    const mediaSource = group.mediaSource
      || sourceOccurrences.find((source) => clean(source?.imageUrl) || clean(source?.thumbUrl))
      || null;
    return {
      ...group,
      mediaSource,
      sourceOccurrences,
      sourceRecordCount: sourceOccurrences.length,
      linkedSourceRefs: uniq(sourceOccurrences.map((source) => source.sourceRef)),
      absorbedDuplicateSourceGroups: absorbed.map((item) => ({
        id: item.id,
        sourceRef: item.sourceRef,
        source: item.source || null,
        createdAt: item.createdAt || null,
      })),
    };
  });

  return Object.freeze({
    groups: finalGroups,
    duplicateGroups: duplicateProjection.duplicateGroups,
    duplicateOccurrences: duplicateProjection.duplicateOccurrences,
    hiddenSourceGroups: hiddenGroups.length,
    rawFindingCount: normalizedRows.length,
    visibleFindingCount: normalizedRows.length - duplicateProjection.duplicateOccurrences,
    mode: duplicateProjection.mode,
    nonDestructive: true,
    canonicalSelection: "longest_original_statement",
  });
}

/**
 * Projection-only source binding. It never rewrites/deletes either source record and never links by
 * filename or contributor-name guessing. A pair must be consecutive in the same channel/access state
 * and carry either an explicit [Image N.ext] witness or bounded structured overlap already extracted
 * into the two source groups.
 */
export function linkAdjacentSourceMediaGroups(sourceGroups = [], sourceMessages = []) {
  const byRef = new Map((sourceGroups || []).map((group) => [group.sourceRef, group]));
  const ordered = [...(sourceMessages || [])]
    .filter((row) => row?.id && Number.isFinite(Date.parse(row.created_at || "")))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || String(a.id).localeCompare(String(b.id)));
  const linkedImages = new Set();
  const mergedByText = new Map();

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const imageMessage = ordered[index];
    const textMessage = ordered[index + 1];
    const imageRef = sourceRefForMessage(imageMessage);
    const textRef = sourceRefForMessage(textMessage);
    const imageGroup = byRef.get(imageRef);
    const textGroup = byRef.get(textRef);
    if (!imageGroup || !textGroup || mergedByText.has(textRef)) continue;
    if (!clean(imageMessage.image_url) && !clean(imageMessage.thumb_url)) continue;
    if (clean(textMessage.image_url) || clean(textMessage.thumb_url)) continue;
    if (!clean(textMessage.text) || (!placeholderSourceCopy(imageMessage.text) && clean(imageMessage.text))) continue;
    if (clean(imageMessage.channel) !== clean(textMessage.channel)) continue;
    if (clean(imageMessage.status) !== clean(textMessage.status)) continue;

    const gapMs = Date.parse(textMessage.created_at) - Date.parse(imageMessage.created_at);
    if (!Number.isFinite(gapMs) || gapMs < 0 || gapMs > MAX_EXPLICIT_MEDIA_GAP_MS) continue;
    const explicitImageReference = SOURCE_IMAGE_REFERENCE_RE.test(clean(textMessage.text));
    const sharedValues = sharedCount(imageGroup.values, textGroup.values);
    const sharedTerms = sharedCount(imageGroup.terms, textGroup.terms);
    const structuredOverlap = gapMs <= MAX_STRUCTURED_MEDIA_GAP_MS && sharedValues >= 1 && sharedTerms >= 2;
    if (!explicitImageReference && !structuredOverlap) continue;

    const mediaPair = Object.freeze({
      state: "linked_source_sequence",
      basis: explicitImageReference ? "explicit_image_reference" : "structured_source_overlap",
      imageSourceRef: imageRef,
      textSourceRef: textRef,
      gapSeconds: Math.round(gapMs / 1000),
      sharedValues,
      sharedTerms,
    });
    linkedImages.add(imageRef);
    mergedByText.set(textRef, mergeSourceGroups(textGroup, imageGroup, mediaPair));
  }

  const groups = (sourceGroups || [])
    .filter((group) => !linkedImages.has(group.sourceRef))
    .map((group) => mergedByText.get(group.sourceRef) || group)
    .sort((a, b) => clean(b.createdAt).localeCompare(clean(a.createdAt)));
  return Object.freeze({ groups, linkedPairCount: linkedImages.size });
}

export function buildContributorFindingsProjection({
  contributor,
  researchObjects = [],
  sourceMessages = [],
  contributions = [],
  topics = [],
  lexicalRows = [],
} = {}) {
  if (!contributor?.id) return null;

  const aliases = uniq([contributor.display_name, ...(Array.isArray(contributor.wa_names) ? contributor.wa_names : [])]);
  const lexicalIndex = Object.fromEntries(
    (Array.isArray(lexicalRows) ? lexicalRows : [])
      .filter((row) => clean(row?.phrase))
      .map((row) => [clean(row.phrase), row])
  );
  const sourceIndex = Object.fromEntries(
    (Array.isArray(sourceMessages) ? sourceMessages : [])
      .filter((row) => row?.id)
      .map((row) => [`channel_updates:${row.id}`, sourceMeta(row)])
  );

  const topicRows = (Array.isArray(topics) ? topics : []).map((row) => ({
    ...normalizeWorldAllResearchRow(row, "topic"),
    slug: row.slug || null,
    title: row.title || null,
    approvedAt: row.approved_at || null,
    createdBy: row.created_by || null,
  })).filter(Boolean);
  const topicBySlug = Object.fromEntries(topicRows.map((row) => [clean(row.slug), row]).filter(([key]) => key));

  const contributionRows = (Array.isArray(contributions) ? contributions : []).map((row) => ({
    ...normalizeWorldAllResearchRow(row, "contribution"),
    convergenceSlug: clean(row.convergence_slug) || null,
    researchState: clean(row.research_state) || null,
  })).filter(Boolean);

  const exactTopicLinks = contributionRows
    .filter((row) => row.convergenceSlug && topicBySlug[row.convergenceSlug])
    .map((row) => topicBySlug[row.convergenceSlug]);
  const exactTopicSlugs = new Set(exactTopicLinks.map((row) => clean(row.slug)));

  const groups = new Map();
  for (const row of Array.isArray(researchObjects) ? researchObjects : []) {
    if (!row?.id) continue;
    const sourceRef = researchGroupSourceRef(row);
    if (!groups.has(sourceRef)) groups.set(sourceRef, { sourceRef, rows: [] });
    groups.get(sourceRef).rows.push(row);
  }

  // Source-first: every attributed source message is a group, with or without extracted Findings.
  // A source with zero Findings is a real source, never an empty/failed state, and never gets a dummy Finding.
  for (const [sourceRef, source] of Object.entries(sourceIndex)) {
    if (!groups.has(sourceRef)) groups.set(sourceRef, { sourceRef, rows: [] });
    void source;
  }

  const unlinkedSourceGroups = [...groups.values()].map((group) => {
    group.rows.sort((a, b) => clean(a.created_at).localeCompare(clean(b.created_at)));
    const source = sourceIndex[group.sourceRef] || null;
    const terms = uniq(group.rows.flatMap((row) => Array.isArray(row.terms) ? row.terms : []));
    const values = [...new Set(group.rows.map((row) => Number(row.value)).filter(Number.isFinite))].sort((a, b) => a - b);
    const relates = uniq(group.rows.flatMap((row) => Array.isArray(row.relates) ? row.relates : []));
    const lexical = lexicalForTerms(terms, lexicalIndex);
    const topicLinks = [];
    const facets = deriveContributorGroupFacets(group.rows, source, topicLinks);
    const createdAt = source?.createdAt
      || group.rows.map((row) => safeDate(row.created_at)).filter(Boolean).sort().at(-1)
      || null;
    const universalFindings = group.rows
      .map((row) => researchObjectToUniversalFinding(row, { locale: "he" }))
      .filter(Boolean);
    const byKind = {};
    for (const row of group.rows) {
      const key = clean(row.kind) || "unknown";
      byKind[key] = (byKind[key] || 0) + 1;
    }
    const verifiedCount = group.rows.filter((row) => row.engine_verified === true).length;
    const mediaRefs = uniq(group.rows.map((row) => row?.meta?.ext?.wa_channel_intake?.media_ref));

    const model = {
      id: group.sourceRef,
      sourceRef: group.sourceRef,
      createdAt,
      source,
      title: null,
      rows: group.rows,
      universalFindings,
      byKind,
      findingCount: group.rows.length,
      verifiedCount,
      terms,
      values,
      relates,
      mediaRefs,
      facets,
      lexicalWorlds: lexical.worlds,
      lexicalTags: lexical.tags,
      topicLinks,
      topicState: topicLinks.length ? "linked_topic" : "finding_only",
      publicationState: source?.status || null,
    };
    model.title = groupTitle(model);
    return model;
  }).sort((a, b) => clean(b.createdAt).localeCompare(clean(a.createdAt)));

  const linkedSources = linkAdjacentSourceMediaGroups(unlinkedSourceGroups, sourceMessages);
  const deduplicatedSources = deduplicateContributorSourceGroups(linkedSources.groups);
  const sourceGroups = deduplicatedSources.groups;

  const worldCounts = {};
  const tagCounts = {};
  const facetCounts = {};
  for (const group of sourceGroups) {
    for (const world of group.lexicalWorlds) worldCounts[world] = (worldCounts[world] || 0) + 1;
    for (const tag of group.lexicalTags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    for (const facet of group.facets) facetCounts[facet] = (facetCounts[facet] || 0) + 1;
  }

  const allTerms = uniq(sourceGroups.flatMap((group) => group.terms));
  const allValues = [...new Set(sourceGroups.flatMap((group) => group.values))].sort((a, b) => a - b);
  const latestAt = sourceGroups.map((group) => safeDate(group.createdAt)).filter(Boolean).sort().at(-1) || null;
  const firstAt = sourceGroups.map((group) => safeDate(group.createdAt)).filter(Boolean).sort().at(0) || null;

  return {
    contributor: {
      id: String(contributor.id),
      slug: contributor.slug,
      displayName: contributor.display_name,
      role: contributor.role || null,
      aliases,
    },
    sourceGroups,
    topics: topicRows,
    contributions: contributionRows,
    linkedTopicSlugs: [...exactTopicSlugs],
    counts: {
      researchObjects: researchObjects.length,
      sourceRecords: sourceMessages.length,
      sourceGroups: sourceGroups.length,
      linkedImageMessages: linkedSources.linkedPairCount,
      exactDuplicateGroups: deduplicatedSources.duplicateGroups,
      duplicateFindingsHidden: deduplicatedSources.duplicateOccurrences,
      duplicateSourceGroupsHidden: deduplicatedSources.hiddenSourceGroups,
      visibleResearchObjects: deduplicatedSources.visibleFindingCount,
      sourceGroupsWithFindings: sourceGroups.filter((group) => group.findingCount > 0).length,
      sourceOnlyGroups: sourceGroups.filter((group) => group.findingCount === 0).length,
      engineVerified: sourceGroups.reduce((sum, group) => sum + group.verifiedCount, 0),
      topics: topicRows.length,
      contributions: contributionRows.length,
      exactLinkedTopics: exactTopicSlugs.size,
      uniqueTerms: allTerms.length,
      uniqueValues: allValues.length,
    },
    worldCounts,
    tagCounts,
    facetCounts,
    allTerms,
    allValues,
    latestAt,
    firstAt,
    duplicateProjection: {
      mode: deduplicatedSources.mode,
      nonDestructive: deduplicatedSources.nonDestructive,
      groups: deduplicatedSources.duplicateGroups,
      occurrencesCombined: deduplicatedSources.duplicateOccurrences,
      sourceGroupsHidden: deduplicatedSources.hiddenSourceGroups,
      rawResearchRows: deduplicatedSources.rawFindingCount,
      visibleResearchRows: deduplicatedSources.visibleFindingCount,
      canonicalSelection: deduplicatedSources.canonicalSelection,
    },
    truthBoundary: "Contributor is provenance/lens only. Source, extracted research object, verification, Topic admission, canonicality and publication remain distinct axes.",
    topicAdmission: "Finding-first. A source message or isolated equality does not become a Topic unless the governed convergence/admission criteria are met.",
  };
}

async function fetchContributor(client, slug) {
  const safeSlug = clean(slug);
  if (!safeSlug) return null;
  const { data, error } = await client
    .from("contributors")
    .select("id,slug,display_name,role,kind,wa_names")
    .eq("slug", safeSlug)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// Research objects by exact attribution or the source message's stable contributor identity. These
// remain separate provenance axes in the view; source ownership never rewrites research authorship.
// Which rows come back is decided by RLS for the client in use (anon in PUBLIC mode, the viewer's
// session in ADMIN mode), so person-only/private material is never broadened by this projection.
async function fetchResearchObjects(client, contributorId, aliases, sourceRef = null) {
  const fields = "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,evidence,status,promoted_node_id,parent_id,meta,privacy_scope";
  const contributorFilter = [
    `source_contributor_id.eq.${clean(contributorId)}`,
    `contributor.in.(${aliases.map(postgrestQuoted).join(",")})`,
  ].join(",");
  const occurrenceId = channelUpdateOccurrenceId(sourceRef);
  const exactSourceRef = occurrenceId ? `channel_updates:${occurrenceId}` : null;
  const result = await paged((start, end, first) => {
    let query = client
      .from("world_contributor_research_v1")
      .select(fields, first ? { count: "exact" } : undefined)
      .or(contributorFilter);
    if (exactSourceRef) query = query.like("source_ref", `${exactSourceRef}%`);
    return query.order("created_at", { ascending: false }).range(start, end);
  }, {
    pageSize: exactSourceRef ? 100 : RESEARCH_PAGE,
    max: exactSourceRef ? 100 : MAX_CONTRIBUTOR_RESEARCH,
    concurrency: exactSourceRef ? 1 : 4,
  });
  return { rows: result.rows, total: result.total, truncated: result.truncated };
}

async function fetchContributorContributions(client, contributorId) {
  return paged((start, end, first) => client
    .from("research_contributions")
    .select(
      "id,created_at,author_contributor_id,author_name,intent,origin,research_state,status,target_type,target_id,title,body,gematria_claim,image_url,media,convergence_slug",
      first ? { count: "exact" } : undefined
    )
    .eq("author_contributor_id", contributorId)
    .order("created_at", { ascending: false })
    .range(start, end)
  );
}

async function fetchSourceMessages(client, contributor, aliases, sourceRef = null) {
  const byId = new Map();
  let truncated = false;
  const fields = "id,created_at,text,image_url,thumb_url,source,status,credit,channel,link_url,speaker,contributor_id";
  const occurrenceId = channelUpdateOccurrenceId(sourceRef);

  if (occurrenceId) {
    const { data, error } = await client
      .from("channel_updates")
      .select(fields)
      .eq("id", occurrenceId);
    if (error) throw error;
    const rows = (Array.isArray(data) ? data : []).filter((row) => (
      clean(row?.contributor_id) === clean(contributor.id)
      || (!clean(row?.contributor_id) && aliases.some((alias) => [clean(row?.credit), clean(row?.speaker)].includes(alias)))
    ));
    return { rows, total: rows.length, truncated: false };
  }

  // Stable identity is authoritative. Registered aliases are a legacy fallback only when the row
  // has not yet been bound to any contributor; an alias can never override another stable identity.
  const canonical = await paged((start, end, first) => client
    .from("channel_updates")
    .select(fields, first ? { count: "exact" } : undefined)
    .eq("contributor_id", contributor.id)
    .order("created_at", { ascending: false })
    .range(start, end), { concurrency: 3 });
  truncated = canonical.truncated;
  for (const row of canonical.rows) byId.set(String(row.id), row);

  for (const column of ["credit", "speaker"]) {
    const result = await paged((start, end, first) => client
      .from("channel_updates")
      .select(fields, first ? { count: "exact" } : undefined)
      .in(column, aliases)
      .is("contributor_id", null)
      .order("created_at", { ascending: false })
      .range(start, end)
    );
    truncated = truncated || result.truncated;
    for (const row of result.rows) byId.set(String(row.id), row);
  }
  const rows = [...byId.values()].sort((a, b) => clean(b.created_at).localeCompare(clean(a.created_at)));
  return { rows, total: rows.length, truncated };
}

async function fetchContributorTopics(aliases) {
  const byKey = new Map();
  for (const creator of aliases) {
    let offset = 0;
    while (offset < 1000) {
      const result = await fetchTopicCardList({ creator, limit: 100, offset });
      for (const row of result?.rows || []) byKey.set(topicKey(row), row);
      if (!result?.hasMore) break;
      offset += 100;
    }
  }
  return [...byKey.values()];
}

async function fetchLexicalRows(client, terms) {
  const safeTerms = uniq(terms).filter((term) => term.length <= 180);
  if (!safeTerms.length) return [];
  const { data, error } = await client.rpc("world_gematria_lexical_lookup_v1", { p_phrases: safeTerms });
  if (error) throw error;
  const rows = data || [];
  const byPhrase = new Map();
  for (const row of rows) {
    const phrase = clean(row.phrase);
    if (!phrase) continue;
    const prior = byPhrase.get(phrase) || { phrase, world: null, tags: [], is_verified: true, is_published: false };
    if (!prior.world && clean(row.world)) prior.world = clean(row.world);
    prior.tags = uniq([...(prior.tags || []), ...(Array.isArray(row.tags) ? row.tags : [])]);
    prior.is_published = Boolean(prior.is_published || row.is_published);
    byPhrase.set(phrase, prior);
  }
  return [...byPhrase.values()];
}

// Availability is a separate axis from count: "unavailable" (read failed/denied) is never rendered as zero.
export function deriveAvailability(settled) {
  const out = {};
  for (const [key, result] of Object.entries(settled)) out[key] = result.status === "fulfilled" ? "ok" : "unavailable";
  return out;
}

/**
 * PUBLIC mode (default, everyone): anonymous client => only what RLS lets a visitor read; never an admin payload.
 * ADMIN mode: the viewer's session; additionally lists research the admin is authorized to see.
 * A failed research read never erases readable source messages, contributions or Topics.
 */
export async function fetchContributorFindingsProjection(slug, {
  mode = PROJECTOR_MODE.PUBLIC_VIEW,
  publicClient = getPublicResearchClient,
  sessionClient = supabase,
  topicsReader = fetchContributorTopics,
  sourceRef = null,
  loadProfile = CONTRIBUTOR_LOAD_PROFILE.FULL,
} = {}) {
  const client = mode === PROJECTOR_MODE.ADMIN_ALL ? sessionClient : publicClient();
  const contributor = await fetchContributor(client, slug);
  if (!contributor) return null;
  const aliases = uniq([contributor.display_name, ...(Array.isArray(contributor.wa_names) ? contributor.wa_names : [])]);
  const focusedOccurrenceId = channelUpdateOccurrenceId(sourceRef);
  const focusedSourceRef = focusedOccurrenceId ? `channel_updates:${focusedOccurrenceId}` : null;
  // The source library is a reading surface, not the all-research review table. Loading thousands
  // of research rows before showing source texts made large contributors appear stuck. The library
  // therefore opens from the complete RLS-filtered source corpus first. An exact occurrence link
  // still loads the small research slice belonging to that occurrence.
  const deferResearch = loadProfile === CONTRIBUTOR_LOAD_PROFILE.SOURCE_LIBRARY && !focusedSourceRef;

  const settled = {};
  const [research, sources, contributions, topics] = await Promise.allSettled([
    deferResearch
      ? Promise.resolve({ rows: [], total: null, truncated: false, deferred: true })
      : fetchResearchObjects(client, contributor.id, aliases, focusedSourceRef),
    fetchSourceMessages(client, contributor, aliases, focusedSourceRef),
    focusedSourceRef ? Promise.resolve({ rows: [], total: 0, truncated: false }) : fetchContributorContributions(client, contributor.id),
    focusedSourceRef ? Promise.resolve([]) : topicsReader(aliases),
  ]);
  Object.assign(settled, { research, sources, contributions, topics });
  const value = (result, fallback) => (result.status === "fulfilled" ? result.value : fallback);
  const researchValue = value(research, { rows: [], total: 0, truncated: false });
  const sourceValue = value(sources, { rows: [], total: 0, truncated: false });
  const contributionValue = value(contributions, { rows: [], total: 0, truncated: false });
  const topicRows = value(topics, []);

  const terms = uniq(researchValue.rows.flatMap((row) => Array.isArray(row.terms) ? row.terms : []));
  let lexicalRows = [];
  try {
    lexicalRows = await fetchLexicalRows(client, terms);
  } catch (_) {
    lexicalRows = [];
  }

  const projection = buildContributorFindingsProjection({
    contributor,
    researchObjects: researchValue.rows,
    sourceMessages: sourceValue.rows,
    contributions: contributionValue.rows,
    topics: topicRows,
    lexicalRows,
  });
  const availability = deriveAvailability(settled);

  return {
    ...projection,
    mode,
    loadProfile,
    focus: focusedSourceRef ? { sourceRef: focusedSourceRef, exactOccurrence: true } : null,
    availability: {
      ...availability,
      research: deferResearch ? "deferred" : availability.research,
    },
    loadState: {
      researchObjectsTotal: deferResearch ? null : researchValue.total,
      researchObjectsTruncated: researchValue.truncated,
      researchObjectsDeferred: deferResearch,
      contributionsTotal: contributionValue.total,
      contributionsTruncated: contributionValue.truncated,
      sourceMessagesLoaded: sourceValue.rows.length,
      sourceMessagesTruncated: sourceValue.truncated,
      topicsLoaded: topicRows.length,
    },
  };
}

export default fetchContributorFindingsProjection;
