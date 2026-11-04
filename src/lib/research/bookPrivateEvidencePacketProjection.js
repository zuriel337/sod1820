// Private Book evidence-packet projection.
//
// This pure adapter receives rows already returned by the existing authorized
// Book reader. It does not fetch, authorize, persist, canonicalize or publish.
// Candidate filtering remains delegated to the canonical publication-review
// projection so a foreign, private or already-public row cannot enter by a new
// path.

import {
  MAX_BOOK_PUBLICATION_REVIEW_LIMIT,
  projectBookPublicationReview,
} from "./bookPublicationReviewProjection.js";
import { researchRowToBookRepresentation } from "./bookResearchProjection.js";

export const BOOK_PRIVATE_EVIDENCE_PACKET_VERSION = "book_private_evidence_packet_v1";

const COMPLEX_SHAPES = new Set(["procedure", "matrix", "composition", "grammar", "spatial"]);
const VERIFIED_WITNESS_RE = /(source_witness_verified|witness_verified|visually_adjudicated|verified_reconstructed)/i;
const UNRESOLVED_RE = /(unresolved|partial|pending|ambiguous|mismatch|unadjudicated|unmapped|not_reproduced)/i;

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function nullable(value) {
  return value == null ? null : value;
}

function fixedDerivationInput(input) {
  return {
    value: nullable(input?.value),
    role: nullable(input?.role),
    originType: nullable(input?.origin_type),
    originStatement: nullable(input?.origin_statement),
    originRef: input?.origin_ref && typeof input.origin_ref === "object"
      ? { sourceLineIndex: nullable(input.origin_ref.source_line_index) }
      : null,
    state: nullable(input?.status),
  };
}

function fixedMediaReference(reference) {
  return {
    kind: nullable(reference?.kind),
    rawMarker: nullable(reference?.raw),
    filename: nullable(reference?.filename),
    resolvedUrl: nullable(reference?.resolved_url),
    resolutionState: nullable(reference?.resolution_status),
  };
}

function requirement(key, state, evidence = null) {
  return { key, state, evidence };
}

function witnessState(row, representation) {
  const explicit = clean(representation?.witnessState);
  if (explicit) return explicit;
  const verification = clean(row?.engine_detail?.verification_state);
  return /witness/i.test(verification) ? verification : null;
}

function witnessRequirement(row, item, representation) {
  const declaredState = witnessState(row, representation);
  const state = VERIFIED_WITNESS_RE.test(clean(declaredState))
    ? "ready"
    : declaredState ? "partial" : "missing";
  return requirement("witness_window", state, {
    declaredState,
    sourceRef: item.sourceRef,
    locator: item.sourceLocator,
  });
}

function structuralEvidence(row, item, representation) {
  const ext = row?.meta?.ext && typeof row.meta.ext === "object" ? row.meta.ext : {};
  const derivationInputs = Array.isArray(ext?.derivation?.inputs)
    ? ext.derivation.inputs.map(fixedDerivationInput)
    : [];
  const mediaReferences = Array.isArray(ext?.media_refs)
    ? ext.media_refs.map(fixedMediaReference)
    : [];
  const integrity = ext?.extraction_integrity && typeof ext.extraction_integrity === "object"
    ? ext.extraction_integrity
    : null;
  const procedureStepCount = Array.isArray(representation?.steps) ? representation.steps.length : 0;
  const gateApplies = Boolean(
    integrity
    || derivationInputs.length
    || mediaReferences.length
    || procedureStepCount
    || COMPLEX_SHAPES.has(representation?.shape),
  );
  const unresolvedInput = derivationInputs.some(input => !input.role || UNRESOLVED_RE.test(clean(input.state)));
  const unresolvedMedia = mediaReferences.some(reference => (
    !reference.resolvedUrl || UNRESOLVED_RE.test(clean(reference.resolutionState))
  ));
  const fidelity = clean(integrity?.fidelity_status) || item.extractionFidelity.state;
  const state = !gateApplies
    ? "not_applicable"
    : fidelity === "complete" && !unresolvedInput && !unresolvedMedia ? "ready"
      : (integrity || derivationInputs.length || mediaReferences.length || procedureStepCount) ? "partial" : "missing";

  return {
    gateApplies,
    state,
    evidence: {
      shape: representation?.shape || null,
      procedureStepCount,
      derivationInputs,
      mediaReferences,
      extractionIntegrity: integrity ? {
        arithmeticVerified: integrity.arithmetic_verified === true,
        semanticOperandCoverage: nullable(integrity.semantic_operand_coverage),
        mediaReferenceCoverage: nullable(integrity.media_reference_coverage),
        fidelityState: nullable(integrity.fidelity_status),
        contract: nullable(integrity.contract),
      } : null,
    },
  };
}

