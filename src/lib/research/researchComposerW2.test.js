import test from "node:test";
import assert from "node:assert/strict";
import { makeUniversalFinding } from "./universalFinding.js";
import {
  RESEARCH_IDENTITY_CONFIDENCE,
  RESEARCH_IDENTITY_SOURCE,
  resolveResearchIdentities,
} from "./researchIdentityResolver.js";
import { buildResearchPlanV2, RESEARCH_CAPABILITY } from "./researchPlanV2.js";
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
