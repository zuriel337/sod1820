import test from "node:test";
import assert from "node:assert/strict";

import {
  ONE_TREE_BRANCH_CONTRACT_VERSION,
  ONE_TREE_BRANCH_REVIEW_STATE,
  ONE_TREE_CONSUMER,
  ONE_TREE_EVIDENCE_LANE,
  ONE_TREE_RELATION_STATUS,
  compileOneTreeBranch,
  inspectOneTreeBranchInput,
  projectOneTreeBranchForConsumer,
} from "../src/lib/research/oneTreeBranchContract2029.js";

const clone = value => structuredClone(value);

function broadFixture() {
  return {
    branchId: "creation-cross-domain",
    branchKind: "topic",
    profileId: "cross-domain-research",
    profileVersion: "1",
    findingIdNamespace: "creation",
    reviewState: ONE_TREE_BRANCH_REVIEW_STATE.BRANCH_ONLY,
    accessTier: "public",
    compiledAt: "2026-10-26T00:00:00.000Z",
    rootEntityRef: "topic:creation",
    parentBranchRefs: ["branch:knowledge"],
    childBranchRefs: ["branch:creation-books", "branch:creation-places"],
    relatedBranchRefs: ["branch:numbers"],
    tags: ["cross_domain", "research"],
    attributes: { locale: "he", temporal_scope: "multi_period" },
    entities: [
      { id: "topic-creation", ref: "topic:creation", kind: "topic", label: "בריאה", accessTier: "public", tags: ["root"], attributes: {} },
      { id: "book-genesis", ref: "book:genesis", kind: "book", label: "בראשית", accessTier: "public", tags: ["source"], attributes: {} },
      { id: "person-commentator", ref: "person:commentator", kind: "person", label: "פרשן", accessTier: "public", tags: [], attributes: {} },
      { id: "place-jerusalem", ref: "place:jerusalem", kind: "place", label: "ירושלים", accessTier: "public", tags: [], attributes: {} },
      { id: "event-study", ref: "event:study", kind: "event", label: "אירוע לימוד", accessTier: "public", tags: [], attributes: {} },
      { id: "number-1820", ref: "number:1820", kind: "number", label: "1820", value: 1820, accessTier: "public", tags: ["number"], attributes: {} },
      { id: "private-note", ref: "note:private", kind: "note", label: "הערה פרטית", accessTier: "private", tags: [], attributes: {} },
      { id: "personal-moment", ref: "moment:personal", kind: "moment", label: "רגע אישי", accessTier: "personal", tags: [], attributes: {} },
    ],
    sources: [
      { id: "source-book", kind: "canonical_book", label: "בראשית", canonicalRef: "book:genesis", capturedAt: "2026-10-26", accessTier: "public", tags: [], attributes: {} },
      { id: "source-event", kind: "event_record", label: "רישום אירוע", canonicalRef: "event:study", capturedAt: "2026-10-26", accessTier: "public", tags: [], attributes: {} },
      { id: "source-personal", kind: "personal_journal", label: "יומן אישי", canonicalRef: "journal:personal", capturedAt: "2026-10-26", accessTier: "personal", tags: [], attributes: {} },
    ],
    evidenceRecords: [
      {
        id: "fact-book-topic",
        lane: ONE_TREE_EVIDENCE_LANE.SOURCE_FACT,
        findingKind: "book_fact",
        subjectRefs: ["book:genesis", "topic:creation"],
        sourceIds: ["source-book"],
        predicate: "addresses_topic",
        value: "בריאה",
        verificationState: "match",
        semanticClass: "evidence",
        governanceState: ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING,
        accessTier: "public",
        tags: ["book"],
        attributes: {},
      },
      {
        id: "observation-event-place",
        lane: ONE_TREE_EVIDENCE_LANE.OBSERVATION,
        findingKind: "event_observation",
        subjectRefs: ["event:study", "place:jerusalem"],
        sourceIds: ["source-event"],
        statement: "אירוע הלימוד משויך לירושלים ברישום המקור.",
        verificationState: "not_tested",
        semanticClass: "evidence",
        governanceState: ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING,
        accessTier: "public",
        tags: ["event"],
        attributes: {},
      },
      {
        id: "engine-number-1820",
        lane: ONE_TREE_EVIDENCE_LANE.ENGINE_OUTPUT,
        findingKind: "number_engine_output",
        subjectRefs: ["number:1820"],
        expression: "1820",
        engineRef: "canonical_number_engine",
        methodId: "identity",
        methodVersion: "v1",
        value: 1820,
        verificationState: "match",
        semanticClass: "evidence",
        governanceState: ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING,
        accessTier: "public",
        tags: ["number"],
        attributes: {},
      },
      {
        id: "derived-number-91",
        lane: ONE_TREE_EVIDENCE_LANE.DERIVATION,
        findingKind: "numeric_derivation",
        subjectRefs: ["number:1820"],
        expression: "1820 / 20",
        engineRef: "deterministic_arithmetic",
        methodId: "division",
        methodVersion: "v1",
        value: 91,
        verificationState: "match",
        semanticClass: "derivation",
        governanceState: ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING,
        dependsOn: ["engine-number-1820"],
        accessTier: "public",
        tags: ["number"],
        attributes: {},
      },
      {
        id: "interpretation-cross-domain",
        lane: ONE_TREE_EVIDENCE_LANE.INTERPRETATION,
        findingKind: "cross_domain_interpretation",
        subjectRefs: ["topic:creation", "book:genesis", "number:1820"],
        statement: "הספר והמספר מוצגים יחד ככיוון מחקר, לא כעובדה חדשה.",
        attributedTo: "ZURIEL",
        dependsOn: ["fact-book-topic", "derived-number-91"],
        verificationState: null,
        semanticClass: "derivation",
        governanceState: ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING,
        accessTier: "public",
        tags: ["research"],
        attributes: {},
      },
      {
        id: "claim-private-note",
        lane: ONE_TREE_EVIDENCE_LANE.AUTHORED_CLAIM,
        findingKind: "private_claim",
        subjectRefs: ["note:private"],
        statement: "טענה פרטית שדורשת הרשאה.",
        attributedTo: "authorized_author",
        dependsOn: ["fact-book-topic"],
        verificationState: "not_tested",
        semanticClass: "derivation",
        governanceState: ONE_TREE_BRANCH_REVIEW_STATE.DRAFT,
        accessTier: "private",
        tags: [],
        attributes: {},
      },
      {
        id: "observation-personal-moment",
        lane: ONE_TREE_EVIDENCE_LANE.OBSERVATION,
        findingKind: "personal_observation",
        subjectRefs: ["moment:personal"],
        sourceIds: ["source-personal"],
        statement: "רגע אישי שנשאר במסלול אישי מורשה.",
        verificationState: "not_tested",
        semanticClass: "evidence",
        governanceState: ONE_TREE_BRANCH_REVIEW_STATE.DRAFT,
        accessTier: "personal",
        tags: [],
        attributes: {},
      },
    ],
    relationCandidates: [
      { id: "relation-book-topic", role: "addresses_topic", fromRef: "book:genesis", toRef: "topic:creation", evidenceIds: ["fact-book-topic"], status: ONE_TREE_RELATION_STATUS.PROPOSED, accessTier: "public", tags: [], attributes: {} },
      { id: "relation-event-place", role: "recorded_at", fromRef: "event:study", toRef: "place:jerusalem", evidenceIds: ["observation-event-place"], status: ONE_TREE_RELATION_STATUS.PROPOSED, accessTier: "public", tags: [], attributes: {} },
      { id: "relation-private-note", role: "private_note_about", fromRef: "note:private", toRef: "topic:creation", evidenceIds: ["claim-private-note"], status: ONE_TREE_RELATION_STATUS.PROPOSED, accessTier: "private", tags: [], attributes: {} },
      { id: "relation-personal-moment", role: "personal_moment_about", fromRef: "moment:personal", toRef: "topic:creation", evidenceIds: ["observation-personal-moment"], status: ONE_TREE_RELATION_STATUS.PROPOSED, accessTier: "personal", tags: [], attributes: {} },
    ],
  };
}

