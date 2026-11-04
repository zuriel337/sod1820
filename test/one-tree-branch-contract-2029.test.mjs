import test from "node:test";
import assert from "node:assert/strict";

import {
  ONE_TREE_BRANCH_CONTRACT_VERSION,
  ONE_TREE_BRANCH_REVIEW_STATE,
  ONE_TREE_CONSUMER,
  ONE_TREE_EVIDENCE_LANE,
  ONE_TREE_FINDING_KIND,
  ONE_TREE_NEWS_MARKER_STATE,
  ONE_TREE_RELATION_STATUS,
  ONE_TREE_SYSTEM_METHOD_RULE_ID,
  compileOneTreeBranch,
  inspectOneTreeBranchInput,
  projectOneTreeBranchForConsumer,
} from "../src/lib/research/oneTreeBranchContract2029.js";

const clone = value => structuredClone(value);

function layeredFixture() {
  const number = value => ({
    id: `number-${value}`,
    ref: `number:${value}`,
    kind: "number",
    label: String(value),
    value,
    accessTier: "public",
    tags: [],
    attributes: {},
  });
  const systemMethod = ({ id, input, output, ruleId, operation, methodOutput, dependsOn = [] }) => ({
    id,
    lane: ONE_TREE_EVIDENCE_LANE.DERIVATION,
    findingKind: ONE_TREE_FINDING_KIND.SYSTEM_METHOD_APPLICATION,
    subjectRefs: [`number:${input}`, `number:${output}`],
    expression: `${input} → ${output}`,
    engineRef: ruleId === ONE_TREE_SYSTEM_METHOD_RULE_ID.ZERO_SCALE
      ? "fn_zero_scale"
      : "project_codex.numeric_rule_family_index",
    methodId: ruleId,
    methodVersion: "1",
    value: output,
    verificationState: "match",
    semanticClass: "derivation",
    governanceState: ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING,
    dependsOn,
    accessTier: "public",
    tags: ["system_method"],
    attributes: {
      system_method_application: {
        rule_id: ruleId,
        rule_version: 1,
        rule_version_source: ruleId === ONE_TREE_SYSTEM_METHOD_RULE_ID.ZERO_SCALE
          ? "fn_zero_scale.version"
          : "nodes.rule_version",
        operation,
        input_value: input,
        output_value: output,
        output: methodOutput,
        raw_identity_preserved: true,
        evidence_relation: "derivation",
      },
    },
  });

  return {
    branchId: "numeric-news-layers",
    branchKind: "topic",
    profileId: "numeric-news-example",
    profileVersion: "1",
    findingIdNamespace: "layers",
    reviewState: ONE_TREE_BRANCH_REVIEW_STATE.BRANCH_ONLY,
    accessTier: "public",
    compiledAt: "2026-10-28T12:00:00.000Z",
    rootEntityRef: "topic:numeric-news",
    parentBranchRefs: [],
    childBranchRefs: [],
    relatedBranchRefs: [],
    tags: [],
    attributes: {},
    entities: [
      { id: "topic-numeric-news", ref: "topic:numeric-news", kind: "topic", label: "מספרים וחדשות", accessTier: "public", tags: [], attributes: {} },
      ...[14, 358, 456, 1400, 1358, 1456, 1500].map(number),
    ],
    sources: [
      { id: "news-first", kind: "reported", label: "דיווח ראשון", locator: "https://example.test/first", capturedAt: "2026-10-28T11:31:00+02:00", accessTier: "public", tags: [], attributes: {} },
      { id: "news-later", kind: "official", label: "עדכון מאוחר", locator: "https://example.test/later", capturedAt: "2026-10-28T15:00:00+02:00", accessTier: "public", tags: [], attributes: {} },
    ],
    evidenceRecords: [
      {
        id: "news-marker-1456",
        lane: ONE_TREE_EVIDENCE_LANE.SOURCE_FACT,
        findingKind: ONE_TREE_FINDING_KIND.NEWS_PUBLICATION_MARKER,
        subjectRefs: ["topic:numeric-news", "number:1456"],
        sourceIds: ["news-first"],
        predicate: "published_value_snapshot",
        value: 1456,
        verificationState: "match",
        semanticClass: "evidence",
        governanceState: ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING,
        accessTier: "public",
        tags: ["news_milestone"],
        attributes: {
          news_publication_marker: {
            published_at: "2026-10-28T11:31:00+02:00",
            snapshot_state: ONE_TREE_NEWS_MARKER_STATE.REPORTED_SNAPSHOT,
            scope: { counted_percent: 70 },
            immutable_snapshot: true,
            source_claim_only: true,
            updates_marker_id: null,
          },
        },
      },
      {
        id: "news-marker-1500-final",
        lane: ONE_TREE_EVIDENCE_LANE.SOURCE_FACT,
        findingKind: ONE_TREE_FINDING_KIND.NEWS_PUBLICATION_MARKER,
        subjectRefs: ["topic:numeric-news", "number:1500"],
        sourceIds: ["news-later"],
        predicate: "published_value_snapshot",
        value: 1500,
        verificationState: "match",
        semanticClass: "evidence",
        governanceState: ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING,
        dependsOn: ["news-marker-1456"],
        accessTier: "public",
        tags: ["news_milestone"],
        attributes: {
          news_publication_marker: {
            published_at: "2026-10-28T15:00:00+02:00",
            snapshot_state: ONE_TREE_NEWS_MARKER_STATE.FINAL_RESULT,
            scope: { counted_percent: 100 },
            immutable_snapshot: true,
            source_claim_only: true,
            updates_marker_id: "news-marker-1456",
          },
        },
      },
      systemMethod({
        id: "method-1456-456",
        input: 1456,
        output: 456,
        ruleId: ONE_TREE_SYSTEM_METHOD_RULE_ID.SHITAT_HAECHAD_ALEF,
        operation: "leading_one_split",
        methodOutput: { leading_unit: 1000, remainder: 456 },
        dependsOn: ["news-marker-1456"],
      }),
      systemMethod({
        id: "method-1400-14",
        input: 1400,
        output: 14,
        ruleId: ONE_TREE_SYSTEM_METHOD_RULE_ID.ZERO_SCALE,
        operation: "zero_scale_chain",
        methodOutput: { core_root: 14, scale_chain: [14, 140, 1400] },
      }),
      systemMethod({
        id: "method-1358-358",
        input: 1358,
        output: 358,
        ruleId: ONE_TREE_SYSTEM_METHOD_RULE_ID.SHITAT_HAECHAD_ALEF,
        operation: "leading_one_split",
        methodOutput: { leading_unit: 1000, remainder: 358 },
      }),
    ],
    relationCandidates: [],
  };
}

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

