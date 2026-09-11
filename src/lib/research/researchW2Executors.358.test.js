import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanonicalW2Executors } from './researchW2Executors.js';
import { CAPABILITY_STATUS } from './researchResultBundle.js';

function fakeSupabase() {
  return {
    rpc: async (name, args) => {
      if (name === 'fn_number_lookup') return { data: [{ phrase: 'משיח', method: 'רגיל', value: args.p_value }] };
      if (name === 'fn_number_dossier') return { data: { value: args.p_value, facts: { convergences: [] } } };
      if (name === 'fn_number_journey') return { data: { value: args.p_value, map: { root: args.p_value } } };
      if (name === 'number_neighbors') return { data: [{ value: 424, weight: 12.84 }] };
      return { data: null };
    },
    from: () => ({
      select: () => ({
        or: () => ({ limit: async () => ({ data: [], error: null }) }),
      }),
    }),
  };
}

const identityResolution358 = { identities: [{ type: 'number', key: '358', value: 358, ref: '358' }] };

test('358 canonical numeric executor preserves router trace and does not manufacture lookup rows as findings', async () => {
  const executors = createCanonicalW2Executors({
    supabase: fakeSupabase(),
    numericLenses: ['number_lookup', 'number_dossier', 'number_journey', 'neighbors', 'research_objects'],
  });
  const out = await executors.number({ identityResolution: identityResolution358 });
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.trace.root.value, 358);
  assert.equal(out.trace.per_lens.number_lookup.status, 'ok');
  assert.deepEqual(out.findings, []);
});

test('358 ELS remains first-class missing adapter, never negative evidence', async () => {
  const executors = createCanonicalW2Executors({ supabase: fakeSupabase() });
  const out = await executors.els({ identityResolution: identityResolution358 });
  assert.equal(out.status, CAPABILITY_STATUS.MISSING_ADAPTER);
  assert.deepEqual(out.findings, []);
  assert.match(out.reason, /number-only/i);
});
