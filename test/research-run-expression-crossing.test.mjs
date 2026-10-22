import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { isolatedResearchRun } from './helpers/research-run-handler.mjs';

const CONTRACT = 'public-expression-crossing-run-v1';
const EXPRESSION = 'משיח';

async function invoke(runtime, overrides = {}) {
  const response = await runtime.fetch(`${runtime.origin}/functions/v1/research-run`, {
    method: 'POST',
    headers: { authorization: `Bearer ${runtime.anon}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      contract: CONTRACT,
      expression: EXPRESSION,
      visitor_id: randomUUID(),
      interaction_id: randomUUID(),
      requested_capabilities: ['els', 'graph'],
      admin: true,
      surface: 'raziel',
      ...overrides,
    }),
  });
  const data = await response.json();
  runtime.assertNoUnexpected();
  return { response, data };
}

test('public expression research performs canonical calculation and crossing RPCs in one Result Bundle', async () => {
  const runtime = isolatedResearchRun({ crossingRows: [
    { partner: 'שלום', n_methods: 2, methods_detail: 'אתבש=112 · סידורי=52' },
    { partner: 'שבוים', n_methods: 2, methods_detail: 'סידורי=52 · רגיל=358' },
  ] });
  const out = await invoke(runtime);

  assert.equal(out.response.status, 200);
  assert.equal(out.data.status, 'ok');
  assert.equal(out.data.contract, CONTRACT);
  const calculationCalls = runtime.calls.filter(call => call.name === 'fn_method_profile');
  const crossingCalls = runtime.calls.filter(call => call.name === 'strongest_crossings');
  assert.equal(calculationCalls.length, 1);
  assert.deepEqual(calculationCalls[0].body, { p_phrase: EXPRESSION, p_depth: 'value' });
  assert.equal(calculationCalls[0].authorization, `Bearer ${runtime.anon}`);
  assert.equal(crossingCalls.length, 1);
  assert.deepEqual(crossingCalls[0].body, { p_self: EXPRESSION, p_min: 2, p_limit: 8 });
  assert.equal(crossingCalls[0].authorization, `Bearer ${runtime.anon}`);
  assert.equal(runtime.calls.filter(call => call.name === 'gematria_words').length, 0);
  assert.equal(out.data.bundle.findings.filter(finding => finding.kind === 'gematria-method-value').length, 3);
  assert.equal(out.data.bundle.findings.filter(finding => finding.kind === 'gematria-crossing').length, 2);

  const calculation = out.data.bundle.capability_trace.find(item => item.key === 'gematria');
  const capability = out.data.bundle.capability_trace.find(item => item.key === 'crossings');
  assert.equal(calculation.status, 'executed');
  assert.deepEqual(calculation.cost, { certainty: 'not_billable', ai_calls: 0, rpc_calls: 1, retry_count: 0 });
  assert.equal(capability.status, 'executed');
  assert.deepEqual(capability.cost, { certainty: 'not_billable', ai_calls: 0, rpc_calls: 1, retry_count: 0 });
  const gate = runtime.calls.find(call => call.name === 'fn_capability_execution_gate_v1');
  assert.equal(gate.body.p_capability, 'research-w2:public-expression-crossings');
  assert.equal(gate.body.p_budget_kind, 'none');

  const operationalTrace = JSON.stringify({
    roots: [...runtime.roots.values()],
    spans: [...runtime.spans.values()],
  });
  assert.equal(operationalTrace.includes(EXPRESSION), false, 'raw expression must not enter operational trace');
  assert.ok([...runtime.spans.values()].some(span => span.p_name === 'w2:gematria'));
  assert.ok([...runtime.spans.values()].some(span => span.p_name === 'w2:crossings'));
});

test('empty completed corpus query is an explicit negative result', async () => {
  const runtime = isolatedResearchRun({ crossingRows: [] });
  const out = await invoke(runtime);

  assert.equal(out.data.status, 'ok');
  assert.equal(out.data.bundle.findings.filter(finding => finding.kind === 'gematria-method-value').length, 3);
  assert.equal(out.data.bundle.findings.filter(finding => finding.kind === 'gematria-crossing').length, 0);
  assert.equal(out.data.bundle.coverage.negative_result, 1);
  const capability = out.data.bundle.capability_trace.find(item => item.key === 'crossings');
  assert.equal(capability.status, 'negative_result');
  assert.equal(capability.negative_result.scope.operation, 'strongest_crossings');
  assert.equal(runtime.calls.filter(call => call.name === 'strongest_crossings').length, 1);
  assert.equal(runtime.calls.filter(call => call.name === 'fn_method_profile').length, 1);
});

test('crossing RPC failure is not retried or mislabeled as a negative result', async () => {
  const runtime = isolatedResearchRun({ failure: { name: 'strongest_crossings' } });
  const out = await invoke(runtime);

  assert.equal(out.data.status, 'ok');
  assert.equal(runtime.calls.filter(call => call.name === 'strongest_crossings').length, 1);
  assert.equal(runtime.calls.filter(call => call.name === 'fn_method_profile').length, 1);
  const capability = out.data.bundle.capability_trace.find(item => item.key === 'crossings');
  assert.equal(capability.status, 'failed');
  assert.equal(capability.negative_result, null);
  assert.equal(out.data.bundle.coverage.failed, 1);
});

test('invalid expression is rejected before trace, gate or research RPC', async () => {
  const runtime = isolatedResearchRun();
  const out = await invoke(runtime, { expression: 'english' });

  assert.equal(out.response.status, 400);
  assert.equal(out.data.error, 'invalid_request');
  assert.equal(runtime.calls.some(call => call.name === 'op_trace_begin_v1'), false);
  assert.equal(runtime.calls.some(call => call.name === 'fn_capability_execution_gate_v1'), false);
  assert.equal(runtime.calls.some(call => call.name === 'strongest_crossings'), false);
  assert.equal(runtime.calls.some(call => call.name === 'fn_method_profile'), false);
});
