import assert from 'node:assert/strict';
import test from 'node:test';
import { composeResearchW2 } from './researchComposerW2.js';
import { ACCESS_CLASS, capabilityResult, CAPABILITY_STATUS, composeResearchResultBundle } from './researchResultBundle.js';
import { CONTROL_STATE, SELECTION_PROTOCOL } from './researchEvaluation.js';

function operatorRef(owner, capabilityKey, operatorId, version) {
  return {
    type: 'research_operator',
    owner,
    capability_key: capabilityKey,
    operator_id: operatorId,
    version,
  };
}

function evaluation(ref, overrides = {}) {
  return {
    operator_ref: ref,
    selection: {
      protocol: SELECTION_PROTOCOL.PRE_REGISTERED_TARGET,
      target_ref: 'test:target',
      provenance_ref: 'test:protocol',
      fixed_before_inspection: true,
    },
    search_space: {
      declared: { corpus: 'fixture', depth: 100 },
      effective: { corpus: 'fixture', depth: 100 },
      tested: { rows: 100 },
      dimensions: { targets: 1 },
      budget: { rows: 100 },
      multiplicity: { targets: 1, operators: 1, total_tests: 1, known_complete: true },
    },
    expectedness: {
      state: 'low_information_controlled_fixture',
      model: 'fixture-model-v1',
      base_rate: 0.25,
      assumptions: ['fixture only'],
    },
    controls: [{ control_id: 'random-1', type: 'randomized', model: 'fixture-rng', result: { hits: 2 }, seed: '42', version: 'v1' }],
    controls_state: { status: CONTROL_STATE.EXECUTED, reason: 'fixture controls executed', model: 'fixture-rng' },
    location: {
      native: { convention: 'native-v1', start: 10, end: 12, locator: 'fixture:10-12' },
      canonical: { convention: 'canonical-v1', start: 11, end: 13, locator: 'canonical:11-13' },
      reconciliation_state: 'converted',
      reconciliation: { delta: 1 },
      span: { start: 11, end: 13, unit: 'position' },
      window_ref: 'window:fixture:1',
    },
    dependency: { group: 'dep:1', relation: 'same_window', window_ref: 'window:fixture:1', depends_on: ['source:1'] },
    robustness: { state: 'stable', protocol: 'neighbor-perturbation-v1', perturbations_tested: 4, result: { survived: 3 } },
    competing_patterns: [{ operator_id: 'competitor', observed: false }],
    completion: { state: 'complete', complete: true, truncated: false, continuation: null, stop_reason: 'fixture exhausted' },
    replay: {
      replayable: true,
      run_id: 'run:fixture:1',
      input_ref: 'test:target',
      source_ref: 'fixture:source',
      engine_ref: ref.operator_id,
      version_refs: [ref.version],
      parameters: { depth: 100 },
      random_seed: '42',
      generator_version: 'fixture-rng-v1',
    },
    ...overrides,
  };
}

