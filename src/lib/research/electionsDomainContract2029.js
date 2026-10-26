import { SEMANTIC_CLASS } from "./researchResultBundle.js";
import {
  ONE_TREE_BRANCH_CONTRACT_VERSION,
  ONE_TREE_BRANCH_OWNER_POINTERS,
  ONE_TREE_BRANCH_REVIEW_STATE,
  ONE_TREE_CONSUMER,
  ONE_TREE_EVIDENCE_LANE,
  ONE_TREE_RELATION_STATUS,
  compileOneTreeBranch,
  inspectOneTreeBranchInput,
  projectOneTreeBranchForConsumer,
} from "./oneTreeBranchContract2029.js";

// Elections is a DOMAIN PROFILE of the generic One Tree Branch Contract. This file retains the
// bounded elections vocabulary and compatibility shape; generic graph, research, access, Raziel
// and consumer behavior belongs to oneTreeBranchContract2029.js.

export const ELECTIONS_DOMAIN_CONTRACT_VERSION = "sod1820.elections-domain.v2";

export const ELECTIONS_REVIEW_STATE = Object.freeze({
  BRANCH_ONLY: ONE_TREE_BRANCH_REVIEW_STATE.BRANCH_ONLY,
  HUMAN_GATE_PENDING: ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING,
});

export const ELECTIONS_EVIDENCE_LANE = Object.freeze({
  SOURCE_PROVENANCE: ONE_TREE_EVIDENCE_LANE.SOURCE_PROVENANCE,
  SOURCE_FACT: ONE_TREE_EVIDENCE_LANE.SOURCE_FACT,
  ENGINE_CALCULATION: ONE_TREE_EVIDENCE_LANE.ENGINE_CALCULATION,
  INTERPRETATION: ONE_TREE_EVIDENCE_LANE.INTERPRETATION,
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

export const ELECTIONS_RELATION_STATUS = ONE_TREE_RELATION_STATUS;
export const ELECTIONS_CONSUMER = ONE_TREE_CONSUMER;
export const ELECTIONS_OWNER_POINTERS = ONE_TREE_BRANCH_OWNER_POINTERS;

const SOURCE_KINDS = new Set(Object.values(ELECTIONS_SOURCE_KIND));
const ASSERTION_SCOPES = new Set(Object.values(ELECTIONS_ASSERTION_SCOPE));
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

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function mapEntity(entity) {
  return {
    ...entity,
    accessTier: entity?.accessTier || "public",
    tags: entity?.tags || [],
    branchRefs: entity?.branchRefs || [],
    attributes: {
      ...(entity?.attributes || {}),
      cycle_refs: entity?.cycleRefs || [],
    },
  };
}

function mapSource(source) {
  return {
    ...source,
    accessTier: source?.accessTier || "public",
    tags: source?.tags || [],
    attributes: source?.attributes || {},
  };
}

function mapSourceFact(fact) {
  return {
    ...fact,
    lane: ONE_TREE_EVIDENCE_LANE.SOURCE_FACT,
    findingKind: "election_source_fact",
    subjectRefs: [fact?.subjectRef, ...asArray(fact?.entityRefs)].filter(Boolean),
    semanticClass: SEMANTIC_CLASS.EVIDENCE,
    governanceState: ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING,
    accessTier: fact?.accessTier || "public",
    tags: fact?.tags || [],
    attributes: {
      ...(fact?.attributes || {}),
      assertion_scope: fact?.assertionScope ?? null,
    },
  };
}

function mapCalculation(calculation) {
  return {
    ...calculation,
    lane: ONE_TREE_EVIDENCE_LANE.ENGINE_CALCULATION,
    findingKind: calculation?.findingKind || "gematria",
    semanticClass: calculation?.semanticClass || SEMANTIC_CLASS.EVIDENCE,
    governanceState: ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING,
    accessTier: calculation?.accessTier || "public",
    tags: calculation?.tags || [],
    attributes: calculation?.attributes || {},
  };
}

function mapInterpretation(interpretation) {
  return {
    ...interpretation,
    lane: ONE_TREE_EVIDENCE_LANE.INTERPRETATION,
    findingKind: "election_interpretation",
    semanticClass: SEMANTIC_CLASS.DERIVATION,
    governanceState: interpretation?.governanceState,
    accessTier: interpretation?.accessTier || "public",
    tags: interpretation?.tags || [],
    attributes: interpretation?.attributes || {},
  };
}

function mapRelation(relation) {
  return {
    ...relation,
    accessTier: relation?.accessTier || "public",
    tags: relation?.tags || [],
    attributes: relation?.attributes || {},
  };
}

function toOneTreeBranchInput(input = {}) {
  return {
    branchId: input.bundleId,
    branchKind: "election_topic",
    profileId: "elections",
    profileVersion: ELECTIONS_DOMAIN_CONTRACT_VERSION,
    findingIdNamespace: "elections",
    reviewState: input.reviewState,
    accessTier: "public",
    compiledAt: input.compiledAt,
    rootEntityRef: input.rootEntityRef,
    parentBranchRefs: [],
    childBranchRefs: [],
    relatedBranchRefs: [],
    tags: ["elections"],
    attributes: { country_scope: "IL", systems_in_scope: 2 },
    entities: asArray(input.entities).map(mapEntity),
    sources: asArray(input.sources).map(mapSource),
    evidenceRecords: [
      ...asArray(input.sourceFacts).map(mapSourceFact),
      ...asArray(input.engineCalculations).map(mapCalculation),
      ...asArray(input.interpretations).map(mapInterpretation),
    ],
    relationCandidates: asArray(input.relationCandidates).map(mapRelation),
  };
}

function electionProfileErrors(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return errors;
  for (const key of Object.keys(input)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) errors.push(`unknown top-level field: ${key}`);
  }
  for (const key of [
    "entities",
    "sources",
    "sourceFacts",
    "engineCalculations",
    "interpretations",
    "relationCandidates",
  ]) {
    if (!Array.isArray(input[key])) errors.push(`${key} must be an array`);
  }

  const entityRefs = new Set(asArray(input.entities).map(entity => entity?.ref).filter(Boolean));
  for (const [index, entity] of asArray(input.entities).entries()) {
    for (const cycleRef of asArray(entity?.cycleRefs)) {
      if (!entityRefs.has(cycleRef)) errors.push(`entities[${index}].cycleRefs contains dangling ref ${cycleRef}`);
    }
  }

  for (const [index, source] of asArray(input.sources).entries()) {
    if (!SOURCE_KINDS.has(source?.kind)) errors.push(`sources[${index}].kind is invalid for elections`);
  }
  for (const [index, fact] of asArray(input.sourceFacts).entries()) {
    if (!ASSERTION_SCOPES.has(fact?.assertionScope)) {
      errors.push(`sourceFacts[${index}].assertionScope is invalid`);
    }
  }
  for (const [index, calculation] of asArray(input.engineCalculations).entries()) {
    if (!Number.isFinite(calculation?.value)) {
      errors.push(`engineCalculations[${index}].value must be a finite engine result`);
    }
  }
  for (const [index, interpretation] of asArray(input.interpretations).entries()) {
    if (interpretation?.governanceState !== ELECTIONS_REVIEW_STATE.HUMAN_GATE_PENDING) {
      errors.push(`interpretations[${index}].governanceState must stay human_gate_pending`);
    }
  }

  const officialSourceIds = new Set(asArray(input.sources)
    .filter(source => source?.kind === ELECTIONS_SOURCE_KIND.OFFICIAL)
    .map(source => source.id));
  for (const fact of asArray(input.sourceFacts)) {
    if (fact?.assertionScope === ELECTIONS_ASSERTION_SCOPE.OFFICIAL
      && !asArray(fact.sourceIds).some(sourceId => officialSourceIds.has(sourceId))) {
      errors.push(`sourceFacts.${fact.id} claims official scope without an official source`);
    }
  }
  return errors;
}

export function inspectElectionsDomainInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return Object.freeze({ valid: false, errors: ["bundle must be a plain object"], warnings: [] });
  }
  const generic = inspectOneTreeBranchInput(toOneTreeBranchInput(input));
  const errors = [...generic.errors, ...electionProfileErrors(input)];
  return deepFreeze({ valid: errors.length === 0, errors, warnings: [...generic.warnings] });
}

