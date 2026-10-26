import { makeUniversalFinding } from "./universalFinding.js";
import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  SEMANTIC_CLASS,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";
import { SYSTEM_RAIL_OWNER } from "../systemSelfModel2029.js";

// Elections Domain Contract 2029
//
// A truth-safe, non-visual adapter for ONE elections topic in the existing Research OS and
// Reality Graph. It owns no canonical rows, routes, UI, access policy, engine arithmetic or
// publication decision. Its job is to keep four evidence lanes separate and to give every
// consumer the same stable references.

export const ELECTIONS_DOMAIN_CONTRACT_VERSION = "sod1820.elections-domain.v1";

export const ELECTIONS_REVIEW_STATE = Object.freeze({
  BRANCH_ONLY: "branch_only_research_candidate",
  HUMAN_GATE_PENDING: "human_gate_pending",
});

export const ELECTIONS_EVIDENCE_LANE = Object.freeze({
  SOURCE_PROVENANCE: "source_provenance",
  SOURCE_FACT: "source_fact",
  ENGINE_CALCULATION: "engine_calculation",
  INTERPRETATION: "interpretation",
});

export const ELECTIONS_SOURCE_KIND = Object.freeze({
  OFFICIAL: "official",
  REPORTED: "reported",
  PARTY: "party_source",
  SITE_POST: "site_post",
  GALLERY_MEDIA: "gallery_media",
});

export const ELECTIONS_ASSERTION_SCOPE = Object.freeze({
  OFFICIAL: "official",
  REPORTED: "reported",
  PARTY_AUTHORED: "party_authored",
  SITE_AUTHORED: "site_authored",
  HISTORICAL_SOURCE: "historical_source",
});

export const ELECTIONS_RELATION_STATUS = Object.freeze({
  PROPOSED: "proposed_relation_candidate",
});

export const ELECTIONS_CONSUMER = Object.freeze({
  WORLD: "world",
  TOPIC: "topic",
  POST: "post",
  NUMBER: "number",
  PERSON: "person",
  GALLERY: "gallery",
  SEARCH: "search",
  JOURNEY: "journey",
  RAZIEL: "raziel",
});

export const ELECTIONS_OWNER_POINTERS = Object.freeze({
  graph: SYSTEM_RAIL_OWNER.REALITY_GRAPH,
  truth: SYSTEM_RAIL_OWNER.TRUTH,
  researchContext: SYSTEM_RAIL_OWNER.RESEARCH_CONTEXT,
  researchStrategy: SYSTEM_RAIL_OWNER.RESEARCH_STRATEGY,
  access: SYSTEM_RAIL_OWNER.ACCESS,
  availability: SYSTEM_RAIL_OWNER.AVAILABILITY,
  raziel: SYSTEM_RAIL_OWNER.RAZIEL,
  personalReality: SYSTEM_RAIL_OWNER.PERSONAL_REALITY,
  presentation: SYSTEM_RAIL_OWNER.PRESENTATION,
});

const REVIEW_STATES = new Set(Object.values(ELECTIONS_REVIEW_STATE));
const SOURCE_KINDS = new Set(Object.values(ELECTIONS_SOURCE_KIND));
const ASSERTION_SCOPES = new Set(Object.values(ELECTIONS_ASSERTION_SCOPE));
const CONSUMERS = new Set(Object.values(ELECTIONS_CONSUMER));
const ACCESS_TIERS = new Set(["public", "authenticated", "private", "personal", "internal"]);
const VERIFICATION_STATES = new Set(["match", "mismatch", "method_unknown", "not_tested"]);
const CALCULATION_SEMANTIC_CLASSES = new Set([
  SEMANTIC_CLASS.EVIDENCE,
  SEMANTIC_CLASS.DERIVATION,
]);
const STABLE_ID = /^[a-z0-9][a-z0-9._:-]*$/;

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "bundleId",
  "reviewState",
  "compiledAt",
  "rootEntityRef",
  "entities",
  "sources",
  "sourceFacts",
  "engineCalculations",
  "interpretations",
  "relationCandidates",
]);

