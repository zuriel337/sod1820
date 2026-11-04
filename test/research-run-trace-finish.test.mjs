// Actual Edge handler and canonical composition; only isolated transport/storage
// and explicit earlier-failure controls come from the existing A3 harness.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {isolatedResearchRun,assertSavedWitness} from './helpers/research-run-handler.mjs';

async function invoke(runtime,{visitorId=randomUUID()}={}){
  const interactionId=randomUUID();
  try{
    const response=await runtime.fetch(`${runtime.origin}/functions/v1/research-run`,{
      method:'POST',headers:{authorization:`Bearer ${runtime.anon}`,'content-type':'application/json'},
      body:JSON.stringify({number:'878',question:'878',visitor_id:visitorId,interaction_id:interactionId,
        requested_capabilities:['numeric','numeric_operators'],surface:'heichal'}),
    });
    return {response,data:await response.json(),interactionId};
  }finally{runtime.assertNoUnexpected();}
}
function assertError(runtime,out,error){
  assert.equal(out.response.status,200,'existing post-begin error HTTP contract');
  assert.equal(out.data.status,'error','failed finalization must not report status: ok');
  assert.deepEqual(Object.keys(out.data).sort(),['error','status','trace_id']);
  assert.equal(out.data.error,error);
  assert.equal(out.data.bundle,undefined,'computed Result must never escape a failed completion');
  const begin=runtime.calls.find(c=>c.name==='op_trace_begin_v1');
  const finishes=runtime.calls.filter(c=>c.name==='op_trace_finish_v1');
  assert.equal(finishes.length,1,'one completion attempt; no retry or replacement trace');
  assert.equal(out.data.trace_id,begin.body.p_trace_id,'retain the original server trace identity');
  assert.equal(finishes[0].body.p_trace_id,out.data.trace_id);
  assert.equal(finishes[0].body.p_root_span_id,begin.body.p_root_span_id);
  assert.equal(runtime.roots.get(out.data.trace_id).p_context.interaction_id,out.interactionId);
  assert.equal(runtime.roots.get(out.data.trace_id).finished,false);
}

for(const mode of ['http','throw','false'])test(`successful computation with ${mode} finish failure returns trace_incomplete without Result`,async()=>{
  const runtime=isolatedResearchRun({failure:{name:'op_trace_finish_v1',mode}});
  const out=await invoke(runtime);
  assertError(runtime,out,'trace_incomplete');
  assert.equal(runtime.calls.at(-1).body.p_outcome,'success','failure injected only after real successful composition');
  const names=[...runtime.spans.values()].map(s=>s.p_name);
  for(const name of ['composeResearchW2','w2:numeric','w2:numeric_operators'])assert.ok(names.includes(name));
  assert.throws(()=>assertSavedWitness(runtime,out.interactionId,out.data.trace_id),/finalization/);
});

test('persisted completion still returns the actual nonempty Result and saved witness',async()=>{
  const runtime=isolatedResearchRun(),out=await invoke(runtime);
  assert.equal(out.response.status,200);assert.equal(out.data.status,'ok');
  assert.equal(out.data.contract,'public-number-research-run-v1');
  assert.ok(out.data.bundle.findings.length>0);
  assert.notEqual(out.data.trace_id,out.interactionId);
  assert.equal(assertSavedWitness(runtime,out.interactionId,out.data.trace_id).length,5);
});

test('existing bounded site visitor identity reaches the same public Result Bundle contract',async()=>{
  const runtime=isolatedResearchRun(),visitorId='vsitevisitor1820';
  const out=await invoke(runtime,{visitorId});
  assert.equal(out.response.status,200);assert.equal(out.data.status,'ok');
  const gate=runtime.calls.find(c=>c.name==='fn_capability_execution_gate_v1');
  assert.equal(gate.body.p_visitor,visitorId);
  assert.equal(gate.body.p_identity,`v:${visitorId}`);
  assert.equal(out.data.contract,'public-number-research-run-v1');
});

test('arbitrary visitor text is rejected before trace, gate or research execution',async()=>{
  const runtime=isolatedResearchRun();
  const out=await invoke(runtime,{visitorId:'visitor@example.com'});
  assert.equal(out.response.status,400);
  assert.deepEqual(out.data,{status:'error',error:'visitor_identity_required'});
  assert.equal(runtime.calls.some(c=>c.name==='op_trace_begin_v1'),false);
  assert.equal(runtime.calls.some(c=>c.name==='fn_capability_execution_gate_v1'),false);
  assert.equal(runtime.calls.some(c=>c.name==='fn_number_lookup'),false);
});

const earlierFailures=[
  {label:'unavailable gate',failures:[{name:'fn_capability_execution_gate_v1'}],error:'gate_unavailable',beforeCompose:true},
  {label:'unrecorded gate',failures:[{name:'op_trace_record_span_v1',span:'fn_capability_execution_gate_v1'}],error:'trace_incomplete',beforeCompose:true},
  {label:'denied gate',gateAllowed:false,error:'access_filtered',beforeCompose:true},
  {label:'gate unavailability before gate-span failure',failures:[{name:'fn_capability_execution_gate_v1'},{name:'op_trace_record_span_v1',span:'fn_capability_execution_gate_v1'}],error:'gate_unavailable',beforeCompose:true},
  {label:'gate-span failure before denied gate',gateAllowed:false,failures:[{name:'op_trace_record_span_v1',span:'fn_capability_execution_gate_v1'}],error:'trace_incomplete',beforeCompose:true},
  {label:'composer exception',composerFailure:true,error:'research_failed'},
  ...['composeResearchW2','w2:numeric','w2:numeric_operators'].map(span=>({label:`unrecorded ${span}`,failures:[{name:'op_trace_record_span_v1',span}],error:'trace_incomplete'})),
];
for(const mode of ['http','throw'])for(const scenario of earlierFailures){
  test(`${scenario.label} keeps its existing error when finish also fails via ${mode}`,async()=>{
    const {failures=[],...options}=scenario;
    const runtime=isolatedResearchRun({...options,failures:[...failures.map(f=>({...f,mode})),{name:'op_trace_finish_v1',mode}]});
    const out=await invoke(runtime);
    assertError(runtime,out,scenario.error);
    if(scenario.beforeCompose)assert.equal(runtime.calls.some(c=>c.name==='fn_number_lookup'),false,'no research beyond an unsuccessful gate');
  });
}