test("the same candidate evidence retains one finding and source identity across World, Topic and Number", () => {
  const bundle = compileOneTreeBranch(broadFixture());
  const worlds = [ONE_TREE_CONSUMER.WORLD, ONE_TREE_CONSUMER.TOPIC, ONE_TREE_CONSUMER.NUMBER]
    .map(consumer => projectOneTreeBranchForConsumer(bundle, consumer));
  const identity = projection => {
    const finding = projection.resultBundle.findings.find(item => item.id === "creation:fact-book-topic");
    assert.ok(finding);
    return { id: finding.id, sourceRef: finding.source.sourceRef, refs: finding.evidence.refs, status: finding.status };
  };

  assert.deepEqual(worlds.map(identity), [identity(worlds[0]), identity(worlds[0]), identity(worlds[0])]);
  assert.equal(identity(worlds[0]).sourceRef, "source-book");
  assert.equal(identity(worlds[0]).status, ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING);
  assert.equal(bundle.invariants.same_branch_finding_identity_for_all_consumers, true);
  assert.equal(bundle.invariants.declared_subject_references_are_not_graph_edges, true);
  assert.equal(bundle.invariants.relation_candidates_are_not_graph_edges, true);
  for (const projection of worlds) {
    assert.equal(projection.relationCandidateIds.includes("relation-book-topic"), true);
    assert.equal(projection.resultBundle.findings.some(item => item.id === "creation:claim-private-note"), false);
  }
});