// Presentation belongs to Design V2/System Frame and final UI writing belongs to Claude.
// Canonical, publishing and personal data decisions also stay with their existing owners.
const FORBIDDEN_KEYS = new Set([
  "style",
  "styles",
  "layout",
  "color",
  "colors",
  "component",
  "renderer",
  "animation",
  "position",
  "x",
  "y",
  "z",
  "canonical",
  "canonicalized",
  "published",
  "approved",
  "writeToGraph",
  "personalData",
  "userData",
  "authorizationContext",
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function isStableId(value) {
  return Boolean(text(value)) && STABLE_ID.test(String(value));
}

function uniqueStrings(value, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) return false;
  const normalized = value.map(text);
  return normalized.every(Boolean) && new Set(normalized).size === normalized.length;
}

function deepClone(value) {
  if (Array.isArray(value)) return value.map(deepClone);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, deepClone(child)]));
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function findForbiddenPayloadKeys(value, path = "bundle", errors = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => findForbiddenPayloadKeys(child, `${path}[${index}]`, errors));
    return errors;
  }
  if (!isPlainObject(value)) return errors;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`${path}.${key} belongs to another canonical owner`);
    findForbiddenPayloadKeys(child, `${path}.${key}`, errors);
  }
  return errors;
}

function addUniqueId(errors, ids, id, path) {
  if (!isStableId(id)) {
    errors.push(`${path}.id must be a stable lowercase machine id`);
    return;
  }
  if (ids.has(id)) errors.push(`${path}.id duplicates ${id}`);
  ids.add(id);
}

function validateAccess(errors, accessTier, path) {
  if (!ACCESS_TIERS.has(accessTier)) errors.push(`${path}.accessTier must be explicit and valid`);
}

function validateEntity(errors, entity, path, ids, entityRefs) {
  if (!isPlainObject(entity)) {
    errors.push(`${path} must be an object`);
    return;
  }
  addUniqueId(errors, ids, entity.id, path);
  if (!text(entity.ref)) errors.push(`${path}.ref is required`);
  else if (entityRefs.has(entity.ref)) errors.push(`${path}.ref duplicates ${entity.ref}`);
  else entityRefs.add(entity.ref);
  if (!isStableId(entity.kind)) errors.push(`${path}.kind must be a stable machine id`);
  if (!text(entity.label)) errors.push(`${path}.label is required`);
  if (entity.cycleRefs != null && !uniqueStrings(entity.cycleRefs, { allowEmpty: true })) {
    errors.push(`${path}.cycleRefs must be unique refs`);
  }
}

function validateSource(errors, source, path, ids, sourceIds) {
  if (!isPlainObject(source)) {
    errors.push(`${path} must be an object`);
    return;
  }
  addUniqueId(errors, ids, source.id, path);
  if (isStableId(source.id)) sourceIds.add(source.id);
  if (!SOURCE_KINDS.has(source.kind)) errors.push(`${path}.kind is invalid`);
  if (!text(source.label)) errors.push(`${path}.label is required`);
  if (!text(source.locator) && !text(source.canonicalRef)) {
    errors.push(`${path} requires locator or canonicalRef`);
  }
  if (!text(source.capturedAt)) errors.push(`${path}.capturedAt is required`);
  validateAccess(errors, source.accessTier, path);
}

function validateRefs(errors, refs, available, path, { allowEmpty = false } = {}) {
  if (!uniqueStrings(refs, { allowEmpty })) {
    errors.push(`${path} must be ${allowEmpty ? "an" : "a non-empty"} array of unique refs`);
    return;
  }
  for (const ref of refs) {
    if (!available.has(ref)) errors.push(`${path} contains dangling ref ${ref}`);
  }
}

function validateSourceFact(errors, fact, path, ids, entityRefs, sourceIds) {
  if (!isPlainObject(fact)) {
    errors.push(`${path} must be an object`);
    return;
  }
  addUniqueId(errors, ids, fact.id, path);
  if (!entityRefs.has(fact.subjectRef)) errors.push(`${path}.subjectRef is dangling`);
  if (!isStableId(fact.predicate)) errors.push(`${path}.predicate must be a stable machine id`);
  if (!("value" in fact)) errors.push(`${path}.value is required`);
  validateRefs(errors, fact.sourceIds, sourceIds, `${path}.sourceIds`);
  if (!ASSERTION_SCOPES.has(fact.assertionScope)) errors.push(`${path}.assertionScope is invalid`);
  if (!VERIFICATION_STATES.has(fact.verificationState)) errors.push(`${path}.verificationState is invalid`);
  validateAccess(errors, fact.accessTier, path);
  if (fact.entityRefs != null) validateRefs(errors, fact.entityRefs, entityRefs, `${path}.entityRefs`, { allowEmpty: true });
}

