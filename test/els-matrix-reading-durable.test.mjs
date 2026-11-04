import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { AXIS, call, req, world } from './helpers/els-matrix-reading-world.mjs';
import { buildElsMatrixReadingSubmission } from '../src/lib/research/elsMatrixReadingSession.js';
import { runElsMatrixReadingTurn } from '../src/lib/research/elsMatrixReadingTransport.js';
const start = extra => req('start', { ack_upper_bound_usd: 2, ...extra });
const starts = w => w.calls.filter(c => c.url.endsWith('/messages/batches') && c.method === 'POST').length;
const jobStatus = id => req('status', { job_id: id });
const reply = body => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
const fault = (w, intercept) => { const original = w.fetchImpl; w.fetchImpl = (url, init) => intercept(String(url), init, () => original(url, init)); };

test('two tabs / twelve concurrent request IDs for the same occurrence create exactly one provider batch', async () => {
  const w = world();
  const results = await Promise.all(Array.from({length:12}, () => call(w, start({request_id:randomUUID()}))));
  assert.equal(starts(w), 1); assert.equal(w.state.jobs.length, 1);
  assert.equal(new Set(results.map(r=>r.body.job.id)).size, 1);
  assert.equal(results.filter(r=>r.body.reused).length, 11);
  assert.equal((await call(w, start())).body.reused, true); assert.equal(starts(w), 1);
});

test('same idempotency ID cannot silently switch parameters; unavailable storage sends zero provider starts', async () => {
  const w = world(); await call(w, start());
  assert.equal((await call(w, start({story:'a changed story'}))).body.error, 'reading_job_storage_unavailable');
  assert.equal(starts(w), 1);
  const down = world(); fault(down, (u,i,next) => u.includes('reading_job_claim') ? Promise.reject(Error('offline')) : next());
  assert.equal((await call(down,start())).body.error,'reading_job_storage_unavailable'); assert.equal(starts(down),0);
});

for (const scenario of ['accepted-response-lost', 'malformed-receipt', 'claim-response-lost', 'attach-response-lost']) {
  test(`${scenario}: never auto-resubmit and never report zero cost`, async () => {
    const w = world(); let enabled = true;
    fault(w, async (u,i,next) => {
      const response = await next();
      const target = scenario.startsWith('claim') ? u.includes('reading_job_claim') : scenario.startsWith('attach') ? u.includes('reading_job_attach') : u.endsWith('/messages/batches');
      if (target && enabled) {
        enabled=false;
        if(scenario==='malformed-receipt') return reply({});
        throw Error('response lost after acceptance');
      }
      return response;
    });
    const first=await call(w,start());
    assert.notEqual(first.body.spent?.usd,0);
    const again=await call(w,start({request_id:randomUUID()}));
    assert.equal(again.body.restart_blocked,true);
    assert.equal(starts(w),scenario==='claim-response-lost'?0:1);
    const recovered=await call(w,req('recover'));
    assert.ok(recovered.body.job.id);
    if(scenario==='attach-response-lost') assert.equal(recovered.body.state,'RUNNING');
    else {
      const later=await call(w,req('recover'),{now:Date.parse('2027-11-29T10:00:00Z')});
      assert.equal(later.body.error,'reading_start_outcome_unknown');assert.equal(later.body.spent.usd,null);
    }
  });
}

test('reload + key rotation + expired old token lifetime: durable ID recovers same result, then cache works without provider', async () => {
  const w=world(); const initial=await call(w,start()); const id=initial.body.job.id;
  w.state.batchState='ended';
  const recovered=await call(w,req('recover'),{jobSecret:'rotated',now:Date.parse('2026-12-01T10:00:00Z')});
  assert.equal(recovered.body.state,'COMPLETE');assert.equal(recovered.body.job.id,id);assert.equal(recovered.body.recovered,true);
  assert.equal(recovered.body.axis.corpus_id,AXIS.corpusId);assert.equal(recovered.body.job.token,undefined);
  fault(w,(u,i,next)=>u.startsWith('https://api.anthropic.com')?Promise.reject(Error('provider unavailable')):next());
  const cached=await call(w,jobStatus(id)); assert.equal(cached.body.state,'COMPLETE');assert.equal(cached.spans.length,0);
  assert.equal(w.tokenLog.length,1);assert.equal(starts(w),1);
});