function packetFor(row, item) {
  const representation = researchRowToBookRepresentation(row);
  const structure = structuralEvidence(row, item, representation);
  const reviewLane = structure.gateApplies ? "complex" : "applicability";
  const requirements = [
    witnessRequirement(row, item, representation),
    requirement("locator_reconciliation", "missing", {
      storedLocator: item.sourceLocator,
      reviewedLocator: null,
    }),
    requirement("surrounding_context", "missing", {
      before: null,
      after: null,
    }),
    requirement("claim_scope", clean(item.statement) ? "partial" : "missing", {
      statement: item.statement,
    }),
    reviewLane === "complex"
      ? requirement("structured_trace", structure.state, structure.evidence)
      : requirement("applicability_rationale", "missing", {
        extractionFidelityState: item.extractionFidelity.state,
        rationale: null,
      }),
  ];
  const completeCount = requirements.filter(entry => entry.state === "ready").length;

  return {
    id: item.id,
    packetVersion: BOOK_PRIVATE_EVIDENCE_PACKET_VERSION,
    exposure: "authorized_private",
    publicationEffect: "none",
    claim: {
      kind: nullable(item.kind),
      statement: nullable(item.statement),
      value: nullable(item.value),
    },
    source: {
      ref: item.sourceRef,
      locator: item.sourceLocator,
      witnessState: witnessState(row, representation),
    },
    truthAxes: {
      verification: item.status.verification.state,
      governance: item.status.governance.state,
      publicationAccess: item.status.publicationAccess.state,
    },
    reviewLane,
    requirements,
    readiness: {
      completeCount,
      requiredCount: requirements.length,
      readyForFidelityVerdict: completeCount === requirements.length,
      fidelityDecision: null,
      humanGateRequired: true,
    },
  };
}

export function projectBookPrivateEvidencePackets(rows, options = {}) {
  const allReview = projectBookPublicationReview(rows, {
    book: options.book,
    sourceRefPrefixes: options.sourceRefPrefixes,
    limit: MAX_BOOK_PUBLICATION_REVIEW_LIMIT,
    offset: 0,
    focusId: options.focusId,
  });
  const pageReview = projectBookPublicationReview(rows, {
    book: options.book,
    sourceRefPrefixes: options.sourceRefPrefixes,
    limit: options.limit ?? MAX_BOOK_PUBLICATION_REVIEW_LIMIT,
    offset: options.offset,
    focusId: options.focusId,
  });
  const rowsById = new Map((Array.isArray(rows) ? rows : []).map(row => [clean(row?.id), row]));
  const allPackets = allReview.items
    .map(item => rowsById.has(item.id) ? packetFor(rowsById.get(item.id), item) : null)
    .filter(Boolean);
  const packets = pageReview.items
    .map(item => rowsById.has(item.id) ? packetFor(rowsById.get(item.id), item) : null)
    .filter(Boolean);
  const focusedPacket = pageReview.focusedItem && rowsById.has(pageReview.focusedItem.id)
    ? packetFor(rowsById.get(pageReview.focusedItem.id), pageReview.focusedItem)
    : null;

  return {
    accessMode: "authorized_private_review",
    publicationEffect: "none",
    packets,
    focusedPacket,
    summary: {
      totalPackets: allPackets.length,
      readyForFidelityVerdict: allPackets.filter(packet => packet.readiness.readyForFidelityVerdict).length,
      needsEvidence: allPackets.filter(packet => !packet.readiness.readyForFidelityVerdict).length,
      complex: allPackets.filter(packet => packet.reviewLane === "complex").length,
      applicability: allPackets.filter(packet => packet.reviewLane === "applicability").length,
    },
    page: pageReview.page,
  };
}
