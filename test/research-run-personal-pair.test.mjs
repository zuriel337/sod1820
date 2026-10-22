import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { isolatedResearchRun } from './helpers/research-run-handler.mjs';

const CONTRACT = 'personal-gematria-pair-run-v1';
const EXPRESSIONS = ['משיח', 'מלך ישראל'];

async function invoke(runtime, overrides = {}) {
  const interactionId = randomUUID();
  const response = await runtime.fetch(`${runtime.origin}/functions/v1/research-run`, {
    method: 'POST',
    headers: { authorization: `Bearer ${runtime.anon}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      contract: CONTRACT,
      expressions: EXPRESSIONS,
      interaction_id: interactionId,
      visitor_id: randomUUID(),
      requested_capabilities: ['els', 'graph'],
      admin: true,
      access_tier: 'public',
      surface: 'raziel',
      ...overrides,
    }),
  });
  const data = await response.json();
  runtime.assertNoUnexpected();
  return { response, data, interactionId };
}

test('personal pair blocks a visitor before trace, gate or relation execution', async () => {
  const runtime = isolatedResearchRun();
  const out = await invoke(runtime);

  assert.equal(out.response.status, 401);
  assert.deepEqual(out.data, { status: 'error', error: 'authenticated_user_required' });
  assert.equal(runtime.calls.some(call => call.name === 'op_trace_begin_v1'), false);
  assert.equal(runtime.calls.some(call => call.name === 'fn_capability_execution_gate_v1'), false);
  assert.equal(runtime.calls.some(call => call.name === 'fn_relation_candidate'), false);
});

test('authenticated personal pair performs one canonical relation RPC and returns the existing Result Bundle', async () => {
  const runtime = isolatedResearchRun({ authenticatedUser: true });
  const out = await invoke(runtime);

  assert.equal(out.response.status, 200);
  assert.equal(out.data.status, 'ok');
  assert.equal(out.data.contract, CONTRACT);
  const relationCalls = runtime.calls.filter(call => call.name === 'fn_relation_candidate');
  assert.equal(relationCalls.length, 1);
  assert.deepEqual(relationCalls[0].body, { p_a: EXPRESSIONS[0], p_b: EXPRESSIONS[1] });
  assert.equal(relationCalls[0].authorization, `Bearer ${runtime.anon}`);
  assert.equal(out.data.bundle.findings.length, 1);
  assert.equal(out.data.bundle.findings[0].access.tier, 'personal');
  assert.equal(out.data.bundle.findings[0].subject.label, `${EXPRESSIONS[0]} ↔ ${EXPRESSIONS[1]}`);

  const capability = out.data.bundle.capability_trace.find(x => x.key === 'gematria_relations');
  assert.equal(capability.status, 'executed');
  assert.deepEqual(capability.cost, { certainty: 'not_billable', ai_calls: 0, rpc_calls: 1, retry_count: 0 });
  assert.equal(capability.trace.pair_count, 1);
  assert.equal(capability.trace.pair_budget, 1);

  const outsidePersonalFinding = JSON.stringify({
    query: out.data.bundle.query,
    plan: out.data.bundle.plan,
    capability_trace: out.data.bundle.capability_trace,
    resolved_run_snapshot: out.data.bundle.resolved_run_snapshot,
    next_actions: out.data.bundle.next_actions,
    operational_roots: [...runtime.roots.values()],
    operational_spans: [...runtime.spans.values()],
  });
  for (const expression of EXPRESSIONS) assert.equal(outsidePersonalFinding.includes(expression), false);

  const gate = runtime.calls.find(call => call.name === 'fn_capability_execution_gate_v1');
  assert.equal(gate.body.p_capability, 'research-w2:gematria-relations');
  assert.equal(gate.body.p_budget_kind, 'none');
  const spanNames = [...runtime.spans.values()].map(span => span.p_name);
  assert.ok(spanNames.includes('w2:gematria_relations'));
});

test('candidate shape without evidence becomes a bounded negative result', async () => {
  const runtime = isolatedResearchRun({
    authenticatedUser: true,
    relationCandidate: {
      status: 'candidate', relation_kind: 'gematria_convergence', engine_signal: 0,
      engine_evidence: [], composite_evidence: [],
      independent_evidence: { edges: [], topic_cards: [], research_objects: [] },
      noise_flags: ['no_atomic_evidence'],
      engine_signal_components: { effective_independent_group_count: 0 },
    },
  });
  const out = await invoke(runtime);

  assert.equal(out.data.status, 'ok');
  assert.equal(out.data.bundle.findings.length, 0);
  assert.equal(out.data.bundle.coverage.negative_result, 1);
  const capability = out.data.bundle.capability_trace.find(x => x.key === 'gematria_relations');
  assert.equal(capability.status, 'negative_result');
  assert.equal(capability.negative_result.scope.operation, 'direct_pair');
  assert.equal([...runtime.roots.values()][0].outcome, 'negative_result');
});

test('relation RPC failure is not retried or mislabeled as negative evidence', async () => {
  const runtime = isolatedResearchRun({
    authenticatedUser: true,
    failure: { name: 'fn_relation_candidate' },
  });
  const out = await invoke(runtime);

  assert.equal(out.data.status, 'ok');
  assert.equal(runtime.calls.filter(call => call.name === 'fn_relation_candidate').length, 1);
  const capability = out.data.bundle.capability_trace.find(x => x.key === 'gematria_relations');
  assert.equal(capability.status, 'failed');
  assert.equal(capability.negative_result, null);
  assert.equal(out.data.bundle.coverage.failed, 1);
  assert.equal(out.data.bundle.coverage.negative_result, 0);
});

test('pair Result is suppressed when its capability trace span cannot be persisted', async () => {
  const runtime = isolatedResearchRun({
    authenticatedUser: true,
    failure: { name: 'op_trace_record_span_v1', span: 'w2:gematria_relations' },
  });
  const out = await invoke(runtime);

  assert.equal(out.data.status, 'error');
  assert.equal(out.data.error, 'trace_incomplete');
  assert.equal(out.data.bundle, undefined);
  assert.equal(runtime.calls.filter(call => call.name === 'fn_relation_candidate').length, 1);
});
