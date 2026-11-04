// Public Content → Research → World Projection Contract v1.
//
// This is deliberately a pure assembly/validation layer. It owns no source
// reader, visibility rule, finding truth, graph relation, publication state or
// Topic. Callers must supply rows that have already passed their canonical
// public readers. Keeping this boundary small lets World and News consume one
// honest DTO without creating a second corpus or a source-specific path.

export const PUBLIC_WORLD_CONTENT_PROJECTION_CONTRACT_VERSION = "public-world-content-projection/v1";

const clean = (value) => value == null ? "" : String(value).trim();
const list = (value) => Array.isArray(value) ? value : [];
const unique = (values) => [...new Set(values.filter(Boolean))];
const frozen = (value) => Object.freeze(value);

function publicRef(value) {
  const ref = clean(value);
  return ref || null;
}

function publicTimes(value = {}) {
  return frozen({
    occurredAt: value?.occurredAt ?? null,
    publishedAt: value?.publishedAt ?? null,
    updatedAt: value?.updatedAt ?? null,
  });
}

function normalizeSource(row) {
  const sourceRef = publicRef(row?.sourceRef ?? row?.id);
  if (!sourceRef) return null;
  return frozen({
    sourceRef,
    title: clean(row?.title) || null,
    contributor: row?.contributor && typeof row.contributor === "object"
      ? frozen({ slug: clean(row.contributor.slug) || null, label: clean(row.contributor.label) || null, href: clean(row.contributor.href) || null })
      : null,
    publisher: row?.publisher && typeof row.publisher === "object"
      ? frozen({ key: clean(row.publisher.key) || null, label: clean(row.publisher.label) || null })
      : null,
    sourceHref: clean(row?.sourceHref) || null,
    media: frozen(list(row?.media).map((media) => frozen({
      mediaRef: publicRef(media?.mediaRef ?? media?.id),
      kind: clean(media?.kind) || null,
      href: clean(media?.href) || null,
      alt: clean(media?.alt) || null,
      provenance: clean(media?.provenance) || null,
    })).filter((media) => media.mediaRef || media.href)),
  });
}

function normalizeOccurrence(row, sourceRefs) {
  const occurrenceRef = publicRef(row?.occurrenceRef ?? row?.id);
  const sourceRef = publicRef(row?.sourceRef);
  if (!occurrenceRef || !sourceRef || !sourceRefs.has(sourceRef)) return null;
  return frozen({
    occurrenceRef,
    sourceRef,
    locator: clean(row?.locator) || null,
    href: clean(row?.href) || null,
    times: publicTimes(row?.times),
  });
}

function normalizeCluster(row, occurrenceRefs) {
  const clusterRef = publicRef(row?.clusterRef ?? row?.id);
  const basis = clean(row?.basis);
  const members = unique(list(row?.occurrenceRefs).map(publicRef)).filter((ref) => occurrenceRefs.has(ref));
  // A cluster is a presentation grouping only. Its basis must be explicit;
  // a title, common author, number, or category cannot silently become one.
  if (!clusterRef || !basis || !members.length) return null;
  return frozen({ clusterRef, basis, occurrenceRefs: frozen(members), representativeOccurrenceRef: members.includes(publicRef(row?.representativeOccurrenceRef)) ? publicRef(row.representativeOccurrenceRef) : members[0] });
}

function normalizeSeriesCategory(row) {
  const key = clean(row?.key);
  const kind = clean(row?.kind);
  if (!key || !["series", "category"].includes(kind)) return null;
  return frozen({ key, kind, label: clean(row?.label) || key, sourceRefs: frozen(unique(list(row?.sourceRefs).map(publicRef))) });
}

function normalizeFinding(row, sourceRefs) {
  const findingRef = publicRef(row?.findingRef ?? row?.id);
  const refs = unique(list(row?.sourceRefs).map(publicRef)).filter((ref) => sourceRefs.has(ref));
  // This layer does not promote a source to a finding. It only carries an
  // already public Universal Finding and its exact canonical provenance.
  if (!findingRef || !refs.length) return null;
  return frozen({
    findingRef,
    sourceRefs: frozen(refs),
    href: clean(row?.href) || null,
    stage: clean(row?.stage) || null,
    verificationState: clean(row?.verificationState) || null,
    publicationState: clean(row?.publicationState) || null,
  });
}

function normalizeTreeRelation(row, findingRefs) {
  const findingRef = publicRef(row?.findingRef);
  const targetRef = publicRef(row?.targetRef);
  const edgeRef = publicRef(row?.edgeRef);
  const governanceRef = publicRef(row?.governanceRef);
  // A relation must be carried by graph provenance or a documented governed
  // attachment. Shared labels, values, authors and categories are not proof.
  if (!findingRef || !findingRefs.has(findingRef) || !targetRef || (!edgeRef && !governanceRef)) return null;
  return frozen({ findingRef, targetRef, edgeRef, governanceRef, href: clean(row?.href) || null });
}

function normalizeLegacyTopic(row) {
  const topicRef = publicRef(row?.topicRef ?? row?.id);
  if (!topicRef) return null;
  return frozen({ topicRef, slug: clean(row?.slug) || null, href: clean(row?.href) || null, title: clean(row?.title) || null });
}

function availability(input, calculatedTotal) {
  const explicitlyAvailable = input?.available;
  const available = explicitlyAvailable === false ? false : true;
  return frozen({ available, total: available ? calculatedTotal : null });
}

/**
 * Builds the shared public envelope. Unknown / unavailable does not become a
 * zero. The function deliberately has no Zvi, Hashmal, writer or News branch.
 */
