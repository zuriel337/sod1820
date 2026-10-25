import test from 'node:test';
import assert from 'node:assert/strict';

import { EVIDENCE_RELATION } from './researchResultBundle.js';
import { createGematriaCorpusCrossingW2Executor } from './gematriaCorpusCrossingW2Executor.js';

function identityResolution(label = 'משיח', explicit = true) {
  return {
    primary: { type: 'phrase', label },
    explicit_text_computation: explicit,
  };
}

test('corpus crossing adapter performs one bounded canonical RPC and projects convergence findings', async () => {
  const calls = [];
  const executor = createGematriaCorpusCrossingW2Executor({
    supabase: {
      rpc: async (name, args) => {
        calls.push({ name, args });
        return {
          data: [
            { partner: 'שלום', n_methods: 2, methods_detail: 'אתבש=112 · סידורי=52' },
            { partner: 'שבוים', n_methods: 2, methods_detail: 'סידורי=52 · רגיל=358' },
          ],
          error: null,
        };
      },
    },
    limit: 8,
  });

  const out = await executor({ identityResolution: identityResolution() });

  assert.deepEqual(calls, [{
    name: 'strongest_crossings',
    args: { p_self: 'משיח', p_min: 2, p_limit: 8 },
  }]);
  assert.equal(out.status, 'executed');
  assert.equal(out.findings.length, 2);
  assert.ok(out.findings.every(finding => finding.kind === 'gematria-crossing'));
  assert.ok(out.findings.every(finding => finding.access.tier === 'public'));
  assert.ok(out.findingOutcomes.every(outcome => outcome.evidenceRelation === EVIDENCE_RELATION.CONVERGENCE));
  assert.deepEqual(out.findings[0].verification.engine_result.methods, [
    { method: 'אתבש', value: 112 },
    { method: 'סידורי', value: 52 },
  ]);
  assert.deepEqual(out.cost, { certainty: 'not_billable', ai_calls: 0, rpc_calls: 1, rest_calls: 0, retry_count: 0 });
  assert.equal(out.trace.source_total_known, false);
});

test('optional pair normalization enriches every admitted crossing through the canonical relation engine', async () => {
  const calls = [];
  const executor = createGematriaCorpusCrossingW2Executor({
    supabase: {
      rpc: async (name, args) => {
        calls.push({ name, args });
        if (name === 'strongest_crossings') return {
          data: [
            { partner: 'שום', n_methods: 2, methods_detail: 'מסתתר=328 · סידורי=40' },
            { partner: 'עולה ויורד', n_methods: 2, methods_detail: 'רגיל=337 · גדול=337' },
          ],
          error: null,
        };
        return {
          data: {
            relation_kind: 'gematria_convergence',
            engine_signal: args.p_b === 'שום' ? 4.9 : 2,
            confidence: 'candidate',
            research_priority: args.p_b === 'שום' ? 'HIGH_ENGINE_NO_EVIDENCE_YET' : 'EVIDENCE_BACKED',
            noise_flags: [],
            engine_signal_components: {
              raw_independent_group_count: args.p_b === 'שום' ? 2 : 1,
              effective_independent_group_count: args.p_b === 'שום' ? 2 : 1,
              effective_structure_sensitive_group_count: 1,
            },
            expression_dependency: { same_word_multiset: false, same_letter_multiset: false },
            engine_evidence: [{ method: args.p_b === 'שום' ? 'מסתתר' : 'רגיל', value: args.p_b === 'שום' ? 328 : 337 }],
            composite_evidence: [],
            independent_evidence: {
              edges: args.p_b === 'שום' ? [] : [{ private: 'must-not-cross' }],
              topic_cards: [],
              research_objects: [],
            },
          },
          error: null,
        };
      },
    },
    normalizeRelations: true,
  });

  const out = await executor({ identityResolution: identityResolution('שאול') });
  assert.deepEqual(calls.map((call) => call.name), [
    'strongest_crossings',
    'fn_relation_candidate',
    'fn_relation_candidate',
  ]);
  assert.deepEqual(calls.slice(1).map((call) => call.args), [
    { p_a: 'שאול', p_b: 'שום' },
    { p_a: 'שאול', p_b: 'עולה ויורד' },
  ]);
  assert.equal(out.findings[0].verification.engine_result.relation_normalization.effective_independent_group_count, 2);
  assert.equal(out.findings[1].verification.engine_result.relation_normalization.effective_independent_group_count, 1);
  assert.equal(out.findings[1].verification.engine_result.relation_normalization.independent_evidence_counts.edges, 1);
  assert.equal(JSON.stringify(out).includes('must-not-cross'), false);
  assert.deepEqual(out.cost, { certainty: 'not_billable', ai_calls: 0, rpc_calls: 3, rest_calls: 0, retry_count: 0 });
  assert.deepEqual(out.trace.relation_normalization, {
    source: 'rpc:fn_relation_candidate',
    requested: true,
    status: 'available',
    requested_pair_count: 2,
    normalized_pair_count: 2,
    empty_pair_count: 0,
    failed_pair_count: 0,
  });
});

test('normalization failure preserves raw crossings but marks source coverage partial', async () => {
  const executor = createGematriaCorpusCrossingW2Executor({
    supabase: {
      rpc: async (name) => name === 'strongest_crossings'
        ? { data: [{ partner: 'שום', n_methods: 2, methods_detail: 'מסתתר=328 · סידורי=40' }], error: null }
        : { data: null, error: { name: 'RpcError' } },
    },
    normalizeRelations: true,
  });

  const out = await executor({ identityResolution: identityResolution('שאול') });
  assert.equal(out.status, 'executed');
  assert.match(out.reason, /partial canonical crossing-source coverage/);
  assert.equal(out.findings.length, 1);
  assert.equal(out.findings[0].verification.engine_result.relation_normalization, null);
  assert.equal(out.trace.relation_normalization.status, 'partial');
  assert.equal(out.trace.relation_normalization.failed_pair_count, 1);
});