test("one generic contract accepts a wide cross-domain branch", () => {
  const bundle = compileOneTreeBranch(broadFixture());

  assert.equal(bundle.contractVersion, ONE_TREE_BRANCH_CONTRACT_VERSION);
  assert.equal(bundle.invariants.one_branch_contract_many_domain_profiles, true);
  assert.deepEqual(Object.keys(bundle.indexes.byKind).sort(), [
    "book", "event", "moment", "note", "number", "person", "place", "topic",
  ]);
  assert.deepEqual(bundle.hierarchy.childBranchRefs, [
    "branch:creation-books",
    "branch:creation-places",
  ]);
  assert.equal(bundle.indexes.byNumber["1820"].includes("engine-number-1820"), true);
});

test("public projection filters private and personal evidence, entities and relations", () => {
  const bundle = compileOneTreeBranch(broadFixture());
  const projection = projectOneTreeBranchForConsumer(bundle, ONE_TREE_CONSUMER.WORLD);

  assert.equal(projection.entityRefs.includes("note:private"), false);
  assert.equal(projection.entityRefs.includes("moment:personal"), false);
  assert.equal(projection.sourceIds.includes("source-personal"), false);
  assert.deepEqual(projection.evidenceIdsByLane.authored_claim, []);
  assert.equal(projection.evidenceIdsByLane.observation.includes("observation-personal-moment"), false);
  assert.equal(projection.relationCandidateIds.includes("relation-private-note"), false);
  assert.equal(projection.relationCandidateIds.includes("relation-personal-moment"), false);
  assert.equal(projection.guardrails.accessFilteredAtProjectionBoundary, true);
});

