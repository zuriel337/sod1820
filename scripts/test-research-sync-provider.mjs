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
const outfile=resolve(`.test-research-sync-provider-${process.pid}.mjs`);
const stub={
  'react-router-dom':`export const useLocation=()=>globalThis.__researchFixture.location;`,
  'AuthContext.jsx':`export const useAuth=()=>globalThis.__researchFixture.auth;`,
  'auth.js':`export const getCloudResearch=(...a)=>globalThis.__researchFixture.read(...a);export const applyCloudResearchOps=(...a)=>globalThis.__researchFixture.write(...a);`,
  'tracking.js':`export const trackResearch=()=>{};`,
  'supabase.js':`export const signalAiBehavior=()=>{};`,
  'eventBus.js':`export const EVENTS=new Proxy({}, {get:(_,k)=>k});export const emit=(...args)=>globalThis.__researchFixture.events.push(args);`,
};
await build({entryPoints:['src/lib/research/ResearchProvider.jsx'],bundle:true,platform:'node',format:'esm',outfile,
  external:['react','react/jsx-runtime'],plugins:[{name:'external-boundary-fixtures',setup(b){
    b.onResolve({filter:/(react-router-dom|AuthContext\.jsx|\/auth\.js|tracking\.js|\/supabase\.js|eventBus\.js)$/},args=>{
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
  const f={auth:{user:{id:'A'},loading:false},location:{pathname:'/world',search:''},events,renders,latest:null,
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