test('one maximal Result Bundle evaluation contract transports Pattern, ELS, Method and unknown future capability without domain-specific schema', () => {
  const refs = {
    pattern: operatorRef('research_strategy_layer_law', 'sequence:pi', 'pi', 'chudnovsky-bigint-v1'),
    els: operatorRef('els_single_engine_law', 'els', 'skip-search', 'els-core-v1'),
    method: operatorRef('canonical_methods_registry_law', 'gematria', 'ragil', 'method-v1'),
    future: operatorRef('future_owner_law', 'future:quantum-spatial', 'quantum-spatial-recurrence', 'v2032'),
  };

  const bundle = composeResearchResultBundle({
    query: { subject: 'cross-capability-fixture' },
    capabilities: [
      capabilityResult({ key: 'sequence:pi', owner: refs.pattern.owner, operatorRef: refs.pattern, researchEvaluation: evaluation(refs.pattern) }),
      capabilityResult({ key: 'els', owner: refs.els.owner, operatorRef: refs.els, researchEvaluation: evaluation(refs.els) }),
      capabilityResult({ key: 'gematria', owner: refs.method.owner, operatorRef: refs.method, researchEvaluation: evaluation(refs.method) }),
      capabilityResult({ key: 'future:quantum-spatial', owner: refs.future.owner, operatorRef: refs.future, researchEvaluation: evaluation(refs.future) }),
    ],
  });

  assert.equal(bundle.contract_version, 1, 'outer Result Bundle remains additive/backward-compatible');
  assert.equal(bundle.capability_trace.length, 4);
  for (const cap of bundle.capability_trace) {
    assert.equal(cap.research_evaluation.contract_version, 1);
    assert.equal(cap.research_evaluation.operator_ref.capability_key, cap.key);
    assert.equal(cap.research_evaluation.selection.protocol, SELECTION_PROTOCOL.PRE_REGISTERED_TARGET);
    assert.equal(cap.research_evaluation.search_space.multiplicity.total_tests, 1);
    assert.equal(cap.research_evaluation.expectedness.model, 'fixture-model-v1');
    assert.equal(cap.research_evaluation.controls[0].seed, '42');
    assert.equal(cap.research_evaluation.controls_state.status, CONTROL_STATE.EXECUTED);
    assert.equal(cap.research_evaluation.location.reconciliation_state, 'converted');
    assert.equal(cap.research_evaluation.dependency.relation, 'same_window');
    assert.equal(cap.research_evaluation.robustness.state, 'stable');
    assert.equal(cap.research_evaluation.completion.complete, true);
    assert.equal(cap.research_evaluation.replay.replayable, true);
  }
  assert.equal(bundle.invariants.research_evaluation_is_transport_not_truth, true);
  assert.equal(bundle.invariants.unknown_evaluation_fields_remain_unknown, true);
});

test('negative result can carry maximal search/evaluation provenance without becoming positive evidence', () => {
  const ref = operatorRef('els_single_engine_law', 'els', 'skip-search', 'els-core-v1');
  const bundle = composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'els',
      owner: ref.owner,
      status: CAPABILITY_STATUS.NEGATIVE_RESULT,
      findings: [],
      negativeScope: { corpus: 'fixture', depth: 500 },
      operatorRef: ref,
      researchEvaluation: evaluation(ref, {
        completion: { state: 'bounded_complete_negative', complete: true, truncated: false, stop_reason: 'bounded space exhausted' },
      }),
    })],
  });

  assert.equal(bundle.coverage.negative_result, 1);
  assert.equal(bundle.capability_trace[0].negative_result.searched, true);
  assert.equal(bundle.capability_trace[0].research_evaluation.completion.state, 'bounded_complete_negative');
  assert.deepEqual(bundle.findings, []);
});

test('missing evaluation data stays unknown/null instead of being fabricated', () => {
  const ref = operatorRef('future_owner_law', 'future:unknown', 'unknown-op', 'v1');
  const bundle = composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:unknown',
      owner: ref.owner,
      operatorRef: ref,
      researchEvaluation: { operator_ref: ref },
    })],
  });

  const evaluationOut = bundle.capability_trace[0].research_evaluation;
  assert.equal(evaluationOut.operator_ref.operator_id, 'unknown-op');
  assert.equal(evaluationOut.selection, null);
  assert.equal(evaluationOut.search_space, null);
  assert.equal(evaluationOut.expectedness, null);
  assert.deepEqual(evaluationOut.controls, []);
  assert.equal(evaluationOut.controls_state, null);
  assert.equal(evaluationOut.replay, null);
});

test('selection provenance fails closed on an invented protocol rather than silently normalizing it', () => {
  const ref = operatorRef('future_owner_law', 'future:unknown', 'unknown-op', 'v1');
  assert.throws(() => composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:unknown',
      owner: ref.owner,
      operatorRef: ref,
      researchEvaluation: {
        operator_ref: ref,
        selection: { protocol: 'looks_significant_after_the_fact' },
      },
    })],
  }), /invalid selection protocol/);
});

test('malformed owner-qualified operator reference fails closed instead of disappearing from the Bundle', () => {
  assert.throws(() => composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:broken',
      owner: 'future_owner_law',
      operatorRef: { owner: 'future_owner_law', capability_key: 'future:broken', operator_id: 'broken-without-version' },
      researchEvaluation: {},
    })],
  }), /malformed owner-qualified operator_ref/);
});

