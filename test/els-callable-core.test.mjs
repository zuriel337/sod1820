import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { elsSearchResultToFindings } from '../src/lib/research/canonicalEls.js';
import { createElsW2Executor } from '../src/lib/research/elsW2Executor.js';
import { createCanonicalW2Executors } from '../src/lib/research/researchW2Executors.js';
import { CAPABILITY_STATUS } from '../src/lib/research/researchResultBundle.js';

const CORPUS = '0b022e8eef6f9c16';

function result({ status = 'OK', hits = [], total = hits.length, truncated = false, scope = 'torah' } = {}) {
  return {
    contract: 'els_search_result_v1',
    status,
    scope,
    corpus_id: scope === 'tanakh' ? '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b' : CORPUS,
    input: { raw: 'משיח', normalized: 'משיח', length: 4, language: 'he', script: 'Hebrew' },
    selection_protocol: 'HYPOTHESIS_DRIVEN_FOLLOWUP',
    engine: { id: 'els-sql-core', version: 1, function: 'els_search_core_v1' },
    coordinate: { position_base: 0 },
    search: { skip_min: 2, skip_max_executed: 40, max_hits: 16 },
    els_count: total,
    hits,
    dependency_group: 'els:test:group',
    completion: {
      executed: status === 'OK' || status === 'EXECUTED_EMPTY',
      state: status,
      coverage: 'bounded_partial',
      negative: status === 'EXECUTED_EMPTY',
      truncated,
      total_hits: total,
      returned_hits: hits.length,
    },
  };
}

const hit = {
  occurrence_id: `els:${CORPUS}:משיח:17:1:100`,
  skip: 17,
  dir: 1,
  direction: 'fwd',
  start: 100,
  end: 151,
  positions: [100, 117, 134, 151],
  coordinate_convention: 'zero_based_character_index',
  dependency_group: 'els:test:group',
};

test('callable ELS occurrence projects to a truth-safe Universal Finding', () => {
  const [finding] = elsSearchResultToFindings(result({ hits: [hit] }), { inputRef: 'repr:phrase:full' });
  assert.ok(finding);
  assert.equal(finding.kind, 'els');
  assert.equal(finding.stage, null);
  assert.equal(finding.status, null);
  assert.equal(finding.verification.verification_state, 'not_tested');
  assert.equal(finding.verification.engine_method_tested, 'els_search_core_v1');
  assert.equal(finding.identity.occurrence.start, 100);
  assert.equal(finding.identity.occurrence.direction, 'fwd');
  assert.deepEqual(finding.projection.anchors.map(x => x.i), hit.positions);
  assert.equal(finding.evidence.facts[0].dependency_group, 'els:test:group');
});

test('ELS executor runs exact primary text representation only and preserves bounded truth', async () => {
  const calls = [];
  const supabase = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      assert.equal(name, 'els_search_v1');
      return { data: result({ hits: [hit], total: 292, truncated: true }) };
    },
  };
  const executor = createElsW2Executor({
    supabase,
    maxSkip: 40,
    maxHits: 16,
    selectionProtocol: 'HYPOTHESIS_DRIVEN_FOLLOWUP',
  });
  const out = await executor({
    identityResolution: {
      text_calculation_allowed: true,
      identities: [{ type: 'phrase', key: 'expr:1', label: 'משיח', access: { tier: 'public' } }],
    },
  });
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.findings.length, 1);
  assert.equal(out.bounded.total_count, 292);
  assert.equal(out.bounded.returned_count, 1);
  assert.equal(out.bounded.truncated, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, {
    p_term: 'משיח', p_scope: 'torah', p_maxskip: 40, p_maxhits: 16,
    p_selection_protocol: 'HYPOTHESIS_DRIVEN_FOLLOWUP',
  });
});

test('bounded empty ELS search is negative only for its explicit searched scope', async () => {
  const supabase = { rpc: async () => ({ data: result({ status: 'EXECUTED_EMPTY', hits: [], total: 0 }) }) };
  const out = await createElsW2Executor({ supabase })({
    identityResolution: { identities: [{ type: 'phrase', key: 'expr:x', label: 'התגלות' }] },
  });
  assert.equal(out.status, CAPABILITY_STATUS.NEGATIVE_RESULT);
  assert.equal(out.findings.length, 0);
  assert.equal(out.negativeScope.kind, 'bounded_els_searches');
  assert.equal(out.negativeScope.searches[0].searched_skip_max, 40);
  assert.equal(out.negativeScope.searches[0].scope, 'torah');
});

test('bare Number does not get fabricated into an ELS term', async () => {
  let called = false;
  const supabase = { rpc: async () => { called = true; throw new Error('must not run'); } };
  const out = await createElsW2Executor({ supabase })({
    identityResolution: { identities: [{ type: 'number', key: 'number:358', label: '358', value: 358 }] },
  });
  assert.equal(out.status, CAPABILITY_STATUS.CONTEXT_REQUIRED);
  assert.equal(called, false);
});

test('Tanakh missing server corpus is MISSING_ADAPTER, never an empty/negative Torah result', async () => {
  const tanakh = result({ status: 'MISSING_ADAPTER', hits: [], total: 0, scope: 'tanakh' });
  const supabase = { rpc: async () => ({ data: tanakh }) };
  const out = await createElsW2Executor({ supabase, scope: 'tanakh' })({
    identityResolution: { identities: [{ type: 'phrase', key: 'expr:1', label: 'משיח' }] },
  });
  assert.equal(out.status, CAPABILITY_STATUS.MISSING_ADAPTER);
  assert.equal(out.findings.length, 0);
  assert.equal(out.negativeScope, null);
});

test('canonical Research OS executor tree mounts callable ELS instead of base numeric missing adapter', async () => {
  const rpcCalls = [];
  const supabase = {
    rpc: async (name, args) => {
      rpcCalls.push(name);
      if (name === 'els_search_v1') return { data: result({ hits: [hit] }) };
      return { data: null };
    },
  };
  const executors = createCanonicalW2Executors({ supabase });
  const out = await executors.els({
    identityResolution: { identities: [{ type: 'phrase', key: 'expr:1', label: 'משיח' }] },
  });
  assert.equal(out.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(out.findings.length, 1);
  assert.ok(rpcCalls.includes('els_search_v1'));
});

test('migration preserves one DB algorithm: legacy fn_els_search is only a core projection and Tanakh fails honest', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20260916150500_g3_els_callable_core_v1.sql', import.meta.url), 'utf8');
  assert.match(sql, /create or replace function public\.els_search_core_v1/i);
  assert.match(sql, /create or replace function public\.els_search_v1/i);
  assert.match(sql, /create or replace function public\.fn_els_search/i);
  assert.match(sql, /select public\.els_search_core_v1\(p_term,'torah',p_maxskip,p_maxhits,null\)/i);
  assert.match(sql, /if v_scope = 'tanakh' then[\s\S]*'status','MISSING_ADAPTER'/i);
  assert.doesNotMatch(sql, /from public\.tanach_verses/i);
});
