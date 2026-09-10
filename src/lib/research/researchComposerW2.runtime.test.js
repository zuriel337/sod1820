import test from "node:test";
import assert from "node:assert/strict";
import { makeUniversalFinding } from "./universalFinding.js";
import { composeResearchW2 } from "./researchComposerW2.js";
import {
  RESEARCH_IDENTITY_CONFIDENCE,
  RESEARCH_IDENTITY_SOURCE,
} from "./researchIdentityResolver.js";
import { RESEARCH_CAPABILITY } from "./researchPlanV2.js";

function syntheticFinding(id, kind, label) {
  return makeUniversalFinding({
    id,
    kind,
    subject: { type: kind, key: id, label },
    source: { adapter: "synthetic-runtime-test", sourceRef: `test:${id}` },
    identity: { sourceIdentity: `test:${id}` },
    verification: { verification_state: "not_tested" },
    provenance: { createdBy: "TEST", inputRef: `test:${id}` },
  });
}

test("1820 + Ahavat Torah resolves semantic identities before engine execution", async () => {
  const calls = [];
  const executors = {
    [RESEARCH_CAPABILITY.BOOKS]: async ({ plan }) => {
      calls.push("books");
      assert.equal(plan.guards.text_calculation_allowed, false);
      return {
        owner: "research_intake_foundation_contract_law",
        findings: [syntheticFinding("book-finding", "research-object", "אהבת תורה source")],
      };
    },
    [RESEARCH_CAPABILITY.SOURCES]: async () => {
      calls.push("sources");
      return { owner: "research_intake_foundation_contract_law", findings: [] };
    },
    [RESEARCH_CAPABILITY.GRAPH]: async () => {
      calls.push("graph");
      return { owner: "reality_graph_law", findings: [syntheticFinding("graph-1820", "graph-entity", "1820")] };
    },
    [RESEARCH_CAPABILITY.NUMERIC]: async () => {
      calls.push("numeric");
      return { owner: "research_strategy_layer_law", findings: [syntheticFinding("numeric-1820", "number", "1820")] };
    },
    [RESEARCH_CAPABILITY.OPERATORS]: async () => {
      calls.push("operators");
      return { owner: "numeric_rule_family", findings: [] };
    },
  };

  const bundle = await composeResearchW2({
    question: "מה הקשר בין 1820 לאהבת תורה?",
    identityCandidates: [
      { type: "number", value: 1820, label: "1820", source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL, confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT },
      { type: "book", id: "book-node", identity_key: "book:ahavat-torah", label: "אהבת תורה", source: RESEARCH_IDENTITY_SOURCE.GRAPH_IDENTITY, confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT },
    ],
    executors,
  });

  assert.equal(bundle.plan.strategy, "cross_identity_research");
  assert.equal(bundle.plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GEMATRIA), false);
  assert.equal(calls.includes("books"), true);
  assert.equal(calls.includes("numeric"), true);
  assert.equal(bundle.findings.length, 3);
  assert.equal(bundle.synthesis, null);
  assert.equal(bundle.resolved_run_snapshot.resolved_identities.some(x => x.identity_key === "book:ahavat-torah"), true);
});

test("future capability can be requested and executed through the same composer", async () => {
  const bundle = await composeResearchW2({
    question: "בדיקת מנוע עתידי",
    requestedCapabilities: ["future_engine_2030"],
    executors: {
      future_engine_2030: async () => ({
        owner: "future_canonical_owner",
        versionRefs: ["future:v1"],
        findings: [syntheticFinding("future-finding", "future-engine", "future result")],
      }),
    },
  });

  const trace = bundle.capability_trace.find(x => x.key === "future_engine_2030");
  assert.equal(trace.owner, "future_canonical_owner");
  assert.equal(trace.status, "executed");
  assert.equal(bundle.findings.some(x => x.id === "future-finding"), true);
  assert.equal(bundle.invariants.no_auto_canonicalization, true);
});

test("missing executors disclose incomplete coverage instead of fabricating output", async () => {
  const bundle = await composeResearchW2({
    question: "חפש בדילוגים",
    intent: "els",
    requestedCapabilities: [RESEARCH_CAPABILITY.ELS],
    executors: {},
  });

  assert.equal(bundle.coverage.missing >= 1, true);
  assert.equal(bundle.coverage.complete, false);
  assert.equal(bundle.findings.length, 0);
  assert.equal(bundle.invariants.no_ai_arithmetic_fallback, true);
});