function buildCycleIndex(entities) {
  const index = {};
  for (const entity of entities) {
    for (const cycleRef of asArray(entity.cycleRefs)) {
      if (!index[cycleRef]) index[cycleRef] = [];
      index[cycleRef].push(entity.id);
    }
  }
  return Object.fromEntries(Object.entries(index)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ids]) => [key, [...ids].sort()]));
}

export function compileElectionsDomainBundle(input) {
  const inspection = inspectElectionsDomainInput(input);
  if (!inspection.valid) {
    throw new TypeError(`electionsDomainContract2029: ${inspection.errors.join("; ")}`);
  }

  const branchContract = compileOneTreeBranch(toOneTreeBranchInput(input));
  return deepFreeze({
    contractVersion: ELECTIONS_DOMAIN_CONTRACT_VERSION,
    branchContractVersion: ONE_TREE_BRANCH_CONTRACT_VERSION,
    bundleId: branchContract.branchId,
    reviewState: branchContract.reviewState,
    compiledAt: branchContract.compiledAt,
    rootEntityRef: branchContract.rootEntityRef,
    owners: branchContract.owners,
    entities: branchContract.entities,
    sources: branchContract.sources,
    evidence: {
      [ELECTIONS_EVIDENCE_LANE.SOURCE_PROVENANCE]: branchContract.evidence[ONE_TREE_EVIDENCE_LANE.SOURCE_PROVENANCE],
      [ELECTIONS_EVIDENCE_LANE.SOURCE_FACT]: branchContract.evidence[ONE_TREE_EVIDENCE_LANE.SOURCE_FACT],
      [ELECTIONS_EVIDENCE_LANE.ENGINE_CALCULATION]: branchContract.evidence[ONE_TREE_EVIDENCE_LANE.ENGINE_CALCULATION],
      [ELECTIONS_EVIDENCE_LANE.INTERPRETATION]: branchContract.evidence[ONE_TREE_EVIDENCE_LANE.INTERPRETATION],
    },
    relationCandidates: branchContract.relationCandidates,
    indexes: deepFreeze({
      ...branchContract.indexes,
      byCycle: buildCycleIndex(input.entities),
    }),
    resultBundle: branchContract.resultBundle,
    branchContract,
    invariants: {
      ...branchContract.invariants,
      elections_is_a_domain_profile: true,
    },
  });
}

export function projectElectionsDomainForConsumer(bundle, consumer, options = {}) {
  if (!bundle?.branchContract) {
    throw new TypeError("projectElectionsDomainForConsumer requires a compiled elections domain bundle");
  }
  const projection = projectOneTreeBranchForConsumer(bundle.branchContract, consumer, options);
  return deepFreeze({
    ...projection,
    contractVersion: ELECTIONS_DOMAIN_CONTRACT_VERSION,
    branchContractVersion: ONE_TREE_BRANCH_CONTRACT_VERSION,
  });
}
