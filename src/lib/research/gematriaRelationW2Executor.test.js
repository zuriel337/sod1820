import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGematriaRelationW2Executor,
  GEMATRIA_RELATION_PAIR_MODE,
} from './gematriaRelationW2Executor.js';
import { EVIDENCE_RELATION } from './researchResultBundle.js';

function fakeSupabase() {
  return {
    async rpc(name, args) {
      assert.equal(name, 'fn_relation_candidate');
      return {
        data: {
          status: 'candidate',
          entity_a: args.p_a,
          entity_b: args.p_b,
          relation_kind: 'gematria_convergence',
          confidence: 'candidate',
          research_priority: 'RESEARCH',
          engine_signal: 2,
          noise_flags: [],
          engine_evidence: [{ method: 'רגיל', value: 338, group_repr: 'regular' }],
          composite_evidence: [],
          independent_evidence: { research_objects: [{ private: 'must-not-cross-generic-adapter' }] },
          expression_dependency: {
            same_word_multiset: false,
            same_letter_multiset: false,
          },
          engine_signal_components: {
            raw_independent_group_count: 2,
            effective_independent_group_count: 2,
            effective_structure_sensitive_group_count: 1,
          },
        },
      };
    },
  };
}

function nameResolution(accessTier = 'public') {
  return {
    text_calculation_allowed: true,
    identities: [{
      type: 'name',
      key: 'name:test',
      label: 'אב גד',
      access: { tier: accessTier },
      metadata: {
        name_parts: [
          { text: 'אב', role: 'given_name' },
          { text: 'גד', role: 'family_name' },
        ],
      },
    }],
  };
}

test('bounded Cross adapter calls only canonical fn_relation_candidate and emits convergence outcomes', async () => {
  const executor = createGematriaRelationW2Executor({
    supabase: fakeSupabase(),
    maxRepresentations: 8,
    maxPairs: 12,
  });

  const out = await executor({ identityResolution: nameResolution('public') });

  assert.equal(out.status, 'executed');
  assert.equal(out.semanticClass, 'derivation');
  assert.equal(out.trace.adapter, 'gematria-relation-w2-v1');
  assert.equal(out.trace.pair_count >= 1, true);
  assert.equal(out.findingOutcomes.every(x => x.evidenceRelation === EVIDENCE_RELATION.CONVERGENCE), true);
  assert.equal(out.findings.some(x => x.subject.label === 'אב ↔ גד'), true);
  assert.equal(out.findings.every(x => x.verification.verification_state === 'not_tested'), true);
});

test('Cross adapter does not transport access-controlled independent_evidence payload', async () => {
  const executor = createGematriaRelationW2Executor({ supabase: fakeSupabase() });
  const out = await executor({ identityResolution: nameResolution('public') });
  const serialized = JSON.stringify(out.findings);

  assert.equal(serialized.includes('must-not-cross-generic-adapter'), false);
  assert.equal(out.findings.every(x =>
    x.projection.dimensions.relation_candidate.independent_evidence_transport === 'excluded_v1_access_boundary'
  ), true);
});

test('personal Cross findings inherit personal access while capability trace never echoes raw name text', async () => {
  const executor = createGematriaRelationW2Executor({ supabase: fakeSupabase() });
  const out = await executor({ identityResolution: nameResolution('personal') });

  assert.equal(out.accessClass, 'source_access_controlled');
  assert.equal(out.findings.length > 0, true);
  assert.equal(out.findings.every(x => x.access.tier === 'personal'), true);
  const trace = JSON.stringify(out.trace);
  assert.equal(trace.includes('אב'), false);
  assert.equal(trace.includes('גד'), false);
});

test('Cross adapter is bounded and never expands to an unbounded pair scan', async () => {
  const executor = createGematriaRelationW2Executor({
    supabase: fakeSupabase(),
    maxRepresentations: 8,
    maxPairs: 1,
  });
  const out = await executor({ identityResolution: nameResolution('public') });

  assert.equal(out.trace.pair_count, 1);
  assert.equal(out.bounded.total_count, 3);
  assert.equal(out.bounded.returned_count, 1);
  assert.equal(out.bounded.truncated, true);
  assert.equal(out.bounded.continuation.kind, 'increase_pair_budget');
  assert.equal(out.trace.available_pair_count, 3);
});

