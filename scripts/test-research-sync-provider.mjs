// Real React mounting of the actual provider+runtime. Only external auth/network/router are mocked.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { rm } from 'node:fs/promises';
import { emptyResearchState, applyResearchOps } from '../src/lib/research/researchSyncState.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const outfile=resolve(`.test-research-sync-provider-${process.pid}.mjs`);
const stub={
  'react-router-dom':`export const useLocation=()=>globalThis.__researchFixture.location;`,
  'AuthContext.jsx':`export const useAuth=()=>globalThis.__researchFixture.auth;`,
  'auth.js':`export const getCloudResearch=(...a)=>globalThis.__researchFixture.read(...a);export const applyCloudResearchOps=(...a)=>globalThis.__researchFixture.write(...a);`,
  'tracking.js':`export const trackResearch=()=>{};`,
  'supabase.js':`export const signalAiBehavior=()=>{};export const supabase={rpc:(...args)=>globalThis.__researchFixture.pathRpc(...args)};`,
  'events.js':`export const emit=(...args)=>globalThis.__researchFixture.journeyEvents.push(args);`,
  'eventBus.js':`export const EVENTS=new Proxy({}, {get:(_,k)=>k});export const emit=(...args)=>globalThis.__researchFixture.events.push(args);`,
};
await build({entryPoints:['src/lib/research/ResearchProvider.jsx'],bundle:true,platform:'node',format:'esm',outfile,
  external:['react','react/jsx-runtime'],plugins:[{name:'external-boundary-fixtures',setup(b){
    b.onResolve({filter:/(react-router-dom|AuthContext\.jsx|\/auth\.js|tracking\.js|\/supabase\.js|eventBus\.js|\/events\.js)$/},args=>{
      const key=args.path==='react-router-dom'?args.path:args.path.split('/').at(-1);
      return stub[key]?{path:key,namespace:'fixture'}:null;
    });
    b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:stub[args.path],loader:'js'}));
  }}]});
const {default:Provider,useResearch}=await import(pathToFileURL(outfile));
after(async()=>{await rm(outfile,{force:true});delete globalThis.__researchFixture;});
class Storage {data=new Map();getItem(k){return this.data.get(k)??null;}setItem(k,v){this.data.set(k,String(v));}removeItem(k){this.data.delete(k);}}
function fixture(){
  globalThis.localStorage=new Storage();globalThis.sessionStorage=new Storage();
  globalThis.window={addEventListener(){},removeEventListener(){},location:{origin:'https://fixture.invalid'}};
  globalThis.document={querySelectorAll:()=>[]};
  const server=new Map(),events=[],renders=[];
  const state=uid=>{if(!server.has(uid))server.set(uid,{...emptyResearchState(),revision:0});return server.get(uid);};
  const f={auth:{user:{id:'A'},loading:false},location:{pathname:'/world',search:''},events,renders,latest:null,journeyEvents:[],
    pathRpc:async()=>({data:{ok:false,error:'not_found'},error:null}),
    read:async uid=>structuredClone(state(uid)),
    write:async(uid,ops,{batchId,expectedRevision})=>{
      assert.equal(uid,f.auth.user.id,'transport principal');
      if(state(uid).revision!==expectedRevision)throw new Error('RESEARCH_SYNC_CONFLICT');
      const next={...applyResearchOps(state(uid),ops),revision:expectedRevision+1};server.set(uid,next);
      return {ok:true,batch_id:batchId,applied_revision:next.revision,snapshot:structuredClone(next)};
    }};
  globalThis.__researchFixture=f;return f;
}
function Probe(){const s=useResearch();const f=globalThis.__researchFixture;f.latest=s;f.renders.push({uid:f.auth.user?.id??null,ids:s.saved.map(x=>x.id),context:s.context});return React.createElement('span',null,s.saved.length);}
const tree=()=>React.createElement(React.StrictMode,null,React.createElement(Provider,null,React.createElement(Probe)));
const item=id=>({id,ref:id,type:'number',title:id});