test("unattested access claims never widen a projection", () => {
  const bundle = compileOneTreeBranch(broadFixture());
  const projection = projectOneTreeBranchForConsumer(bundle, ONE_TREE_CONSUMER.API, {
    accessDescriptor: { allowed_access_tiers: ["private", "personal"] },
  });

  assert.deepEqual(projection.resultBundle.access.allowed_access_tiers, ["public"]);
  assert.equal(projection.entityRefs.includes("note:private"), false);
  assert.equal(projection.entityRefs.includes("moment:personal"), false);
  assert.equal(projection.resultBundle.access.unverified_authority_claims_ignored, true);
});

test("verified boundaries may project only their explicitly attested tiers", () => {
  const bundle = compileOneTreeBranch(broadFixture());
  const privateProjection = projectOneTreeBranchForConsumer(bundle, ONE_TREE_CONSUMER.PERSONAL, {
    accessDescriptor: {
      authority_source: "supabase_auth",
      authenticated: true,
      allowed_access_tiers: ["private"],
    },
  });
  const personalProjection = projectOneTreeBranchForConsumer(bundle, ONE_TREE_CONSUMER.PERSONAL, {
    accessDescriptor: {
      authority_source: "supabase_auth",
      authenticated: true,
      personal_scope_available: true,
      allowed_access_tiers: ["personal"],
    },
  });

  assert.equal(privateProjection.entityRefs.includes("note:private"), true);
  assert.equal(privateProjection.entityRefs.includes("moment:personal"), false);
  assert.equal(privateProjection.evidenceIdsByLane.authored_claim.includes("claim-private-note"), true);
  assert.equal(personalProjection.entityRefs.includes("moment:personal"), true);
  assert.equal(personalProjection.entityRefs.includes("note:private"), false);
  assert.equal(personalProjection.personalContext.authorizedProjectionOnly, true);
});

