// 2029 Research OS admission boundary for media/document/OCR/automation inputs.
// Pure projection only: no DB writes, no truth promotion, no new store/registry.

const VERIFICATION_STATES = new Set(['match', 'mismatch', 'method_unknown', 'not_tested']);

function cleanVerification(input) {
  if (!input || typeof input !== 'object') {
    return { valid: true, state: 'not_tested', owner: null, detail: null };
  }

  // truth_axes_foundation_law v3 PR2: explicit invalid semantic input must never
  // be silently laundered into a valid-looking verification state.
  if (input.state != null && !VERIFICATION_STATES.has(input.state)) {
    return {
      valid: false,
      reason: 'invalid_verification_state',
      inputState: String(input.state),
    };
  }

  return {
    valid: true,
    state: input.state ?? 'not_tested',
    owner: input.owner || null,
    detail: input.detail ?? null,
  };
}

export function makeResearchAdmissionEnvelope({
  sourceType,
  sourceRef,
  intrinsicPayload,
  historicalContext = null,
  provenance = null,
  extraction = null,
  verification = null,
  projectionReason = null,
  automation = null,
  generatedRepresentation = null,
  legacyRelations = [],
} = {}) {
  if (!sourceType || !sourceRef) {
    return { admitted: false, reason: 'missing_source_identity' };
  }

  const verificationPayload = cleanVerification(verification);
  if (!verificationPayload.valid) {
    return {
      admitted: false,
      reason: verificationPayload.reason,
      invalidVerificationState: verificationPayload.inputState,
    };
  }

  const extractionPayload = extraction && typeof extraction === 'object'
    ? {
        status: extraction.status || 'unknown',
        text: extraction.text ?? null,
        numbers: Array.isArray(extraction.numbers) ? extraction.numbers : [],
        metadata: extraction.metadata ?? null,
        extractedAt: extraction.extractedAt ?? null,
        uncertainty: extraction.uncertainty ?? 'unverified_extraction',
        epistemicRole: 'extraction',
        isFact: false,
      }
    : null;

  return {
    admitted: true,
    semanticRole: 'representation',
    source: {
      type: sourceType,
      ref: sourceRef,
      provenance: provenance ?? null,
    },
    intrinsicPayload: intrinsicPayload ?? null,
    historicalContext: historicalContext ?? null,
    extraction: extractionPayload,
    verification: {
      state: verificationPayload.state,
      owner: verificationPayload.owner,
      detail: verificationPayload.detail,
    },
    governance: {
      humanGateRequiredForCanonicalPromotion: true,
      canonical: false,
      published: false,
    },
    projection: {
      reason: projectionReason ?? null,
      maySurface: Boolean(projectionReason),
    },
    automation: automation
      ? {
          producer: automation.producer || null,
          runRef: automation.runRef || null,
          outputRole: 'extraction_or_candidate',
          isHumanGate: false,
        }
      : null,
    generatedRepresentation: generatedRepresentation
      ? {
          ...generatedRepresentation,
          independentEvidence: false,
        }
      : null,
    legacyRelations: Array.isArray(legacyRelations)
      ? legacyRelations.map((relation) => ({
          ...relation,
          authority: 'compatibility_only',
          verified: false,
          eligibleForTruthProjection: false,
        }))
      : [],
  };
}

// reality_graph_law v8: Media Representation identity != Placement.
// STRONG identity = exact canonical public-storage object of the canonical
// project only. No filename-only / OCR / value / similarity matching.
const CANONICAL_SUPABASE_HOST = 'linswmnnkjxvweumprav.supabase.co';
const PUBLIC_STORAGE_PREFIX = '/storage/v1/object/public/';

export const SAME_ARTIFACT_DEPENDENCY_CLASS = 'SAME_ARTIFACT/REPRESENTATION';

export function resolveGalleryArtifactIdentity(imageUrl) {
  const original = typeof imageUrl === 'string' ? imageUrl : null;
  const unresolved = (reason) => ({ resolved: false, reason, originalUrl: original, key: null });
  if (!original) return unresolved('missing_url');

  let url;
  try {
    url = new URL(original);
  } catch {
    return unresolved('malformed_or_relative_url');
  }
  if (url.protocol !== 'https:' || url.host !== CANONICAL_SUPABASE_HOST || url.port) {
    return unresolved('noncanonical_host');
  }
  if (url.search || url.hash || url.username || url.password) {
    return unresolved('query_or_fragment_url');
  }
  if (!url.pathname.startsWith(PUBLIC_STORAGE_PREFIX)) return unresolved('not_public_storage_path');

  const rest = url.pathname.slice(PUBLIC_STORAGE_PREFIX.length);
  const slash = rest.indexOf('/');
  if (slash <= 0 || slash === rest.length - 1) return unresolved('unknown_storage_path');
  const bucket = rest.slice(0, slash);
  const objectPath = rest.slice(slash + 1);
  if (objectPath.split('/').some((seg) => seg === '' || seg === '.' || seg === '..')) {
    return unresolved('unknown_storage_path');
  }
  // Keep the parser's canonical encoded pathname: decoding reserved bytes
  // (e.g. %2F) would collapse distinct object keys into one identity.
  return {
    resolved: true,
    strength: 'STRONG_STORAGE_OBJECT',
    key: `storage://${rest}`,
    bucket,
    objectPath,
    originalUrl: original,
  };
}

