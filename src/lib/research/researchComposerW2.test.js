import test from "node:test";
import assert from "node:assert/strict";
import { makeUniversalFinding } from "./universalFinding.js";
import {
  RESEARCH_IDENTITY_CONFIDENCE,
  RESEARCH_IDENTITY_SOURCE,
  resolveResearchIdentities,
} from "./researchIdentityResolver.js";
import { buildResearchPlanV2, RESEARCH_CAPABILITY } from "./researchPlanV2.js";
import { buildRazielRouteGrammar, RAZIEL_ROUTE_ACTION } from "./razielRouteGrammar.js";
import {
  CAPABILITY_STATUS,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";
import { composeResearchW2 } from "./researchComposerW2.js";
import { normalizeResearchSynthesis } from "./researchSynthesis.js";

function finding(id, kind = "other", label = id) {
  return makeUniversalFinding({
    id,
    kind,
    subject: { type: kind === "els" ? "word" : "entity", key: id, label },
    source: { adapter: "synthetic-test", sourceRef: `test:${id}` },
    identity: { sourceIdentity: `test:${id}` },
    verification: { verification_state: "not_tested" },
    provenance: { createdBy: "TEST", inputRef: `test:${id}` },
  });
}

test("known Book identity blocks accidental gematria of its label", () => {
  const resolved = resolveResearchIdentities({
    rawInput: "מה הקשר בין 1820 לאהבת תורה?",
    candidates: [
      { type: "number", value: 1820, label: "1820", source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL, confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT },
      { type: "book", id: "book-node-1", identity_key: "book:ahavat-torah", label: "אהבת תורה", source: RESEARCH_IDENTITY_SOURCE.GRAPH_IDENTITY, confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT },
    ],
  });

  assert.equal(resolved.text_calculation_allowed, false);
  assert.equal(resolved.identities.some(x => x.type === "book" && x.identity_key === "book:ahavat-torah"), true);

  const plan = buildResearchPlanV2({ question: resolved.raw_input, identityResolution: resolved });
  assert.equal(plan.strategy, "cross_identity_research");
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.BOOKS), true);
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.SOURCES), true);
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GRAPH), true);
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.NUMERIC), true);
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GEMATRIA), false);
});

test("explicit gematria request may calculate the Book title as text without changing Book identity", () => {
  const resolved = resolveResearchIdentities({
    rawInput: "כמה אהבת תורה בגימטריה?",
    explicitTextComputation: true,
    candidates: [
      { type: "book", id: "book-node-1", identity_key: "book:ahavat-torah", label: "אהבת תורה", source: RESEARCH_IDENTITY_SOURCE.GRAPH_IDENTITY, confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT },
    ],
  });
  const plan = buildResearchPlanV2({ question: resolved.raw_input, intent: "gematria", identityResolution: resolved });
  assert.equal(resolved.text_calculation_allowed, true);
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GEMATRIA), true);
  assert.equal(plan.identities[0].identity_key, "book:ahavat-torah");
});

test("Name Research requests canonical Gematria plus dependency-normalized Cross capability", () => {
  const resolved = resolveResearchIdentities({
    rawInput: "נתח את השם אב גד",
    candidates: [{
      type: "name",
      key: "name:test:synthetic-ab-gad",
      label: "אב גד",
      source: RESEARCH_IDENTITY_SOURCE.EXPLICIT_REF,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    }],
  });
  const plan = buildResearchPlanV2({ question: resolved.raw_input, intent: "research", identityResolution: resolved });
  assert.equal(plan.strategy, "name_research");
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GEMATRIA), true);
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GEMATRIA_RELATIONS), true);
  assert.equal(plan.check_order.indexOf(RESEARCH_CAPABILITY.GEMATRIA) < plan.check_order.indexOf(RESEARCH_CAPABILITY.GEMATRIA_RELATIONS), true);
});

test("personal family + clock context requests privacy-first person/time/operator capabilities", () => {
  const resolved = resolveResearchIdentities({
    rawInput: "4:24 חוזר אצלי ואצל הבן שלי",
    candidates: [
      { type: "person", ref: "person:owner:self", label: "אני", source: RESEARCH_IDENTITY_SOURCE.PERSONAL_CONTEXT, confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT },
      { type: "person", ref: "person:owner:p:child", label: "הבן שלי", source: RESEARCH_IDENTITY_SOURCE.PERSONAL_CONTEXT, confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT },
    ],
  });
  const plan = buildResearchPlanV2({
    question: resolved.raw_input,
    identityResolution: resolved,
    contextType: "authenticated_user",
    authorizationContext: { user_ref: "owner" },
  });

  assert.equal(plan.strategy, "personal_family_research");
  assert.equal(plan.check_order[0], RESEARCH_CAPABILITY.PERSON);
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.FAMILY), true);
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.TIME), true);
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.OPERATORS), true);
  assert.equal(plan.guards.access_must_be_resolved_before_evidence, true);
});

