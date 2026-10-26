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
      return { owner: "research_intake_foundation_contract_law", findings: [syntheticFinding("book-finding", "research-object", "אהבת תורה source")] };
    },
    [RESEARCH_CAPABILITY.SOURCES]: async () => { calls.push("sources"); return { owner: "research_intake_foundation_contract_law", findings: [] }; },
    [RESEARCH_CAPABILITY.GRAPH]: async () => { calls.push("graph"); return { owner: "reality_graph_law", findings: [syntheticFinding("graph-1820", "graph-entity", "1820")] }; },
    [RESEARCH_CAPABILITY.NUMERIC]: async () => { calls.push("numeric"); return { owner: "research_strategy_layer_law", findings: [syntheticFinding("numeric-1820", "number", "1820")] }; },
    [RESEARCH_CAPABILITY.OPERATORS]: async () => { calls.push("operators"); return { owner: "numeric_rule_family", findings: [] }; },
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
      future_engine_2030: async () => ({ owner: "future_canonical_owner", versionRefs: ["future:v1"], findings: [syntheticFinding("future-finding", "future-engine", "future result")] }),
    },
  });

  const trace = bundle.capability_trace.find(x => x.key === "future_engine_2030");
  assert.equal(trace.owner, "future_canonical_owner");
  assert.equal(trace.status, "executed");
  assert.equal(bundle.findings.some(x => x.id === "future-finding"), true);
  assert.equal(bundle.invariants.no_auto_canonicalization, true);
});

test("missing executors disclose missing_adapter instead of fabricating a negative result", async () => {
  const bundle = await composeResearchW2({
    question: "חפש בדילוגים",
    intent: "els",
    requestedCapabilities: [RESEARCH_CAPABILITY.ELS],
    executors: {},
  });

  assert.equal(bundle.coverage.missing_adapter >= 1, true);
  assert.equal(bundle.coverage.negative_result, 0);
  assert.equal(bundle.coverage.complete, false);
  assert.equal(bundle.findings.length, 0);
  assert.equal(bundle.invariants.missing_adapter_is_not_negative_evidence, true);
  assert.equal(bundle.invariants.no_ai_arithmetic_fallback, true);
});

test("an injected presentation authority ranks only admitted Finding IDs after execution", async () => {
  const lead = syntheticFinding("lead", "gematria", "ביאת המשיח");
  const sourceFirst = syntheticFinding("source-first", "gematria", "אותיות אחרי");
  let seenIds = [];
  const bundle = await composeResearchW2({
    question: "776",
    requestedCapabilities: ["numeric"],
    capabilityAllowlist: ["numeric"],
    executors: {
      numeric: async () => ({ findings: [sourceFirst, lead] }),
    },
    rankingResolver: ({ capabilityResults }) => {
      seenIds = capabilityResults.flatMap((capability) => capability.findings.map((finding) => finding.id));
      return [{
        finding_id: lead.id,
        rank: 1,
        axes: { authority: "public.gematria_words.lead_rank" },
        reasons: ["manual number-page order"],
      }];
    },
  });

  assert.deepEqual(seenIds, [sourceFirst.id, lead.id]);
  assert.deepEqual(bundle.findings.map((finding) => finding.id), [sourceFirst.id, lead.id], "ranking never mutates source evidence order");
  assert.deepEqual(bundle.ranking.map((entry) => [entry.finding_id, entry.rank]), [[lead.id, 1]]);
});

test("a failed presentation resolver falls back without suppressing canonical evidence", async () => {
  const finding = syntheticFinding("still-present", "gematria", "1820");
  const bundle = await composeResearchW2({
    question: "1820",
    requestedCapabilities: ["numeric"],
    capabilityAllowlist: ["numeric"],
    executors: { numeric: async () => ({ findings: [finding] }) },
    ranking: [{ finding_id: finding.id, rank: 7 }],
    rankingResolver: () => { throw new Error("presentation unavailable"); },
  });

  assert.equal(bundle.findings[0].id, finding.id);
  assert.deepEqual(bundle.ranking.map((entry) => entry.rank), [7]);
});
