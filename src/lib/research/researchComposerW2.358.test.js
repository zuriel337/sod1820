import test from "node:test";
import assert from "node:assert/strict";
import { makeUniversalFinding } from "./universalFinding.js";
import { composeResearchW2 } from "./researchComposerW2.js";
import { RESEARCH_IDENTITY_CONFIDENCE, RESEARCH_IDENTITY_SOURCE } from "./researchIdentityResolver.js";
import { RESEARCH_CAPABILITY } from "./researchPlanV2.js";
import { CAPABILITY_STATUS, EVIDENCE_RELATION } from "./researchResultBundle.js";

function finding(id) {
  return makeUniversalFinding({
    id,
    kind: "gematria",
    subject: { type: "number", key: "358", label: "358", value: 358 },
    source: { adapter: "358-composer-test", sourceRef: id },
    identity: { sourceIdentity: id },
    verification: { verification_state: "not_tested" },
    provenance: { createdBy: "TEST", inputRef: "358" },
  });
}

test("358 composer carries evidence dependency and negative/missing outcomes without collapsing them", async () => {
  const independent = finding("uf:358:independent:composer");
  const bundle = await composeResearchW2({
    question: "358 golden replay",
    identityCandidates: [{
      type: "number",
      value: 358,
      label: "358",
      source: RESEARCH_IDENTITY_SOURCE.NUMERIC_LITERAL,
      confidence: RESEARCH_IDENTITY_CONFIDENCE.EXACT,
    }],
    requestedCapabilities: [RESEARCH_CAPABILITY.ELS, "sequence:fixture"],
    executors: {
      [RESEARCH_CAPABILITY.NUMERIC]: async () => ({
        owner: "numericResearch",
        findings: [independent],
        findingOutcomes: [{ findingId: independent.id, evidenceRelation: EVIDENCE_RELATION.INDEPENDENT_EVIDENCE }],
      }),
      [RESEARCH_CAPABILITY.OPERATORS]: async () => ({ owner: "numeric_rule_family", findings: [] }),
      [RESEARCH_CAPABILITY.GRAPH]: async () => ({ owner: "reality_graph_law", findings: [] }),
      [RESEARCH_CAPABILITY.ELS]: async () => ({
        owner: "els_single_engine_law",
        status: CAPABILITY_STATUS.MISSING_ADAPTER,
        reason: "no safe number-only adapter",
        findings: [],
      }),
      "sequence:fixture": async () => ({
        owner: "sequence-owner",
        status: CAPABILITY_STATUS.NEGATIVE_RESULT,
        reason: "not found in bounded search",
        negativeScope: { max_search_depth: 1000 },
        findings: [],
      }),
    },
  });

  assert.equal(bundle.finding_outcomes[0].evidence_relation, "independent_evidence");
  assert.equal(bundle.coverage.negative_result, 1);
  assert.equal(bundle.coverage.missing_adapter, 1);
  assert.equal(bundle.coverage.partial, true);
  const els = bundle.capability_trace.find(x => x.key === RESEARCH_CAPABILITY.ELS);
  const seq = bundle.capability_trace.find(x => x.key === "sequence:fixture");
  assert.equal(els.status, "missing_adapter");
  assert.equal(seq.status, "negative_result");
  assert.equal(seq.negative_result.scope.max_search_depth, 1000);
});
