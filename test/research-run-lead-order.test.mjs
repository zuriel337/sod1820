import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

import {buildRazielResultBundleConsumer} from '../src/lib/research/razielResultBundleConsumer.js';
import {isolatedResearchRun} from './helpers/research-run-handler.mjs';

function leadRow(id, phrase, rank, overrides={}){
  return {
    id,phrase,ragil:878,lead_rank:rank,is_verified:true,is_published:true,is_encrypted:false,
    node_id:null,created_at:'2026-10-22T00:00:00.000Z',...overrides,
  };
}

async function invoke(runtime){
  const response=await runtime.fetch(`${runtime.origin}/functions/v1/research-run`,{
    method:'POST',
    headers:{authorization:`Bearer ${runtime.anon}`,'content-type':'application/json'},
    body:JSON.stringify({number:'878',question:'מה זה 878?',visitor_id:'vleadorder878',interaction_id:randomUUID(),
      requested_capabilities:['numeric','numeric_operators'],surface:'heichal'}),
  });
  const data=await response.json();
  runtime.assertNoUnexpected();
  return {response,data};
}

test('one caller-scoped lead-order read promotes Human-Gate phrases before the consumer bound',async()=>{
  const runtime=isolatedResearchRun({leadRows:[
    leadRow('11111111-1111-4111-8111-111111111118','שני',2),
    leadRow('11111111-1111-4111-8111-111111111117','ראשון',1),
  ]});
  const out=await invoke(runtime);

  assert.equal(out.response.status,200);
  assert.equal(out.data.status,'ok');
  assert.equal(runtime.calls.filter(call=>call.name==='gematria_words').length,1,'one deterministic presentation read');
  assert.equal(runtime.calls.filter(call=>call.name==='gematria_words')[0].authorization,`Bearer ${runtime.anon}`);
  assert.deepEqual(out.data.bundle.ranking.map(entry=>entry.rank),[1,2]);
  const consumer=buildRazielResultBundleConsumer(out.data.bundle);
  assert.deepEqual(consumer.model_input.findings.slice(0,2).map(finding=>finding.subject.label),['ראשון','שני']);
  assert.equal(consumer.model_input.findings[0].ranking.axes.authority,'public.gematria_words.lead_rank');
  assert.equal(consumer.guards.no_model_call,true);
});

test('presentation-read failure returns the canonical research evidence with no retry or false rank',async()=>{
  const runtime=isolatedResearchRun({leadReadFailure:true});
  const out=await invoke(runtime);

  assert.equal(out.data.status,'ok');
  assert.ok(out.data.bundle.findings.length>0);
  assert.deepEqual(out.data.bundle.ranking,[]);
  assert.equal(runtime.calls.filter(call=>call.name==='gematria_words').length,1);
  const numeric=out.data.bundle.capability_trace.find(capability=>capability.key==='numeric');
  assert.equal(numeric.trace.presentation_order.status,'unavailable');
  assert.equal(numeric.trace.presentation_order.retry_count,0);
  assert.equal(numeric.trace.presentation_order.ai_calls,0);
});

test('guest and authenticated public runs receive the same lead-order evidence quality',async()=>{
  const leadRows=[leadRow('11111111-1111-4111-8111-111111111117','ראשון',1)];
  const guest=isolatedResearchRun({leadRows});
  const authenticated=isolatedResearchRun({leadRows,authenticatedUser:true});
  const [guestOut,authenticatedOut]=await Promise.all([invoke(guest),invoke(authenticated)]);
  const guestView=buildRazielResultBundleConsumer(guestOut.data.bundle);
  const authenticatedView=buildRazielResultBundleConsumer(authenticatedOut.data.bundle);
  const stableFindings=(findings)=>findings.map((finding)=>({
    ...finding,
    provenance:{...finding.provenance,created_at:null},
  }));

  assert.deepEqual(stableFindings(authenticatedView.model_input.findings),stableFindings(guestView.model_input.findings));
  assert.deepEqual(authenticatedOut.data.bundle.ranking,guestOut.data.bundle.ranking);
  assert.equal(guest.calls.find(call=>call.name==='fn_capability_execution_gate_v1').body.p_identity,'v:vleadorder878');
  assert.equal(authenticated.calls.find(call=>call.name==='fn_capability_execution_gate_v1').body.p_identity,'u:22222222-2222-4222-8222-222222222222');
});