function validateCalculation(errors, calculation, path, ids, entityRefs, sourceFactIds) {
  if (!isPlainObject(calculation)) {
    errors.push(`${path} must be an object`);
    return;
  }
  addUniqueId(errors, ids, calculation.id, path);
  if (!text(calculation.expression)) errors.push(`${path}.expression is required`);
  if (!isStableId(calculation.methodId)) errors.push(`${path}.methodId is required`);
  if (!text(calculation.methodVersion)) errors.push(`${path}.methodVersion is required`);
  if (!text(calculation.engineRef)) errors.push(`${path}.engineRef is required`);
  if (!Number.isFinite(calculation.value)) errors.push(`${path}.value must be a finite engine result`);
  if (!VERIFICATION_STATES.has(calculation.verificationState)) {
    errors.push(`${path}.verificationState is invalid`);
  }
  if (!CALCULATION_SEMANTIC_CLASSES.has(calculation.semanticClass)) {
    errors.push(`${path}.semanticClass must be evidence or derivation`);
  }
  validateRefs(errors, calculation.subjectRefs, entityRefs, `${path}.subjectRefs`, { allowEmpty: true });
  if (calculation.dependsOn != null) {
    validateRefs(errors, calculation.dependsOn, sourceFactIds, `${path}.dependsOn`, { allowEmpty: true });
  }
  validateAccess(errors, calculation.accessTier, path);
}

function validateInterpretation(errors, interpretation, path, ids, evidenceIds, entityRefs) {
  if (!isPlainObject(interpretation)) {
    errors.push(`${path} must be an object`);
    return;
  }
  addUniqueId(errors, ids, interpretation.id, path);
  if (!text(interpretation.statement)) errors.push(`${path}.statement is required`);
  if (!text(interpretation.attributedTo)) errors.push(`${path}.attributedTo is required`);
  if (interpretation.governanceState !== ELECTIONS_REVIEW_STATE.HUMAN_GATE_PENDING) {
    errors.push(`${path}.governanceState must stay human_gate_pending`);
  }
  validateRefs(errors, interpretation.dependsOn, evidenceIds, `${path}.dependsOn`);
  validateRefs(errors, interpretation.subjectRefs, entityRefs, `${path}.subjectRefs`, { allowEmpty: true });
  validateAccess(errors, interpretation.accessTier, path);
}

function validateRelation(errors, relation, path, ids, evidenceIds, entityRefs) {
  if (!isPlainObject(relation)) {
    errors.push(`${path} must be an object`);
    return;
  }
  addUniqueId(errors, ids, relation.id, path);
  if (!isStableId(relation.role)) errors.push(`${path}.role must be a stable proposed role`);
  if (!entityRefs.has(relation.fromRef)) errors.push(`${path}.fromRef is dangling`);
  if (!entityRefs.has(relation.toRef)) errors.push(`${path}.toRef is dangling`);
  if (relation.status !== ELECTIONS_RELATION_STATUS.PROPOSED) {
    errors.push(`${path}.status must stay proposed_relation_candidate`);
  }
  validateRefs(errors, relation.evidenceIds, evidenceIds, `${path}.evidenceIds`);
}