test('mounted provider never renders A data under B; stale callback is inert',async()=>{
  const f=fixture();let root;await act(async()=>{root=Renderer.create(tree());});
  await act(async()=>{f.latest.saveItem(item('A-private'));});const oldSave=f.latest.saveItem;
  await act(async()=>{f.auth={user:{id:'B'},loading:false};root.update(tree());});
  assert.equal(f.latest.saved.length,0);assert.ok(!f.renders.some(r=>r.uid==='B'&&r.ids.includes('A-private')));
  await act(async()=>{assert.equal(oldSave(item('late-A')),false);});assert.equal(f.latest.saved.length,0);
  await act(async()=>root.unmount());
});
test('mounted context survives navigation and hydration cannot undo explicit clear',async()=>{
  const f=fixture();let resolveRead;f.read=()=>new Promise(r=>{resolveRead=r;});let root;
  await act(async()=>{root=Renderer.create(tree());});
  const context={subject:{id:'878',type:'number'},returnTo:{href:'/books?locator=exact'}};
  await act(async()=>{f.latest.setResearchContext(context);});
  await act(async()=>{f.location={pathname:'/books',search:'?locator=exact'};root.update(tree());});
  assert.equal(f.latest.context.returnTo.href,context.returnTo.href);
  await act(async()=>{f.latest.clearResearchContext();resolveRead({...emptyResearchState(),revision:0,context:{old:'cloud'}});});
  assert.equal(f.latest.context,null);await act(async()=>root.unmount());
});
test('mounted actions read current state for immediate save/remove, not a stale render closure',async()=>{
  const f=fixture();let root;await act(async()=>{root=Renderer.create(tree());});
  await act(async()=>{const api=f.latest;api.saveItem(item('x'));api.removeSaved('x');});
  assert.equal(f.latest.saved.length,0);assert.equal(f.latest.exportPendingResearch().queue.length,2);
  await act(async()=>root.unmount());
});
test('auth pending frame exposes no persisted guest state',async()=>{
  const f=fixture();f.auth={user:null,loading:true};localStorage.setItem('sod_research_v2:guest',JSON.stringify({saved:[item('guest')]}));
  let root;await act(async()=>{root=Renderer.create(tree());});assert.equal(f.latest.saved.length,0);assert.equal(f.latest.syncStatus,'auth_loading');
  await act(async()=>root.unmount());
});

const numberContext=(method='רגיל')=>({subject:{id:'1237',type:'number',label:'1237',href:`/2029/number/1237?method=${encodeURIComponent(method)}`},
  selection:{entityId:'1237',entityType:'number',expression:'ביטוי נבחר',method,resultValue:1237},lens:'number',
  returnTo:{href:'/post/source#paragraph-7',subject:{id:'source',type:'post',label:'מקור'},selection:{sourceRef:'post:source',locator:'paragraph-7',versionRef:'v2'},lens:'source'}});
const pathId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const revisionId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function pathServer(f){
  const calls=[];let saved=null;
  f.pathRpc=async(name,args)=>{
    calls.push({name,args,uid:f.auth.user?.id});
    if(name==='fn_research_path_resume_v1')return {data:saved&&(!args.p_path_id||args.p_path_id===pathId)?structuredClone(saved):{ok:false,error:'not_found'}};
    assert.equal(name,'fn_research_path_append_v1');
    assert.equal(f.auth.user.id,'A');
    assert.equal(args.p_identity_metadata.root_ref,'source');
    assert.equal(args.p_representation.context.access,undefined);
    const steps=[...(saved?.steps||[]),...args.p_steps].map((s,i)=>({...s,step_index:i}));
    saved={ok:true,path_id:pathId,revision_id:revisionId,revision_no:(saved?.revision_no||0)+1,steps,representation:args.p_representation};
    return {data:structuredClone(saved)};
  };
  return {calls,get saved(){return saved;}};
}