test('owner, occurrence and corpus isolation on status, cancel and recovery before ANY provider access', async () => {
  const w=world(); const id=(await call(w,start())).body.job.id;
  const before=w.calls.length;
  for(const action of [jobStatus(id),req('cancel',{job_id:id}),req('recover')]) for(const options of [
    {identity:`u:${randomUUID()}`},{axis:{...AXIS,start:AXIS.start+1}},{axis:{...AXIS,corpusId:'different-corpus'}},
  ]) assert.equal((await call(w,action,options)).body.error,'reading_job_not_found');
  assert.equal(w.calls.slice(before).filter(c=>c.url.startsWith('https://api.anthropic.com')).length,0);
});

test('concurrent collections create one cost receipt and one model-cost trace; finish response loss is recoverable', async () => {
  const w=world({batchState:'ended'}); const id=(await call(w,start())).body.job.id;
  let lose=true; fault(w,async(u,i,next)=>{const r=await next();if(lose&&u.includes('reading_job_finish')){lose=false;throw Error('lost response');}return r;});
  const collected=await Promise.all(Array.from({length:12},()=>call(w,jobStatus(id))));
  assert.equal(w.tokenLog.length,1);
  assert.equal(collected.flatMap(r=>r.spans).filter(s=>s.kind==='model_call').length,1);
  assert.equal((await call(w,req('recover'))).body.state,'COMPLETE');assert.equal(starts(w),1);
});

for(const stage of ['cost','finish']) test(`${stage} unavailable: keep active job and reuse provider output on retry`,async()=>{
  const w=world({batchState:'ended'});const id=(await call(w,start())).body.job.id;
  let down=true;fault(w,(u,i,next)=>down&&u.includes(`reading_job_${stage}`)?Promise.reject(Error('offline')):next());
  const failed=await call(w,jobStatus(id));assert.equal(failed.body.retryable,true);assert.equal(failed.body.restart_blocked,true);
  assert.equal(w.state.jobs[0].result,null);assert.equal((await call(w,start({request_id:randomUUID()}))).body.reused,true);
  down=false;assert.equal((await call(w,req('recover'))).body.state,'COMPLETE');assert.equal(w.tokenLog.length,1);assert.equal(starts(w),1);
});

for(const corrupt of ['batch-id','status','result-type','results-url']) test(`malformed ${corrupt} is not a terminal release or a credential leak`,async()=>{
  const w=world({batchState:'ended'});const id=(await call(w,start())).body.job.id;
  fault(w,async(u,i,next)=>{
    const r=await next();
    if(u.endsWith('/results')&&corrupt==='result-type')return reply({custom_id:w.state.customId,result:{type:'invented'}});
    if(/\/batches\/msgbatch_test01$/.test(u)){
      const b=await r.json(); if(corrupt==='batch-id')b.id='msgbatch_another';if(corrupt==='status')b.processing_status='invented';
      if(corrupt==='results-url')b.results_url='https://attacker.invalid/collect';return reply(b);
    }
    return r;
  });
  const failed=await call(w,jobStatus(id));assert.equal(failed.body.retryable,true);assert.equal(failed.body.restart_blocked,true);
  assert.equal(w.state.jobs[0].result,null);assert.equal(w.calls.some(c=>c.url.includes('attacker.invalid')),false);assert.equal(starts(w),1);
});

test('explicit recovery uses same transport; poll and cancel carry durable ID, never a new start',async()=>{
  const w=world();const id=(await call(w,start())).body.job.id;const ops=[];
  const action=buildElsMatrixReadingSubmission({context:{axis:AXIS},op:'recover'}).submission.elsMatrixReadingAction;
  const result=await runElsMatrixReadingTurn({action,wait:async()=>{w.state.batchState='ended';},invoke:async a=>{
    ops.push(a);const r=await call(w,a);return {data:{els_matrix_reading:r.body}};
  }});
  assert.equal(result.els_matrix_reading.state,'COMPLETE');assert.deepEqual(ops.map(a=>a.op),['recover','status']);
  assert.equal(ops[1].job_id,id);assert.equal(starts(w),1);
  const submitted=buildElsMatrixReadingSubmission({context:{axis:AXIS},jobId:id,op:'cancel'});
  assert.deepEqual(submitted.submission.elsMatrixReadingAction,req('cancel',{job_id:id}));
});