export function inspectElectionsDomainInput(input) {
  const errors = [];
  const warnings = [];
  if (!isPlainObject(input)) {
    return Object.freeze({ valid: false, errors: ["bundle must be a plain object"], warnings });
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) errors.push(`unknown top-level field: ${key}`);
  }
  findForbiddenPayloadKeys(input, "bundle", errors);

  if (!isStableId(input.bundleId)) errors.push("bundleId must be a stable lowercase machine id");
  if (!REVIEW_STATES.has(input.reviewState)) errors.push("reviewState must be a non-canonical review state");
  if (!text(input.compiledAt)) errors.push("compiledAt is required for deterministic provenance");

  const ids = new Set();
  const entityRefs = new Set();
  const sourceIds = new Set();
  const entities = Array.isArray(input.entities) ? input.entities : [];
  const sources = Array.isArray(input.sources) ? input.sources : [];
  const sourceFacts = Array.isArray(input.sourceFacts) ? input.sourceFacts : [];
  const calculations = Array.isArray(input.engineCalculations) ? input.engineCalculations : [];
  const interpretations = Array.isArray(input.interpretations) ? input.interpretations : [];
  const relations = Array.isArray(input.relationCandidates) ? input.relationCandidates : [];

  if (!entities.length) errors.push("entities must be non-empty");
  if (!sources.length) errors.push("sources must be non-empty");
  entities.forEach((row, index) => validateEntity(errors, row, `entities[${index}]`, ids, entityRefs));
  entities.forEach((row, index) => {
    if (Array.isArray(row?.cycleRefs)) {
      for (const cycleRef of row.cycleRefs) {
        if (!entityRefs.has(cycleRef)) errors.push(`entities[${index}].cycleRefs contains dangling ref ${cycleRef}`);
      }
    }
  });
  if (!entityRefs.has(input.rootEntityRef)) errors.push("rootEntityRef must reference an entity in this bundle");
  sources.forEach((row, index) => validateSource(errors, row, `sources[${index}]`, ids, sourceIds));
  sourceFacts.forEach((row, index) => validateSourceFact(
    errors, row, `sourceFacts[${index}]`, ids, entityRefs, sourceIds,
  ));
  const sourceFactIds = new Set(sourceFacts.map(row => row?.id).filter(isStableId));
  calculations.forEach((row, index) => validateCalculation(
    errors, row, `engineCalculations[${index}]`, ids, entityRefs, sourceFactIds,
  ));

  const evidenceIds = new Set([
    ...sourceFactIds,
    ...calculations.map(row => row?.id).filter(isStableId),
  ]);
  interpretations.forEach((row, index) => {
    validateInterpretation(errors, row, `interpretations[${index}]`, ids, evidenceIds, entityRefs);
    if (isStableId(row?.id)) evidenceIds.add(row.id);
  });
  relations.forEach((row, index) => validateRelation(
    errors, row, `relationCandidates[${index}]`, ids, evidenceIds, entityRefs,
  ));

  const officialSourceIds = new Set(sources
    .filter(source => source?.kind === ELECTIONS_SOURCE_KIND.OFFICIAL)
    .map(source => source.id));
  for (const fact of sourceFacts) {
    if (fact?.assertionScope === ELECTIONS_ASSERTION_SCOPE.OFFICIAL
      && !fact.sourceIds?.some(sourceId => officialSourceIds.has(sourceId))) {
      errors.push(`sourceFacts.${fact.id} claims official scope without an official source`);
    }
  }

  if (!sourceFacts.length) warnings.push("bundle contains no source facts");
  if (!calculations.length) warnings.push("bundle contains no engine calculations");
  if (!interpretations.length) warnings.push("bundle contains no interpretations");

  return deepFreeze({ valid: errors.length === 0, errors, warnings });
}

function sourceFactFinding(fact, entityByRef, compiledAt) {
  const entity = entityByRef[fact.subjectRef];
  return makeUniversalFinding({
    id: `elections:${fact.id}`,
    kind: "election_source_fact",
    stage: "evidence",
    status: ELECTIONS_REVIEW_STATE.HUMAN_GATE_PENDING,
    subject: { type: entity.kind, key: entity.ref, label: entity.label, lang: "he" },
    source: { engine: null, sourceRef: fact.sourceIds[0], method: fact.assertionScope, lang: "he" },
    identity: { sourceIdentity: fact.id, entityRef: entity.ref },
    verification: { verification_state: fact.verificationState },
    evidence: {
      refs: [...fact.sourceIds],
      facts: [{ predicate: fact.predicate, value: deepClone(fact.value), assertion_scope: fact.assertionScope }],
    },
    access: { tier: fact.accessTier, reason: "declared by elections domain input" },
    provenance: { createdAt: compiledAt, inputRef: fact.id },
    projection: {
      anchors: [fact.subjectRef, ...(fact.entityRefs || [])],
      dimensions: { elections_evidence_lane: ELECTIONS_EVIDENCE_LANE.SOURCE_FACT },
    },
  });
}

