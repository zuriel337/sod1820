import test from "node:test";
import assert from "node:assert/strict";
import { makeUniversalFinding } from "./universalFinding.js";
import {
  CAPABILITY_STATUS,
  EVIDENCE_RELATION,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";

function finding(id, label) {
  return makeUniversalFinding({
    id,
    kind: "gematria",
    subject: { type: "number", key: "358", label, value: 358 },
    source: { adapter: "358-golden-replay-test", sourceRef: `test:${id}` },
    identity: { sourceIdentity: `test:${id}` },
    verification: { verification_state: "not_tested" },
    provenance: { createdBy: "TEST", inputRef: "358" },
  });
}

test("358 replay preserves derivation, convergence and independent evidence as distinct outcomes", () => {
  const derived = finding("uf:358:derived", "derived 358");
  const convergence = finding("uf:358:convergence", "convergent 358");
  const independent = finding("uf:358:independent", "independent 358");

  const bundle = composeResearchResultBundle({
    query: { subject: 358, replay: "golden" },
    capabilities: [capabilityResult({
      key: "numeric",
      owner: "numericResearch",
      findings: [derived, convergence, independent],
      findingOutcomes: [
        { findingId: derived.id, evidenceRelation: EVIDENCE_RELATION.DERIVATION, dependsOn: ["uf:358:source"], reason: "entailed by prior governed result" },
        { findingId: convergence.id, evidenceRelation: EVIDENCE_RELATION.CONVERGENCE, convergenceKey: "value:358", reason: "multiple paths meet at 358; independence not assumed" },
        {
          findingId: independent.id,
          evidenceRelation: EVIDENCE_RELATION.INDEPENDENT_EVIDENCE,
          reason: "source-native identity is independent of prior derivation",
          expectedness: "near_certain_under_uniform_digit_heuristic",
          expectednessModel: "uniform_digit_stream_heuristic_v1",
          baseRate: 0.99,
        },
      ],
    })],
  });

  assert.deepEqual(bundle.finding_outcomes.map(x => x.evidence_relation), [
    "derivation",
    "convergence",
    "independent_evidence",
  ]);
  assert.equal(bundle.finding_outcomes[2].expectedness, "near_certain_under_uniform_digit_heuristic");
  assert.equal(bundle.finding_outcomes[2].expectedness_model, "uniform_digit_stream_heuristic_v1");
  assert.equal(bundle.finding_outcomes[2].base_rate, 0.99);
  assert.equal(bundle.invariants.derivation_is_not_independent_evidence, true);
  assert.equal(bundle.invariants.convergence_is_not_automatically_independent, true);
});

test("executed capability with zero findings is executed-empty, not a positive result", () => {
  const bundle = composeResearchResultBundle({
    query: { subject: 358, replay: "golden" },
    capabilities: [capabilityResult({
      key: "numeric",
      owner: "numericResearch",
      status: CAPABILITY_STATUS.EXECUTED,
      findings: [],
    })],
  });

  assert.equal(bundle.coverage.executed, 1);
  assert.equal(bundle.coverage.executed_empty, 1);
  assert.equal(bundle.coverage.positive_result, 0);
  assert.equal(bundle.coverage.complete, true);
});

test("negative result is a completed executed search, not missing evidence", () => {
  const bundle = composeResearchResultBundle({
    query: { subject: 358, replay: "golden" },
    capabilities: [capabilityResult({
      key: "sequence:fixture",
      owner: "sequence-owner",
      status: CAPABILITY_STATUS.NEGATIVE_RESULT,
      reason: "358 not found within bounded canonical search",
      negativeScope: { max_search_depth: 25000, operation: "exact_digits" },
      findings: [],
    })],
  });

  assert.equal(bundle.coverage.executed, 1);
  assert.equal(bundle.coverage.negative_result, 1);
  assert.equal(bundle.coverage.complete, true);
  assert.equal(bundle.capability_trace[0].negative_result.searched, true);
  assert.equal(bundle.capability_trace[0].negative_result.scope.max_search_depth, 25000);
});

test("missing adapter survives as first-class gap and never becomes a negative result", () => {
  const bundle = composeResearchResultBundle({
    query: { subject: 358, replay: "golden" },
    capabilities: [capabilityResult({
      key: "els",
      owner: "els_single_engine_law",
      status: CAPABILITY_STATUS.MISSING_ADAPTER,
      reason: "no safe number-only ELS dispatch adapter",
      findings: [],
    })],
  });

  assert.equal(bundle.coverage.executed, 0);
  assert.equal(bundle.coverage.negative_result, 0);
  assert.equal(bundle.coverage.missing_adapter, 1);
  assert.equal(bundle.coverage.complete, false);
  assert.equal(bundle.capability_trace[0].negative_result, null);
  assert.equal(bundle.invariants.missing_adapter_is_not_negative_evidence, true);
});

test("negative result cannot smuggle a positive Finding", () => {
  assert.throws(() => composeResearchResultBundle({
    query: { subject: 358 },
    capabilities: [capabilityResult({
      key: "bad-adapter",
      status: CAPABILITY_STATUS.NEGATIVE_RESULT,
      findings: [finding("uf:358:contradiction", "should fail")],
    })],
  }), /negative_result/);
});
