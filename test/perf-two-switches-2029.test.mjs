import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorldRelationIdentity } from '../src/lib/research/worldRelationIdentity2029.js';
import { createNumberLookupTransport, resetNumberLookupTransportMemory } from '../src/lib/research/numberLookupTransport2029.js';
beforeEach(() => resetNumberLookupTransportMemory());
import { switchesFromFlags, RUNTIME_SWITCHES_2029, setRuntimeSwitch, primeRuntimeSwitches } from '../src/lib/runtimeSwitches2029.js';
import { supabase } from '../src/lib/supabase.js';
import { researchNumber } from '../src/lib/research/numericResearch.js';

test('the two accelerators are independent opt-ins and retain the 13 capability defaults', () => {
  const defaults = switchesFromFlags({});
  assert.equal(RUNTIME_SWITCHES_2029.filter(x => x.mode !== 'optimization').length, 13);
  for (const x of RUNTIME_SWITCHES_2029.filter(x => x.mode !== 'optimization')) assert.equal(defaults[x.key], true);
  for (const [world, lookup] of [[false, false], [true, false], [false, true], [true, true]]) {
    const state = switchesFromFlags({ fx_world_relation_identity: { enabled: world }, fx_number_lookup_page: { enabled: lookup } });
    assert.equal(state.fx_world_relation_identity, world);
    assert.equal(state.fx_number_lookup_page, lookup);
    assert.equal(state.fx_number_dossier, true);
    assert.equal(state.fx_number_journey, true);
  }
  assert.equal(defaults.fx_world_relation_identity, false);
  assert.equal(defaults.fx_number_lookup_page, false);
  assert.equal(switchesFromFlags({fx_number_lookup_page: {enabled: 'true'}}).fx_number_lookup_page, false);
});

for (const type of ['number', 'person', 'topic']) {
  test(`World ${type}: ON resolves one node; OFF uses the original projection; identity is equal`, async () => {
    const node = {id: 'node-1', type, label: type === 'number' ? '1820' : 'יעד'};
    const identity = {nodeId: node.id, type, label: node.label};
    let enabled = false;
    const calls = [];
    const dependencies = {
      is2029: true,
      readSwitches: async () => ({fx_world_relation_identity: enabled}),
      resolveNode: async args => {calls.push(['node', args]); return node;},
      project: async args => {calls.push(['projection', args]); return {identity};},
    };
    assert.deepEqual(await resolveWorldRelationIdentity('node-1', dependencies), identity);
    assert.deepEqual(calls, [['projection', {nodeId:'node-1',relationLimit:1,researchLimit:1,topicLimit:1}]]);
    enabled = true; calls.length = 0;
    assert.deepEqual(await resolveWorldRelationIdentity('node-1', dependencies), identity);
    assert.deepEqual(calls, [['node', {nodeId:'node-1'}]]);
    enabled = false; calls.length = 0;
    await resolveWorldRelationIdentity('node-1', dependencies);
    assert.equal(calls[0][0], 'projection');
  });
}

test('World errors do not broaden the reader; missing flag/read failure retains baseline', async () => {
  let projections = 0;
  const base = {is2029:true, readSwitches: async () => ({}), resolveNode: async () => {throw new Error('42501');}, project: async () => {projections++; return {identity:{nodeId:'1'}};}};
  assert.deepEqual(await resolveWorldRelationIdentity('1', base), {nodeId:'1'});
  await resolveWorldRelationIdentity('1', {...base, readSwitches: async () => {throw new Error('offline');}});
  assert.equal(projections, 2);
  const on = {...base, readSwitches: async () => ({fx_world_relation_identity:true})};
  await assert.rejects(resolveWorldRelationIdentity('1', on), /42501/);
  assert.equal(projections, 2);
  assert.equal(await resolveWorldRelationIdentity('missing', {...on, resolveNode: async () => null}), null);
});

test('Legacy World keeps the existing projection even if the shared flag is ON', async () => {
  let reads = 0;
  const identity = {nodeId:'1',type:'number',label:'1820'};
  const result = await resolveWorldRelationIdentity('1', {
    is2029:false,
    readSwitches:async()=>{reads++;return {fx_world_relation_identity:true};},
    resolveNode:async()=>{throw Error('must not narrow a Legacy read');},
    project:async()=>({identity}),
  });
  assert.deepEqual(result,identity);
  assert.equal(reads,0);
});