test("a private branch is completely withheld from a public consumer", () => {
  const input = broadFixture();
  input.accessTier = "private";
  input.entities = [{
    id: "private-root",
    ref: "topic:creation",
    kind: "topic",
    label: "ענף פרטי",
    accessTier: "private",
    tags: [],
    attributes: {},
  }];
  input.sources = [{
    id: "private-source",
    kind: "private_note",
    label: "מקור פרטי",
    canonicalRef: "note:private-source",
    capturedAt: "2026-10-26",
    accessTier: "private",
    tags: [],
    attributes: {},
  }];
  input.evidenceRecords = [{
    id: "private-fact",
    lane: ONE_TREE_EVIDENCE_LANE.SOURCE_FACT,
    findingKind: "private_fact",
    subjectRefs: ["topic:creation"],
    sourceIds: ["private-source"],
    predicate: "private_statement",
    value: "מוגבל",
    verificationState: "not_tested",
    semanticClass: "evidence",
    governanceState: ONE_TREE_BRANCH_REVIEW_STATE.DRAFT,
    accessTier: "private",
    tags: [],
    attributes: {},
  }];
  input.relationCandidates = [];
  const bundle = compileOneTreeBranch(input);
  const projection = projectOneTreeBranchForConsumer(bundle, ONE_TREE_CONSUMER.SEARCH);

  assert.equal(projection.branchId, null);
  assert.equal(projection.branchKind, null);
  assert.equal(projection.rootEntityRef, null);
  assert.equal(projection.rootWithheld, true);
  assert.deepEqual(projection.entityRefs, []);
  assert.deepEqual(projection.sourceIds, []);
  assert.deepEqual(projection.relationCandidateIds, []);
  assert.deepEqual(projection.resultBundle.findings, []);
  assert.equal(projection.resultBundle.identity_disclosure.redacted_identity_count > 0, true);
  assert.equal(projection.resultBundle.query.raw_input.includes(input.branchId), false);
});

test("Raziel receives the same generic context without canonical or publishing authority", () => {
  const projection = projectOneTreeBranchForConsumer(
    compileOneTreeBranch(broadFixture()),
    ONE_TREE_CONSUMER.RAZIEL,
  );

  assert.equal(projection.razielContext.branchKind, "topic");
  assert.equal(projection.razielContext.mayExplainConnections, true);
  assert.equal(projection.razielContext.maySuggestNextResearch, true);
  assert.equal(projection.razielContext.mayPromoteToCanonical, false);
  assert.equal(projection.razielContext.mayPublish, false);
});

test("all declared consumer families share the same branch identity contract", () => {
  const bundle = compileOneTreeBranch(broadFixture());
  for (const consumer of Object.values(ONE_TREE_CONSUMER)) {
    const projection = projectOneTreeBranchForConsumer(bundle, consumer);
    assert.equal(projection.branchId, bundle.branchId, consumer);
    assert.equal(projection.rootEntityRef, bundle.rootEntityRef, consumer);
    assert.equal(projection.contractVersion, ONE_TREE_BRANCH_CONTRACT_VERSION, consumer);
  }
});

test("dangling refs, dependency cycles, visual payload and canonical states fail closed", () => {
  const dangling = broadFixture();
  dangling.relationCandidates[0].toRef = "topic:missing";
  assert.match(inspectOneTreeBranchInput(dangling).errors.join("\n"), /toRef is dangling/);

  const cyclic = broadFixture();
  cyclic.evidenceRecords.find(row => row.id === "engine-number-1820").dependsOn = ["derived-number-91"];
  assert.match(inspectOneTreeBranchInput(cyclic).errors.join("\n"), /dependency cycle detected/);

  const visual = broadFixture();
  visual.attributes.layout = "tree";
  assert.match(inspectOneTreeBranchInput(visual).errors.join("\n"), /layout belongs to another canonical owner/);

  const canonical = broadFixture();
  canonical.evidenceRecords[0].governanceState = "canonical";
  assert.match(inspectOneTreeBranchInput(canonical).errors.join("\n"), /may not assert canonical/);

  const crossTierLeak = broadFixture();
  crossTierLeak.evidenceRecords[0].subjectRefs.push("note:private");
  assert.match(inspectOneTreeBranchInput(crossTierLeak).errors.join("\n"), /public.*may not expose.*private/);
});

test("compiled branch and all nested evidence are immutable", () => {
  const bundle = compileOneTreeBranch(clone(broadFixture()));
  assert.equal(Object.isFrozen(bundle), true);
  assert.equal(Object.isFrozen(bundle.evidence), true);
  assert.equal(Object.isFrozen(bundle.evidence.source_fact[0]), true);
  assert.throws(() => bundle.entities.push({}), TypeError);
});
