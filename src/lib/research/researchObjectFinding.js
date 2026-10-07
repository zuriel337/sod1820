import { makeUniversalFinding, VALID_VERIFICATION_STATES } from "./universalFinding.js";
import { resolveResearchObjectPresentation } from "./researchObjectPresentation.js";

const VALID_VERIFICATION = new Set(VALID_VERIFICATION_STATES);

function clean(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cleanList(values) {
  return [...new Set((values || []).map(clean).filter(Boolean))];
}

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Shared one-tree research facets.
 *
 * This is a READ-ONLY projection over already structured research metadata.
 * It creates no taxonomy, method registry, graph edge or research family.
 * World / Projector / future writer surfaces may consume the same facets, but
 * each source-owned identity remains exactly where it already lives:
 * - method refs come only from structured engine fields and still require the
 *   canonical Method Registry for public naming/order;
 * - operator/quantity comes only from engine_detail.compound (never text regex);
 * - spatial family/cluster comes only from meta.ext.spatial_research;
 * - source occurrences remain provenance, not independent evidence.
 */
export function researchObjectFacets(row) {
  const detail = objectValue(row?.engine_detail);
  const compound = objectValue(detail.compound);
  const ext = objectValue(row?.meta?.ext);
  const gematria = objectValue(ext.gematria);
  const spatial = objectValue(ext.spatial_research);
  const mediaProfile = objectValue(ext.source_media_profile);
  const duplicateLineage = objectValue(ext.exact_duplicate_lineage);

  const compoundOperand = objectValue(compound.operand);
  const compoundOperands = Array.isArray(compound.operands) ? compound.operands.map(objectValue) : [];
  const methodRefs = cleanList([
    detail.claimed_method,
    detail.engine_method_tested,
    detail.method,
    compoundOperand.method,
    ...compoundOperands.map((operand) => operand.method),
    gematria.method_key,
    gematria.method,
  ]);

  const sourceRef = clean(row?.source_ref);
  const occurrenceRefs = cleanList([
    sourceRef,
    ...(Array.isArray(compound.occurrences) ? compound.occurrences : []),
    ...(Array.isArray(ext.source_refs) ? ext.source_refs : []),
  ]);

  const spatialRole = clean(spatial.role);
  const mediaClass = clean(mediaProfile.class);
  const spatial3d = [spatialRole, mediaClass].some((value) => /(?:^|_)3D(?:_|$)/i.test(value || ""));

  const compoundKind = clean(compound.kind);
  const multiplier = compoundKind === "quantity-product" ? finiteNumber(compound.quantity) : null;
  const computedResult = finiteNumber(compound.computedTotal ?? compound.result);

  const researchFocusKey = clean(spatial.research_focus_key);
  const cluster = clean(spatial.cluster);

  return {
    methods: {
      refs: methodRefs,
      registryResolutionRequired: methodRefs.length > 0,
    },
    operation: {
      compoundKind,
      multiplier,
      computedResult,
      linkCount: finiteNumber(compound.linkCount),
    },
    family: {
      researchFocusKey,
      cluster,
      spatialRole,
      spatial3d,
    },
    media: {
      class: mediaClass,
      loadBearingVisualCandidate: mediaProfile.load_bearing_visual_candidate === true,
    },
    provenance: {
      sourceRef,
      occurrenceRefs,
      duplicateOccurrenceCount: finiteNumber(duplicateLineage.occurrence_count),
    },
  };
}

export function researchObjectPersonalScope(row) {
  return clean(row?.meta?.ext?.personal_scope?.scope)?.toLowerCase() || null;
}

export function isGeneralResearchProjectionEligible(row) {
  return researchObjectPersonalScope(row) !== "person_only";
}

function verificationFrom(row) {
  const detail = row?.engine_detail && typeof row.engine_detail === "object" ? row.engine_detail : {};
  const explicit = clean(detail.verification_state);
  const verification_state = explicit && VALID_VERIFICATION.has(explicit) ? explicit : null;

  return {
    claimed_expression: detail.claimed_expression ?? null,
    claimed_method: detail.claimed_method ?? null,
    claimed_value: detail.claimed_value ?? null,
    engine_method_tested: detail.engine_method_tested ?? detail.engine ?? null,
    engine_result: detail.engine_result ?? detail.result ?? null,
    statement_lang: detail.statement_lang ?? null,
    verification_state,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Explicit PER-OBJECT attribution only (Research Intake §6.7: attribution is
 * per-object and never inherited). Resolves only when the row itself carries
 * BOTH meta.attribution_type and a structurally valid meta.contributor_id.
 * Structural only: provenance.createdBy stays null (no canonical owner/vocabulary for a
 * string identity namespace exists); the exact pair is kept in projection.dimensions.attribution.
 * Never inferred from row.contributor text, source, status, uploader/Human Gate,
 * engine_verified or the source occurrence. Attribution is not part of identity.
 */
export function resolveExplicitAttribution(row) {
  const meta = row?.meta && typeof row.meta === "object" ? row.meta : {};
  const type = clean(meta.attribution_type);
  const contributorId = clean(meta.contributor_id);
  const validId = contributorId && UUID_RE.test(contributorId) ? contributorId.toLowerCase() : null;
  return {
    type,
    contributorId: validId,
    resolved: Boolean(type && validId),
  };
}

/**
 * Read-only projection of one durable research_objects row into the shared
 * Universal Finding envelope.
 *
 * Important truth-axis rules:
 * - research_objects.kind is NOT mapped to Universal Finding stage. These are
 *   domain-owned epistemic vocabularies and no global translation exists.
 * - research_objects.status IS governance and may be carried as status.
 * - engine_detail is the verification authority; engine_verified is not used to
 *   manufacture match/mismatch when engine_detail has no explicit state.
 * - privacy_scope is carried as the source-owned access tier.
 * - promoted_node_id is an existing graph identity pointer, never a promotion.
 * - human presentation is a locale projection only. It never replaces statement,
 *   source/source_ref, verification, governance or access state.
 */
export function researchObjectToUniversalFinding(row, { locale = "he" } = {}) {
  if (!row?.id) return null;

  const sourceRef = clean(row.source_ref);
  const promotedNodeId = clean(row.promoted_node_id);
  const terms = Array.isArray(row.terms) ? row.terms.filter(Boolean) : [];
  const presentation = resolveResearchObjectPresentation(row, { locale });
  const attribution = resolveExplicitAttribution(row);
  const researchFacets = researchObjectFacets(row);
  const rawStatementRef = { researchObjectId: String(row.id), field: "statement" };

  return makeUniversalFinding({
    kind: "research-object",
    stage: null,
    status: row.status ?? null,
    subject: {
      type: "research-object",
      key: String(row.id),
      label: presentation.title,
      value: row.value ?? null,
      lang: presentation.hasHumanPresentation
        ? presentation.resolvedLocale
        : presentation.statementLang || null,
    },
    source: {
      engine: null,
      adapter: "research-object-v1",
      sourceRef,
      method: null,
      corpus: clean(row.source),
      // Source witness language is distinct from the research statement/presentation language.
      // Unknown stays null; a Latin-script statement is never silently called English.
      lang: presentation.sourceWitnessLang,
    },
    identity: {
      sourceIdentity: { researchObjectId: String(row.id) },
      entityRef: promotedNodeId ? `node:${promotedNodeId}` : null,
      relationRef: null,
    },
    verification: verificationFrom(row),
    evidence: {
      refs: sourceRef ? [sourceRef] : [],
      facts: terms.map((term) => ({ type: "term", value: term })),
      score: row.confidence ?? null,
      confidence: row.confidence ?? null,
    },
    access: {
      tier: row.privacy_scope ?? null,
      reason: null,
    },
    provenance: {
      createdBy: null,
      createdAt: row.created_at || undefined,
      inputRef: sourceRef,
    },
    projection: {
      anchors: promotedNodeId ? [{ space: "reality-graph", id: promotedNodeId }] : [],
      relations: [],
      dimensions: {
        researchObjectKind: row.kind ?? null,
        researchFacets,
        ...(attribution.type || attribution.contributorId
          ? { attribution: { type: attribution.type, contributorId: attribution.contributorId, resolved: attribution.resolved, explicit: attribution.resolved } }
          : {}),
        presentation: {
          requestedLocale: presentation.requestedLocale,
          resolvedLocale: presentation.resolvedLocale,
          hasHumanPresentation: presentation.hasHumanPresentation,
          fallbackMode: presentation.fallbackMode,
          statementLang: presentation.statementLang,
          statementRole: presentation.statementRole,
          sourceWitnessLang: presentation.sourceWitnessLang,
          sourceWitnessLangBasis: presentation.sourceWitnessLangBasis,
          rawStatementRef,
          sourceLocator: sourceRef,
          typeLabel: presentation.typeLabel,
          contextLine: presentation.contextLine,
          attributionLabel: presentation.attributionLabel,
          attributionState: presentation.attributionState,
          occurrenceLabel: presentation.occurrenceLabel,
          dateLabel: presentation.dateLabel,
          originalLanguage: presentation.originalLanguage,
        },
      },
    },
    view: {
      rendererHints: {
        presentation: {
          title: presentation.title,
          summary: presentation.summary,
          sourceLabel: presentation.sourceLabel,
          locale: presentation.resolvedLocale,
          fallbackMode: presentation.fallbackMode,
          typeLabel: presentation.typeLabel,
          contextLine: presentation.contextLine,
          attributionLabel: presentation.attributionLabel,
          attributionState: presentation.attributionState,
          occurrenceLabel: presentation.occurrenceLabel,
          dateLabel: presentation.dateLabel,
          rawStatementRef,
        },
      },
    },
  });
}

export function researchObjectsToUniversalFindings(rows, options = {}) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => researchObjectToUniversalFinding(row, options))
    .filter(Boolean);
}

export default researchObjectToUniversalFinding;