test('access-controlled evaluation provenance is filtered unless its tier is explicitly allowed', () => {
  const ref = operatorRef('person_foundation_contract_law', 'person:patterns', 'private-pattern-scan', 'v1');
  const bundle = composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'person:patterns',
      owner: ref.owner,
      accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
      operatorRef: ref,
      researchEvaluation: evaluation(ref, {
        access: { tier: 'private', reason: 'private person research' },
        replay: {
          replayable: true,
          input_ref: 'anon:private-person-input',
          source_ref: 'private:person:secret-source',
          engine_ref: 'private-pattern-scan',
          version_refs: ['v1'],
          parameters: { secret: true },
        },
      }),
    })],
  });

  const cap = bundle.capability_trace[0];
  assert.equal(cap.research_evaluation, null);
  assert.equal(cap.research_evaluation_access.filtered, true);
  assert.match(cap.research_evaluation_access.reason, /private/);
  assert.equal(JSON.stringify(cap).includes('secret-source'), false);
  assert.equal(bundle.invariants.evaluation_access_is_filtered_at_composition_boundary, true);
});

test('base rate outside probability range fails closed', () => {
  const ref = operatorRef('future_owner_law', 'future:probability', 'probability-op', 'v1');
  assert.throws(() => composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:probability', owner: ref.owner, operatorRef: ref,
      researchEvaluation: evaluation(ref, { expectedness: { model: 'bad-model', base_rate: 7 } }),
    })],
  }), /base_rate.*between 0 and 1/);
});

test('control without provenance identity remains null rather than receiving a fabricated ordinal id', () => {
  const ref = operatorRef('future_owner_law', 'future:control', 'control-op', 'v1');
  const bundle = composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:control', owner: ref.owner, operatorRef: ref,
      researchEvaluation: evaluation(ref, { controls: [{ type: 'randomized', model: 'rng-v1', result: { hits: 0 } }] }),
    })],
  });
  assert.equal(bundle.capability_trace[0].research_evaluation.controls[0].control_id, null);
});

test('replayable=true fails closed when replay identity/version/parameters are incomplete', () => {
  const ref = operatorRef('future_owner_law', 'future:replay', 'replay-op', 'v1');
  assert.throws(() => composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:replay', owner: ref.owner, operatorRef: ref,
      researchEvaluation: evaluation(ref, { replay: { replayable: true, source_ref: 'source:1' } }),
    })],
  }), /replayable=true requires/);
});

test('completion cannot claim complete and truncated simultaneously', () => {
  const ref = operatorRef('future_owner_law', 'future:completion', 'completion-op', 'v1');
  assert.throws(() => composeResearchResultBundle({
    query: { subject: 'fixture' },
    capabilities: [capabilityResult({
      key: 'future:completion', owner: ref.owner, operatorRef: ref,
      researchEvaluation: evaluation(ref, { completion: { state: 'impossible', complete: true, truncated: true } }),
    })],
  }), /completion cannot be both complete=true and truncated=true/);
});

test('W2 Composer preserves the same maximal envelope from an unknown future executor to the final Bundle', async () => {
  const ref = operatorRef('future_owner_law', 'future:quantum-spatial', 'quantum-spatial-recurrence', 'v2032');
  const bundle = await composeResearchW2({
    question: 'run future fixture',
    rawInput: 'future fixture',
    requestedCapabilities: ['future:quantum-spatial'],
    executors: {
      'future:quantum-spatial': async () => ({
        owner: ref.owner,
        status: CAPABILITY_STATUS.EXECUTED,
        findings: [],
        operatorRef: ref,
        researchEvaluation: evaluation(ref),
      }),
    },
  });

  const cap = bundle.capability_trace.find(x => x.key === 'future:quantum-spatial');
  assert.ok(cap);
  assert.equal(cap.operator_ref.operator_id, 'quantum-spatial-recurrence');
  assert.equal(cap.research_evaluation.selection.protocol, SELECTION_PROTOCOL.PRE_REGISTERED_TARGET);
  assert.equal(cap.research_evaluation.replay.run_id, 'run:fixture:1');
  assert.equal(bundle.contract_version, 1);
});
