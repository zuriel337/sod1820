import { makeUniversalFinding } from "./universalFinding.js";
import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  SEMANTIC_CLASS,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";
import { SYSTEM_RAIL_OWNER } from "../systemSelfModel2029.js";

// One Tree Branch Contract 2029
//
// Domain-neutral branch envelope for the existing Reality Graph and Research OS. A branch may
// describe a Topic, Person, Book, Place, Event, Number, Election, Tool, Journey or a future domain.
// It owns no canonical row, graph edge, engine truth, publication decision, access grant or UI.

export const ONE_TREE_BRANCH_CONTRACT_VERSION = "sod1820.one-tree-branch.v1";

export const ONE_TREE_BRANCH_REVIEW_STATE = Object.freeze({
  BRANCH_ONLY: "branch_only_research_candidate",
  HUMAN_GATE_PENDING: "human_gate_pending",
  DRAFT: "draft",
});

// Common profiles get stable names, while the compiler intentionally accepts any additional
// lowercase stable kind so new domains do not require a new parallel contract.
export const ONE_TREE_BRANCH_KIND = Object.freeze({
  TOPIC: "topic",
  PERSON: "person",
  BOOK: "book",
  PLACE: "place",
  EVENT: "event",
  NUMBER: "number",
  ELECTION: "election",
  GALLERY: "gallery",
  CORPUS: "corpus",
  TOOL: "tool",
  JOURNEY: "journey",
  COMMUNITY: "community",
  COLLECTION: "collection",
  CROSS_DOMAIN: "cross_domain",
});

export const ONE_TREE_EVIDENCE_LANE = Object.freeze({
  SOURCE_PROVENANCE: "source_provenance",
  SOURCE_FACT: "source_fact",
  OBSERVATION: "observation",
  ENGINE_OUTPUT: "engine_output",
  ENGINE_CALCULATION: "engine_calculation",
  DERIVATION: "derivation",
  AUTHORED_CLAIM: "authored_claim",
  INTERPRETATION: "interpretation",
});

export const ONE_TREE_RELATION_STATUS = Object.freeze({
  PROPOSED: "proposed_relation_candidate",
});

export const ONE_TREE_CONSUMER = Object.freeze({
  WORLD: "world",
  TOPIC: "topic",
  POST: "post",
  NUMBER: "number",
  PERSON: "person",
  BOOK: "book",
  PLACE: "place",
  EVENT: "event",
  GALLERY: "gallery",
  SEARCH: "search",
  JOURNEY: "journey",
  TOOL: "tool",
  RAZIEL: "raziel",
  PERSONAL: "personal",
  API: "api",
});

export const ONE_TREE_BRANCH_OWNER_POINTERS = Object.freeze({
  graph: SYSTEM_RAIL_OWNER.REALITY_GRAPH,
  truth: SYSTEM_RAIL_OWNER.TRUTH,
  researchContext: SYSTEM_RAIL_OWNER.RESEARCH_CONTEXT,
  researchStrategy: SYSTEM_RAIL_OWNER.RESEARCH_STRATEGY,
  access: SYSTEM_RAIL_OWNER.ACCESS,
  availability: SYSTEM_RAIL_OWNER.AVAILABILITY,
  raziel: SYSTEM_RAIL_OWNER.RAZIEL,
  personalReality: SYSTEM_RAIL_OWNER.PERSONAL_REALITY,
  publishing: SYSTEM_RAIL_OWNER.PUBLISHING,
  presentation: SYSTEM_RAIL_OWNER.PRESENTATION,
});

const REVIEW_STATES = new Set(Object.values(ONE_TREE_BRANCH_REVIEW_STATE));
const CONSUMERS = new Set(Object.values(ONE_TREE_CONSUMER));
const ACCESS_TIERS = new Set(["public", "public_candidate", "private", "personal"]);
const VERIFICATION_STATES = new Set(["match", "mismatch", "method_unknown", "not_tested"]);
const SEMANTIC_CLASSES = new Set(Object.values(SEMANTIC_CLASS));
const STABLE_ID = /^[a-z0-9][a-z0-9._:-]*$/;

