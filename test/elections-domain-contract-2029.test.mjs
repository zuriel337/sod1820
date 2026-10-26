import test from "node:test";
import assert from "node:assert/strict";

import {
  ELECTIONS_CONSUMER,
  ELECTIONS_DOMAIN_CONTRACT_VERSION,
  ELECTIONS_EVIDENCE_LANE,
  compileElectionsDomainBundle,
  inspectElectionsDomainInput,
  projectElectionsDomainForConsumer,
} from "../src/lib/research/electionsDomainContract2029.js";
import {
  ELECTIONS_ISRAEL_21_26_BUNDLE,
  ELECTIONS_ISRAEL_21_26_INPUT,
  ELECTIONS_ISRAEL_21_26_RAZIEL_CONTEXT,
} from "../src/lib/research/electionsIsrael21_26Seed2029.js";

const clone = value => structuredClone(value);

test("two Israeli election systems compile into one non-canonical domain bundle", () => {
  const bundle = ELECTIONS_ISRAEL_21_26_BUNDLE;

  assert.equal(bundle.contractVersion, ELECTIONS_DOMAIN_CONTRACT_VERSION);
  assert.equal(bundle.rootEntityRef, "node:2bb53dbf-816a-4033-aff2-874c4981cd39");
  assert.equal(bundle.invariants.one_reality_graph, true);
  assert.equal(bundle.invariants.one_research_context, true);
  assert.equal(bundle.invariants.no_auto_canonicalization, true);
  assert.equal(bundle.invariants.no_auto_publication, true);
  assert.equal(bundle.relationCandidates.every(row => row.status === "proposed_relation_candidate"), true);

  const cycleRefs = new Set(bundle.entities
    .filter(entity => entity.kind === "election_cycle")
    .map(entity => entity.ref));
  assert.deepEqual(cycleRefs, new Set(["election:il:knesset-21", "election:il:knesset-26"]));
});

test("source, fact, engine and interpretation lanes remain separate", () => {
  const bundle = ELECTIONS_ISRAEL_21_26_BUNDLE;
  assert.equal(bundle.sources.length > 0, true);
  assert.equal(bundle.evidence[ELECTIONS_EVIDENCE_LANE.SOURCE_PROVENANCE], bundle.sources);
  assert.equal(bundle.evidence[ELECTIONS_EVIDENCE_LANE.SOURCE_FACT].length, 16);
  assert.equal(bundle.evidence[ELECTIONS_EVIDENCE_LANE.ENGINE_CALCULATION].length, 14);
  assert.equal(bundle.evidence[ELECTIONS_EVIDENCE_LANE.INTERPRETATION].length, 8);

  const findingById = Object.fromEntries(bundle.resultBundle.findings.map(row => [row.id, row]));
  assert.equal(findingById["elections:derived-gap-1454"].stage, "evidence");
  assert.equal(
    findingById["elections:derived-gap-1454"].projection.dimensions.semantic_class,
    "derivation",
  );
  assert.equal(findingById["elections:engine-seal-454"].stage, "evidence");
  assert.equal(findingById["elections:gap-1454-seal"].stage, "interpretation");
  assert.equal(
    findingById["elections:gap-1454-seal"].verification.verification_state,
    null,
  );
});

test("the seed maps requested people, parties, sources and numeric anchors", () => {
  const bundle = ELECTIONS_ISRAEL_21_26_BUNDLE;
  const entityByRef = Object.fromEntries(bundle.entities.map(entity => [entity.ref, entity]));

  assert.equal(entityByRef["person:naftali-bennett"].label, "נפתלי בנט");
  assert.equal(entityByRef["person:ofer-winter"].label, "עופר וינטר");
  assert.equal(entityByRef["person:tamar-shvili"].label, "תמר (תמי) שוילי");
  assert.equal(entityByRef["party:sharshar"].label, "שרשר לאהבה ואחדות העם");

  assert.deepEqual(bundle.indexes.byNumber["631"], [
    "engine-bennett-631",
    "engine-elections-631",
    "engine-king-israel-631",
    "engine-nes-netanyahu-631",
    "engine-winter-631",
    "number-631",
  ]);
  assert.deepEqual(bundle.indexes.byNumber["1820"], [
    "engine-winter-milui-1820",
    "number-1820",
  ]);
  assert.equal(bundle.indexes.byNumber["450"].includes("engine-tami-450"), true);
  assert.equal(bundle.indexes.byNumber["454"].includes("engine-seal-454"), true);
  assert.equal(bundle.indexes.byNumber["140052"].includes("derived-threshold-140052"), true);
});

test("threshold and gap stay deterministic derivations over official inputs", () => {
  const bundle = ELECTIONS_ISRAEL_21_26_BUNDLE;
  const factIds = new Set(bundle.evidence.source_fact.map(row => row.id));
  const calculations = Object.fromEntries(bundle.evidence.engine_calculation.map(row => [row.id, row]));
  const capability = bundle.resultBundle.capability_trace.find(
    row => row.key === "elections_deterministic_derivations",
  );

  assert.equal(factIds.has("official-threshold-140052"), false);
  assert.equal(factIds.has("official-gap-1454"), false);
  assert.deepEqual(calculations["derived-threshold-140052"].dependsOn, [
    "official-valid-votes-4309270",
  ]);
  assert.deepEqual(calculations["derived-gap-1454"].dependsOn, [
    "official-valid-votes-4309270",
    "official-new-right-138598",
  ]);
  assert.equal(capability.semantic_class, "derivation");
});

