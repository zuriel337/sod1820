const clean = (value) => value == null ? "" : String(value).trim();

const DASH_FAMILY = /[־–—‒‑]/g;
const QUOTE_FAMILY = /["'״׳`‚„“”‘’]/g;

function codePointLength(value) {
  return Array.from(clean(value)).length;
}

function unique(values) {
  return [...new Set(values.filter((value) => value != null && value !== ""))];
}

function uniqueObjects(values) {
  const seen = new Set();
  const out = [];
  for (const value of values.filter(Boolean)) {
    const key = JSON.stringify(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function normalizedDimension(value) {
  return clean(value).toLowerCase();
}

function numericIdentity(value) {
  if (value == null || value === "") return "null";
  const number = Number(value);
  return Number.isFinite(number) ? `number:${number}` : `raw:${clean(value)}`;
}

/**
 * Mirrors public.fn_research_claim_uid(text), the existing conservative claim
 * identity. It intentionally keeps digits and mathematical operators distinct.
 */
export function normalizeResearchClaimForDuplicateCluster(value) {
  return clean(value)
    .toLowerCase()
    .replace(DASH_FAMILY, "-")
    .replace(QUOTE_FAMILY, "")
    .replace(/\s+/gu, "");
}

function duplicatePartitionKey(row) {
  if (row?.family !== "research_object") return null;
  const claim = normalizeResearchClaimForDuplicateCluster(row.originalStatement || row.statement);
  if (!claim) return null;

  // These axes stay in the partition key so projection-time clustering can
  // never collapse a truth, governance or access disagreement.
  return JSON.stringify([
    claim,
    normalizedDimension(row.kind),
    numericIdentity(row.value),
    normalizedDimension(row.access),
    normalizedDimension(row.status),
    normalizedDimension(row.verification),
  ]);
}

function canonicalTextLength(row) {
  return codePointLength(row?.originalStatement || row?.statement);
}

function canonicalCompleteness(row) {
  return [
    row?.originalStatement,
    row?.secondary,
    row?.contextLine,
    row?.attributionLabel,
    row?.sourceRef,
    row?.contributor,
    row?.confidence,
  ].filter((value) => value != null && value !== "").length;
}

function compareCanonicalCandidates(left, right) {
  const byCharacters = canonicalTextLength(right) - canonicalTextLength(left);
  if (byCharacters) return byCharacters;

  const byCompleteness = canonicalCompleteness(right) - canonicalCompleteness(left);
  if (byCompleteness) return byCompleteness;

  const byConfidence = (Number(right?.confidence) || 0) - (Number(left?.confidence) || 0);
  if (byConfidence) return byConfidence;

  const byDate = clean(right?.createdAt).localeCompare(clean(left?.createdAt));
  if (byDate) return byDate;

  return clean(left?.id).localeCompare(clean(right?.id));
}

function occurrenceOf(row) {
  return {
    id: row.id,
    sourceId: row.sourceId || null,
    source: row.source || null,
    sourceLabel: row.sourceLabel || null,
    sourceRef: row.sourceRef || null,
    sourceRefs: Array.isArray(row.sourceRefs) ? [...row.sourceRefs] : [],
    contributor: row.contributor || null,
    createdAt: row.createdAt || null,
    statement: row.statement || null,
    originalStatement: row.originalStatement || null,
    characterCount: canonicalTextLength(row),
    confidence: row.confidence ?? null,
    treeMatches: Array.isArray(row.treeMatches) ? [...row.treeMatches] : [],
  };
}

function mergeExactDuplicateGroup(partitionKey, members) {
  const ranked = [...members].sort(compareCanonicalCandidates);
  const canonical = ranked[0];
  const occurrences = ranked
    .map(occurrenceOf)
    .sort((left, right) => clean(right.createdAt).localeCompare(clean(left.createdAt)));
  const sourceRefs = unique(ranked.flatMap((row) => [row.sourceRef, ...(row.sourceRefs || [])]));
  const contributors = unique(ranked.map((row) => row.contributor));
  const sourceLabels = unique(ranked.map((row) => row.sourceLabel));
  const sources = unique(ranked.map((row) => row.source));
  const treeMatches = uniqueObjects(ranked.flatMap((row) => row.treeMatches || []));
  const created = ranked.map((row) => clean(row.createdAt)).filter(Boolean).sort();

  return {
    ...canonical,
    sourceRefs,
    contributors,
    sourceLabels,
    sources,
    treeMatches,
    occurrenceCount: members.length,
    duplicateOccurrenceCount: members.length - 1,
    duplicateClusterKey: partitionKey,
    duplicateClusterMode: "exact_claim_same_truth_access_governance",
    canonicalSelection: "longest_original_statement",
    canonicalCharacterCount: canonicalTextLength(canonical),
    firstSeenAt: created[0] || canonical.createdAt || null,
    lastSeenAt: created[created.length - 1] || canonical.createdAt || null,
    occurrences,
  };
}

/**
 * Non-destructive World projection clustering.
 *
 * The durable research_objects rows stay untouched. Only exact, high-confidence
 * duplicates inside the same truth/access/governance partition become one World
 * card. Every underlying occurrence and source reference remains attached.
 */
export function clusterWorldResearchRows(rows = []) {
  const input = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const partitions = new Map();
  const passthrough = [];

  for (const row of input) {
    const key = duplicatePartitionKey(row);
    if (!key) {
      passthrough.push(row);
      continue;
    }
    const members = partitions.get(key) || [];
    members.push(row);
    partitions.set(key, members);
  }

  const clustered = [];
  let duplicateGroups = 0;
  let duplicateOccurrences = 0;

  for (const [key, members] of partitions) {
    if (members.length === 1) {
      clustered.push(members[0]);
      continue;
    }
    duplicateGroups += 1;
    duplicateOccurrences += members.length - 1;
    clustered.push(mergeExactDuplicateGroup(key, members));
  }

  return {
    rows: [...clustered, ...passthrough],
    duplicateGroups,
    duplicateOccurrences,
    rawCount: input.length,
    clusteredCount: clustered.length + passthrough.length,
    mode: "exact-safe-projection",
    nonDestructive: true,
  };
}
