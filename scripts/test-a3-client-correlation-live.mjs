// Historical filename retained for callers. This is isolated acceptance only.
// Live service acceptance has NOT been performed by this test.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {newInteractionId,safeInteractionId} from '../src/lib/research/interactionCorrelation.js';
import {isolatedResearchRun,assertSavedWitness} from '../test/helpers/research-run-handler.mjs';
const invoke=async(runtime)=>{
  const client=createClient(runtime.origin,runtime.anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:runtime.fetch}});
  const interactionId=newInteractionId(),visitorId=newInteractionId();
  assert.ok(safeInteractionId(interactionId)&&safeInteractionId(visitorId));
  const result=await client.functions.invoke('research-run',{body:{number:'878',question:'878',interaction_id:interactionId,visitor_id:visitorId,requested_capabilities:['numeric','numeric_operators'],surface:'heichal'}});
  runtime.assertNoUnexpected();return {...result,interactionId};
};
const runtime=isolatedResearchRun(),success=await invoke(runtime);
assert.equal(success.error,null);assert.equal(success.data.status,'ok');
const saved=assertSavedWitness(runtime,success.interactionId,success.data.trace_id);
assert.ok(success.data.bundle.findings.length>0,'actual composer must emit nonempty Findings');
assert.notEqual(success.data.trace_id,success.interactionId,'server owns canonical trace identity');
const failures=[
  {name:'op_trace_begin_v1',error:'trace_unavailable'},
  {name:'op_trace_record_span_v1',span:'fn_capability_execution_gate_v1',error:'trace_incomplete'},
  {name:'op_trace_record_span_v1',span:'composeResearchW2',error:'trace_incomplete'},
  {name:'op_trace_record_span_v1',span:'w2:numeric',error:'trace_incomplete'},
  {name:'op_trace_finish_v1',error:'trace_incomplete'},
];
let persistenceFailureCases=0;
for(const mode of ['http','throw','false'])for(const failure of mode==='false'?failures.filter(f=>f.name==='op_trace_finish_v1'):failures){
  const rt=isolatedResearchRun({failure:{...failure,mode}}),out=await invoke(rt);
  const data=out.data||await out.error.context.json();
  assert.equal(data.status,'error');assert.equal(data.error,failure.error);assert.equal(data.bundle,undefined,'persistence failure suppresses Result');
  if(failure.name==='op_trace_begin_v1')assert.equal(rt.calls.some(c=>c.name==='fn_capability_execution_gate_v1'),false);
  if(failure.name==='op_trace_finish_v1'){
    assert.equal(data.trace_id,rt.calls.find(c=>c.name==='op_trace_begin_v1').body.p_trace_id);
    assert.throws(()=>assertSavedWitness(rt,out.interactionId,data.trace_id),/finalization/);
  }
  persistenceFailureCases++;
}
console.log(JSON.stringify({test:'A3_ISOLATED_CLIENT_CORRELATION',storage:'per-test memory; actual Edge handler/composer/executors',interactionId:success.interactionId,traceId:success.data.trace_id,savedSpans:saved.length,persistenceFailureCases,traceFinishFailureModes:['http','throw','false'],traceFinish:'fail_closed_verified',liveAcceptance:'NOT_RUN'}));