test('numericResearch integration routes paged lookups and preserves continuation after toggle OFF', async (t) => {
  const previous = globalThis.__SOD_2029_BUILD__;
  globalThis.__SOD_2029_BUILD__ = true;
  t.after(()=>{if(previous===undefined)delete globalThis.__SOD_2029_BUILD__;else globalThis.__SOD_2029_BUILD__=previous;primeRuntimeSwitches({});});
  const calls=[];
  const rows=[{method:'רגיל',phrase:'א',value:1820,bid_id:'a',total_count:3,method_governed:true},
    {method:'רגיל',phrase:'ב',value:1820,bid_id:'b',total_count:3,method_governed:true}];
  const rpc=async(name,args)=>{calls.push({name,args});return {data:rows,error:null};};
  primeRuntimeSwitches({fx_number_lookup_page:true});
  const on=await researchNumber(1820,{rpc,lenses:['number_lookup'],lookupWindow:{limit:2},provenance:{generatedAt:'fixture'}});
  assert.deepEqual(calls,[{name:'fn_number_lookup_2029_page',args:{p_value:1820,p_limit:2,p_after_bid_id:null}}]);
  assert.equal(on.bounds.number_lookup.total_count,3);
  assert.equal(on.bounds.number_lookup.continuation.after_bid_id,'b');
  primeRuntimeSwitches({fx_number_lookup_page:false}); calls.length=0;
  const off=await researchNumber(1820,{rpc,lenses:['number_lookup'],lookupWindow:{limit:2},provenance:{generatedAt:'fixture'}});
  assert.deepEqual(calls,[{name:'fn_number_lookup',args:{p_value:1820,p_limit:2,p_after_bid_id:null}}]);
  assert.deepEqual(off.per_lens.number_lookup,on.per_lens.number_lookup);
  assert.deepEqual(off.bounds,on.bounds);
});

test('lookup switch preserves exact args/results and OFF immediately selects the original RPC', async () => {
  let enabled = true;
  const calls = [];
  const response = {data:[{bid_id:'x',total_count:32}], error:null};
  const rpc = async (name,args) => {calls.push([name,args]); return response;};
  const routed = createNumberLookupTransport(rpc,{is2029:true,readSwitches:async()=>({fx_number_lookup_page:enabled})});
  const args={p_value:1820,p_limit:2,p_after_bid_id:'a'};
  assert.equal(await routed('fn_number_lookup',args),response);
  assert.deepEqual(calls,[['fn_number_lookup_2029_page',args]]);
  enabled=false; calls.length=0;
  assert.equal(await routed('fn_number_lookup',args),response);
  assert.deepEqual(calls,[['fn_number_lookup',args]]);
  assert.equal(createNumberLookupTransport(routed,{is2029:true}),routed);
});

test('legacy and non-lookup calls make no flag read and use the same RPC', async () => {
  let reads=0; const calls=[];
  const rpc=async(name,args)=>{calls.push(name);return {data:args};};
  const options={is2029:false,readSwitches:async()=>{reads++;return {fx_number_lookup_page:true};}};
  assert.equal(createNumberLookupTransport(rpc,options),rpc);
  await createNumberLookupTransport(rpc,{...options,is2029:true})('fn_number_dossier',{p_value:1});
  assert.deepEqual(calls,['fn_number_dossier']); assert.equal(reads,0);
});

for (const thrown of [false,true]) {
  test(`only missing-function errors fall back once (${thrown ? 'thrown' : 'returned'})`,async()=>{
    const calls=[]; const args={p_value:26,p_limit:1,p_after_bid_id:null};
    const rpc=async(name,a)=>{calls.push([name,a]);if(name.endsWith('_2029_page')){const error={code:'PGRST202'};if(thrown)throw error;return {error};}return {data:[]};};
    const routed=createNumberLookupTransport(rpc,{is2029:true,readSwitches:async()=>({fx_number_lookup_page:true})});
    assert.deepEqual(await routed('fn_number_lookup',args),{data:[]});
    assert.deepEqual(calls,[['fn_number_lookup_2029_page',args],['fn_number_lookup',args]]);
  });
}

