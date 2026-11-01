import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as tick} from 'node:timers/promises';
import {supabase} from '../src/lib/supabase.js';
import {fetchEntityHubProjection} from '../src/lib/research/entityHubProjection.js';

// Actual projection/composition, SDK transport replaced with a local empty-read
// fixture. No live network, graph creation, engine-result fabrication or writes.
async function fixture(parallel,{failMaterial=false,holdResearch=false}={}){
 const original={from:supabase.from,rpc:supabase.rpc},calls=[];let release;
 const gate=new Promise(resolve=>{release=resolve;});
 const readOps=new Set(['select','eq','neq','is','in','contains','overlaps','or','not','ilike','like','gt','gte','lt','lte','order','limit','range','filter','match']);
 supabase.from=table=>{
  calls.push({table});let query;
  const result=single=>table==='entity_types'?gate.then(()=>({data:{type:'number',label:'fixture',tabs:[]},error:null})):holdResearch&&table==='research_objects'?gate.then(()=>({data:[],error:null})):Promise.resolve({data:single?null:[],count:0,error:null});
  query=new Proxy({}, {get(_target,key){
   if(key==='then')return(resolve,reject)=>result(false).then(resolve,reject);
   if(key==='maybeSingle'||key==='single')return()=>result(true);
   assert.ok(readOps.has(key),'unreviewed query operation '+String(key));return()=>query;
  }});return query;
 };
 supabase.rpc=(name,args)=>{
  calls.push({rpc:name,args});
  return Promise.resolve({data:[],error:failMaterial&&name==='fn_zero_scale'?{message:'synthetic material outage'}:null});
 };
 try{
  let settled=false;const pending=fetchEntityHubProjection({type:'number',key:'1820',allowUnstoredNumber:true,parallelNumberReads:parallel,includeMedia:false});
  const observed=pending.then(value=>{settled=true;return {value};},error=>{settled=true;return {error};});
  await tick();await tick();
  assert.equal(calls.some(call=>call.rpc==='fn_zero_scale'),parallel,'only the explicit Number-page option starts material reads before the type/graph phase');
  if(holdResearch) assert.equal(calls.some(call=>call.rpc==='fn_number_dossier'),parallel,'independent canonical numeric lenses start while research rows are pending');
  assert.equal(settled,false,'a complete projection still waits for its required metadata');
  release();const outcome=await observed;
  if(failMaterial){assert.equal(outcome.error?.message,'synthetic material outage');assert.equal('value' in outcome,false);return;}
  assert.ok(outcome.value);assert.equal(outcome.value.identity.nodeId,null);assert.deepEqual(outcome.value.media.items,[]);
  assert.equal(outcome.value.truthLifecycle.automaticPublication,false);assert.equal(calls.filter(call=>call.rpc==='posts_by_number_strict').length,1);
  return {surface:outcome.value.surface,gematria:outcome.value.gematria,truthLifecycle:outcome.value.truthLifecycle};
 }finally{release();supabase.from=original.from;supabase.rpc=original.rpc;}
}

test('opt-in overlaps the existing reads while preserving complete output and the default scheduling boundary',async()=>{
 const serial=await fixture(false),parallel=await fixture(true);assert.deepEqual(parallel,serial);
});
test('early material failure is observed and propagated, never a successful empty projection',async()=>{
 await fixture(true,{failMaterial:true});
});
test('slow research rows do not serialize the other canonical lenses and complete output stays identical',async()=>{
 const serial=await fixture(false,{holdResearch:true}),parallel=await fixture(true,{holdResearch:true});assert.deepEqual(parallel,serial);
});
