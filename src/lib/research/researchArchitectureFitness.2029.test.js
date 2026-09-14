import assert from 'node:assert/strict';
import test from 'node:test';

import { makeUniversalFinding } from './universalFinding.js';
import {
  CAPABILITY_STATUS,
  EVIDENCE_RELATION,
  capabilityResult,
  composeResearchResultBundle,
} from './researchResultBundle.js';
import { normalizeResearchEvaluation } from './researchEvaluation.js';

function finding(id = 'uf:fitness:1') {
  return makeUniversalFinding({
    id,
    kind: 'fixture',
    subject: { type: 'entity', key: id, label: id },
    source: { adapter: 'architecture-fitness', sourceRef: `fixture:${id}` },
    identity: { sourceIdentity: `fixture:${id}` },
    provenance: { createdBy: 'TEST', inputRef: 'fixture' },
  });
}

function ref(capability = 'future:fixture', version = 'v1') {
  return {
    type: 'research_operator',
    owner: 'future_owner_law',
    capability_key: capability,
    operator_id: 'future-op',
    version,
  };
}

test('pre-registered and post-hoc timing contradictions fail closed', () => {
  assert.throws(() => normalizeResearchEvaluation({
    selection: { protocol: 'pre_registered_target', fixed_before_inspection: false },
  }), /pre_registered_target/);

  assert.throws(() => normalizeResearchEvaluation({
    selection: { protocol: 'post_hoc_exploratory', fixed_before_inspection: true },
  }), /post_hoc_exploratory/);
});

test('completion cannot claim complete while offering continuation or truncation', () => {
  assert.throws(() => normalizeResearchEvaluation({
    completion: { complete: true, truncated: true },
  }), /complete=true/);
  assert.throws(() => normalizeResearchEvaluation({
    completion: { complete: true, truncated: false, continuation: { cursor: 'next' } },
  }), /continuation/);
});

test('replayable=true requires input/source-version/parameters rather than optimism', () => {
  assert.throws(() => normalizeResearchEvaluation({
    replay: { replayable: true, input_ref: 'x' },
  }), /requires input_ref/);
});

test('operator version/capability mismatch cannot be laundered through Result Bundle', () => {
  assert.throws(() => composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:fixture',
      owner: 'future_owner_law',
      operatorRef: ref('future:fixture', 'v1'),
      researchEvaluation: { operator_ref: ref('future:fixture', 'v2') },
    })],
  }), /operator_ref mismatch/);

  assert.throws(() => composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:fixture',
      owner: 'future_owner_law',
      operatorRef: ref('future:other', 'v1'),
    })],
  }), /does not match capability/);
});

test('precomputed rank survives only as contextual order, never governed Research Strength', () => {
  const f = finding('uf:fitness:rank');
  const bundle = composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:fixture', owner: 'future_owner_law', findings: [f],
      findingOutcomes: [{
        findingId: f.id,
        evidenceRelation: EVIDENCE_RELATION.INDEPENDENT_EVIDENCE,
        reason: 'fixture',
      }],
    })],
    ranking: [{ findingId: f.id, rank: 1, score: 999 }],
  });
  assert.equal(bundle.ranking[0].score, 999);
  assert.equal(bundle.ranking[0].dependency_safe, false);
  assert.equal(bundle.ranking[0].research_strength_eligible, false);
  assert.equal(bundle.ranking_semantics.research_strength_eligible, false);
});

test('UNKNOWN dependency never turns an engine independent-evidence label into dependency proof', () => {
  const f = finding('uf:fitness:unknown');
  const bundle = composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:fixture', owner: 'future_owner_law', findings: [f],
      findingOutcomes: [{
        findingId: f.id,
        evidenceRelation: EVIDENCE_RELATION.INDEPENDENT_EVIDENCE,
        reason: 'lineage not supplied',
      }],
    })],
  });
  assert.equal(bundle.finding_outcomes[0].dependency_state, 'unknown');
  assert.equal(bundle.dependency_groups[0].dependency_state, 'unknown');
});

// These two tests lock the desired status semantics. They remain part of Step-5 acceptance: a
// non-executed capability may not smuggle positive evidence, and a NEGATIVE_RESULT must attest the
// bounded search it actually completed rather than obtaining searched=true from the status label.
test('non-executed capability status cannot carry positive Finding', () => {
  const f = finding('uf:fitness:missing-smuggle');
  assert.throws(() => composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:missing',
      owner: 'future_owner_law',
      status: CAPABILITY_STATUS.MISSING_ADAPTER,
      findings: [f],
    })],
  }), /cannot carry positive findings/);
});

test('NEGATIVE_RESULT without bounded search attestation fails closed', () => {
  assert.throws(() => composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:negative',
      owner: 'future_owner_law',
      status: CAPABILITY_STATUS.NEGATIVE_RESULT,
      reason: 'trust me, nothing was found',
      findings: [],
    })],
  }), /search attestation/);
});

test('bounded NEGATIVE_RESULT remains first-class when the searched scope is attested', () => {
  const bundle = composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:negative',
      owner: 'future_owner_law',
      status: CAPABILITY_STATUS.NEGATIVE_RESULT,
      reason: 'not found in the declared bounded scope',
      negativeScope: { corpus: 'fixture', max_depth: 500 },
      findings: [],
    })],
  });
  assert.equal(bundle.coverage.negative_result, 1);
  assert.equal(bundle.capability_trace[0].negative_result.searched, true);
  assert.equal(bundle.capability_trace[0].negative_result.scope.max_depth, 500);
});