test("explicit ELS intent routes ELS without turning it into a gematria engine", () => {
  const resolved = resolveResearchIdentities({
    rawInput: "חפש משיח טבת עשירי בדילוגי אותיות",
    candidates: [{ type: "phrase", label: "משיח טבת עשירי", value: "משיח טבת עשירי", source: RESEARCH_IDENTITY_SOURCE.EXPLICIT_REF, confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT }],
  });
  const plan = buildResearchPlanV2({ question: resolved.raw_input, intent: "els", identityResolution: resolved });
  assert.equal(plan.strategy, "els_research");
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.ELS), true);
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GEMATRIA), false);
});

test("result bundle dedupes one finding shown by multiple capabilities without changing truth", () => {
  const shared = finding("uf:test:shared", "graph-entity", "1820");
  const bundle = composeResearchResultBundle({
    query: { subject: "1820" },
    capabilities: [
      capabilityResult({ key: "graph", owner: "reality_graph_law", findings: [shared] }),
      capabilityResult({ key: "numeric", owner: "numericResearch", findings: [shared] }),
    ],
  });

  assert.equal(bundle.findings.length, 1);
  assert.equal(bundle.findings[0].id, shared.id);
  assert.equal(bundle.findings[0].verification.verification_state, "not_tested");
  assert.equal(bundle.capability_trace.length, 2);
  assert.equal(bundle.coverage.complete, true);
});

test("failed capability remains explicit and AI arithmetic fallback is forbidden", () => {
  const ok = finding("uf:test:book", "research-object", "source result");
  const bundle = composeResearchResultBundle({
    query: { subject: "book+number" },
    capabilities: [
      capabilityResult({ key: "books", owner: "research_intake_foundation_contract_law", findings: [ok] }),
      capabilityResult({ key: "els", owner: "els_single_engine_law", status: CAPABILITY_STATUS.FAILED, reason: "engine unavailable", findings: [] }),
    ],
  });

  assert.equal(bundle.coverage.partial, true);
  assert.equal(bundle.coverage.failed, 1);
  assert.equal(bundle.invariants.no_ai_arithmetic_fallback, true);
  assert.equal(bundle.findings.length, 1);
});

test("future capability plugs in without changing bundle schema or consumer contract", () => {
  const future = finding("uf:test:future", "future-engine", "future result");
  const bundle = composeResearchResultBundle({
    query: { subject: "future" },
    capabilities: [capabilityResult({
      key: "future_engine_2030",
      owner: "future_canonical_owner",
      findings: [future],
      sourceRefs: ["future:source:1"],
      versionRefs: ["future:v1"],
    })],
  });

  assert.equal(bundle.capability_trace[0].key, "future_engine_2030");
  assert.equal(bundle.findings[0].id, future.id);
  assert.equal(bundle.contract_version, 1);
  assert.equal(bundle.invariants.no_auto_canonicalization, true);
  assert.equal(bundle.invariants.no_auto_publication, true);
});

test("synthesis contract forbids universal truth scores and keeps Tarot auxiliary-only", () => {
  assert.throws(() => normalizeResearchSynthesis({
    truth_score: 91,
    claims: [{ id: "c1", text: "claim" }],
  }), /truth_score is forbidden/);

  const synthesis = normalizeResearchSynthesis({
    claims: [{ id: "c1", text: "bounded interpretation" }],
    motifs: [{ key: "integration", claim_ids: ["c1"] }],
    auxiliary_signals: [{
      kind: "tarot",
      result: { cards: [9, 11, 14] },
      evidence_weight: 99,
      included_in_empirical_fit: true,
    }],
  });

  assert.equal(synthesis.invariants.no_universal_truth_score, true);
  assert.equal(synthesis.auxiliary_signals[0].evidence_weight, 0);
  assert.equal(synthesis.auxiliary_signals[0].included_in_empirical_fit, false);
});

test("empirical person-fit is rejected unless the message was frozen before validation", () => {
  assert.throws(() => normalizeResearchSynthesis({
    claims: [{ id: "c1", text: "claim" }],
    calibration: {
      individual: { tested_claims: 1, supported_claims: 1, empirical_fit_percent: 100 },
      bias_controls: { message_frozen_before_validation: false },
    },
  }), /message_frozen_before_validation=true/);

  const synthesis = normalizeResearchSynthesis({
    claims: [{ id: "c1", text: "claim" }],
    calibration: {
      state: "calibrating",
      individual: { tested_claims: 1, supported_claims: 1, empirical_fit_percent: 100 },
      bias_controls: {
        message_frozen_before_validation: true,
        validation_data_hidden_during_synthesis: true,
      },
    },
  });
  assert.equal(synthesis.calibration.individual.empirical_fit_percent, 100);
  assert.equal(synthesis.invariants.empirical_person_fit_is_not_verification, true);
});