test('direct personal pair uses exactly the two full Intake endpoints and one RPC without retry', async () => {
  const calls = [];
  const executor = createGematriaRelationW2Executor({
    supabase: {
      async rpc(name, args) {
        calls.push({ name, args });
        return fakeSupabase().rpc(name, args);
      },
    },
    pairMode: GEMATRIA_RELATION_PAIR_MODE.INTAKE_DIRECT_PAIR,
    maxRepresentations: 2,
    maxPairs: 1,
  });
  const out = await executor({
    identityResolution: nameResolution('personal'),
    intake: {
      representations: [
        { ref: 'repr:opaque-left', kind: 'expression', role: 'pair_left', content: 'משיח בן דוד', access: { tier: 'personal' } },
        { ref: 'repr:opaque-right', kind: 'expression', role: 'pair_right', content: 'מלך ישראל', access: { tier: 'personal' } },
      ],
    },
  });

  assert.deepEqual(calls, [{
    name: 'fn_relation_candidate',
    args: { p_a: 'משיח בן דוד', p_b: 'מלך ישראל' },
  }]);
  assert.equal(out.status, 'executed');
  assert.equal(out.findings.length, 1);
  assert.equal(out.findings[0].subject.label, 'משיח בן דוד ↔ מלך ישראל');
  assert.equal(out.findings[0].access.tier, 'personal');
  assert.equal(out.trace.pair_mode, GEMATRIA_RELATION_PAIR_MODE.INTAKE_DIRECT_PAIR);
  assert.equal(out.trace.pair_count, 1);
  assert.deepEqual(out.cost, { certainty: 'not_billable', ai_calls: 0, rpc_calls: 1, retry_count: 0 });
  assert.equal(JSON.stringify(out.trace).includes('משיח'), false);
  assert.equal(JSON.stringify(out.sourceRefs).includes('משיח'), false);
});

test('candidate-shaped payload with no substantive evidence is an explicit bounded negative result', async () => {
  const executor = createGematriaRelationW2Executor({
    supabase: { rpc: async () => ({ data: {
      status: 'candidate',
      relation_kind: 'gematria_convergence',
      engine_signal: 0,
      engine_evidence: [],
      composite_evidence: [],
      independent_evidence: { edges: [], topic_cards: [], research_objects: [] },
      noise_flags: ['no_atomic_evidence'],
      engine_signal_components: { effective_independent_group_count: 0 },
    } }) },
    pairMode: GEMATRIA_RELATION_PAIR_MODE.INTAKE_DIRECT_PAIR,
  });
  const out = await executor({ intake: { representations: [
    { ref: 'left', content: 'משיח', access: { tier: 'personal' } },
    { ref: 'right', content: 'מלך ישראל', access: { tier: 'personal' } },
  ] } });

  assert.equal(out.status, 'negative_result');
  assert.equal(out.findings.length, 0);
  assert.deepEqual(out.negativeScope, {
    operation: 'direct_pair',
    searched_pair_count: 1,
    requested_pair_count: 1,
    pair_budget: 1,
    truncated: false,
  });
  assert.equal(out.trace.pair_statuses[0].reason, 'no_substantive_evidence');
});

test('empty canonical relation result is negative_result and never fabricates a relation Finding', async () => {
  const executor = createGematriaRelationW2Executor({
    supabase: { rpc: async () => ({ data: null }) },
  });
  const out = await executor({ identityResolution: nameResolution('public') });

  assert.equal(out.status, 'negative_result');
  assert.equal(out.findings.length, 0);
  assert.match(out.reason, /no substantive evidence/);
  assert.equal(out.trace.pair_statuses.every(x => x.status === 'executed_empty'), true);
});

test('RPC failure is failed, never negative, and is not retried', async () => {
  let calls = 0;
  const executor = createGematriaRelationW2Executor({
    supabase: { rpc: async () => { calls += 1; return { error: { name: 'RpcError' } }; } },
    pairMode: GEMATRIA_RELATION_PAIR_MODE.INTAKE_DIRECT_PAIR,
  });
  const out = await executor({ intake: { representations: [
    { ref: 'left', content: 'ירושלים', access: { tier: 'personal' } },
    { ref: 'right', content: 'שומרים', access: { tier: 'personal' } },
  ] } });

  assert.equal(calls, 1);
  assert.equal(out.status, 'failed');
  assert.equal(out.negativeScope, null);
  assert.equal(out.findings.length, 0);
  assert.deepEqual(out.cost, { certainty: 'not_billable', ai_calls: 0, rpc_calls: 1, retry_count: 0 });
});

test('positive findings plus a failed bounded pair stay executed with an explicit partial reason', async () => {
  let calls = 0;
  const executor = createGematriaRelationW2Executor({
    supabase: {
      async rpc(name, args) {
        calls += 1;
        if (calls === 2) return { error: { name: 'RpcError' } };
        return fakeSupabase().rpc(name, args);
      },
    },
    maxPairs: 2,
  });
  const out = await executor({ identityResolution: nameResolution('public') });

  assert.equal(calls, 2);
  assert.equal(out.status, 'executed');
  assert.equal(out.findings.length, 1);
  assert.match(out.reason, /1 failed/);
});
