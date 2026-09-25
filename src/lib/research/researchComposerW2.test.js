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


test("Raziel Route Grammar exposes four stable semantic actions without execution authority", () => {
  const grammar = buildRazielRouteGrammar({
    question: "מה זה 1820?",
    surfaceContext: { surface: "number", subject: { type: "number" } },
    identityResolution: {
      primary: { type: "number", value: 1820, label: "1820" },
      identities: [{ type: "number", value: 1820, label: "1820" }],
    },
  });
  assert.deepEqual(grammar.actions.map((x) => x.id), [
    RAZIEL_ROUTE_ACTION.UNDERSTAND,
    RAZIEL_ROUTE_ACTION.RESEARCH,
    RAZIEL_ROUTE_ACTION.CONNECT,
    RAZIEL_ROUTE_ACTION.CONTINUE,
  ]);
  assert.equal(grammar.requested_action, RAZIEL_ROUTE_ACTION.UNDERSTAND);
  assert.equal(grammar.guards.no_tool_execution, true);
  assert.equal(grammar.guards.no_navigation_execution, true);
  assert.equal(grammar.guards.no_second_router, true);
});

test("Raziel Route Grammar gives explicit user language priority over surface defaults", () => {
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
  assert.equal(research.requested_action, RAZIEL_ROUTE_ACTION.RESEARCH);
  assert.equal(next.requested_action, RAZIEL_ROUTE_ACTION.CONTINUE);
  assert.equal(connect.requested_by, "user_language");
});

test("Raziel Route Grammar uses existing surface roles only as a fallback", () => {
  assert.equal(buildRazielRouteGrammar({ surfaceContext: { surface: "world" } }).requested_action, RAZIEL_ROUTE_ACTION.CONNECT);
  assert.equal(buildRazielRouteGrammar({ surfaceContext: { surface: "journey" } }).requested_action, RAZIEL_ROUTE_ACTION.CONTINUE);
  assert.equal(buildRazielRouteGrammar({ surfaceContext: { surface: "els" } }).requested_action, RAZIEL_ROUTE_ACTION.RESEARCH);
  assert.equal(buildRazielRouteGrammar({ surfaceContext: { surface: "post" } }).requested_action, RAZIEL_ROUTE_ACTION.UNDERSTAND);
});

test("Research Plan carries Route Grammar additively without changing strategy/capability authority", () => {
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
  assert.equal(plan.route_grammar.requested_action, RAZIEL_ROUTE_ACTION.CONNECT);
  assert.equal(plan.route_grammar.guards.semantic_hint_only, true);
  assert.equal(plan.guards.route_grammar_is_semantic_hint_only, true);
});

test("generic planner intent does not steal explicit conversational meaning", () => {
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
  assert.equal(plan.intent, "research");
  assert.equal(plan.route_grammar.requested_action, RAZIEL_ROUTE_ACTION.UNDERSTAND);
});