function calculationFinding(calculation, entityByRef, compiledAt) {
  const primary = entityByRef[calculation.subjectRefs[0]] || {
    kind: "number",
    ref: `number:${calculation.value}`,
    label: String(calculation.value),
  };
  return makeUniversalFinding({
    id: `elections:${calculation.id}`,
    kind: "gematria",
    stage: "evidence",
    status: ELECTIONS_REVIEW_STATE.HUMAN_GATE_PENDING,
    subject: { type: primary.kind, key: primary.ref, label: calculation.expression, lang: "he", value: calculation.value },
    source: {
      engine: calculation.engineRef,
      sourceRef: calculation.id,
      method: calculation.methodId,
      lang: "he",
    },
    identity: { sourceIdentity: calculation.id, entityRef: primary.ref },
    verification: {
      verification_state: calculation.verificationState,
      claimed_expression: calculation.expression,
      claimed_method: calculation.methodId,
      claimed_value: calculation.value,
      engine_method_tested: `${calculation.methodId}@${calculation.methodVersion}`,
      engine_result: calculation.value,
      statement_lang: "he",
    },
    evidence: { refs: [calculation.engineRef, ...(calculation.dependsOn || [])], facts: [] },
    access: { tier: calculation.accessTier, reason: "declared by elections domain input" },
    provenance: {
      createdAt: compiledAt,
      inputRef: calculation.id,
      parentFindingIds: (calculation.dependsOn || []).map(id => `elections:${id}`),
    },
    projection: {
      anchors: [...calculation.subjectRefs],
      dimensions: {
        elections_evidence_lane: ELECTIONS_EVIDENCE_LANE.ENGINE_CALCULATION,
        semantic_class: calculation.semanticClass,
      },
    },
  });
}

function interpretationFinding(interpretation, entityByRef, compiledAt) {
  const primary = entityByRef[interpretation.subjectRefs[0]];
  return makeUniversalFinding({
    id: `elections:${interpretation.id}`,
    kind: "election_interpretation",
    stage: "interpretation",
    status: ELECTIONS_REVIEW_STATE.HUMAN_GATE_PENDING,
    subject: {
      type: primary?.kind || "election_topic",
      key: primary?.ref || null,
      label: interpretation.statement,
      lang: "he",
    },
    source: { engine: null, sourceRef: interpretation.id, method: "authored_interpretation", lang: "he" },
    identity: { sourceIdentity: interpretation.id, entityRef: primary?.ref || null },
    verification: { verification_state: null },
    evidence: { refs: [...interpretation.dependsOn], facts: [], confidence: null },
    access: { tier: interpretation.accessTier, reason: "declared by elections domain input" },
    provenance: { createdBy: interpretation.attributedTo, createdAt: compiledAt, inputRef: interpretation.id },
    projection: {
      anchors: [...interpretation.subjectRefs],
      dimensions: { elections_evidence_lane: ELECTIONS_EVIDENCE_LANE.INTERPRETATION },
    },
  });
}

function pushIndex(index, key, id) {
  if (!key) return;
  if (!index[key]) index[key] = [];
  if (!index[key].includes(id)) index[key].push(id);
}

function sortedIndex(index) {
  return Object.fromEntries(Object.entries(index)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ids]) => [key, [...ids].sort()]));
}