for (const code of ['42501','57014','XX000']) {
  test(`lookup ${code} errors propagate without a second query`,async()=>{
    let calls=0; const failure={error:{code,message:'keep original error'}};
    const routed=createNumberLookupTransport(async()=>{calls++;return failure;},{is2029:true,readSwitches:async()=>({fx_number_lookup_page:true})});
    assert.equal(await routed('fn_number_lookup',{p_value:26}),failure); assert.equal(calls,1);
  });
}

test('failed settings read uses baseline and no RPC response cache crosses requests',async()=>{
  const calls=[];
  const rpc=async(name)=>{calls.push(name);return {data:[calls.length]};};
  const routed=createNumberLookupTransport(rpc,{is2029:true,readSwitches:async()=>{throw Error('offline');}});
  assert.deepEqual(await routed('fn_number_lookup',{p_value:1}),{data:[1]});
  assert.deepEqual(await routed('fn_number_lookup',{p_value:1}),{data:[2]});
  assert.deepEqual(calls,['fn_number_lookup','fn_number_lookup']);
});

test('admin cannot enable a missing DB candidate; no flag write, while OFF remains available',async(t)=>{
  const calls=[];
  t.mock.method(supabase,'rpc',async(name,args)=>{calls.push([name,args]);return name==='fn_number_lookup_2029_page'?{error:{code:'PGRST202'}}:{data:null,error:null};});
  t.mock.method(supabase,'from',()=>({select:async()=>({data:[{key:'fx_number_lookup_page',enabled:false}],error:null})}));
  await assert.rejects(setRuntimeSwitch('fx_number_lookup_page',true),/עדיין לא הותקן/);
  assert.equal(calls.length,1);
  const map=await setRuntimeSwitch('fx_number_lookup_page',false);
  assert.equal(map.fx_number_lookup_page,false);
  assert.deepEqual(calls[1],['admin_set_runtime_switch',{p_key:'fx_number_lookup_page',p_on:false}]);
});

test('admin enable probes then saves then reads back; refusal never reports success',async(t)=>{
  const calls=[]; let denied=false;
  t.mock.method(supabase,'rpc',async(name,args)=>{calls.push([name,args]);return name==='admin_set_runtime_switch'&&denied?{error:{code:'42501',message:'admin required'}}:{data:[],error:null};});
  t.mock.method(supabase,'from',()=>({select:async()=>({data:[{key:'fx_number_lookup_page',enabled:true}],error:null})}));
  const map=await setRuntimeSwitch('fx_number_lookup_page',true);
  assert.equal(map.fx_number_lookup_page,true);
  assert.deepEqual(calls.map(x=>x[0]),['fn_number_lookup_2029_page','admin_set_runtime_switch']);
  denied=true;
  await assert.rejects(setRuntimeSwitch('fx_world_relation_identity',true),{code:'42501'});
  await assert.rejects(setRuntimeSwitch('lock_world',true),/unknown runtime switch/);
  primeRuntimeSwitches({});
});

test('successful write with failed or contradictory readback reports an unverified state',async(t)=>{
  let response={data:null,error:{code:'503',message:'read unavailable'}};
  t.mock.method(supabase,'rpc',async()=>({data:null,error:null}));
  t.mock.method(supabase,'from',()=>({select:async()=>response}));
  await assert.rejects(setRuntimeSwitch('fx_world_relation_identity',true),{code:'RUNTIME_SWITCH_STATE_UNVERIFIED'});
  response={data:[{key:'fx_world_relation_identity',enabled:false}],error:null};
  await assert.rejects(setRuntimeSwitch('fx_world_relation_identity',true),{code:'RUNTIME_SWITCH_STATE_UNVERIFIED'});
  response={data:[{key:'fx_world_relation_identity',enabled:true}],error:null};
  assert.equal((await setRuntimeSwitch('fx_world_relation_identity',true)).fx_world_relation_identity,true);
  primeRuntimeSwitches({});
});
