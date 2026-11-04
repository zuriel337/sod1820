// Adapters for rows returned by existing canonical PUBLIC readers.
// No query belongs here: this keeps World and News from growing source-specific
// fetch paths while preserving the access boundary of the reader that supplied
// the row.

const clean = (value) => value == null ? "" : String(value).trim();
const unique = (values) => [...new Set(values.filter(Boolean))];

function exactRef(value) {
  const ref = clean(value);
  return ref || null;
}

function publicContributor(row) {
  const contributor = row?.contributor;
  if (!contributor || typeof contributor !== "object") return null;
  const slug = clean(contributor.slug) || null;
  const label = clean(contributor.label ?? contributor.displayName) || null;
  const href = clean(contributor.href) || null;
  return slug || label || href ? { slug, label, href } : null;
}

/**
 * Maps an already-public source-row shape to the contract input shape.
 * `sourceRef` must be supplied by the source's canonical reader. The adapter
 * never guesses it from a title, writer, URL, number or category.
 */
export function adaptPublicSourceRowV1(row = {}) {
  const sourceRef = exactRef(row.sourceRef);
  if (!sourceRef) return null;
  const occurrenceRef = exactRef(row.occurrenceRef);
  const source = {
    sourceRef,
    title: clean(row.title) || null,
    contributor: publicContributor(row),
    publisher: row?.publisher && typeof row.publisher === "object"
      ? { key: clean(row.publisher.key) || null, label: clean(row.publisher.label) || null }
      : null,
    sourceHref: clean(row.sourceHref) || null,
    media: Array.isArray(row.media) ? row.media : [],
  };
  const occurrence = occurrenceRef ? {
    occurrenceRef,
    sourceRef,
    locator: clean(row.locator) || null,
    href: clean(row.occurrenceHref) || clean(row.sourceHref) || null,
    times: {
      occurredAt: row?.times?.occurredAt ?? null,
      publishedAt: row?.times?.publishedAt ?? null,
      updatedAt: row?.times?.updatedAt ?? null,
    },
  } : null;
  return { source, occurrence };
}

export function adaptPublicSourceRowsV1(rows = []) {
  const sources = new Map();
  const occurrences = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const adapted = adaptPublicSourceRowV1(row);
    if (!adapted) continue;
    if (!sources.has(adapted.source.sourceRef)) sources.set(adapted.source.sourceRef, adapted.source);
    if (adapted.occurrence && !occurrences.has(adapted.occurrence.occurrenceRef)) occurrences.set(adapted.occurrence.occurrenceRef, adapted.occurrence);
  }
  return { sources: [...sources.values()], occurrences: [...occurrences.values()] };
}

// Legacy Topics have no source identity in this adapter. They intentionally
// enter compatibility only, so their count can never inflate corpus sources.
export function adaptLegacyTopicsV1(rows = []) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).flatMap((row) => {
    const topicRef = exactRef(row?.topicRef ?? row?.id);
    if (!topicRef || seen.has(topicRef)) return [];
    seen.add(topicRef);
    return [{
      topicRef,
      slug: clean(row?.slug) || null,
      href: clean(row?.href) || null,
      title: clean(row?.title) || null,
    }];
  });
}

export function adaptPublicFindingRowsV1(rows = []) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).flatMap((row) => {
    const findingRef = exactRef(row?.findingRef ?? row?.id);
    const sourceRefs = unique((Array.isArray(row?.sourceRefs) ? row.sourceRefs : [row?.sourceRef]).map(exactRef));
    if (!findingRef || !sourceRefs.length || seen.has(findingRef)) return [];
    seen.add(findingRef);
    return [{
      findingRef,
      sourceRefs,
      href: clean(row?.href) || null,
      stage: clean(row?.stage) || null,
      verificationState: clean(row?.verificationState) || null,
      publicationState: clean(row?.publicationState) || null,
    }];
  });
}
