import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newInteractionId, safeInteractionId } from '../src/lib/research/interactionCorrelation.js';
import { verifyEls2029Selection } from '../src/lib/research/els2029ReplayClient.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const bridge = read('../supabase/functions/els-search-bridge/index.ts');
const run = read('../supabase/functions/research-run/index.ts');
const heichal = read('../src/pages/Heichal2029Page.jsx');
const tzofen = read('../src/components/TzofenEmbed.jsx');
const helper = read('../src/lib/research/interactionCorrelation.js');

test('helper mints a UUID and rejects non-UUID values; holds no store', () => {
  const id = newInteractionId();
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.equal(safeInteractionId(id), id);
  assert.equal(safeInteractionId('not-a-uuid'), null);
  assert.doesNotMatch(helper.replace(/^\s*\/\/.*$/gm, ''), /op_trace|supabase|localStorage|rpc\(/);
});

test('ELS replay client sends a fresh interaction_id per action and nothing private', async () => {
  const selection = { entityType: 'els', term: 'משיח', corpus: 'torah', skip: 17, dir: 1, start: 100 };
  const seen = [];
  const invoke = async (body) => { seen.push(body); return { data: { trace_id: 't', result: null } }; };
  await verifyEls2029Selection(selection, invoke);
  await verifyEls2029Selection(selection, invoke);
  assert.equal(seen.length, 2);
  assert.ok(safeInteractionId(seen[0].interaction_id));
  assert.notEqual(seen[0].interaction_id, seen[1].interaction_id);
  assert.deepEqual(Object.keys(seen[0]).sort(), ['dir', 'interaction_id', 'op', 'scope', 'skip', 'start', 'term']);
  assert.equal('trace_id' in seen[0] || 'root_span_id' in seen[0], false);
});

test('ELS bridge: server-issued trace root, interaction_id validated and not in inputHash', () => {
  assert.match(bridge, /const traceId = crypto\.randomUUID\(\)/);
  assert.match(bridge, /const rootSpanId = crypto\.randomUUID\(\)/);
  assert.doesNotMatch(bridge, /body\?\.(trace_id|root_span_id)/);
  assert.match(bridge, /interaction_id: interactionId/);
  assert.match(bridge, /safeInteractionId\(body\?\.interaction_id\)/);
  const hash = bridge.slice(bridge.indexOf('const inputHash'), bridge.indexOf('const trace = await'));
  assert.doesNotMatch(hash, /interaction_id/);
  assert.match(bridge, /els_research_layer_law v9/);
  assert.doesNotMatch(bridge, /els_research_layer_law v3/);
});

test('research-run: server-issued root, interaction_id carried, provenance refs current', () => {
  assert.match(run, /const traceId = crypto\.randomUUID\(\)/);
  assert.doesNotMatch(run, /run\.(trace_id|root_span_id)|body\?\.(trace_id|root_span_id)/);
  assert.match(run, /interaction_id: safeUuid\(run\.interaction_id\)/);
  assert.match(run, /research_strategy_layer_law v17 \+ research_workspace_law v5/);
  assert.doesNotMatch(run, /research_strategy_layer_law v15|research_workspace_law v4/);
});

test('Heichal and Tzofen callers use the single helper; no second trace system', () => {
  assert.match(heichal, /interaction_id: newInteractionId\(\)/);
  assert.match(tzofen, /interaction_id: newInteractionId\(\)/);
  assert.doesNotMatch(heichal, /trace_id:|root_span_id:/);
  assert.doesNotMatch(tzofen, /body:\s*\{[^}]*(trace_id|root_span_id)/);
});

console.log('g3 client correlation: PASS');