const FINDING_LANES = new Set([
  ONE_TREE_EVIDENCE_LANE.SOURCE_FACT,
  ONE_TREE_EVIDENCE_LANE.OBSERVATION,
  ONE_TREE_EVIDENCE_LANE.ENGINE_OUTPUT,
  ONE_TREE_EVIDENCE_LANE.ENGINE_CALCULATION,
  ONE_TREE_EVIDENCE_LANE.DERIVATION,
  ONE_TREE_EVIDENCE_LANE.AUTHORED_CLAIM,
  ONE_TREE_EVIDENCE_LANE.INTERPRETATION,
]);

const SOURCE_REQUIRED_LANES = new Set([
  ONE_TREE_EVIDENCE_LANE.SOURCE_FACT,
  ONE_TREE_EVIDENCE_LANE.OBSERVATION,
]);

const ENGINE_REQUIRED_LANES = new Set([
  ONE_TREE_EVIDENCE_LANE.ENGINE_OUTPUT,
  ONE_TREE_EVIDENCE_LANE.ENGINE_CALCULATION,
  ONE_TREE_EVIDENCE_LANE.DERIVATION,
]);

const ATTRIBUTION_REQUIRED_LANES = new Set([
  ONE_TREE_EVIDENCE_LANE.AUTHORED_CLAIM,
  ONE_TREE_EVIDENCE_LANE.INTERPRETATION,
]);

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "branchId",
  "branchKind",
  "profileId",
  "profileVersion",
  "findingIdNamespace",
  "reviewState",
  "accessTier",
  "compiledAt",
  "rootEntityRef",
  "parentBranchRefs",
  "childBranchRefs",
  "relatedBranchRefs",
  "tags",
  "attributes",
  "entities",
  "sources",
  "evidenceRecords",
  "relationCandidates",
]);

// Domain attributes are deliberately extensible, but no extension may seize another owner's rail.
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
  "authContext",
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clean(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function isDateLike(value) {
  const normalized = clean(value);
  return Boolean(normalized) && !Number.isNaN(Date.parse(normalized));
}

function isStableId(value) {
  return Boolean(clean(value)) && STABLE_ID.test(String(value));
}

function uniqueStrings(value, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) return false;
  const normalized = value.map(clean);
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

function findForbiddenKeys(value, path = "branch", errors = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => findForbiddenKeys(child, `${path}[${index}]`, errors));
    return errors;
  }
  if (!isPlainObject(value)) return errors;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`${path}.${key} belongs to another canonical owner`);
    findForbiddenKeys(child, `${path}.${key}`, errors);
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

function validateAccess(errors, value, path) {
  if (!ACCESS_TIERS.has(value)) errors.push(`${path}.accessTier must use the Research access vocabulary`);
}

