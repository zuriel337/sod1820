import assert from 'node:assert/strict';
import test from 'node:test';
import { composeResearchW2 } from './researchComposerW2.js';
import { createCanonicalW2Executors } from './researchW2Executors.js';

function fakeSupabase() {
  return {
    rpc: async (name, args) => {
      if (name === 'fn_number_lookup') return { data: [{ phrase: 'משיח', method: 'רגיל', value: args.p_value }] };
      if (name === 'fn_number_dossier') return { data: { value: args.p_value, facts: { convergences: [] } } };
      if (name === 'fn_number_journey') return { data: { value: args.p_value, map: { root: args.p_value } } };
      if (name === 'number_neighbors') return { data: [{ value: 424, weight: 12.84 }] };
      return { data: null };
    },
  };
}

const identity358 = [{ type: 'number', value: 358, ref: '358', source: 'explicit_ref', confidence: 'exact' }];

function cap(bundle, key) {
  return bundle.capability_trace.find(x => x.key === key);
}

test('358 replay preserves execution, negative result and capability gaps without raw-evidence leakage', async () => {
  const executors = createCanonicalW2Executors({ supabase: fakeSupabase() });
  const bundle = await composeResearchW2({
    question: '358',
    rawInput: '358',
    identityCandidates: identity358,
    requestedCapabilities: ['numeric', 'els', 'sequence:fibonacci', 'research_objects'],
    executors,
  });

  assert.equal(bundle.query.identities[0].value, 358);
  assert.equal(cap(bundle, 'numeric').status, 'executed');
  assert.equal(cap(bundle, 'sequence:fibonacci').status, 'negative_result');
  assert.equal(cap(bundle, 'els').status, 'missing_adapter');
  assert.equal(cap(bundle, 'research_objects').status, 'missing_adapter');
  assert.equal(cap(bundle, 'graph').status, 'missing_adapter');
  assert.equal(cap(bundle, 'numeric_operators').status, 'missing_adapter');
  assert.equal(bundle.coverage.negative_result, 1);
  assert.equal(bundle.coverage.missing_adapter, 4);
  assert.equal(bundle.coverage.executed, 2);
  assert.equal(bundle.coverage.partial, true);
  assert.equal(bundle.findings.length, 0);
  assert.equal(JSON.stringify(cap(bundle, 'numeric').trace).includes('משיח'), false);
  assert.equal(cap(bundle, 'sequence:fibonacci').negative_result.scope.sequence_id, 'fibonacci');
  assert.equal(bundle.synthesis, null);
});