export function buildPublicWorldContentProjectionV1(input = {}) {
  const sourceByRef = new Map();
  for (const row of list(input.sources)) {
    const source = normalizeSource(row);
    if (source && !sourceByRef.has(source.sourceRef)) sourceByRef.set(source.sourceRef, source);
  }
  const sources = frozen([...sourceByRef.values()]);
  const sourceRefs = new Set(sourceByRef.keys());

  const occurrenceByRef = new Map();
  for (const row of list(input.occurrences)) {
    const occurrence = normalizeOccurrence(row, sourceRefs);
    if (occurrence && !occurrenceByRef.has(occurrence.occurrenceRef)) occurrenceByRef.set(occurrence.occurrenceRef, occurrence);
  }
  const occurrences = frozen([...occurrenceByRef.values()]);
  const occurrenceRefs = new Set(occurrenceByRef.keys());

  const clusterByRef = new Map();
  for (const row of list(input.clusters)) {
    const cluster = normalizeCluster(row, occurrenceRefs);
    if (cluster && !clusterByRef.has(cluster.clusterRef)) clusterByRef.set(cluster.clusterRef, cluster);
  }
  const clusters = frozen([...clusterByRef.values()]);

  const seriesCategoryByKey = new Map();
  for (const row of list(input.seriesCategories)) {
    const item = normalizeSeriesCategory(row);
    if (item && !seriesCategoryByKey.has(`${item.kind}:${item.key}`)) seriesCategoryByKey.set(`${item.kind}:${item.key}`, item);
  }
  const seriesCategories = frozen([...seriesCategoryByKey.values()]);

  const findingByRef = new Map();
  for (const row of list(input.findings)) {
    const finding = normalizeFinding(row, sourceRefs);
    if (finding && !findingByRef.has(finding.findingRef)) findingByRef.set(finding.findingRef, finding);
  }
  const findings = frozen([...findingByRef.values()]);
  const findingRefs = new Set(findingByRef.keys());

  const treeRelationByKey = new Map();
  for (const row of list(input.treeRelations)) {
    const relation = normalizeTreeRelation(row, findingRefs);
    if (relation) treeRelationByKey.set(`${relation.findingRef}:${relation.targetRef}:${relation.edgeRef || relation.governanceRef}`, relation);
  }
  const treeRelations = frozen([...treeRelationByKey.values()]);

  const legacyByRef = new Map();
  for (const row of list(input?.compatibility?.legacyTopics)) {
    const topic = normalizeLegacyTopic(row);
    if (topic && !legacyByRef.has(topic.topicRef)) legacyByRef.set(topic.topicRef, topic);
  }
  const legacyTopics = frozen([...legacyByRef.values()]);

  const declared = input.coverage && typeof input.coverage === "object" ? input.coverage : {};
  const coverage = frozen({
    sources: availability(declared.sources, sources.length),
    occurrences: availability(declared.occurrences, occurrences.length),
    clusters: availability(declared.clusters, clusters.length),
    seriesCategories: availability(declared.seriesCategories, seriesCategories.length),
    findings: availability(declared.findings, findings.length),
    treeRelations: availability(declared.treeRelations, treeRelations.length),
    legacyTopics: availability(declared.legacyTopics, legacyTopics.length),
  });

  return frozen({
    contractVersion: PUBLIC_WORLD_CONTENT_PROJECTION_CONTRACT_VERSION,
    coverage,
    sources,
    occurrences,
    clusters,
    seriesCategories,
    findings,
    treeRelations,
    compatibility: frozen({ legacyTopics }),
    metrics: frozen({
      corpusSources: coverage.sources.available ? sources.length : null,
      occurrences: coverage.occurrences.available ? occurrences.length : null,
      clusters: coverage.clusters.available ? clusters.length : null,
      seriesCategories: coverage.seriesCategories.available ? seriesCategories.length : null,
      findings: coverage.findings.available ? findings.length : null,
      treeRelations: coverage.treeRelations.available ? treeRelations.length : null,
      legacyTopics: coverage.legacyTopics.available ? legacyTopics.length : null,
    }),
  });
}

/**
 * Combines already-built public content pages without fetching anything.
 *
 * It is deliberately an envelope composer rather than a second reader: the
 * caller decides which public pages were requested and retains the original
 * reader's access boundary. A metric is available only when every supplied
 * page made that dimension available. Therefore a failed/deferred page can
 * never turn into an apparently complete zero or partial corpus total.
 */
export function composePublicWorldContentProjectionPagesV1(pages = []) {
  const supplied = list(pages).filter((page) => page && page.contractVersion === PUBLIC_WORLD_CONTENT_PROJECTION_CONTRACT_VERSION);
  const fields = ["sources", "occurrences", "clusters", "seriesCategories", "findings", "treeRelations", "legacyTopics"];
  const coverage = Object.fromEntries(fields.map((field) => [field, {
    available: supplied.length > 0 && supplied.every((page) => page.coverage?.[field]?.available === true),
  }]));
  return buildPublicWorldContentProjectionV1({
    sources: supplied.flatMap((page) => list(page.sources)),
    occurrences: supplied.flatMap((page) => list(page.occurrences)),
    clusters: supplied.flatMap((page) => list(page.clusters)),
    seriesCategories: supplied.flatMap((page) => list(page.seriesCategories)),
    findings: supplied.flatMap((page) => list(page.findings)),
    treeRelations: supplied.flatMap((page) => list(page.treeRelations)),
    compatibility: { legacyTopics: supplied.flatMap((page) => list(page.compatibility?.legacyTopics)) },
    coverage,
  });
}