function validateOptionalStableList(errors, value, path) {
  if (value == null) return;
  if (!uniqueStrings(value, { allowEmpty: true }) || !value.every(isStableId)) {
    errors.push(`${path} must be an array of unique stable ids`);
  }
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

function validateEntity(errors, entity, path, ids, entityRefs) {
  if (!isPlainObject(entity)) {
    errors.push(`${path} must be an object`);
    return;
  }
  addUniqueId(errors, ids, entity.id, path);
  if (!clean(entity.ref)) errors.push(`${path}.ref is required`);
  else if (entityRefs.has(entity.ref)) errors.push(`${path}.ref duplicates ${entity.ref}`);
  else entityRefs.add(entity.ref);
  if (!isStableId(entity.kind)) errors.push(`${path}.kind must be a stable domain-neutral kind`);
  if (!clean(entity.label)) errors.push(`${path}.label is required`);
  validateAccess(errors, entity.accessTier, path);
  validateOptionalStableList(errors, entity.tags, `${path}.tags`);
  if (entity.branchRefs != null && !uniqueStrings(entity.branchRefs, { allowEmpty: true })) {
    errors.push(`${path}.branchRefs must contain unique external branch refs`);
  }
  if (entity.attributes != null && !isPlainObject(entity.attributes)) {
    errors.push(`${path}.attributes must be an object`);
  }
}

function validateSource(errors, source, path, ids, sourceIds) {
  if (!isPlainObject(source)) {
    errors.push(`${path} must be an object`);
    return;
  }
  addUniqueId(errors, ids, source.id, path);
  if (isStableId(source.id)) sourceIds.add(source.id);
  if (!isStableId(source.kind)) errors.push(`${path}.kind must be a stable source kind`);
  if (!clean(source.label)) errors.push(`${path}.label is required`);
  if (!clean(source.locator) && !clean(source.canonicalRef)) {
    errors.push(`${path} requires locator or canonicalRef`);
  }
  if (!isDateLike(source.capturedAt)) errors.push(`${path}.capturedAt must be a valid date or timestamp`);
  validateAccess(errors, source.accessTier, path);
  validateOptionalStableList(errors, source.tags, `${path}.tags`);
  if (source.attributes != null && !isPlainObject(source.attributes)) {
    errors.push(`${path}.attributes must be an object`);
  }
}

function validateEvidenceRecord(errors, record, path, ids, entityRefs, sourceIds, evidenceIds) {
  if (!isPlainObject(record)) {
    errors.push(`${path} must be an object`);
    return;
  }
  addUniqueId(errors, ids, record.id, path);
  if (isStableId(record.id)) evidenceIds.add(record.id);
  if (!FINDING_LANES.has(record.lane)) errors.push(`${path}.lane is invalid`);
  if (record.findingKind != null && !isStableId(record.findingKind)) {
    errors.push(`${path}.findingKind must be a stable finding kind`);
  }
  validateRefs(errors, record.subjectRefs, entityRefs, `${path}.subjectRefs`);
  validateAccess(errors, record.accessTier, path);
  validateOptionalStableList(errors, record.tags, `${path}.tags`);

  if (record.verificationState != null && !VERIFICATION_STATES.has(record.verificationState)) {
    errors.push(`${path}.verificationState is invalid`);
  }
  if (!SEMANTIC_CLASSES.has(record.semanticClass)) errors.push(`${path}.semanticClass is invalid`);
  if (!clean(record.governanceState)) errors.push(`${path}.governanceState is required`);
  if (["canonical", "published", "approved", "active"].includes(record.governanceState)) {
    errors.push(`${path}.governanceState may not assert canonical, published or approved state`);
  }

  const sourceIdsForRecord = record.sourceIds ?? [];
  if (SOURCE_REQUIRED_LANES.has(record.lane)) {
    validateRefs(errors, sourceIdsForRecord, sourceIds, `${path}.sourceIds`);
  } else if (record.sourceIds != null) {
    validateRefs(errors, sourceIdsForRecord, sourceIds, `${path}.sourceIds`, { allowEmpty: true });
  }

  if (record.lane === ONE_TREE_EVIDENCE_LANE.SOURCE_FACT && !clean(record.predicate)) {
    errors.push(`${path}.predicate is required for a source fact`);
  }
  if (record.lane === ONE_TREE_EVIDENCE_LANE.SOURCE_FACT && !("value" in record)) {
    errors.push(`${path}.value is required for a source fact`);
  }
  if (record.lane === ONE_TREE_EVIDENCE_LANE.OBSERVATION
    && !clean(record.statement) && !("value" in record)) {
    errors.push(`${path} requires statement or value for an observation`);
  }

  if (ENGINE_REQUIRED_LANES.has(record.lane)) {
    if (!isStableId(record.engineRef)) errors.push(`${path}.engineRef must be a stable engine ref`);
    if (!isStableId(record.methodId)) errors.push(`${path}.methodId is required`);
    if (!clean(record.methodVersion)) errors.push(`${path}.methodVersion is required`);
    if (!("value" in record)) errors.push(`${path}.value is required for an engine output or derivation`);
  }

  if (ATTRIBUTION_REQUIRED_LANES.has(record.lane)) {
    if (!clean(record.statement)) errors.push(`${path}.statement is required`);
    if (!clean(record.attributedTo)) errors.push(`${path}.attributedTo is required`);
    if (!uniqueStrings(record.dependsOn)) errors.push(`${path}.dependsOn must be non-empty`);
  }
  if (record.attributes != null && !isPlainObject(record.attributes)) {
    errors.push(`${path}.attributes must be an object`);
  }
}

function validateRelation(errors, relation, path, ids, entityRefs, evidenceIds) {
  if (!isPlainObject(relation)) {
    errors.push(`${path} must be an object`);
    return;
  }
  addUniqueId(errors, ids, relation.id, path);
  if (!isStableId(relation.role)) errors.push(`${path}.role must be a stable proposed role`);
  if (!entityRefs.has(relation.fromRef)) errors.push(`${path}.fromRef is dangling`);
  if (!entityRefs.has(relation.toRef)) errors.push(`${path}.toRef is dangling`);
  if (relation.status !== ONE_TREE_RELATION_STATUS.PROPOSED) {
    errors.push(`${path}.status must stay proposed_relation_candidate`);
  }
  validateRefs(errors, relation.evidenceIds, evidenceIds, `${path}.evidenceIds`);
  validateAccess(errors, relation.accessTier, path);
  validateOptionalStableList(errors, relation.tags, `${path}.tags`);
  if (relation.attributes != null && !isPlainObject(relation.attributes)) {
    errors.push(`${path}.attributes must be an object`);
  }
}

function tierMayReference(ownerTier, targetTier) {
  return targetTier === "public" || ownerTier === targetTier;
}

function addTierReferenceError(errors, ownerPath, ownerTier, targetPath, targetTier) {
  if (ownerTier && targetTier && !tierMayReference(ownerTier, targetTier)) {
    errors.push(`${ownerPath} (${ownerTier}) may not expose ${targetPath} (${targetTier})`);
  }
}

function dependencyCycle(records) {
  const graph = new Map(records.map(record => [record.id, record.dependsOn || []]));
  const visiting = new Set();
  const visited = new Set();

  function visit(id) {
    if (visiting.has(id)) return id;
    if (visited.has(id)) return null;
    visiting.add(id);
    for (const dependency of graph.get(id) || []) {
      if (!graph.has(dependency)) continue;
      const cycle = visit(dependency);
      if (cycle) return cycle;
    }
    visiting.delete(id);
    visited.add(id);
    return null;
  }

  for (const id of graph.keys()) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return null;
}

export function inspectOneTreeBranchInput(input) {
  const errors = [];
  const warnings = [];
  if (!isPlainObject(input)) {
    return Object.freeze({ valid: false, errors: ["branch must be a plain object"], warnings });
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) errors.push(`unknown top-level field: ${key}`);
  }
  findForbiddenKeys(input, "branch", errors);

  if (!isStableId(input.branchId)) errors.push("branchId must be a stable lowercase machine id");
  if (!isStableId(input.branchKind)) errors.push("branchKind must be a stable domain kind");
  if (!isStableId(input.profileId)) errors.push("profileId must be a stable profile id");
  if (!clean(input.profileVersion)) errors.push("profileVersion is required");
  if (!isStableId(input.findingIdNamespace)) errors.push("findingIdNamespace must be a stable id namespace");
  if (!REVIEW_STATES.has(input.reviewState)) errors.push("reviewState must be a non-canonical review state");
  validateAccess(errors, input.accessTier, "branch");
  if (!isDateLike(input.compiledAt)) errors.push("compiledAt must be a valid deterministic timestamp");
  validateOptionalStableList(errors, input.tags, "tags");
  for (const key of ["parentBranchRefs", "childBranchRefs", "relatedBranchRefs"]) {
    if (input[key] != null && !uniqueStrings(input[key], { allowEmpty: true })) {
      errors.push(`${key} must contain unique external branch refs`);
    }
  }
  if (input.attributes != null && !isPlainObject(input.attributes)) {
    errors.push("attributes must be an object");
  }

  const ids = new Set();
  const entityRefs = new Set();
  const sourceIds = new Set();
  const evidenceIds = new Set();
  const entities = Array.isArray(input.entities) ? input.entities : [];
  const sources = Array.isArray(input.sources) ? input.sources : [];
  const evidenceRecords = Array.isArray(input.evidenceRecords) ? input.evidenceRecords : [];
  const relations = Array.isArray(input.relationCandidates) ? input.relationCandidates : [];

  for (const key of ["entities", "sources", "evidenceRecords", "relationCandidates"]) {
    if (!Array.isArray(input[key])) errors.push(`${key} must be an array`);
  }

  if (!entities.length) errors.push("entities must be non-empty");
  entities.forEach((row, index) => validateEntity(errors, row, `entities[${index}]`, ids, entityRefs));
  if (!entityRefs.has(input.rootEntityRef)) errors.push("rootEntityRef must reference an entity in this branch");
  sources.forEach((row, index) => validateSource(errors, row, `sources[${index}]`, ids, sourceIds));
  evidenceRecords.forEach((row, index) => validateEvidenceRecord(
    errors, row, `evidenceRecords[${index}]`, ids, entityRefs, sourceIds, evidenceIds,
  ));

  for (const [index, record] of evidenceRecords.entries()) {
    if (record?.dependsOn != null) {
      validateRefs(errors, record.dependsOn, evidenceIds, `evidenceRecords[${index}].dependsOn`, {
        allowEmpty: !ATTRIBUTION_REQUIRED_LANES.has(record.lane),
      });
    }
  }
  const cycle = dependencyCycle(evidenceRecords);
  if (cycle) errors.push(`evidence dependency cycle detected at ${cycle}`);

  relations.forEach((row, index) => validateRelation(
    errors, row, `relationCandidates[${index}]`, ids, entityRefs, evidenceIds,
  ));

  const entityTierByRef = new Map(entities.map(entity => [entity?.ref, entity?.accessTier]));
  const sourceTierById = new Map(sources.map(source => [source?.id, source?.accessTier]));
  const evidenceTierById = new Map(evidenceRecords.map(record => [record?.id, record?.accessTier]));
  const rootTier = entityTierByRef.get(input.rootEntityRef);
  if (rootTier && input.accessTier && rootTier !== input.accessTier) {
    errors.push(`root entity accessTier (${rootTier}) must equal branch accessTier (${input.accessTier})`);
  }
  for (const [index, record] of evidenceRecords.entries()) {
    for (const ref of record?.subjectRefs || []) {
      addTierReferenceError(
        errors,
        `evidenceRecords[${index}]`,
        record?.accessTier,
        `entity ${ref}`,
        entityTierByRef.get(ref),
      );
    }
    for (const sourceId of record?.sourceIds || []) {
      addTierReferenceError(
        errors,
        `evidenceRecords[${index}]`,
        record?.accessTier,
        `source ${sourceId}`,
        sourceTierById.get(sourceId),
      );
    }
    for (const dependency of record?.dependsOn || []) {
      addTierReferenceError(
        errors,
        `evidenceRecords[${index}]`,
        record?.accessTier,
        `evidence ${dependency}`,
        evidenceTierById.get(dependency),
      );
    }
  }
  for (const [index, relation] of relations.entries()) {
    for (const ref of [relation?.fromRef, relation?.toRef].filter(Boolean)) {
      addTierReferenceError(
        errors,
        `relationCandidates[${index}]`,
        relation?.accessTier,
        `entity ${ref}`,
        entityTierByRef.get(ref),
      );
    }
    for (const evidenceId of relation?.evidenceIds || []) {
      addTierReferenceError(
        errors,
        `relationCandidates[${index}]`,
        relation?.accessTier,
        `evidence ${evidenceId}`,
        evidenceTierById.get(evidenceId),
      );
    }
  }

  if (!sources.length) warnings.push("branch contains no source provenance");
  if (!evidenceRecords.length) warnings.push("branch contains no evidence records");
  if (!relations.length) warnings.push("branch contains no proposed relations");

  return deepFreeze({ valid: errors.length === 0, errors, warnings });
}

