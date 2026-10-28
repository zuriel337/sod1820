// Election branch → World public-content projection.
//
// This is a consumer of the generic One Tree branch and existing public
// readers. It creates neither graph rows nor a new election/source reader.
// Branch candidates remain candidates; only the already-existing World DTO is
// emitted for the public World preview.

import { ELECTIONS_ISRAEL_21_26_BUNDLE } from "./electionsIsrael21_26Seed2029.js";
import { buildPublicWorldContentProjectionV1 } from "./publicWorldContentProjectionV1.js";
import { fetchGallerySourceContext, fetchPublicWorldPostSource } from "./entityHubProjection.js";

const clean = (value) => value == null ? "" : String(value).trim();
const list = (value) => Array.isArray(value) ? value : [];
const unique = (value) => [...new Set(value.filter(Boolean))];

function galleryId(ref) {
  const match = clean(ref).match(/^gallery-image:([0-9a-f-]{36})$/i);
  return match ? match[1].toLowerCase() : null;
}

function postId(ref) {
  const match = clean(ref).match(/^post:(\d+)$/);
  return match ? Number(match[1]) : null;
}

function exactSourceRef(source, galleryById, postById) {
  const galleryImageId = galleryId(source?.canonicalRef);
  if (galleryImageId) return galleryById.get(galleryImageId)?.provenance?.sourceRef || null;
  const id = postId(source?.canonicalRef);
  if (id != null) return postById.get(id)?.id != null ? `posts:${id}` : null;
  return clean(source?.locator) || null;
}

function sourceHref(source, galleryById, postById) {
  const galleryImageId = galleryId(source?.canonicalRef);
  if (galleryImageId) return galleryById.get(galleryImageId)?.reopen?.galleries?.[0]?.href || null;
  const id = postId(source?.canonicalRef);
  if (id != null) {
    const post = postById.get(id);
    return post?.slug ? `/post/${encodeURIComponent(post.slug)}` : null;
  }
  return clean(source?.locator) || null;
}

function sourceMedia(source, galleryById) {
  const id = galleryId(source?.canonicalRef);
  const item = id ? galleryById.get(id) : null;
  if (!item?.imageUrl) return [];
  return [{
    mediaRef: item.mediaId || `gallery_images:${id}`,
    kind: "image",
    href: item.imageUrl,
    alt: item.label || source.label || null,
    provenance: item.provenance?.sourceRef || null,
  }];
}

function collectSourceIds(recordId, recordsById, seen = new Set()) {
  if (!recordId || seen.has(recordId)) return [];
  seen.add(recordId);
  const record = recordsById.get(recordId);
  if (!record) return [];
  return unique([
    ...list(record.sourceIds),
    ...list(record.dependsOn).flatMap((id) => collectSourceIds(id, recordsById, seen)),
  ]);
}

function evidenceFindingRows(bundle, sourceRefById) {
  const recordsById = new Map(list(bundle?.branchContract?.evidenceRecords).map((row) => [row?.id, row]));
  return list(bundle?.resultBundle?.findings).flatMap((finding) => {
    if (finding?.access?.tier !== "public") return [];
    const recordId = finding?.provenance?.inputRef;
    const sourceRefs = collectSourceIds(recordId, recordsById)
      .map((id) => sourceRefById.get(id))
      .filter(Boolean);
    if (!sourceRefs.length) return [];
    return [{
      findingRef: finding.id,
      sourceRefs,
      href: null,
      stage: finding.stage || null,
      verificationState: finding.verification?.verification_state || null,
      // Human Gate status is carried as a state, never rewritten as approval.
      publicationState: finding.status || null,
    }];
  });
}

/**
 * Pure: turns a compiled generic One Tree branch plus rows already admitted by
 * existing public readers into the shared World content DTO. It deliberately
 * does not promote relationCandidates into treeRelations.
 */