test('guest explicit Number journey survives reload; AI unavailable does not block continuation or exact source return',async()=>{
  const f=fixture();f.auth={user:null,loading:false};let root;await act(async()=>{root=Renderer.create(tree());});
  await act(async()=>{f.latest.setResearchContext(numberContext());f.latest.continueResearchPath({kind:'number_expression',surface:'number'});});
  assert.equal(f.latest.researchPathSteps.length,2);
  assert.equal(f.journeyEvents.filter(e=>e[1]==='start').length,1);
  await act(async()=>{f.latest.continueResearchPath({kind:'number_expression'});});
  assert.equal(f.journeyEvents.filter(e=>e[1]==='start').length,1);
  const sessions=new Map(sessionStorage.data);
  await act(async()=>root.unmount());sessionStorage.data=sessions;
  await act(async()=>{root=Renderer.create(tree());});
  assert.equal(f.latest.context.selection.method,'רגיל');
  assert.equal(f.latest.researchPathSteps.length,2);
  let result;await act(async()=>{result=await f.latest.saveCurrentResearchPath();});
  assert.equal(result.error,'authentication_required');
  await act(async()=>{result=f.latest.openResearchPathStep(0);});
  assert.equal(result.href,'/post/source#paragraph-7');
  assert.equal(f.latest.context.selection.versionRef,'v2');
  assert.equal(f.latest.context.access,null);
  await act(async()=>root.unmount());
});

test('same Path saves multiple methods once, resumes after reload, and remains private on denied/missing reads',async()=>{
  const f=fixture();const server=pathServer(f);let root;await act(async()=>{root=Renderer.create(tree());});
  await act(async()=>{f.latest.setResearchContext(numberContext());f.latest.continueResearchPath({kind:'number_expression',surface:'number'});});
  await act(async()=>{await f.latest.saveCurrentResearchPath({surface:'number'});});
  assert.equal(server.saved.steps.length,2);
  assert.equal(f.latest.context.journey.pendingSteps.length,0);
  await act(async()=>{f.latest.updateResearchContext({subject:numberContext('מילוי').subject,selection:numberContext('מילוי').selection});f.latest.continueResearchPath({kind:'number_expression'});});
  await act(async()=>{await f.latest.saveCurrentResearchPath({surface:'number'});await f.latest.saveCurrentResearchPath({surface:'number'});});
  assert.equal(server.saved.steps.length,3,'repeated save must not append the same selection');
  assert.equal(server.saved.steps.at(-1).selection.method,'מילוי');
  assert.equal(server.calls.filter(c=>c.name==='fn_research_path_append_v1').length,2);
  await act(async()=>root.unmount());
  await act(async()=>{root=Renderer.create(tree());});
  assert.equal(f.latest.context,null,'loading latest does not activate it');
  await act(async()=>{await f.latest.resumeResearchPath(pathId);});
  assert.equal(f.latest.context.selection.method,'מילוי');
  assert.equal(f.latest.context.returnTo.href,'/post/source#paragraph-7');
  assert.equal(f.latest.context.journey.id,pathId);
  const before=f.latest.context;
  f.pathRpc=async()=>({error:{code:'42501',message:'permission denied'}});
  await act(async()=>{const result=await f.latest.resumeResearchPath(pathId);assert.equal(result.ok,false);});
  assert.deepEqual(f.latest.context,before,'denied read preserves current context');
  f.pathRpc=async()=>({data:{...server.saved,representation:{context:{subject:{id:'missing',type:'source'}}}}});
  await act(async()=>{const result=await f.latest.resumeResearchPath(pathId);assert.equal(result.error,'resume_context_unavailable');});
  assert.deepEqual(f.latest.context,before,'missing href never replaces a useful current context');
  await act(async()=>root.unmount());
});

test('pending Path response and stale callback cannot cross an account switch',async()=>{
  const f=fixture();let resolveSave;let writes=0;
  f.pathRpc=async(name)=>name==='fn_research_path_append_v1'?(writes++,await new Promise(r=>{resolveSave=r;})):{data:{ok:false,error:'not_found'}};
  let root;await act(async()=>{root=Renderer.create(tree());});
  await act(async()=>{f.latest.setResearchContext(numberContext());f.latest.continueResearchPath({kind:'number_expression'});});
  const oldSave=f.latest.saveCurrentResearchPath;let pending;
  await act(async()=>{pending=oldSave();});
  await act(async()=>{f.auth={user:{id:'B'},loading:false};root.update(tree());});
  await act(async()=>{resolveSave({data:{ok:true,path_id:pathId,revision_id:revisionId,revision_no:1,steps:[],representation:{context:numberContext()}}});await pending;});
  assert.equal(f.latest.context,null);assert.equal(f.latest.pathResume.latest,null);
  assert.equal((await oldSave()).error,'session_unavailable');assert.equal(writes,1);
  await act(async()=>root.unmount());
});

