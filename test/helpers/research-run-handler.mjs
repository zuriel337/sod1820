// Same boundary as ai-analyze-handler: execute the complete actual Edge handler
// and canonical imports, replacing only Deno runtime + network/storage.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {randomUUID} from 'node:crypto';
import {composeResearchW2} from '../../src/lib/research/researchComposerW2.js';
import {createCanonicalW2Executors as createPublicNumberW2Executors} from '../../src/lib/research/researchW2ExecutorsBase.js';
import {createGematriaRelationW2Executor,GEMATRIA_RELATION_PAIR_MODE} from '../../src/lib/research/gematriaRelationW2Executor.js';
import {PERSONAL_GEMATRIA_PAIR_CAPABILITY,PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT,normalizeResearchRunRequest} from '../../src/lib/research/researchRunRequest.js';
import {mergeNumberPhrasePresentationOrder,NUMBER_PHRASE_PRESENTATION_AUTHORITY,NUMBER_PHRASE_PRESENTATION_LIMIT} from '../../src/lib/research/numberPhrasePresentationOrder.js';
export function isolatedResearchRun({failure=null,failures=[],gateAllowed=true,composerFailure=false,authenticatedUser=false,relationCandidate=null,leadRows=[],leadReadFailure=false,source=readFileSync(new URL('../../supabase/functions/research-run/index.ts',import.meta.url),'utf8')}={}) {
  const roots=new Map(),spans=new Map(),calls=[],unexpected=[];
  const faults=[failure,...failures].filter(Boolean);
  const origin='http://127.0.0.1:1',anon='test-anon-key',service='test-service-key';
  const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
  const transport=async(input,init={})=>{
    const req=input instanceof Request?input:new Request(input,init),u=new URL(req.url);
    const body=req.method==='POST'?await req.json():null,name=u.pathname.split('/').at(-1);
    calls.push({name,method:req.method,body,authorization:req.headers.get('authorization')});
    if(u.origin!==origin){unexpected.push(req.url);throw new Error('Unexpected destination');}
    if(u.pathname==='/auth/v1/user')return authenticatedUser
      ? response({id:'22222222-2222-4222-8222-222222222222'})
      : response({message:'synthetic guest'},401);
    if(u.pathname==='/rest/v1/gematria_words'){
      assert.equal(req.method,'GET');
      assert.equal(req.headers.get('authorization'),`Bearer ${anon}`,'lead order must retain caller credential');
      assert.equal(u.searchParams.get('ragil'),'eq.878');
      assert.equal(u.searchParams.get('is_verified'),'eq.true');
      assert.equal(u.searchParams.get('is_published'),'eq.true');
      assert.equal(u.searchParams.get('or'),'(is_encrypted.eq.false,is_encrypted.is.null)');
      assert.equal(u.searchParams.get('lead_rank'),'not.is.null');
      assert.equal(u.searchParams.get('limit'),String(NUMBER_PHRASE_PRESENTATION_LIMIT));
      return leadReadFailure ? response({message:'synthetic presentation outage'},503) : response(leadRows);
    }
    if(req.method!=='POST'||!u.pathname.startsWith('/rest/v1/rpc/')){unexpected.push(req.url);throw new Error('Unexpected request');}
    const fault=faults.find(f=>f.name===name && (!f.span || body.p_name===f.span));
    if(fault){
      if(fault.mode==='throw')throw new Error('Isolated persistence outage');
      if(fault.mode==='false')return response(false);
      return response({message:'Isolated persistence outage'},503);
    }
    if(name.startsWith('op_trace_')||name==='fn_capability_execution_gate_v1')assert.equal(req.headers.get('authorization'),`Bearer ${service}`);
    else assert.equal(req.headers.get('authorization'),`Bearer ${anon}`,'canonical executors must retain caller credential');
    if(name==='op_trace_begin_v1'){
      assert.ok(!roots.has(body.p_trace_id));
      roots.set(body.p_trace_id,{...body,finished:false});
      spans.set(body.p_root_span_id,{p_span_id:body.p_root_span_id,p_trace_id:body.p_trace_id,p_parent_span_id:null,p_name:'research-run',p_kind:'root_interaction'});
      return response({trace_id:body.p_trace_id,root_span_id:body.p_root_span_id});
    }
    if(name==='op_trace_record_span_v1'){
      assert.ok(roots.has(body.p_trace_id));assert.equal(spans.get(body.p_parent_span_id)?.p_trace_id,body.p_trace_id,'parent and trace integrity');
      assert.ok(!spans.has(body.p_span_id));spans.set(body.p_span_id,body);return response({ok:true});
    }
    if(name==='op_trace_finish_v1'){
      // Canonical migration returns boolean true only after finalization writes.
      assert.ok(roots.has(body.p_trace_id));Object.assign(roots.get(body.p_trace_id),{finished:true,outcome:body.p_outcome,stopReason:body.p_stop_reason});return response(true);
    }
    if(name==='fn_capability_execution_gate_v1')return response({allowed:gateAllowed,entitlement:{entitlement:'public',is_admin:false}});
    // Representative numeric source: exact literal, source identity and governed
    // truth axes. The canonical composer/executors, not this fixture, emit Findings.
    if(name==='fn_number_lookup')return response([{bid_id:'11111111-1111-4111-8111-111111111111',phrase:'בדיקת מספר 878',value:878,method_key:'regular',method:'רגיל',source_ref:'test:isolated:878',truth_status:'source_supported',total_count:1}]);
    if(name==='fn_number_dossier')return response({value:878,related:[{value:1202,label:'fixture context'}]});
    if(name==='fn_number_journey')return response({value:878,seeds:[{value:1202,status:'ready'}]});
    if(name==='fn_zero_scale')return response({applicable:true,method_id:'zero_scale',version:1,core_root:878,scale_chain:[878]});
    if(name==='number_neighbors')return response([{value:877,weight:1},{value:879,weight:1}]);
    if(name==='fn_relation_candidate')return response(relationCandidate ?? {
      status:'candidate',relation_kind:'gematria_convergence',engine_signal:2,
      engine_evidence:[{method:'רגיל',value:358,group_repr:'regular'}],composite_evidence:[],
      independent_evidence:{edges:[],topic_cards:[],research_objects:[]},noise_flags:[],
      engine_signal_components:{effective_independent_group_count:1},
    });
    unexpected.push(req.url);throw new Error(`Unknown RPC ${name}`);
  };
  const imports=[...source.matchAll(/^import .*;$/gm)].map(([s])=>s);
  assert.deepEqual(imports,[
    'import { composeResearchW2 } from "../../../src/lib/research/researchComposerW2.js";',
    'import { createCanonicalW2Executors as createPublicNumberW2Executors } from "../../../src/lib/research/researchW2ExecutorsBase.js";',
    'import { createGematriaRelationW2Executor, GEMATRIA_RELATION_PAIR_MODE } from "../../../src/lib/research/gematriaRelationW2Executor.js";',
    'import { PERSONAL_GEMATRIA_PAIR_CAPABILITY, PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT, normalizeResearchRunRequest } from "../../../src/lib/research/researchRunRequest.js";',
    'import { mergeNumberPhrasePresentationOrder, NUMBER_PHRASE_PRESENTATION_AUTHORITY, NUMBER_PHRASE_PRESENTATION_LIMIT } from "../../../src/lib/research/numberPhrasePresentationOrder.js";',
  ],'Review new Edge imports before executing them');
  let handler;
  const env={SUPABASE_URL:origin,SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:service};
  runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\n/gm,'')),{
    Deno:{env:{get:k=>env[k]},serve:fn=>{handler=fn;}},fetch:transport,
    composeResearchW2:composerFailure?()=>{throw new Error('Isolated composer failure');}:composeResearchW2,
    createPublicNumberW2Executors,createGematriaRelationW2Executor,GEMATRIA_RELATION_PAIR_MODE,
    PERSONAL_GEMATRIA_PAIR_CAPABILITY,PERSONAL_GEMATRIA_PAIR_RESEARCH_RUN_CONTRACT,normalizeResearchRunRequest,
    mergeNumberPhrasePresentationOrder,NUMBER_PHRASE_PRESENTATION_AUTHORITY,NUMBER_PHRASE_PRESENTATION_LIMIT,
    Request,Response,Headers,URL,crypto:{randomUUID},
  },{filename:'research-run/index.ts',timeout:5000});
  const fetch=async(input,init)=>{
    const req=input instanceof Request?input:new Request(input,init);
    if(req.url!==`${origin}/functions/v1/research-run`){unexpected.push(req.url);throw new Error('Only the isolated research-run entrypoint is permitted');}
    return handler(req);
  };
  const assertNoUnexpected=()=>assert.deepEqual(unexpected,[],'Unmapped I/O must fail even if swallowed');
  return {origin,anon,fetch,roots,spans,calls,assertNoUnexpected};
}
export function assertSavedWitness(runtime,interactionId,traceId){
  runtime.assertNoUnexpected();
  const root=runtime.roots.get(traceId);
  assert.ok(root,'response trace must exist in isolated storage');
  assert.equal(root.p_context.interaction_id,interactionId);
  assert.equal(root.finished,true,'trace finalization must have persisted');
  assert.equal(root.outcome,'success');
  const children=[...runtime.spans.values()].filter(s=>s.p_trace_id===traceId);
  for(const name of ['research-run','fn_capability_execution_gate_v1','composeResearchW2','w2:numeric','w2:numeric_operators'])assert.ok(children.some(s=>s.p_name===name),`missing saved ${name}`);
  return children;
}