export function buildElectionWorldContentProjection({
  bundle = ELECTIONS_ISRAEL_21_26_BUNDLE,
  galleryItems = [],
  publicPosts = [],
} = {}) {
  const galleryById = new Map(list(galleryItems)
    .filter((row) => row?.galleryImageId && row?.access?.scope === "public")
    .map((row) => [String(row.galleryImageId).toLowerCase(), row]));
  const postById = new Map(list(publicPosts).filter((row) => Number.isSafeInteger(row?.id)).map((row) => [row.id, row]));
  const publicSources = list(bundle?.sources).filter((source) => source?.accessTier === "public");
  const sourceRefById = new Map();
  const sources = [];
  const occurrences = [];

  for (const source of publicSources) {
    const sourceRef = exactSourceRef(source, galleryById, postById);
    if (!sourceRef) continue;
    sourceRefById.set(source.id, sourceRef);
    if (!sources.some((row) => row.sourceRef === sourceRef)) {
      sources.push({
        sourceRef,
        title: clean(source.label) || null,
        sourceHref: sourceHref(source, galleryById, postById),
        media: sourceMedia(source, galleryById),
        publisher: { key: "elections-israel", label: "בחירות בישראל" },
      });
    }
    occurrences.push({
      occurrenceRef: `elections-israel-21-26:${source.id}`,
      sourceRef,
      // A branch/seed id is traceability metadata, not an anchor inside the
      // public source. A feed item without a verified anchor stays unanchored.
      locator: clean(source?.canonicalRef) || null,
      href: sourceHref(source, galleryById, postById),
      times: {
        occurredAt: null,
        // Capture time never substitutes for a source publication timestamp.
        publishedAt: source?.attributes?.article_metadata_published_at || null,
        updatedAt: null,
      },
    });
  }

  const findings = evidenceFindingRows(bundle, sourceRefById);
  return buildPublicWorldContentProjectionV1({
    sources,
    occurrences,
    seriesCategories: [{
      key: "elections-israel",
      kind: "series",
      label: "בחירות בישראל",
      sourceRefs: sources.map((row) => row.sourceRef),
    }],
    findings,
    compatibility: { legacyTopics: [] },
    coverage: {
      sources: { available: true },
      occurrences: { available: true },
      clusters: { available: false },
      seriesCategories: { available: true },
      findings: { available: true },
      // Candidates are intentionally not graph edges. Existing graph links are
      // read by the canonical Topic/Graph projection, not recreated here.
      treeRelations: { available: false },
      legacyTopics: { available: false },
    },
  });
}

/** Uses only the existing bounded public gallery/post readers for enrichment. */
export async function fetchElectionWorldContentProjection({
  bundle = ELECTIONS_ISRAEL_21_26_BUNDLE,
  galleryReader = fetchGallerySourceContext,
  postReader = fetchPublicWorldPostSource,
} = {}) {
  const galleryIds = unique(list(bundle?.sources).map((source) => galleryId(source?.canonicalRef)));
  const ids = unique(list(bundle?.sources).map((source) => postId(source?.canonicalRef)).filter(Number.isSafeInteger));
  const [galleryResult, postResults] = await Promise.all([
    galleryReader({ imageIds: galleryIds }),
    Promise.all(ids.map(async (id) => {
      try { return await postReader({ postId: id }); } catch { return null; }
    })),
  ]);
  return Object.freeze({
    contentProjection: buildElectionWorldContentProjection({
      bundle,
      galleryItems: galleryResult?.items || [],
      publicPosts: postResults.filter(Boolean),
    }),
    summary: Object.freeze({
      bundleId: bundle?.bundleId || null,
      cycles: list(bundle?.entities).filter((entity) => entity?.kind === "election_cycle").map((entity) => entity.label),
      sources: list(bundle?.sources).length,
      sourceFacts: list(bundle?.evidence?.source_fact).length,
      engineCalculations: list(bundle?.evidence?.engine_calculation).length,
      systemDerivations: list(bundle?.evidence?.derivation).length,
      interpretations: list(bundle?.evidence?.interpretation).length,
      reviewState: bundle?.reviewState || null,
      galleryPublicCount: list(galleryResult?.items).length,
    }),
  });
}