test("synthesis cannot cite a finding that did not survive the Result Bundle boundary", () => {
  assert.throws(() => normalizeResearchSynthesis({
    claims: [{
      id: "c1",
      text: "claim",
      support: { finding_ids: ["uf:private:not-in-bundle"] },
    }],
  }, { allowedFindingIds: ["uf:public:1"] }), /unavailable finding/);
});

test("W2 composer fills the single canonical synthesis socket and freezes it before validation", async () => {
  const bundle = await composeResearchW2({
    question: "bounded synthesis test",
    requestedCapabilities: [],
    synthesizer: async ({ bundle: safeBundle }) => {
      assert.equal(Object.prototype.hasOwnProperty.call(safeBundle, "access"), true);
      return {
        message: "one canonical synthesis",
        claims: [{ id: "claim:1", text: "atomic interpretation" }],
        motifs: [{ key: "integration", label: "Integration", claim_ids: ["claim:1"] }],
        calibration: {
          state: "holdout_pending",
          bias_controls: {
            message_frozen_before_validation: true,
            validation_data_hidden_during_synthesis: true,
          },
        },
      };
    },
  });

  assert.equal(bundle.synthesis.status, "composed");
  assert.equal(bundle.synthesis.message, "one canonical synthesis");
  assert.equal(bundle.synthesis.freeze.frozen, true);
  assert.equal(bundle.synthesis.invariants.tarot_is_auxiliary_only, true);
});

test("Cross Signatures are Bundle-backed while resonance and model agreement remain non-evidential", () => {
  const relation = finding("uf:test:relation", "gematria-relation", "אב ↔ גד");
  const synthesis = normalizeResearchSynthesis({
    claims: [{
      id: "c1",
      text: "bounded Cross motif",
      support: { finding_ids: [relation.id] },
    }],
    cross_signatures: [{
      finding_id: relation.id,
      relation_ref: "relation:test",
      effective_independent_group_count: 2,
      raw_group_count: 4,
      noise_flags: ["dependency_normalized"],
    }],
    research_strength: {
      independent_evidence_groups: 2,
      cross_domain_dimensions: ["gematria", "number_math"],
      reproducibility: "replayable",
    },
    resonance: {
      analyses: 1889,
      up_votes: 162,
      down_votes: 3,
      research_actions: 391,
    },
    model_robustness: {
      providers: ["anthropic", "google", "openai"],
      independent_runs: 3,
      shared_motifs: ["integration"],
    },
    corpus_context: {
      corpus_ref: "gematria_words",
      population_size: 4835,
      search_space_size: 258502,
      multiple_comparison_control: "declared",
    },
  }, { allowedFindingIds: [relation.id] });

  assert.equal(synthesis.cross_signatures.length, 1);
  assert.equal(synthesis.resonance.included_in_research_strength, false);
  assert.equal(synthesis.resonance.included_in_empirical_fit, false);
  assert.equal(synthesis.model_robustness.included_as_independent_evidence, false);
  assert.equal(synthesis.invariants.cross_signatures_must_be_bundle_backed, true);
  assert.equal(synthesis.invariants.historical_resonance_is_not_accuracy, true);

  assert.throws(() => normalizeResearchSynthesis({
    claims: [{ id: "x", text: "unsupported Cross" }],
    cross_signatures: [{ finding_id: "uf:missing" }],
  }, { allowedFindingIds: [relation.id] }), /must reference a relation Finding available/);
});

test("synthesis failure is explicit and never destroys the underlying research bundle", async () => {
  const bundle = await composeResearchW2({
    question: "synthesis failure test",
    requestedCapabilities: [],
    synthesizer: async () => ({ truth_score: 100, claims: [{ id: "x", text: "bad" }] }),
  });

  assert.equal(bundle.synthesis.status, "failed");
  assert.match(bundle.synthesis.explain_why.reason, /truth_score is forbidden/);
  assert.equal(Array.isArray(bundle.findings), true);
  assert.equal(bundle.invariants.no_auto_canonicalization, true);
});