function buildIndexes(input) {
  const byEntity = {};
  const bySource = {};
  const byCycle = {};
  const byNumber = {};
  const byLane = {
    [ELECTIONS_EVIDENCE_LANE.SOURCE_PROVENANCE]: input.sources.map(source => source.id),
    [ELECTIONS_EVIDENCE_LANE.SOURCE_FACT]: input.sourceFacts.map(fact => fact.id),
    [ELECTIONS_EVIDENCE_LANE.ENGINE_CALCULATION]: input.engineCalculations.map(row => row.id),
    [ELECTIONS_EVIDENCE_LANE.INTERPRETATION]: input.interpretations.map(row => row.id),
  };

  for (const entity of input.entities) {
    for (const cycleRef of entity.cycleRefs || []) pushIndex(byCycle, cycleRef, entity.id);
    if (entity.kind === "number" && Number.isFinite(entity.value)) pushIndex(byNumber, String(entity.value), entity.id);
  }
  for (const fact of input.sourceFacts) {
    pushIndex(byEntity, fact.subjectRef, fact.id);
    for (const ref of fact.entityRefs || []) pushIndex(byEntity, ref, fact.id);
    for (const sourceId of fact.sourceIds) pushIndex(bySource, sourceId, fact.id);
    if (Number.isFinite(fact.value)) pushIndex(byNumber, String(fact.value), fact.id);
  }
  for (const calculation of input.engineCalculations) {
    for (const ref of calculation.subjectRefs) pushIndex(byEntity, ref, calculation.id);
    pushIndex(byNumber, String(calculation.value), calculation.id);
  }
  for (const interpretation of input.interpretations) {
    for (const ref of interpretation.subjectRefs) pushIndex(byEntity, ref, interpretation.id);
    for (const value of interpretation.numberRefs || []) pushIndex(byNumber, String(value), interpretation.id);
  }

  return deepFreeze({
    byLane: sortedIndex(byLane),
    byEntity: sortedIndex(byEntity),
    bySource: sortedIndex(bySource),
    byCycle: sortedIndex(byCycle),
    byNumber: sortedIndex(byNumber),
  });
}

export function compileElectionsDomainBundle(input) {
  const inspection = inspectElectionsDomainInput(input);
  if (!inspection.valid) {
    throw new TypeError(`electionsDomainContract2029: ${inspection.errors.join("; ")}`);
  }

  const safeInput = deepClone(input);
  const entityByRef = Object.fromEntries(safeInput.entities.map(entity => [entity.ref, entity]));
  const factFindings = safeInput.sourceFacts.map(fact => sourceFactFinding(fact, entityByRef, safeInput.compiledAt));
  const calculationFindings = safeInput.engineCalculations.map(row => calculationFinding(row, entityByRef, safeInput.compiledAt));
  const calculationEvidenceFindings = calculationFindings.filter((_, index) => (
    safeInput.engineCalculations[index].semanticClass === SEMANTIC_CLASS.EVIDENCE
  ));
  const calculationDerivationFindings = calculationFindings.filter((_, index) => (
    safeInput.engineCalculations[index].semanticClass === SEMANTIC_CLASS.DERIVATION
  ));
  const interpretationFindings = safeInput.interpretations.map(row => interpretationFinding(row, entityByRef, safeInput.compiledAt));

  const resultBundle = composeResearchResultBundle({
    contractVersion: ELECTIONS_DOMAIN_CONTRACT_VERSION,
    query: {
      raw_input: "elections domain context",
      identities: [{ type: "election_topic", ref: safeInput.rootEntityRef, source: "domain_contract" }],
    },
    capabilities: [
      capabilityResult({
        key: "elections_source_facts",
        owner: ELECTIONS_OWNER_POINTERS.truth,
        status: CAPABILITY_STATUS.EXECUTED,
        findings: factFindings,
        sourceRefs: safeInput.sources.map(source => source.id),
        versionRefs: [ELECTIONS_DOMAIN_CONTRACT_VERSION],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.EVIDENCE,
      }),
      capabilityResult({
        key: "elections_engine_calculations",
        owner: "canonical_gematria_engine",
        status: CAPABILITY_STATUS.EXECUTED,
        findings: calculationEvidenceFindings,
        versionRefs: [...new Set(safeInput.engineCalculations
          .filter(row => row.semanticClass === SEMANTIC_CLASS.EVIDENCE)
          .map(row => row.methodVersion))],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.EVIDENCE,
      }),
      capabilityResult({
        key: "elections_deterministic_derivations",
        owner: ELECTIONS_OWNER_POINTERS.truth,
        status: CAPABILITY_STATUS.EXECUTED,
        findings: calculationDerivationFindings,
        versionRefs: [...new Set(safeInput.engineCalculations
          .filter(row => row.semanticClass === SEMANTIC_CLASS.DERIVATION)
          .map(row => row.methodVersion))],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
      }),
      capabilityResult({
        key: "elections_interpretations",
        owner: ELECTIONS_OWNER_POINTERS.truth,
        status: CAPABILITY_STATUS.EXECUTED,
        findings: interpretationFindings,
        versionRefs: [ELECTIONS_DOMAIN_CONTRACT_VERSION],
        accessClass: ACCESS_CLASS.PUBLIC_SOURCE,
        semanticClass: SEMANTIC_CLASS.DERIVATION,
      }),
    ],
    synthesis: {
      authority: ELECTIONS_OWNER_POINTERS.truth,
      state: safeInput.reviewState,
      statement: "Evidence lanes remain separate; no auto-canonicalization or auto-publication.",
    },
  });

  return deepFreeze({
    contractVersion: ELECTIONS_DOMAIN_CONTRACT_VERSION,
    bundleId: safeInput.bundleId,
    reviewState: safeInput.reviewState,
    compiledAt: safeInput.compiledAt,
    rootEntityRef: safeInput.rootEntityRef,
    owners: ELECTIONS_OWNER_POINTERS,
    entities: safeInput.entities,
    sources: safeInput.sources,
    evidence: {
      [ELECTIONS_EVIDENCE_LANE.SOURCE_PROVENANCE]: safeInput.sources,
      [ELECTIONS_EVIDENCE_LANE.SOURCE_FACT]: safeInput.sourceFacts,
      [ELECTIONS_EVIDENCE_LANE.ENGINE_CALCULATION]: safeInput.engineCalculations,
      [ELECTIONS_EVIDENCE_LANE.INTERPRETATION]: safeInput.interpretations,
    },
    relationCandidates: safeInput.relationCandidates,
    indexes: buildIndexes(safeInput),
    resultBundle,
    invariants: {
      one_reality_graph: true,
      one_research_context: true,
      source_is_not_fact: true,
      calculation_is_not_interpretation: true,
      interpretation_is_not_fact: true,
      relation_candidates_are_not_graph_edges: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
      no_ui_or_visual_payload: true,
      claude_owns_final_visual_writing: true,
    },
  });
}

