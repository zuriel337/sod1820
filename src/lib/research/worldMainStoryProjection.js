import {
  compareWorldResearchStrength,
  worldPublicResearchDto,
} from "./worldAllResearchProjection.js";

const clean = (value) => value == null ? "" : String(value).trim();

function finiteOrNull(value) {
  if (value == null || typeof value === "boolean" || typeof value === "object") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function strongPublicFinding(row) {
  return row?.family === "research_object"
    && row?.verification === "match"
    && Array.isArray(row?.treeMatches)
    && row.treeMatches.length > 0;
}

function targetKeys(row) {
  return (Array.isArray(row?.treeMatches) ? row.treeMatches : [])
    .map((target) => clean(target?.key || target?.id || target?.label))
    .filter(Boolean);
}

function sourceKeys(row) {
  return [...new Set([
    clean(row?.sourceRef),
    ...(Array.isArray(row?.sourceRefs) ? row.sourceRefs.map(clean) : []),
  ].filter(Boolean))];
}

function selectionReasons(row) {
  const reasons = [
    "אימות מנוע מפורש תואם",
    `${row.treeMatches.length} ${row.treeMatches.length === 1 ? "חיבור מתועד" : "חיבורים מתועדים"} ליעד קיים בעץ`,
  ];
  const meter = finiteOrNull(row?.linkedTopicRating?.meterScore);
  const quality = finiteOrNull(row?.linkedTopicRating?.quality);
  if (meter != null) reasons.push(`מד היעד הקיים: ${meter} · אות הצגה, לא ציון אמת`);
  if (quality != null) reasons.push(`איכות הראיות של היעד: ${quality}`);
  return reasons;
}

function publicStoryItem(row) {
  const independentSourceCount = finiteOrNull(row?.independentSourceCount);
  return {
    id: clean(row?.sourceId),
    title: clean(row?.statement) || "ממצא מחקר",
    summary: clean(row?.secondary) || null,
    kind: clean(row?.kind) || "observation",
    canonicalFindingHref: clean(row?.canonicalFindingHref) || null,
    sourceRef: clean(row?.sourceRef) || null,
    sourceRefs: Array.isArray(row?.sourceRefs) ? [...row.sourceRefs] : [],
    sourceHref: clean(row?.sourceHref) || null,
    sourceLabel: clean(row?.sourceLabel) || null,
    contributor: clean(row?.contributor) || null,
    status: clean(row?.status) || null,
    access: clean(row?.access) || null,
    verification: clean(row?.verification) || null,
    connectionStrength: "strong",
    evidenceQuality: finiteOrNull(row?.linkedTopicRating?.quality),
    independentSourceCount,
    independentSourceCountLabel: independentSourceCount == null ? "אין נתון" : String(independentSourceCount),
    treeTargets: (Array.isArray(row?.treeMatches) ? row.treeMatches : []).map((target) => ({
      type: clean(target?.type) || null,
      key: clean(target?.key || target?.id) || null,
      label: clean(target?.label) || null,
    })),
    occurrenceCount: Math.max(1, finiteOrNull(row?.occurrenceCount) || 1),
    occurrences: Array.isArray(row?.occurrences) ? row.occurrences.map((occurrence) => ({ ...occurrence })) : [],
    whySelected: selectionReasons(row),
  };
}

/**
 * A bounded public presentation projection for the World opening story.
 *
 * It consumes the existing authorized World DTO and its existing Research-Strength
 * comparator. It creates no reader, score, store, cache, publication decision or
 * truth state. Only approved/canonical public findings that already have both an
 * explicit engine match and a typed tree target are eligible. Exact duplicate
 * occurrences remain attached to the representative chosen by the upstream
 * non-destructive cluster projection.
 */
export function buildWorldMainStoryProjection(projection = {}, { limit = 4 } = {}) {
  const publicProjection = worldPublicResearchDto(projection);
  const requested = Math.max(1, Math.min(Number(limit) || 4, 6));
  const publicResearch = publicProjection.rows.filter((row) => row?.family === "research_object");
  const explicitlyVerified = publicResearch.filter((row) => row?.verification === "match");
  const connectedToTree = publicResearch.filter((row) => Array.isArray(row?.treeMatches) && row.treeMatches.length > 0);
  const eligible = publicResearch.filter(strongPublicFinding)
    .sort(compareWorldResearchStrength);

  // The first pass prevents one target or one repeated source occurrence from
  // taking over the whole opening. It is presentation diversity, not a new rank.
  const selected = [];
  const deferred = [];
  const seenTargets = new Set();
  const seenSources = new Set();
  for (const row of eligible) {
    const targets = targetKeys(row);
    const sources = sourceKeys(row);
    const repeatsTarget = targets.some((key) => seenTargets.has(key));
    const repeatsSource = sources.some((key) => seenSources.has(key));
    if ((repeatsTarget || repeatsSource) && selected.length > 0) {
      deferred.push(row);
      continue;
    }
    selected.push(row);
    targets.forEach((key) => seenTargets.add(key));
    sources.forEach((key) => seenSources.add(key));
    if (selected.length === requested) break;
  }
  if (selected.length < requested) {
    for (const row of deferred) {
      if (selected.length === requested) break;
      selected.push(row);
    }
  }

  return {
    items: selected.map(publicStoryItem),
    eligibleCount: eligible.length,
    displayedCount: selected.length,
    readiness: {
      explicitlyVerified: explicitlyVerified.length,
      connectedToTree: connectedToTree.length,
      readyForStrongStory: eligible.length,
      verifiedAwaitingTreeConnection: explicitlyVerified.filter((row) => !row.treeMatches?.length).length,
      connectedAwaitingExplicitVerification: connectedToTree.filter((row) => row.verification !== "match").length,
    },
    selectionMode: "existing_research_strength_then_source_and_target_diversity",
    publicOnly: true,
    disclaimer: "הבחירה מסדרת את פתיחת העולם; היא אינה ציון אמת ואינה משנה אימות, איכות ראיות, עצמאות מקורות או פרסום.",
  };
}

