import assert from 'node:assert/strict';
import test from 'node:test';

import { createSequenceW2Executor } from './sequenceW2Executor.js';
import { createCanonicalW2Executors } from './researchW2Executors.js';
import {
  OPERATOR_EXECUTION_KIND,
  SEQUENCE_OPERATION,
  SEQUENCE_REPRESENTATION,
} from './sequenceLens.js';
import { CAPABILITY_STATUS, EVIDENCE_RELATION } from './researchResultBundle.js';

const numberIdentity = value => ({ identities: [{ type: 'number', key: `number:${value}`, value }] });
const fakeSupabase = { rpc: async () => ({ data: null }) };

const lucasAdapter = Object.freeze({
  sequenceId: 'lucas',
  sequenceVersion: 'fixture-lucas-v2032',
  owner: 'future_sequence_owner_law',
  operatorId: 'lucas.membership.fixture',
  operatorFamily: 'integer_sequence_membership',
  executionKind: OPERATOR_EXECUTION_KIND.DETERMINISTIC,
  outputType: 'sequence_term_occurrence',
  applicabilityBoundary: 'fixture non-negative integer query',
  representationKind: SEQUENCE_REPRESENTATION.TERM_SEQUENCE,
  positionConvention: 'fixture_one_based',
  maxSearchDepth: 100,
  defaultOperation: SEQUENCE_OPERATION.TERM_FIRST,
  operations: Object.freeze([SEQUENCE_OPERATION.TERM_FIRST]),
  async execute(request = {}) {
    return {
      status: 'ok',
      sequence_id: 'lucas',
      sequence_version: 'fixture-lucas-v2032',
      representation_kind: SEQUENCE_REPRESENTATION.TERM_SEQUENCE,
      query: String(request.query),
      operation: request.operation,
      position_convention: 'fixture_one_based',
      search_depth: request.budget.maxSearchDepth,
      result: {
        found: true,
        first_position: 17,
        occurrences_truncated: false,
        surrounding_window: { start_position: 15, end_position: 19 },
      },
      verification: { state: 'deterministic_computation', verified: true },
      provenance: { input_ref: request.provenance?.inputRef || null },
    };
  },
  async evaluate() {
    return {
      status: 'ok',
      expectedness: {
        state: 'fixture_low',
        model: 'lucas_fixture_expectedness_v1',
        base_rate: 0.125,
        assumptions: ['fixture'],
        unavailable_reason: null,
      },
      controls: [{
        control_id: 'lucas-fixture-control',
        type: 'structural',
        model: 'fixture-control-v1',
        result: { passed: true },
        version: 'v1',
      }],
      controls_state: { status: 'executed', reason: 'fixture control executed' },
      robustness: { state: 'stable', protocol: 'fixture-perturbation', perturbations_tested: 2, result: { survived: 2 } },
      competing_patterns: [{ operator_id: 'fixture-competitor', observed: false }],
    };
  },
});

test('unknown future sequence capability uses one generic W2 bridge with adapter-owned evaluation', async () => {
  const executor = createSequenceW2Executor({
    supabase: fakeSupabase,
    lensId: 'sequence:lucas',
    sequenceAdapters: [lucasAdapter],
    sequenceBudget: { maxSearchDepth: 100, maxOccurrences: 10, windowRadius: 2 },
  });

  const out = await executor({
    identityResolution: numberIdentity(358),
    plan: { selection_protocol: 'pre_registered_target' },
  });

  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.operatorRef.owner, 'future_sequence_owner_law');
  assert.equal(out.operatorRef.capability_key, 'sequence:lucas');
  assert.equal(out.researchEvaluation.expectedness.model, 'lucas_fixture_expectedness_v1');
  assert.equal(out.researchEvaluation.expectedness.base_rate, 0.125);
  assert.equal(out.researchEvaluation.controls_state.status, 'executed');
  assert.equal(out.researchEvaluation.robustness.state, 'stable');
  assert.equal(out.researchEvaluation.selection.protocol, 'pre_registered_target');
  assert.equal(out.findingOutcomes[0].evidenceRelation, EVIDENCE_RELATION.INDEPENDENT_EVIDENCE);
  assert.equal(out.findingOutcomes[0].expectednessModel, 'lucas_fixture_expectedness_v1');
  assert.match(out.findingOutcomes[0].reason, /operator-declared model/i);
});

test('canonical Pi/Fibonacci entrypoint consumes adapter evaluation instead of central family-specific evaluation', async () => {
  const executors = createCanonicalW2Executors({ supabase: fakeSupabase });

  const pi = await executors['sequence:pi']({ identityResolution: numberIdentity(358), plan: { selection_protocol: 'pre_registered_target' } });
  assert.equal(pi.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(pi.trace.evaluation_status, 'ok');
  assert.equal(pi.researchEvaluation.expectedness.model, 'uniform_digit_stream_heuristic_v1');
  assert.ok(pi.researchEvaluation.expectedness.base_rate > 0.95);
  assert.match(pi.findingOutcomes[0].reason, /declared evaluation model/i);

  const fib = await executors['sequence:fibonacci']({ identityResolution: numberIdentity(358), plan: { selection_protocol: 'pre_registered_target' } });
  assert.equal(fib.status, CAPABILITY_STATUS.NEGATIVE_RESULT);
  assert.equal(fib.trace.evaluation_status, 'unavailable');
  assert.equal(fib.researchEvaluation.expectedness.model, null);
  assert.match(fib.researchEvaluation.expectedness.unavailable_reason, /no registered Fibonacci/i);
});
