import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanonicalW2Executors } from './researchW2Executors.js';
import { CAPABILITY_STATUS, EVIDENCE_RELATION } from './researchResultBundle.js';

function fakeSupabase() {
  return {
    rpc: async (name, args) => {
      if (name === 'fn_number_lookup') return { data: [{ phrase: 'משיח', method: 'רגיל', value: args.p_value }] };
      if (name === 'fn_number_dossier') return { data: { value: args.p_value, facts: { convergences: [] } };
      if (name === 'fn_number_journey') return { data: { value: args.p_value, map: { root: args.p_value } } };
      if (name === 'number_neighbors') return { data: [{ value: 424, weight: 12.84 }] };
      return { data: null };
    },
  };
}

const numberIdentity = value => ({ identities: [{ type: 'number', key: String(value), value, ref: String(value) }] });

test('358 canonical numeric executor keeps raw lookup rows behind the adapter boundary', async () => {
  const executors = createCanonicalW2Executors({ supabase: fakeSupabase() });
  const out = await executors.numeric({ identityResolution: numberIdentity(358) });
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.trace.root.value, 358);
  assert.equal(out.trace.per_lens.number_lookup.status, 'ok');
  assert.equal(out.trace.per_lens.number_lookup.row_count, 1);
  assert.equal(JSON.stringify(out.trace).includes('משיח'), false);
  assert.deepEqual(out.findings, []);
});

test('numeric executor cannot reinterpret a non-number semantic identity whose label happens to be numeric', async () => {
  const executors = createCanonicalW2Executors({ supabase: fakeSupabase() });
  const out = await executors.numeric({ identityResolution: { identities: [{ type: 'book', label: '358', key: 'book:358' }] } });
  assert.equal(out.status, CAPABILITY_STATUS.SKIPPED);
});

test('numeric executor refuses coercible empty, boolean and array values instead of researching 0 or 1', async () => {
  const executors = createCanonicalW2Executors({ supabase: fakeSupabase() });
  for (const value of ['', '   ', true, []]) {
    const out = await executors.numeric({ identityResolution: { identities: [{ type: 'number', value }] } });
    assert.equal(out.status, CAPABILITY_STATUS.SKIPPED);
  }
});

test('W2 numeric bridge refuses raw research_objects access instead of relying on caller RLS', () => {
  assert.throws(() => createCanonicalW2Executors({ supabase: fakeSupabase(), numericLenses: ['number_lookup', 'research_objects'] }), /cannot bypass capability adapters/);
});

test('research_objects capability reports deliberate access refusal instead of missing adapter', async () => {
  const executors = createCanonicalW2Executors({ supabase: fakeSupabase() });
  const out = await executors.research_objects({ identityResolution: numberIdentity(358) });
  assert.equal(out.status, CAPABILITY_STATUS.CONTEXT_REQUIRED);
  assert.deepEqual(out.findings, []);
  assert.match(out.reason, /access-filtered/i);
  assert.equal(out.trace.access, 'refused_fail_closed');
});

test('358 Fibonacci bounded search survives as first-class negative result', async () => {
  const executors = createCanonicalW2Executors({ supabase: fakeSupabase() });
  const out = await executors['sequence:fibonacci']({ identityResolution: numberIdentity(358) });
  assert.equal(out.status, CAPABILITY_STATUS.NEGATIVE_RESULT);
  assert.deepEqual(out.findings, []);
  assert.equal(out.negativeScope.sequence_id, 'fibonacci');
  assert.equal(out.negativeScope.search_depth, 10000);
});

test('377 Fibonacci hit is explicitly independent evidence, not a derived Gematria confirmation', async () => {
  const executors = createCanonicalW2Executors({ supabase: fakeSupabase() });
  const out = await executors['sequence:fibonacci']({ identityResolution: numberIdentity(377) });
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.findings.length, 1);
  assert.equal(out.findingOutcomes[0].findingId, out.findings[0].id);
  assert.equal(out.findingOutcomes[0].evidenceRelation, EVIDENCE_RELATION.INDEPENDENT_EVIDENCE);
  assert.equal(out.findingOutcomes[0].expectedness, 'sequence_specific_not_estimated');
});

test('358 pi hit carries high-base-rate expectedness so lineage independence is not mistaken for corroboration', async () => {
  const executors = createCanonicalW2Executors({ supabase: fakeSupabase() });
  const out = await executors['sequence:pi']({ identityResolution: numberIdentity(358) });
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.findings.length, 1);
  assert.equal(out.findingOutcomes[0].evidenceRelation, EVIDENCE_RELATION.INDEPENDENT_EVIDENCE);
  assert.equal(out.findingOutcomes[0].expectedness, 'near_certain_under_uniform_digit_heuristic');
  assert.equal(out.findingOutcomes[0].expectednessModel, 'uniform_digit_stream_heuristic_v1');
  assert.ok(out.findingOutcomes[0].baseRate > 0.95);
  assert.match(out.findingOutcomes[0].reason, /not corroboration by itself/i);
});

test('358 ELS remains first-class missing adapter, never negative evidence', async () => {
  const executors = createCanonicalW2Executors({ supabase: fakeSupabase() });
  const out = await executors.els({ identityResolution: numberIdentity(358) });
  assert.equal(out.status, CAPABILITY_STATUS.MISSING_ADAPTER);
  assert.deepEqual(out.findings, []);
  assert.match(out.reason, /number-only/i);
});
