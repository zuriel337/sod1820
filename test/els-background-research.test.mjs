import test from 'node:test';
import {createElsOperationTelemetry} from '../src/lib/research/elsTelemetry2029.js';
import assert from 'node:assert/strict';
import { prepareElsBackgroundResearch, runElsBackgroundResearch, executeElsResearchOperation } from '../src/lib/research/elsBackgroundResearch.js';

const origin = { entityType: 'els', term: 'בדיקה', corpus: 'torah', corpusId: 'fixture', skip: 583, dir: -1, start: 239480 };
const input = { axis: 'אמת', related: 'חסד', scope: 'torah', skipMin: 2, skipMax: 80, pageSize: 20 };
const verify = { data: { result: { contract: 'els_occurrence_replay_v1', verification_state: 'MATCH', status: 'OK', corpus_id: 'fixture' } } };
const empty = term => ({ data: { result: { contract: 'els_search_page_v1', status: 'EXECUTED_EMPTY', corpus_id: 'fixture', input: { normalized: term }, hits: [], completion: { executed: true, returned_hits: 0, has_more: false, truncated: false } } } });

test('bounded plan copies identity and excludes unrelated context; scope cannot drift', () => {
  const plan = prepareElsBackgroundResearch(input, { ...origin, story: 'private', token: 'secret', href: '/private' });
  assert.ok(!plan.error);
  assert.ok(Object.isFrozen(plan.plan));
  assert.ok(Object.isFrozen(plan.plan.terms));
  assert.deepEqual(plan.origin, origin);
  assert.ok(prepareElsBackgroundResearch({ ...input, scope: 'tanakh' }, origin).error);
  assert.ok(prepareElsBackgroundResearch(input, null).error);
  assert.ok(prepareElsBackgroundResearch({ ...input, related: 'א,ב,ג,ד' }, origin).error);
  assert.deepEqual(prepareElsBackgroundResearch({ ...input, spelling: 'reverse_all' }, origin).plan.terms, ['תמא', 'דסח']);
});

test('one canonical replay then bounded page requests; no model, no rescan, honest empty outcome', async () => {
  const calls = [], progress = [], controller = new AbortController();
  const result = await runElsBackgroundResearch({ prepared: prepareElsBackgroundResearch(input, origin), signal: controller.signal,
    invoke: async (request, signal) => { assert.equal(signal, controller.signal); calls.push(request); return request.op === 'verify' ? verify : empty(request.term); },
    onProgress: item => progress.push(item) });
  assert.deepEqual(calls.map(x => x.op), ['verify', 'page', 'page']);
  assert.equal(result.scan.trials, 2);
  assert.equal(result.scan.complete, true);
  assert.ok(result.rows.every(row => row.count === 0 && row.state === 'OK'));
  assert.equal(progress.at(-1).rows.length, 2);
});

test('failed replay prevents search; cancellation rejects late page and sends no next request', async () => {
  const controller = new AbortController(), calls = [];
  await assert.rejects(() => runElsBackgroundResearch({ prepared: prepareElsBackgroundResearch(input, origin), signal: controller.signal,
    invoke: async request => { calls.push(request); return { data: { result: { contract: 'els_occurrence_replay_v1', verification_state: 'MISMATCH' } } }; } }));
  assert.equal(calls.length, 1);
  const pages = [], progress = [];
  await assert.rejects(() => runElsBackgroundResearch({ prepared: prepareElsBackgroundResearch(input, origin), signal: controller.signal,
    invoke: async request => { pages.push(request); if (request.op === 'verify') return verify; controller.abort(); return empty(request.term); },
    onProgress: value => progress.push(value) }));
  assert.deepEqual(pages.map(x => x.op), ['verify', 'page']);
  assert.equal(progress.at(-1).rows.length, 0);
});

test('backend failures remain failures, never empty discoveries', async () => {
  const result = await runElsBackgroundResearch({ prepared: prepareElsBackgroundResearch(input, origin), signal: new AbortController().signal,
    invoke: async request => request.op === 'verify' ? verify : { error: { message: 'offline' } } });
  assert.ok(result.rows.every(row => row.state === 'FAILED'));
  assert.ok(result.scan.outcomes.every(row => row.negative === false));
});

test('a MATCH from a different corpus revision cannot start the research', async () => {
  let calls = 0;
  await assert.rejects(() => runElsBackgroundResearch({ prepared: prepareElsBackgroundResearch(input, origin), signal: new AbortController().signal,
    invoke: async () => { calls++; return { data: { result: { ...verify.data.result, corpus_id: 'different' } } }; } }));
  assert.equal(calls, 1);
});

for (const failed of [false, true]) test(`lazy execution retains ${failed ? 'FAILED' : 'COMPLETE'} outcome and owns the task`, async () => {
  const operation = { controller: new AbortController(), task: null };
  let released = false;
  const result = await executeElsResearchOperation({ input, origin, captured: null, operation,
    owns: () => true, release: () => { released = true; },
    publish: patch => { operation.task = { ...operation.task, ...patch }; },
    invoke: async request => request.op === 'verify' ? verify : failed ? { error: { message: 'offline' } } : empty(request.term) });
  assert.equal(result.ok, true);
  assert.equal(operation.task.status, failed ? 'FAILED' : 'COMPLETE');
  assert.equal(operation.task.rows.length, 2);
  assert.equal(released, false, 'a completed task stays available for returning to its matrix');
});

test('lazy execution after principal ownership is lost does not publish or invoke', async () => {
  const unexpected = () => assert.fail('old principal must not act');
  assert.deepEqual(await executeElsResearchOperation({ owns: () => false, publish: unexpected, invoke: unexpected, release: unexpected }), { ok: false });
});

test('background research records outcome on its original context, and abort never claims provider cancellation', async () => {
 for (const abort of [false,true]) {
  const rows=[], operation={controller:new AbortController(),task:null};
  const account={user:'origin'};
  await executeElsResearchOperation({input,origin,operation,owns:()=>true,release(){},
   createTelemetry:(kind,source)=>createElsOperationTelemetry(kind,source,{capture:()=>account,id:()=> 'terms-1',send:(ctx,event,props)=>rows.push({ctx,event,props})}),
   publish:patch=>{operation.task={...operation.task,...patch}},
   invoke:async request=>{if(request.op==='verify')return verify;if(abort){operation.telemetry.cancel();operation.controller.abort();}return empty(request.term)}
  });
  const end=rows.filter(r=>r.event==='operation_finished');
  assert.equal(end.length,1);assert.equal(end[0].props.outcome,abort?'tracking_stopped':'completed');
  assert.ok(rows.every(r=>r.ctx===account));
  assert.equal(rows.some(r=>r.event==='cancel_requested'),abort);
 }
});