test("Raziel Route Grammar exposes exactly four stable human actions", () => {
  const grammar = buildRazielRouteGrammar({
    question: "מה זה 1820?",
    surfaceContext: { surface: "number", subject: { type: "number" } },
    identityResolution: {
      primary: { type: "number", value: 1820, label: "1820" },
      identities: [{ type: "number", value: 1820, label: "1820" }],
    },
  });

  assert.deepEqual(grammar.actions.map((action) => action.id), [
    RAZIEL_ROUTE_ACTION.UNDERSTAND,
    RAZIEL_ROUTE_ACTION.RESEARCH,
    RAZIEL_ROUTE_ACTION.CONNECT,
    RAZIEL_ROUTE_ACTION.CONTINUE,
  ]);
  assert.deepEqual(grammar.actions.map((action) => action.label), ["להבין", "לחקור", "לחבר", "להתקדם"]);
  assert.equal(grammar.requested_action, RAZIEL_ROUTE_ACTION.UNDERSTAND);
  assert.equal(grammar.requested_by, "user_language");
  assert.equal(grammar.guards.no_second_router, true);
  assert.equal(grammar.guards.no_tool_execution, true);
});

test("Raziel Route Grammar reads natural language goal before surface default", () => {
  const connect = buildRazielRouteGrammar({
    question: "מה הקשר בין 455 ל-424?",
    surfaceContext: { surface: "number" },
  });
  const research = buildRazielRouteGrammar({
    question: "תחקור לי את השם שלי לעומק",
    surfaceContext: { surface: "home" },
  });
  const next = buildRazielRouteGrammar({
    question: "תמשיך מהמסע מהמקום שעצרתי",
    surfaceContext: { surface: "number" },
  });

  assert.equal(connect.requested_action, RAZIEL_ROUTE_ACTION.CONNECT);
  assert.equal(connect.actions.find((x) => x.selected).preferred_home, "world");
  assert.equal(research.requested_action, RAZIEL_ROUTE_ACTION.RESEARCH);
  assert.equal(research.actions.find((x) => x.selected).preferred_home, "heichal");
  assert.equal(next.requested_action, RAZIEL_ROUTE_ACTION.CONTINUE);
  assert.equal(next.actions.find((x) => x.selected).preferred_home, "journey");
});

test("Raziel Route Grammar uses the existing surface roles when the user did not ask explicitly", () => {
  const world = buildRazielRouteGrammar({ surfaceContext: { surface: "world" } });
  const journey = buildRazielRouteGrammar({ surfaceContext: { surface: "journey" } });
  const els = buildRazielRouteGrammar({ surfaceContext: { surface: "els" } });
  const post = buildRazielRouteGrammar({ surfaceContext: { surface: "post" } });

  assert.equal(world.requested_action, RAZIEL_ROUTE_ACTION.CONNECT);
  assert.equal(world.requested_by, "surface_default");
  assert.equal(journey.requested_action, RAZIEL_ROUTE_ACTION.CONTINUE);
  assert.equal(els.requested_action, RAZIEL_ROUTE_ACTION.RESEARCH);
  assert.equal(post.requested_action, RAZIEL_ROUTE_ACTION.UNDERSTAND);
});

test("Research Plan carries Route Grammar additively without replacing strategy or capability owners", () => {
  const resolved = resolveResearchIdentities({
    rawInput: "מה הקשר בין 455 ל-424?",
    candidates: [
      { type: "number", value: 455, label: "455", source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL, confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT },
      { type: "number", value: 424, label: "424", source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL, confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT },
    ],
  });
  const plan = buildResearchPlanV2({
    question: resolved.raw_input,
    identityResolution: resolved,
    surfaceContext: { surface: "number" },
  });

  assert.equal(plan.strategy, "number_research");
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.RELATIONS), true);
  assert.equal(plan.requested_capabilities.includes(RESEARCH_CAPABILITY.NUMERIC), true);
  assert.equal(plan.route_grammar.requested_action, RAZIEL_ROUTE_ACTION.CONNECT);
  assert.equal(plan.route_grammar.guards.semantic_hint_only, true);
  assert.equal(plan.guards.route_grammar_is_semantic_hint_only, true);
});


test("generic planner intent research never steals an explicit conversational UNDERSTAND request", () => {
  const resolved = resolveResearchIdentities({
    rawInput: "מה זה 1820?",
    candidates: [
      { type: "number", value: 1820, label: "1820", source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL, confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT },
    ],
  });
  const plan = buildResearchPlanV2({
    question: resolved.raw_input,
    identityResolution: resolved,
    surfaceContext: { surface: "number" },
  });

  assert.equal(plan.intent, "research", "existing planner default remains unchanged");
  assert.equal(plan.route_grammar.requested_action, RAZIEL_ROUTE_ACTION.UNDERSTAND);
  assert.equal(plan.route_grammar.requested_by, "user_language");
});


test("journey noun alone does not steal an explicit RESEARCH verb", () => {
  const grammar = buildRazielRouteGrammar({
    question: "תחקור את מסע 878 לעומק",
    surfaceContext: { surface: "number" },
  });
  assert.equal(grammar.requested_action, RAZIEL_ROUTE_ACTION.RESEARCH);
});
