import test from 'node:test';
import assert from 'node:assert/strict';
import { createGematriaRelationW2Executor } from './gematriaRelationW2Executor.js';
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
      label: 'גל שגב',
      access: { tier: accessTier },
      metadata: {
        name_parts: [
          { text: 'גל', role: 'given_name' },
          { text: 'שגב', role: 'family_name' },
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
  assert.equal(out.findings.some(x => x.subject.label === 'גל ↔ שגב'), true);
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
  assert.equal(trace.includes('גל'), false);
  assert.equal(trace.includes('שגב'), false);
});

test('Cross adapter is bounded and never expands to an unbounded pair scan', async () => {
  const executor = createGematriaRelationW2Executor({
    supabase: fakeSupabase(),
    maxRepresentations: 8,
    maxPairs: 1,
  });
  const out = await executor({ identityResolution: nameResolution('public') });

  assert.equal(out.trace.pair_count, 1);
  assert.equal(out.bounded.total_count, 1);
  assert.equal(out.bounded.returned_count, 1);
  assert.equal(out.bounded.truncated, true);
});


test('empty canonical relation result stays executed-empty and never fabricates a relation Finding', async () => {
  const executor = createGematriaRelationW2Executor({
    supabase: { rpc: async () => ({ data: null }) },
  });
  const out = await executor({ identityResolution: nameResolution('public') });

  assert.equal(out.status, 'executed');
  assert.equal(out.findings.length, 0);
  assert.match(out.reason, /no candidate/);
  assert.equal(out.trace.pair_statuses.every(x => x.status === 'executed_empty'), true);
});
