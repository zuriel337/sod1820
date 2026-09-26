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

export function galleryImageToResearchAdmission(row = {}, context = {}) {
  const id = row.id ? String(row.id) : null;
  if (!id) return { admitted: false, reason: 'missing_source_identity' };

  return makeResearchAdmissionEnvelope({
    sourceType: 'gallery_media',
    sourceRef: `gallery_images:${id}`,
    intrinsicPayload: {
      mediaId: id,
      mediaKind: row.image_type || 'unknown',
      imageUrl: row.image_url || null,
      thumbUrl: row.thumb_url || null,
      name: row.name || null,
      description: row.description || null,
      tags: Array.isArray(row.tags) ? row.tags : [],
      retention: row.retention || null,
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
}