test("all consumers receive the same identities and evidence ids without presentation payload", () => {
  const bundle = ELECTIONS_ISRAEL_21_26_BUNDLE;
  const topic = projectElectionsDomainForConsumer(bundle, ELECTIONS_CONSUMER.TOPIC);
  const world = projectElectionsDomainForConsumer(bundle, ELECTIONS_CONSUMER.WORLD);
  const gallery = projectElectionsDomainForConsumer(bundle, ELECTIONS_CONSUMER.GALLERY);

  assert.deepEqual(topic.entityRefs, world.entityRefs);
  assert.deepEqual(topic.sourceIds, gallery.sourceIds);
  assert.deepEqual(topic.evidenceIdsByLane, world.evidenceIdsByLane);
  assert.equal(topic.guardrails.noPresentationInstructions, true);
  assert.equal("layout" in topic, false);
  assert.equal("component" in topic, false);
});

test("Raziel receives an attributed context pack but no promotion or publishing authority", () => {
  const projection = ELECTIONS_ISRAEL_21_26_RAZIEL_CONTEXT;

  assert.equal(projection.razielContext.mode, "research_companion");
  assert.equal(projection.razielContext.mayExplainConnections, true);
  assert.equal(projection.razielContext.maySuggestNextResearch, true);
  assert.equal(projection.razielContext.requiredAttribution, true);
  assert.equal(projection.razielContext.mayPromoteToCanonical, false);
  assert.equal(projection.razielContext.mayPublish, false);
  assert.deepEqual(Object.keys(projection.evidenceIdsByLane).sort(), [
    "engine_calculation",
    "interpretation",
    "source_fact",
    "source_provenance",
  ]);
});

test("a source fact cannot exist without a resolvable source", () => {
  const input = clone(ELECTIONS_ISRAEL_21_26_INPUT);
  input.sourceFacts[0].sourceIds = ["missing-source"];

  const inspection = inspectElectionsDomainInput(input);
  assert.equal(inspection.valid, false);
  assert.match(inspection.errors.join("\n"), /dangling ref missing-source/);
  assert.throws(() => compileElectionsDomainBundle(input), /dangling ref missing-source/);
});

test("an official fact requires an official source", () => {
  const input = clone(ELECTIONS_ISRAEL_21_26_INPUT);
  input.sources.find(source => source.id === "knesset-21-national-results").kind = "reported";

  const inspection = inspectElectionsDomainInput(input);
  assert.equal(inspection.valid, false);
  assert.match(inspection.errors.join("\n"), /claims official scope without an official source/);
});

test("an engine calculation requires explicit engine and method versions", () => {
  const input = clone(ELECTIONS_ISRAEL_21_26_INPUT);
  input.engineCalculations[0].methodVersion = null;
  input.engineCalculations[0].engineRef = null;

  const inspection = inspectElectionsDomainInput(input);
  assert.equal(inspection.valid, false);
  assert.match(inspection.errors.join("\n"), /methodVersion is required/);
  assert.match(inspection.errors.join("\n"), /engineRef is required/);
});

test("interpretation cannot masquerade as approved fact or depend on unknown evidence", () => {
  const input = clone(ELECTIONS_ISRAEL_21_26_INPUT);
  input.interpretations[0].governanceState = "approved";
  input.interpretations[0].dependsOn = ["unknown-evidence"];

  const inspection = inspectElectionsDomainInput(input);
  assert.equal(inspection.valid, false);
  assert.match(inspection.errors.join("\n"), /must stay human_gate_pending/);
  assert.match(inspection.errors.join("\n"), /dangling ref unknown-evidence/);
});

test("visual instructions and canonicalization claims are rejected recursively", () => {
  const input = clone(ELECTIONS_ISRAEL_21_26_INPUT);
  input.entities[0].layout = { mode: "tree" };
  input.interpretations[0].approved = true;

  const inspection = inspectElectionsDomainInput(input);
  assert.equal(inspection.valid, false);
  assert.match(inspection.errors.join("\n"), /layout belongs to another canonical owner/);
  assert.match(inspection.errors.join("\n"), /approved belongs to another canonical owner/);
});

test("duplicate identities fail closed and compiled output is deeply immutable", () => {
  const input = clone(ELECTIONS_ISRAEL_21_26_INPUT);
  input.sources[0].id = input.entities[0].id;

  const inspection = inspectElectionsDomainInput(input);
  assert.equal(inspection.valid, false);
  assert.match(inspection.errors.join("\n"), /duplicates elections-topic/);

  const bundle = ELECTIONS_ISRAEL_21_26_BUNDLE;
  assert.equal(Object.isFrozen(bundle), true);
  assert.equal(Object.isFrozen(bundle.entities), true);
  assert.equal(Object.isFrozen(bundle.resultBundle.findings[0]), true);
  assert.throws(() => bundle.entities.push({}), TypeError);
});