test("a later input appears in projections only after recompiling the branch snapshot", () => {
  const input = broadFixture();
  const initial = compileOneTreeBranch(input);
  input.evidenceRecords.push({
    id: "future-source-fact",
    lane: ONE_TREE_EVIDENCE_LANE.SOURCE_FACT,
    findingKind: "book_fact",
    subjectRefs: ["topic:creation", "number:1820"],
    sourceIds: ["source-book"],
    predicate: "statement_in_source",
    value: "new source content",
    verificationState: "not_tested",
    semanticClass: "evidence",
    governanceState: ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING,
    accessTier: "public",
    tags: [],
    attributes: {},
  });

  const hasNewFinding = bundle => projectOneTreeBranchForConsumer(bundle, ONE_TREE_CONSUMER.WORLD)
    .resultBundle.findings.some(item => item.id === "creation:future-source-fact");
  assert.equal(hasNewFinding(initial), false);
  const next = compileOneTreeBranch(input);
  assert.equal(hasNewFinding(next), true);
  assert.equal(initial.invariants.compiled_input_is_snapshot_not_live_feed, true);
  for (const consumer of [ONE_TREE_CONSUMER.TOPIC, ONE_TREE_CONSUMER.NUMBER]) {
    const finding = projectOneTreeBranchForConsumer(next, consumer).resultBundle.findings
      .find(item => item.id === "creation:future-source-fact");
    assert.ok(finding);
    assert.equal(finding.source.sourceRef, "source-book");
    assert.equal(finding.status, ONE_TREE_BRANCH_REVIEW_STATE.HUMAN_GATE_PENDING);
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

test("news milestones and governed system methods compile as site-wide layers", () => {
  const bundle = compileOneTreeBranch(layeredFixture());
  const projection = projectOneTreeBranchForConsumer(bundle, ONE_TREE_CONSUMER.TOPIC);

  assert.deepEqual(bundle.layers.newsMilestones.evidenceIds, [
    "news-marker-1456",
    "news-marker-1500-final",
  ]);
  assert.deepEqual(bundle.layers.systemMethods.evidenceIds, [
    "method-1456-456",
    "method-1400-14",
    "method-1358-358",
  ]);
  assert.equal(bundle.layers.newsMilestones.laterMarkersDoNotOverwriteEarlierMarkers, true);
  assert.equal(bundle.layers.systemMethods.owner, "project_codex.numeric_rule_family_index");
  assert.deepEqual(bundle.indexes.bySystemMethodRule.shitat_haechad_alef_law, [
    "method-1358-358",
    "method-1456-456",
  ]);
  assert.deepEqual(bundle.indexes.byNewsMarkerState.reported_snapshot, ["news-marker-1456"]);
  assert.equal(bundle.indexes.byNumber["1456"].includes("method-1456-456"), true);
  assert.equal(bundle.indexes.byNumber["456"].includes("method-1456-456"), true);
  assert.equal(bundle.entities.some(entity => entity.ref === "number:1456"), true);
  assert.equal(bundle.entities.some(entity => entity.ref === "number:456"), true);
  assert.equal(bundle.invariants.system_method_derivation_is_not_numeric_equality, true);
  assert.equal(bundle.invariants.system_method_derivation_is_not_independent_evidence, true);
  assert.deepEqual(projection.layerEvidenceIds.systemMethods, bundle.layers.systemMethods.evidenceIds);
  assert.equal(projection.guardrails.newsMilestonesRemainAppendOnly, true);
  assert.equal(projection.guardrails.rawNumericIdentityPreserved, true);

  const methodFinding = bundle.findingByRecordId["method-1358-358"];
  assert.equal(methodFinding.evidence.facts[0].input_value, 1358);
  assert.equal(methodFinding.evidence.facts[0].output_value, 358);
  assert.equal(methodFinding.evidence.facts[0].evidence_relation, "derivation");
});

test("special layers fail closed on overwrite semantics, unknown rules or lost raw identity", () => {
  const overwrite = layeredFixture();
  overwrite.evidenceRecords[1].dependsOn = [];
  assert.match(inspectOneTreeBranchInput(overwrite).errors.join("\n"), /updates append and never overwrite/);

  const unknownRule = layeredFixture();
  unknownRule.evidenceRecords[2].methodId = "local_one_rule";
  unknownRule.evidenceRecords[2].attributes.system_method_application.rule_id = "local_one_rule";
  assert.match(inspectOneTreeBranchInput(unknownRule).errors.join("\n"), /governed numeric system-method rule/);

  const lostRawIdentity = layeredFixture();
  lostRawIdentity.evidenceRecords[2].subjectRefs = ["number:456"];
  assert.match(inspectOneTreeBranchInput(lostRawIdentity).errors.join("\n"), /preserve the raw numeric input entity/);

  const mutableNews = layeredFixture();
  mutableNews.evidenceRecords[0].attributes.news_publication_marker.immutable_snapshot = false;
  assert.match(inspectOneTreeBranchInput(mutableNews).errors.join("\n"), /immutable_snapshot must be true/);
});
