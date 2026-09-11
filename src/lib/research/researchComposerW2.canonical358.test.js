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
  assert.equal(cap(bundle, 'research_objects').status, 'context_required');
  assert.match(cap(bundle, 'research_objects').reason, /access-filtered/i);
  // W2.2b UPDATED EXPECTATIONS (both were true statements about the PRE-W2.2b bridge, and both are
  // now false because the adapters they described as absent exist):
  //   graph            — still missing_adapter here BY DESIGN: this test injects no graph seam, and
  //                      W2 must never fall back to a resolver of its own.
  //   numeric_operators — was missing_adapter (no executor at all). There is now a governed Rule
  //                      Application adapter, and for 358 it honestly reports UNVERIFIED: 358 is
  //                      not 4-digit-leading-1, does not end in 0, and this fake RPC returns no
  //                      fn_zero_scale result, so no System Method application can be ATTESTED.
  //                      unverified is the honest outcome — not a fabricated READY, and not a
  //                      negative result (nothing was searched and found absent).
  assert.equal(cap(bundle, 'graph').status, 'missing_adapter');
  assert.equal(cap(bundle, 'numeric_operators').status, 'unverified');
  assert.match(cap(bundle, 'numeric_operators').reason, /could not be attested|no System Method rule application/i);
  assert.equal(bundle.coverage.negative_result, 1);
  assert.equal(bundle.coverage.context_required, 1);
  assert.equal(bundle.coverage.missing_adapter, 2);
  assert.equal(bundle.coverage.unverified, 1);
  assert.equal(bundle.coverage.executed, 2);
  assert.equal(bundle.coverage.positive_result, 1);
  assert.equal(bundle.coverage.partial, true);
  // W2.2b: the number_lookup row IS now a Universal Finding — that is the point of the pass. What
  // must still never happen is a RAW SOURCE ROW travelling in the capability trace.
  assert.equal(bundle.findings.length, 1);
  assert.equal(bundle.findings[0].identity.sourceIdentity.table, 'bidim');
  assert.equal(JSON.stringify(cap(bundle, 'numeric').trace).includes('משיח'), false);
  assert.equal(cap(bundle, 'sequence:fibonacci').negative_result.scope.sequence_id, 'fibonacci');
  assert.equal(bundle.synthesis, null);
});