test('878 legacy projection cannot replace the active durable Path identity',async()=>{
  const f=fixture();let root;await act(async()=>{root=Renderer.create(tree());});
  await act(async()=>{f.latest.setResearchContext({...numberContext(),dimensions:{journey2029Active:true,journeySemanticId:'golden:878:v1'},journey:{id:pathId,kind:'research_path',revisionId,revisionNo:2}});});
  await act(async()=>{f.latest.setResearchContext({subject:{id:'1202',type:'number',href:'/world'},journey:{id:'golden:878:v1',kind:'golden',position:1},dimensions:{journeySemanticId:'golden:878:v1'}});});
  assert.equal(f.latest.context.journey.id,pathId);assert.equal(f.latest.context.journey.revisionNo,2);
  assert.equal(f.latest.context.dimensions.journey2029Active,true);
  await act(async()=>root.unmount());
});

test('saving a captured prefix keeps later choices and prevents concurrent duplicate appends',async()=>{
  const f=fixture();const server=pathServer(f);const rpc=f.pathRpc;let finish;
  f.pathRpc=async(name,args)=>name==='fn_research_path_append_v1'?await new Promise(resolve=>{finish=async()=>resolve(await rpc(name,args));}):rpc(name,args);
  let root;await act(async()=>{root=Renderer.create(tree());});
  await act(async()=>{f.latest.setResearchContext(numberContext());f.latest.continueResearchPath({kind:'number_expression'});});
  let saving;await act(async()=>{saving=f.latest.saveCurrentResearchPath();});
  await act(async()=>{assert.equal((await f.latest.saveCurrentResearchPath()).error,'path_operation_pending');
    f.latest.updateResearchContext({subject:numberContext('מילוי').subject,selection:numberContext('מילוי').selection});f.latest.continueResearchPath({kind:'number_expression'});});
  await act(async()=>{await finish();await saving;});
  assert.equal(server.saved.steps.length,2);
  assert.equal(f.latest.context.journey.id,pathId);
  assert.equal(f.latest.context.journey.pendingSteps.length,1);
  assert.equal(f.latest.context.journey.pendingSteps[0].selection.method,'מילוי');
  await act(async()=>root.unmount());
});

test('retry after an uncertain response reuses the operation key; late initial reads cannot replace the saved Path',async()=>{
  const f=fixture();const server=pathServer(f);const rpc=f.pathRpc;let initialRead;let first=true;const keys=[];
  f.pathRpc=async(name,args)=>{
    if(name==='fn_research_path_resume_v1'&&!args.p_path_id)return await new Promise(r=>{initialRead=r;});
    if(name==='fn_research_path_append_v1'){
      keys.push(args.p_save_key);
      if(first){first=false;await rpc(name,args);throw new Error('network_uncertain');}
      return {data:server.saved};
    }
    return rpc(name,args);
  };
  let root;await act(async()=>{root=Renderer.create(tree());});
  await act(async()=>{f.latest.setResearchContext(numberContext());f.latest.continueResearchPath({kind:'number_expression'});});
  await act(async()=>{assert.equal((await f.latest.saveCurrentResearchPath()).ok,false);});
  await act(async()=>{assert.equal((await f.latest.saveCurrentResearchPath()).ok,true);});
  assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);
  await act(async()=>{initialRead({data:{ok:false,error:'not_found'}});});
  assert.equal(f.latest.pathResume.latest.path_id,pathId);
  assert.equal(f.latest.context.journey.pendingSteps.length,0);
  await act(async()=>root.unmount());
});
