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
  assert.deepEqual(out.cost, { certainty: 'not_billable', ai_calls: 0, rpc_calls: 1, retry_count: 0 });
  assert.equal(out.trace.source_total_known, false);
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
  assert.deepEqual(out.cost, { certainty: 'not_billable', ai_calls: 0, rpc_calls: 1, retry_count: 0 });
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