export function galleryImageToResearchAdmission(row = {}, context = {}) {
  const id = row.id ? String(row.id) : null;
  if (!id) return { admitted: false, reason: 'missing_source_identity' };

  const identity = resolveGalleryArtifactIdentity(row.image_url);

  const envelope = makeResearchAdmissionEnvelope({
    sourceType: 'gallery_media',
    sourceRef: `gallery_images:${id}`,
    // Artifact-level payload only: identity of the object itself. Row-local
    // meaning (values, name, tags, type, thumb, ...) lives in placementContext.
    intrinsicPayload: {
      imageUrl: row.image_url || null,
      artifactKey: identity.resolved ? identity.key : null,
    },
    historicalContext: {
      galleryId: row.gallery_id || null,
      wpGalleryId: row.wp_gallery_id ?? null,
      wpImageId: row.wp_image_id ?? null,
      ordering: row.ordering ?? null,
      relatedPostId: row.related_post_id || null,
      occurredAt: row.occurred_at || null,
      createdAt: row.created_at || null,
      orderKnown: row.ordering != null,
    },
    provenance: {
      source: row.source || null,
      witness: context.witness ?? null,
      lineage: context.lineage ?? null,
    },
    extraction: row.ocr_status || row.ocr_text || row.ocr_meta
      ? {
          status: row.ocr_status || 'unknown',
          text: row.ocr_text || null,
          numbers: Array.isArray(row.ocr_numbers) ? row.ocr_numbers : [],
          metadata: row.ocr_meta ?? null,
          extractedAt: row.ocr_at || null,
          uncertainty: context.extractionUncertainty || 'unverified_extraction',
        }
      : null,
    verification: context.verification,
    projectionReason: context.projectionReason,
    automation: context.automation,
    generatedRepresentation: context.generatedRepresentation,
    legacyRelations: context.legacyRelations,
  });
  if (!envelope.admitted) return envelope;

  return {
    ...envelope,
    // Two distinct identities: placement (source.ref) vs artifact (below).
    artifactIdentity: identity.resolved
      ? {
          resolved: true,
          strength: identity.strength,
          key: identity.key,
          bucket: identity.bucket,
          objectPath: identity.objectPath,
          originalUrl: identity.originalUrl,
        }
      : { resolved: false, reason: identity.reason, key: null, originalUrl: identity.originalUrl },
    placementContext: {
      placementRef: `gallery_images:${id}`,
      isArtifactTruth: false,
      primaryValue: row.primary_value ?? null,
      allValues: Array.isArray(row.all_values) ? row.all_values : [],
      relatedValues: Array.isArray(row.related_values) ? row.related_values : [],
      imageType: row.image_type || null,
      name: row.name || null,
      description: row.description || null,
      tags: Array.isArray(row.tags) ? row.tags : [],
      importance: row.importance ?? null,
      retention: row.retention || null,
      thumbUrl: row.thumb_url || null,
      access: {
        published: row.published ?? null,
        curatorHidden: row.curator_hidden ?? null,
        minTier: row.min_tier ?? null,
        curationStatus: row.curation_status ?? null,
      },
    },
  };
}

// Pure composition over admissions already produced by galleryImageToResearchAdmission.
// Groups ONLY by strong artifact identity. Not an access resolver: the caller
// passes access-filtered input or an `isVisible(admission)` predicate; excluded
// placements contribute nothing (no fields, no counts) to the output.
// Full already-filtered placement context; no field is promoted to artifact truth.
function projectPlacement(adm) {
  return {
    placementRef: adm.placementContext.placementRef,
    primaryValue: adm.placementContext.primaryValue,
    imageType: adm.placementContext.imageType,
    access: adm.placementContext.access,
    placementContext: adm.placementContext,
    historicalContext: adm.historicalContext ?? null,
    source: adm.source ?? null,
    extraction: adm.extraction ?? null,
  };
}