function findingStageForLane(lane) {
  if (lane === ONE_TREE_EVIDENCE_LANE.INTERPRETATION) return "interpretation";
  if (lane === ONE_TREE_EVIDENCE_LANE.AUTHORED_CLAIM) return "claim";
  return "evidence";
}

function evidenceFact(record) {
  if (record.lane === ONE_TREE_EVIDENCE_LANE.SOURCE_FACT) {
    return { predicate: record.predicate, value: deepClone(record.value) };
  }
  if (record.lane === ONE_TREE_EVIDENCE_LANE.OBSERVATION) {
    return { statement: record.statement ?? null, value: deepClone(record.value ?? null) };
  }
  return null;
}

function recordToFinding(record, entityByRef, input) {
  const primary = entityByRef[record.subjectRefs[0]];
  const fact = evidenceFact(record);
  const claimedExpression = record.expression ?? record.statement ?? null;
  const verification = {
    verification_state: record.verificationState ?? null,
  };
  if (ENGINE_REQUIRED_LANES.has(record.lane)) {
    verification.claimed_expression = claimedExpression;
    verification.claimed_method = record.methodId;
    verification.claimed_value = deepClone(record.value);
    verification.engine_method_tested = `${record.methodId}@${record.methodVersion}`;
    verification.engine_result = deepClone(record.value);
    verification.statement_lang = record.statementLang ?? null;
  }

  return makeUniversalFinding({
    id: `${input.findingIdNamespace}:${record.id}`,
    kind: record.findingKind || `branch_${record.lane}`,
    stage: findingStageForLane(record.lane),
    status: record.governanceState,
    subject: {
      type: primary.kind,
      key: primary.ref,
      label: record.expression || record.statement || primary.label,
      lang: record.subjectLang ?? null,
      value: deepClone(record.value ?? null),
    },
    source: {
      engine: record.engineRef ?? null,
      sourceRef: record.sourceIds?.[0] || record.id,
      method: record.methodId || record.predicate || record.lane,
      lang: record.sourceLang ?? null,
    },
    identity: { sourceIdentity: record.id, entityRef: primary.ref },
    verification,
    evidence: {
      refs: [
        ...(record.sourceIds || []),
        ...(record.dependsOn || []),
        ...(record.engineRef ? [record.engineRef] : []),
      ],
      facts: fact ? [fact] : [],
      confidence: record.confidence ?? null,
    },
    access: { tier: record.accessTier, reason: "declared by One Tree branch input" },
    provenance: {
      createdBy: record.attributedTo ?? null,
      createdAt: input.compiledAt,
      inputRef: record.id,
      parentFindingIds: (record.dependsOn || []).map(id => `${input.findingIdNamespace}:${id}`),
    },
    projection: {
      anchors: [...record.subjectRefs],
      dimensions: {
        one_tree_branch_id: input.branchId,
        one_tree_profile_id: input.profileId,
        one_tree_evidence_lane: record.lane,
        semantic_class: record.semanticClass,
        tags: [...(record.tags || [])],
        attributes: deepClone(record.attributes || {}),
      },
    },
  });
}

