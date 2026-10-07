import { makeUniversalFinding, VALID_VERIFICATION_STATES } from "./universalFinding.js";
import { resolveResearchObjectPresentation } from "./researchObjectPresentation.js";

const VALID_VERIFICATION = new Set(VALID_VERIFICATION_STATES);

function clean(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
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

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function methodRef(token, basis) {
  const value = clean(token);
  if (!value) return null;
  return {
    token: value,
    namespace: /^[a-z0-9_+.-]+$/i.test(value) ? "db_column_or_alias" : "method_key",
    basis,
    registryResolutionRequired: true,
  };
}

function verifiedCompoundOperationShape(compound) {
  if (!compound || typeof compound !== "object" || Array.isArray(compound) || !Object.keys(compound).length) return null;
  const raw = clean(compound.raw) || clean(compound.text) || clean(compound.origRaw);
  const verifiedComposite = clean(compound.status) === "ENGINE_VERIFIED_COMPOSITE";
  const factors = [];
  const addFactor = (value) => {
    const n = finiteNumber(value);
    if (n == null || factors.includes(n)) return;
    factors.push(n);
  };

  const quantity = finiteNumber(compound.quantity);
  if (quantity != null) addFactor(quantity);

  // Deterministic parsing is allowed only over the engine-owned, verified compound expression.
  // Never inspect row.statement here. The factors are projection/filter hints, not new calculations.
  if (verifiedComposite && raw) {
    for (const match of raw.matchAll(/(?:×|x)\s*(\d+(?:\.\d+)?)/gi)) addFactor(match[1]);
    for (const match of raw.matchAll(/(\d+(?:\.\d+)?)\s*(?:×|x)/gi)) addFactor(match[1]);
    for (const match of raw.matchAll(/(\d+(?:\.\d+)?)\s*פעמים/g)) addFactor(match[1]);
  }

  const operators = [];
  const compoundKind = clean(compound.kind);
  if (compoundKind && /product/i.test(compoundKind)) operators.push("multiply");
  if (verifiedComposite && raw && /×|x/i.test(raw) && !operators.includes("multiply")) operators.push("multiply");
  if (verifiedComposite && raw && /\+/.test(raw)) operators.push("add");

  return {
    kind: compoundKind,
    multiplier: quantity,
    factors,
    operators,
    result: finiteNumber(compound.result),
    computedTotal: finiteNumber(compound.computedTotal),
    linkCount: finiteNumber(compound.linkCount),
    status: clean(compound.status),
    basis: verifiedComposite ? "verified_engine_compound" : "structured_compound",
  };
}

/**
 * Shared one-tree filtering facets extracted only from already-structured research metadata.
 * No statement-text guessing and no new taxonomy: method identity is resolved later through
 * canonical_methods_registry_law; spatial/family identity is carried only when the source row
 * already owns meta.ext.spatial_research; operation shape comes only from engine_detail.compound.
 */
export function researchObjectFacetDimensions(row, { registryRows = [], sourceOccurrence = null } = {}) {
  const detail = asObject(row?.engine_detail);
  const compound = asObject(detail.compound);
  const ext = asObject(row?.meta?.ext);
  const spatial = asObject(ext.spatial_research);
  const mediaProfile = asObject(ext.source_media_profile);
  const duplicate = asObject(ext.exact_duplicate_lineage);
  const gematria = asObject(ext.gematria);

  const methodRefs = [];
  const addMethod = (token, basis) => {
    const ref = methodRef(token, basis);
    if (!ref || methodRefs.some((item) => item.token === ref.token && item.namespace === ref.namespace)) return;
    methodRefs.push(ref);
  };

  addMethod(detail.claimed_method, "engine_detail.claimed_method");
  addMethod(detail.engine_method_tested, "engine_detail.engine_method_tested");
  addMethod(detail.method, "engine_detail.method");
  addMethod(gematria.method_key, "meta.ext.gematria.method_key");
  addMethod(gematria.method, "meta.ext.gematria.method");
  addMethod(compound?.operand?.method, "engine_detail.compound.operand.method");
  for (const operand of Array.isArray(compound.operands) ? compound.operands : []) {
    addMethod(operand?.method, "engine_detail.compound.operands[].method");
  }
  for (const component of Array.isArray(detail.method_components) ? detail.method_components : []) {
    addMethod(component?.method_key || component?.method, "engine_detail.method_components[].method_key");
  }

  const registryByMethodKey = new Map();
  const registryByDbColumn = new Map();
  for (const registryRow of Array.isArray(registryRows) ? registryRows : []) {
    const methodKey = clean(registryRow?.method_key);
    const dbColumn = clean(registryRow?.db_column);
    if (methodKey) registryByMethodKey.set(methodKey, registryRow);
    if (dbColumn) registryByDbColumn.set(dbColumn, registryRow);
  }
  const canonicalMethodMap = new Map();
  for (const ref of methodRefs) {
    const registry = registryByMethodKey.get(ref.token) || registryByDbColumn.get(ref.token) || null;
    const methodKey = clean(registry?.method_key);
    if (!methodKey) continue;
    const current = canonicalMethodMap.get(methodKey) || {
      methodKey,
      dbColumn: clean(registry?.db_column),
      displayLabel: clean(registry?.display_label) || methodKey,
      refs: [],
      registryResolved: true,
    };
    current.refs.push({ token: ref.token, namespace: ref.namespace, basis: ref.basis });
    canonicalMethodMap.set(methodKey, current);
  }
  const canonicalMethods = [...canonicalMethodMap.values()];

  const methodComponents = (Array.isArray(detail.method_components) ? detail.method_components : [])
    .map((component) => {
      const rawMethod = clean(component?.method_key || component?.method);
      if (!rawMethod) return null;
      const registry = registryByMethodKey.get(rawMethod) || registryByDbColumn.get(rawMethod) || null;
      return {
        methodKey: clean(registry?.method_key) || rawMethod,
        dbColumn: clean(registry?.db_column) || null,
        displayLabel: clean(registry?.display_label) || rawMethod,
        registryResolved: Boolean(registry),
        expression: clean(component?.expression) || null,
        claimedValue: finiteNumber(component?.claimed_value),
        engineResult: finiteNumber(component?.engine_result),
        verificationState: clean(component?.verification_state) || null,
        verifiedVia: clean(component?.verified_via) || null,
      };
    })
    .filter(Boolean);

  const sourceMethods = (Array.isArray(sourceOccurrence?.methodMentions) ? sourceOccurrence.methodMentions : [])
    .map((mention) => ({
      token: clean(mention?.token),
      methodKey: clean(mention?.methodKey),
      displayLabel: clean(mention?.displayLabel) || clean(mention?.token),
      state: clean(mention?.state),
      sourceAttested: mention?.sourceAttested === true,
      appliesToFinding: mention?.appliesToFinding === true,
    }))
    .filter((mention) => mention.token && mention.sourceAttested);

  const operation = verifiedCompoundOperationShape(compound);

  const family = Object.keys(spatial).length ? {
    key: clean(spatial.research_focus_key),
    cluster: clean(spatial.cluster),
    role: clean(spatial.role),
    classification: clean(spatial.classification),
  } : null;

  const sourceOccurrenceRef = clean(row?.source_ref) || clean(spatial.source_ref) || clean(mediaProfile.source_ref);
  const occurrenceRefs = [];
  const addOccurrence = (value) => {
    const ref = clean(value);
    if (ref && !occurrenceRefs.includes(ref)) occurrenceRefs.push(ref);
  };
  addOccurrence(row?.source_ref);
  addOccurrence(spatial.source_ref);
  addOccurrence(mediaProfile.source_ref);
  for (const ref of Array.isArray(compound.occurrences) ? compound.occurrences : []) addOccurrence(ref);
  for (const ref of Array.isArray(ext.source_refs) ? ext.source_refs : []) addOccurrence(ref);
  for (const ref of Array.isArray(row?.meta?.source_refs) ? row.meta.source_refs : []) addOccurrence(ref);

  const duplicateOccurrenceCount = finiteNumber(duplicate.occurrence_count);
  const spatialRole = family?.role || null;
  const mediaClass = clean(mediaProfile.class);
  const spatial3d = [spatialRole, mediaClass].some((value) => /(?:^|_)3D(?:_|$)/i.test(value || ""));

  const facets = {
    methods: methodRefs,
    canonicalMethods,
    methodComponents,
    sourceMethods,
    operation,
    family,
    spatial: (family || mediaClass) ? {
      role: spatialRole,
      cluster: family?.cluster || null,
      mediaClass,
      is3d: spatial3d,
      loadBearingVisualCandidate: mediaProfile.load_bearing_visual_candidate === true,
    } : null,
    sourceOccurrence: sourceOccurrenceRef || occurrenceRefs.length ? {
      ref: sourceOccurrenceRef,
      refs: occurrenceRefs,
      duplicateOccurrenceCount,
    } : null,
  };

  const hasFacet = facets.methods.length || facets.canonicalMethods.length || facets.methodComponents.length || facets.sourceMethods.length || facets.operation || facets.family || facets.spatial || facets.sourceOccurrence;
  return hasFacet ? facets : null;
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
export function researchObjectToUniversalFinding(row, { locale = "he", methodRegistry = [] } = {}) {
  if (!row?.id) return null;

  const sourceRef = clean(row.source_ref);
  const promotedNodeId = clean(row.promoted_node_id);
  const terms = Array.isArray(row.terms) ? row.terms.filter(Boolean) : [];
  const presentation = resolveResearchObjectPresentation(row, { locale });
  const attribution = resolveExplicitAttribution(row);
  const rawStatementRef = { researchObjectId: String(row.id), field: "statement" };
  const researchFacets = researchObjectFacetDimensions(row, { registryRows: methodRegistry });

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
        ...(researchFacets ? { researchFacets } : {}),
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
          displayText: presentation.displayText,
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
          displayText: presentation.displayText,
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