export function composeGalleryArtifactGroups(admissions = [], { isVisible = null } = {}) {
  const seen = new Set();
  const groups = new Map();
  const unresolved = [];

  for (const adm of Array.isArray(admissions) ? admissions : []) {
    if (!adm || adm.admitted !== true || !adm.placementContext) continue;
    if (typeof isVisible === 'function' && !isVisible(adm)) continue;
    const ref = adm.placementContext.placementRef;
    if (seen.has(ref)) continue;
    seen.add(ref);

    if (adm.artifactIdentity?.resolved) {
      const key = adm.artifactIdentity.key;
      if (!groups.has(key)) {
        groups.set(key, { artifactKey: key, artifactIdentity: adm.artifactIdentity, placements: [] });
      }
      groups.get(key).placements.push(adm);
    } else {
      unresolved.push(adm);
    }
  }

  const artifactGroups = [...groups.values()].map((g) => {
    const values = g.placements.map((p) => p.placementContext.primaryValue);
    const types = g.placements.map((p) => p.placementContext.imageType);
    const distinct = (arr) => [...new Set(arr.filter((v) => v != null))];
    return {
      artifactKey: g.artifactKey,
      artifactIdentity: g.artifactIdentity,
      dependencyClass: SAME_ARTIFACT_DEPENDENCY_CLASS,
      // One artifact lineage unit only; NOT one independently supported evidence item.
      artifactLineageUnit: 1,
      // Independence beyond this same-artifact group is unproven until a higher-level dependency classifier decides.
      independenceBeyondArtifactGroup: 'UNKNOWN',
      placementRefs: g.placements.map((p) => p.placementContext.placementRef),
      placements: g.placements.map(projectPlacement),
      // Honest variance across placements; never elected into artifact truth.
      placementVariance: {
        isTruthConflict: false,
        primaryValues: distinct(values),
        imageTypes: distinct(types),
        hasValueVariance: distinct(values).length > 1,
        hasImageTypeVariance: distinct(types).length > 1,
      },
    };
  });

  return {
    artifactGroups,
    // Unresolved identity = dependency UNKNOWN (not zero contribution); each
    // placement stays separate and is never counted in a proven lineage total.
    unresolvedPlacements: unresolved.map((a) => ({
      ...projectPlacement(a),
      reason: a.artifactIdentity?.reason ?? 'unresolved',
      dependencyClass: 'UNKNOWN',
    })),
    placementCount: seen.size,
    strongArtifactLineageCount: artifactGroups.length,
    unresolvedLineageCount: unresolved.length,
    independenceBeyondArtifactGroup: 'UNKNOWN',
  };
}

export function videoAssetToResearchAdmission(asset = {}, context = {}) {
  const publicId = asset.public_id ? String(asset.public_id) : null;
  if (!publicId) return { admitted: false, reason: 'missing_source_identity' };

  const series = Array.isArray(asset.series_keys) ? asset.series_keys.filter(Boolean) : [];
  const ciphers = Array.isArray(asset.cipher_slugs) ? asset.cipher_slugs.filter(Boolean) : [];
  const topics = Array.isArray(asset.topics) ? asset.topics.filter(Boolean) : [];
  const placements = Array.isArray(asset.placements) ? asset.placements : [];

  const legacyRelations = [
    ...series.map(key => ({ type: 'series', target: key })),
    ...ciphers.map(slug => ({ type: 'cipher', target: slug })),
    ...placements
      .filter(row => row?.page_url)
      .map(row => ({ type: 'placement', target: row.page_url, sourceType: row.source_type || null })),
  ];

  return makeResearchAdmissionEnvelope({
    sourceType: 'video_asset_projection',
    sourceRef: `video:${publicId}`,
    intrinsicPayload: {
      publicId,
      mediaKind: asset.video_kind || 'video',
      mediaUrl: asset.media_url || null,
      youtubeId: asset.youtube_id || null,
      title: asset.title || null,
      posterUrl: asset.poster_url || null,
      thumbUrl: asset.thumb_url || null,
      primaryPageUrl: asset.primary_page_url || null,
      placementCount: Number(asset.placement_count || placements.length || 0),
      topics,
      series,
      cipherSlugs: ciphers,
    },
    historicalContext: {
      firstSeenAt: asset.first_seen_at || null,
      lastSeenAt: asset.last_seen_at || null,
      placements,
      sourceTypes: Array.isArray(asset.source_types) ? asset.source_types : [],
    },
    provenance: {
      source: 'video_media_assets_v1',
      witness: context.witness ?? null,
      lineage: context.lineage ?? 'Unified Video Projection 2029 v1',
    },
    extraction: context.extraction ?? null,
    verification: context.verification,
    projectionReason: context.projectionReason || 'public_video_asset',
    automation: context.automation,
    legacyRelations,
  });
}