function accessClassForTier(tier) {
  if (tier === "public") return ACCESS_CLASS.PUBLIC_SOURCE;
  if (tier === "personal") return ACCESS_CLASS.PERSONAL;
  return ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED;
}

function capabilityKey(record) {
  return [
    "one_tree_branch",
    record.lane,
    record.semanticClass,
    accessClassForTier(record.accessTier),
    record.engineRef || "truth_owner",
  ].join(":");
}

function buildCapabilities(records, findingByRecordId) {
  const groups = new Map();
  for (const record of records) {
    const key = capabilityKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  return [...groups.entries()].map(([key, group]) => capabilityResult({
    key,
    owner: group.some(record => ENGINE_REQUIRED_LANES.has(record.lane))
      ? (group[0].engineRef || ONE_TREE_BRANCH_OWNER_POINTERS.truth)
      : ONE_TREE_BRANCH_OWNER_POINTERS.truth,
    status: CAPABILITY_STATUS.EXECUTED,
    findings: group.map(record => findingByRecordId[record.id]),
    sourceRefs: [...new Set(group.flatMap(record => record.sourceIds || []))],
    versionRefs: [...new Set(group.map(record => record.methodVersion).filter(Boolean))],
    accessClass: accessClassForTier(group[0].accessTier),
    semanticClass: group[0].semanticClass,
  }));
}

function composeBranchResultBundle(bundle, accessDescriptor = null, { withholdAll = false } = {}) {
  return composeResearchResultBundle({
    contractVersion: ONE_TREE_BRANCH_CONTRACT_VERSION,
    query: {
      raw_input: "one tree branch context",
      identities: [{
        type: bundle.branchKind,
        ref: bundle.rootEntityRef,
        source: bundle.accessTier === "personal" ? "personal_context" : "one_tree_branch_contract",
        access: { tier: bundle.accessTier },
      }],
    },
    capabilities: withholdAll ? [] : buildCapabilities(bundle.evidenceRecords, bundle.findingByRecordId),
    accessDescriptor,
    synthesis: {
      authority: ONE_TREE_BRANCH_OWNER_POINTERS.truth,
      state: bundle.reviewState,
      statement: "Evidence lanes remain separate; no auto-canonicalization or auto-publication.",
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
  const byLane = {
    [ONE_TREE_EVIDENCE_LANE.SOURCE_PROVENANCE]: input.sources.map(source => source.id),
  };
  const byEntity = {};
  const bySource = {};
  const byKind = {};
  const byTag = {};
  const byNumber = {};

  for (const entity of input.entities) {
    pushIndex(byKind, entity.kind, entity.id);
    for (const tag of entity.tags || []) pushIndex(byTag, tag, entity.id);
    if (entity.kind === "number" && Number.isFinite(entity.value)) pushIndex(byNumber, String(entity.value), entity.id);
  }
  for (const record of input.evidenceRecords) {
    pushIndex(byLane, record.lane, record.id);
    for (const ref of record.subjectRefs) pushIndex(byEntity, ref, record.id);
    for (const sourceId of record.sourceIds || []) pushIndex(bySource, sourceId, record.id);
    for (const tag of record.tags || []) pushIndex(byTag, tag, record.id);
    if (Number.isFinite(record.value)) pushIndex(byNumber, String(record.value), record.id);
    for (const value of record.numberRefs || []) pushIndex(byNumber, String(value), record.id);
  }

  return deepFreeze({
    byLane: sortedIndex(byLane),
    byEntity: sortedIndex(byEntity),
    bySource: sortedIndex(bySource),
    byKind: sortedIndex(byKind),
    byTag: sortedIndex(byTag),
    byNumber: sortedIndex(byNumber),
  });
}

function evidenceByLane(sources, records) {
  const grouped = { [ONE_TREE_EVIDENCE_LANE.SOURCE_PROVENANCE]: sources };
  for (const lane of FINDING_LANES) grouped[lane] = [];
  for (const record of records) grouped[record.lane].push(record);
  return grouped;
}

export function compileOneTreeBranch(input) {
  const inspection = inspectOneTreeBranchInput(input);
  if (!inspection.valid) {
    throw new TypeError(`oneTreeBranchContract2029: ${inspection.errors.join("; ")}`);
  }

  const safeInput = deepClone(input);
  const entityByRef = Object.fromEntries(safeInput.entities.map(entity => [entity.ref, entity]));
  const findingByRecordId = Object.fromEntries(safeInput.evidenceRecords.map(record => [
    record.id,
    recordToFinding(record, entityByRef, safeInput),
  ]));

  const internal = {
    contractVersion: ONE_TREE_BRANCH_CONTRACT_VERSION,
    branchId: safeInput.branchId,
    branchKind: safeInput.branchKind,
    profileId: safeInput.profileId,
    profileVersion: safeInput.profileVersion,
    findingIdNamespace: safeInput.findingIdNamespace,
    reviewState: safeInput.reviewState,
    accessTier: safeInput.accessTier,
    compiledAt: safeInput.compiledAt,
    rootEntityRef: safeInput.rootEntityRef,
    hierarchy: {
      parentBranchRefs: safeInput.parentBranchRefs || [],
      childBranchRefs: safeInput.childBranchRefs || [],
      relatedBranchRefs: safeInput.relatedBranchRefs || [],
    },
    tags: safeInput.tags || [],
    attributes: safeInput.attributes || {},
    owners: ONE_TREE_BRANCH_OWNER_POINTERS,
    entities: safeInput.entities,
    sources: safeInput.sources,
    evidenceRecords: safeInput.evidenceRecords,
    evidence: evidenceByLane(safeInput.sources, safeInput.evidenceRecords),
    relationCandidates: safeInput.relationCandidates,
    indexes: buildIndexes(safeInput),
    findingByRecordId,
  };

  const resultBundle = composeBranchResultBundle(internal, null, {
    withholdAll: safeInput.accessTier !== "public",
  });
  return deepFreeze({
    ...internal,
    resultBundle,
    invariants: {
      one_reality_graph: true,
      one_research_context: true,
      one_branch_contract_many_domain_profiles: true,
      source_is_not_fact: true,
      engine_output_is_not_interpretation: true,
      derivation_is_not_source_fact: true,
      interpretation_is_not_fact: true,
      relation_candidates_are_not_graph_edges: true,
      access_never_widens_inside_branch: true,
      no_auto_canonicalization: true,
      no_auto_publication: true,
      no_ui_or_visual_payload: true,
      claude_owns_final_visual_writing: true,
    },
  });
}

function allowedTierSet(resultBundle) {
  return new Set(resultBundle?.access?.allowed_access_tiers || ["public"]);
}

function idsByVisibleLane(bundle, visibleRecordIds, visibleSourceIds) {
  const out = {
    [ONE_TREE_EVIDENCE_LANE.SOURCE_PROVENANCE]: bundle.sources
      .filter(source => visibleSourceIds.has(source.id))
      .map(source => source.id),
  };
  for (const lane of FINDING_LANES) {
    out[lane] = bundle.evidence[lane]
      .filter(record => visibleRecordIds.has(record.id))
      .map(record => record.id);
  }
  return out;
}

export function projectOneTreeBranchForConsumer(bundle, consumer, { accessDescriptor = null } = {}) {
  if (!bundle || bundle.contractVersion !== ONE_TREE_BRANCH_CONTRACT_VERSION) {
    throw new TypeError("projectOneTreeBranchForConsumer requires a compiled One Tree branch");
  }
  if (!CONSUMERS.has(consumer)) throw new TypeError(`unknown One Tree consumer: ${consumer}`);

  let resultBundle = composeBranchResultBundle(bundle, accessDescriptor);
  const allowedTiers = allowedTierSet(resultBundle);
  const branchVisible = allowedTiers.has(bundle.accessTier);
  if (!branchVisible) {
    resultBundle = composeBranchResultBundle(bundle, accessDescriptor, { withholdAll: true });
  }
  const visibleFindingIds = new Set(resultBundle.findings.map(finding => finding.id));
  const visibleRecordIds = new Set(bundle.evidenceRecords
    .filter(record => visibleFindingIds.has(`${bundle.findingIdNamespace}:${record.id}`))
    .map(record => record.id));
  const visibleEntityRefs = new Set(bundle.entities
    .filter(entity => branchVisible && allowedTiers.has(entity.accessTier))
    .map(entity => entity.ref));
  const visibleSourceIds = new Set(bundle.sources
    .filter(source => branchVisible && allowedTiers.has(source.accessTier))
    .map(source => source.id));
  const visibleRelationIds = bundle.relationCandidates
    .filter(relation => allowedTiers.has(relation.accessTier))
    .filter(relation => visibleEntityRefs.has(relation.fromRef) && visibleEntityRefs.has(relation.toRef))
    .filter(relation => relation.evidenceIds.every(id => visibleRecordIds.has(id)))
    .map(relation => relation.id);

  const rootVisible = branchVisible && visibleEntityRefs.has(bundle.rootEntityRef);
  const projection = {
    projectionId: branchVisible ? `${bundle.branchId}:${consumer}` : `withheld:${consumer}`,
    consumer,
    contractVersion: bundle.contractVersion,
    profileId: branchVisible ? bundle.profileId : null,
    profileVersion: branchVisible ? bundle.profileVersion : null,
    branchId: branchVisible ? bundle.branchId : null,
    branchKind: branchVisible ? bundle.branchKind : null,
    rootEntityRef: rootVisible ? bundle.rootEntityRef : null,
    rootWithheld: !rootVisible,
    reviewState: branchVisible ? bundle.reviewState : null,
    hierarchy: branchVisible ? bundle.hierarchy : {
      parentBranchRefs: [],
      childBranchRefs: [],
      relatedBranchRefs: [],
    },
    ownerPointers: bundle.owners,
    entityRefs: [...visibleEntityRefs],
    sourceIds: [...visibleSourceIds],
    evidenceIdsByLane: idsByVisibleLane(bundle, visibleRecordIds, visibleSourceIds),
    relationCandidateIds: visibleRelationIds,
    resultBundle,
    guardrails: {
      preserveEvidenceLanes: true,
      readOnlyGraphProjection: true,
      noLocalEngineFallback: true,
      noCanonicalOrPublicationDecision: true,
      noPresentationInstructions: true,
      accessFilteredAtProjectionBoundary: true,
    },
  };

  if (consumer === ONE_TREE_CONSUMER.RAZIEL) {
    projection.razielContext = {
      mode: "research_companion",
      branchId: projection.branchId,
      branchKind: projection.branchKind,
      strategyOwner: ONE_TREE_BRANCH_OWNER_POINTERS.researchStrategy,
      companionOwner: ONE_TREE_BRANCH_OWNER_POINTERS.raziel,
      mayExplainConnections: true,
      mayLabelEvidenceLanes: true,
      maySuggestNextResearch: true,
      mayPromoteToCanonical: false,
      mayPublish: false,
      requiredAttribution: true,
    };
  }

  if (consumer === ONE_TREE_CONSUMER.PERSONAL) {
    projection.personalContext = {
      owner: ONE_TREE_BRANCH_OWNER_POINTERS.personalReality,
      authorizedProjectionOnly: true,
      accessDescriptorApplied: true,
      mayCopyPublicEvidence: false,
    };
  }

  return deepFreeze(projection);
}