test('corpus crossing adapter excludes self, anagram and malformed rows without inventing evidence', async () => {
  const executor = createGematriaCorpusCrossingW2Executor({
    supabase: { rpc: async () => ({ data: [
      { partner: 'משיח', n_methods: 2, methods_detail: 'רגיל=358 · סידורי=52' },
      { partner: 'חישמ', n_methods: 2, methods_detail: 'רגיל=358 · סידורי=52' },
      { partner: 'שלום', n_methods: 1, methods_detail: 'רגיל=376' },
      { partner: 'מלך', n_methods: 2, methods_detail: 'not-parseable' },
    ], error: null }) },
  });

  const out = await executor({ identityResolution: identityResolution() });
  assert.equal(out.status, 'negative_result');
  assert.equal(out.findings.length, 0);
  assert.equal(out.negativeScope.operation, 'strongest_crossings');
});

test('corpus crossing adapter does not retry failures and does not label them negative', async () => {
  let calls = 0;
  const executor = createGematriaCorpusCrossingW2Executor({
    supabase: { rpc: async () => { calls += 1; return { data: null, error: { message: 'offline' } }; } },
  });

  const out = await executor({ identityResolution: identityResolution() });
  assert.equal(calls, 1);
  assert.equal(out.status, 'failed');
  assert.equal(out.negativeScope, undefined);
  assert.deepEqual(out.cost, { certainty: 'not_billable', ai_calls: 0, rpc_calls: 1, rest_calls: 0, retry_count: 0 });
});

test('confirmed cross-method evidence and approved method meaning remain separate truth layers', async () => {
  const executor = createGematriaCorpusCrossingW2Executor({
    supabase: { rpc: async () => ({ data: [], error: null }) },
    readConfirmedRelations: async ({ expression }) => ({
      status: 'available',
      rest_calls: 4,
      rows: [{
        relation_type: 'hidden',
        method: 'מסתתר',
        a_phrase: expression,
        b_phrase: 'בינה',
        value: 67,
        note: 'הבינה מסתתרת בתוך החכמה.',
        engine_verified: true,
        status: 'confirmed',
        semantic: {
          profile: 'sod1820',
          relation_type: 'hidden',
          label_he: 'נסתר',
          calculation_description: 'הפרשים בין אותיות סמוכות.',
          semantic_description: 'הרובד הנסתר של הביטוי.',
          confidence_source: 'sod1820_model',
          review_version: '2026.07',
        },
      }],
    }),
  });

  const out = await executor({ identityResolution: identityResolution('חכמה') });
  const relation = out.findings.find(finding => finding.kind === 'gematria-confirmed-relation');
  const semantic = out.findings.find(finding => finding.kind === 'gematria-method-semantic');

  assert.equal(out.status, 'executed');
  assert.ok(relation);
  assert.equal(relation.stage, 'evidence');
  assert.equal(relation.verification.verification_state, 'match');
  assert.deepEqual(relation.verification.engine_result, {
    relation_kind: 'confirmed_cross_method_relation',
    relation_type: 'hidden',
    expression: 'חכמה',
    partner: 'בינה',
    value: 67,
    expression_method: 'מסתתר',
    partner_method: 'רגיל',
    engine_verified: true,
    dependency_independence_claimed: false,
  });
  assert.ok(semantic);
  assert.equal(semantic.stage, 'interpretation');
  assert.equal(semantic.verification.engine_result, null);
  assert.equal(semantic.evidence.facts[0].semantic_description, 'הרובד הנסתר של הביטוי.');
  assert.deepEqual(semantic.provenance.parentFindingIds, [relation.id]);
  assert.equal(out.findingOutcomes.find(item => item.findingId === relation.id).evidenceRelation, EVIDENCE_RELATION.CONVERGENCE);
  assert.equal(out.findingOutcomes.find(item => item.findingId === semantic.id).evidenceRelation, EVIDENCE_RELATION.DERIVATION);
  assert.equal(out.cost.rest_calls, 4);
});

test('confirmed relation keeps the stored method on its original endpoint when queried in reverse', async () => {
  const executor = createGematriaCorpusCrossingW2Executor({
    supabase: { rpc: async () => ({ data: [], error: null }) },
    readConfirmedRelations: async () => ({
      status: 'available',
      rest_calls: 3,
      rows: [{
        relation_type: 'hidden', method: 'מסתתר', a_phrase: 'חכמה', b_phrase: 'בינה', value: 67,
        engine_verified: true, status: 'confirmed', semantic: null,
      }],
    }),
  });

  const out = await executor({ identityResolution: identityResolution('בינה') });
  const relation = out.findings.find(finding => finding.kind === 'gematria-confirmed-relation');
  assert.equal(relation.verification.engine_result.expression_method, 'רגיל');
  assert.equal(relation.verification.engine_result.partner_method, 'מסתתר');
  assert.equal(relation.subject.label, 'בינה (רגיל) ↔ חכמה (מסתתר)');
});

test('corpus crossing adapter requires explicit text computation before any RPC', async () => {
  let calls = 0;
  const executor = createGematriaCorpusCrossingW2Executor({
    supabase: { rpc: async () => { calls += 1; return { data: [], error: null }; } },
  });

  const out = await executor({ identityResolution: identityResolution('משיח', false) });
  assert.equal(out.status, 'skipped');
  assert.equal(calls, 0);
  assert.equal(out.cost.ai_calls, 0);
});
