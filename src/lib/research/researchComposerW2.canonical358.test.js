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
    from: () => ({ select: () => ({ or: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
  };
}

const identity358 = [{ type: 'number', value: 358, ref: '358', source: 'explicit_ref', confidence: 'exact' }];

test('358 composes canonical numeric coverage and explicit ELS gap into one Result Bundle', async () => {
  const executors = createCanonicalW2Executors({
    supabase: fakeSupabase(),
    numericLenses: ['number_lookup', 'number_dossier', 'number_journey', 'neighbors', 'research_objects'],
  });
  const bundle = await composeResearchW2({
    question: '358', rawInput: '358', identityCandidates: identity358,
    requestedCapabilities: ['numeric', 'els'], executors,
  });

  assert.equal(bundle.query.identities[0].value, 358);
  assert.equal(bundle.capabilities.numeric.status, 'executed');
  assert.equal(bundle.capabilities.els.status, 'missing_adapter');
  assert.equal(bundle.coverage.missing_adapter, 1);
  assert.equal(bundle.coverage.negative_result, 0);
  assert.deepEqual(bundle.capabilities.numeric.findings, []);
  assert.equal(bundle.capabilities.numeric.trace.root.value, 358);
  assert.equal(bundle.synthesis, null);
});