export function projectElectionsDomainForConsumer(bundle, consumer) {
  if (!bundle || bundle.contractVersion !== ELECTIONS_DOMAIN_CONTRACT_VERSION) {
    throw new TypeError("projectElectionsDomainForConsumer requires a compiled elections domain bundle");
  }
  if (!CONSUMERS.has(consumer)) throw new TypeError(`unknown elections consumer: ${consumer}`);

  const projection = {
    projectionId: `${bundle.bundleId}:${consumer}`,
    consumer,
    contractVersion: bundle.contractVersion,
    rootEntityRef: bundle.rootEntityRef,
    reviewState: bundle.reviewState,
    ownerPointers: bundle.owners,
    entityRefs: bundle.entities.map(entity => entity.ref),
    sourceIds: bundle.sources.map(source => source.id),
    evidenceIdsByLane: Object.fromEntries(Object.entries(bundle.evidence)
      .map(([lane, records]) => [lane, records.map(record => record.id)])),
    relationCandidateIds: bundle.relationCandidates.map(relation => relation.id),
    resultBundle: bundle.resultBundle,
    guardrails: {
      preserveEvidenceLanes: true,
      readOnlyGraphProjection: true,
      noLocalArithmetic: true,
      noCanonicalOrPublicationDecision: true,
      noPresentationInstructions: true,
    },
  };

  if (consumer === ELECTIONS_CONSUMER.RAZIEL) {
    projection.razielContext = {
      mode: "research_companion",
      strategyOwner: ELECTIONS_OWNER_POINTERS.researchStrategy,
      companionOwner: ELECTIONS_OWNER_POINTERS.raziel,
      mayExplainConnections: true,
      mayLabelEvidenceLanes: true,
      maySuggestNextResearch: true,
      mayPromoteToCanonical: false,
      mayPublish: false,
      requiredAttribution: true,
    };
  }

  return deepFreeze(projection);
}
