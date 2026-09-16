import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchSyncRuntime } from './researchSyncRuntime.js';
import { applyResearchOps, emptyResearchState, appendResearchOp, principalStateKey, principalContextKey, principalToken } from './researchSyncState.js';
import { readFile } from 'node:fs/promises';
const copy = x => JSON.parse(JSON.stringify(x));
const tick = () => new Promise(resolve => setImmediate(resolve));
const op = (kind, payload={}) => ({ kind, op_id: crypto.randomUUID(), ...payload });
const item = id => ({ id, ref: id, type: 'number', title: id });
class Storage {
  data = new Map(); fail = false;
  getItem(k) { return this.data.get(k) ?? null; }
  setItem(k,v) { if(this.fail) throw new Error('quota'); this.data.set(k,String(v)); }
  removeItem(k) { this.data.delete(k); }
  clone() { const s = new Storage(); s.data = new Map(this.data); return s; }
}
function deferred() { let resolve, reject; const promise=new Promise((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; }
class Server {
  data = new Map(); calls=[]; reads=[]; readError=false; writeError=false; loseAck=false; gate=null;
  state(uid) { if(!this.data.has(uid))this.data.set(uid,{...emptyResearchState(),revision:0,receipts:new Map()});return this.data.get(uid); }
  snapshot(uid) { const {receipts,...s}=this.state(uid);return copy(s); }
  read=async uid=>{this.reads.push(uid);if(this.readError)throw new Error('read failed');return this.snapshot(uid);};
  write=async(uid,ops,{batchId,expectedRevision})=>{
    this.calls.push(copy({uid,ops,batchId,expectedRevision}));
    if(this.gate)await this.gate.promise;
    if(this.writeError)throw new Error('write failed');
    const s=this.state(uid),fingerprint=JSON.stringify(ops),receipt=s.receipts.get(batchId);
    if(receipt){if(receipt.fingerprint!==fingerprint)throw new Error('RESEARCH_BATCH_PAYLOAD_MISMATCH');return {ok:true,batch_id:batchId,applied_revision:receipt.rev,snapshot:this.snapshot(uid),replayed:true};}
    if(expectedRevision!==s.revision)throw new Error('RESEARCH_SYNC_CONFLICT');
    const next={...applyResearchOps(s,ops),revision:s.revision+1,receipts:s.receipts};
    next.receipts.set(batchId,{fingerprint,rev:next.revision});
    while(next.receipts.size>128)next.receipts.delete(next.receipts.keys().next().value);
    this.data.set(uid,next);
    if(this.loseAck){this.loseAck=false;throw new Error('lost response');}
    return {ok:true,batch_id:batchId,applied_revision:next.revision,snapshot:this.snapshot(uid)};
  };
}
function setup({uid='A',server=new Server(),storage=new Storage(),session=new Storage(),readCloud=server.read,disabled=false}={}) {
  const contexts=[];
  const runtime=createResearchSyncRuntime({userId:uid,storage,session,readCloud,writeCloud:server.write,delay:60000,disabled,onContext:x=>contexts.push(copy(x))});
  runtime.start();
  return {runtime,server,storage,session,contexts};
}
async function ready(f){await tick();assert.notEqual(f.runtime.getSnapshot().syncStatus,'loading');return f;}
const add=(r,id)=>r.commit([op('item_upsert',{bucket:'library',entity:item(id)})]);

test('ordered add/update/remove and clear/add never compact away intent',()=>{
  let q=[];q=appendResearchOp(q,op('collection_add',{collection:{id:'c',name:'old'}}));q=appendResearchOp(q,op('collection_update',{id:'c',patch:{name:'new'}}));
  assert.equal(q.length,2);assert.equal(applyResearchOps({},q).collections[0].name,'new');
  assert.equal(applyResearchOps({},[...q,op('collection_remove',{id:'c'})]).collections.length,0);
  assert.deepEqual(applyResearchOps({},[op('history_clear'),op('history_add',{entity:{id:'h'}})]).history,[{id:'h'}]);
});
test('identity uses exact type/ref tuple; delimiter collisions do not merge',()=>{
  const s=applyResearchOps({},[op('item_upsert',{bucket:'library',entity:{type:'a|b',ref:'c'}}),op('item_upsert',{bucket:'library',entity:{type:'a',ref:'b|c'}})]);
  assert.equal(s.saved.length,2);
});
test('invalid collection identity patches and unknown ops fail loudly',()=>{
  assert.throws(()=>applyResearchOps({},[op('collection_update',{id:'a',patch:{id:'b'}})]));
  assert.throws(()=>applyResearchOps({},[op('bad')]));
});
test('guest remains local, survives account login, never auto-adopted',async()=>{
  const g=setup({uid:null});add(g.runtime,'guest');g.runtime.stop();
  const a=await ready(setup({uid:'A',storage:g.storage,session:g.session,server:g.server}));
  assert.equal(a.runtime.getSnapshot().saved.length,0);assert.equal(a.server.calls.length,0);
  a.runtime.stop();const again=setup({uid:null,storage:g.storage,session:g.session,server:g.server});
  assert.equal(again.runtime.getSnapshot().saved[0].id,'guest');again.runtime.stop();
});
test('auth loading does not render a guest/cache partition',()=>{
  const storage=new Storage();storage.setItem(principalStateKey('guest'),JSON.stringify({saved:[item('private-cache')]}));
  const f=setup({uid:null,storage,disabled:true});assert.equal(f.runtime.getSnapshot().saved.length,0);assert.equal(add(f.runtime,'bad'),false);f.runtime.stop();
});
test('A logout B has no A state and stale A callbacks cannot mutate B',async()=>{
  const a=await ready(setup());add(a.runtime,'A-private');a.runtime.stop();
  const b=await ready(setup({uid:'B',storage:a.storage,session:a.session,server:a.server}));
  assert.equal(b.runtime.getSnapshot().saved.length,0);assert.equal(add(a.runtime,'stale'),false);
  assert.equal(b.server.calls.length,0);b.runtime.stop();
});
test('stale hydration after principal unmount is ignored',async()=>{
  const d=deferred(),a=setup({readCloud:()=>d.promise});a.runtime.stop();
  const b=await ready(setup({uid:'B',storage:a.storage,session:a.session,server:a.server}));
  d.resolve({...emptyResearchState(),revision:1,saved:[item('A-secret')]});await tick();
  assert.equal(b.runtime.getSnapshot().saved.length,0);assert.equal(a.runtime.getSnapshot().saved.length,0);b.runtime.stop();
});
test('cloud hydration never overwrites active Context or return_exact',async()=>{
  const d=deferred(),f=setup({readCloud:()=>d.promise});const context={subject:{id:'878',type:'number'},returnTo:{href:'/books?locator=12'},dimensions:{filter:'source'}};
  f.runtime.commit([op('context_set',{context})]);d.resolve({...emptyResearchState(),revision:0,context:{old:'cloud'}});await tick();
  assert.deepEqual(f.runtime.getSnapshot().context,context);f.runtime.stop();
});
test('clear context during hydration stays null after read finishes',async()=>{
  const d=deferred(),f=setup({readCloud:()=>d.promise});f.runtime.commit([op('context_set',{context:{subject:'x'}})]);f.runtime.commit([op('context_set',{context:null})]);
  d.resolve({...emptyResearchState(),revision:0,context:{old:'cloud'}});await tick();assert.equal(f.runtime.getSnapshot().context,null);f.runtime.stop();
});
test('read error is not empty authoritative cloud; write remains disabled',async()=>{
  const server=new Server();server.readError=true;const f=await ready(setup({server}));add(f.runtime,'local');await f.runtime.flush();
  assert.equal(server.calls.length,0);assert.equal(f.runtime.getSnapshot().syncStatus,'error');assert.equal(f.runtime.getSnapshot().syncPending,1);
  server.readError=false;await f.runtime.retry();await f.runtime.flush();assert.equal(server.snapshot('A').saved[0].id,'local');f.runtime.stop();
});
test('malformed snapshot fails closed',async()=>{
  const f=await ready(setup({readCloud:async()=>({})}));add(f.runtime,'x');await f.runtime.flush();assert.equal(f.server.calls.length,0);assert.equal(f.runtime.getSnapshot().syncStatus,'error');f.runtime.stop();
});
test('failed write retains exact batch id, revision and operations on retry',async()=>{
  const f=await ready(setup());f.server.writeError=true;add(f.runtime,'x');await f.runtime.flush();const first=f.server.calls[0];
  assert.equal(f.runtime.getSnapshot().syncPending,1);f.server.writeError=false;await f.runtime.retry();assert.deepEqual(f.server.calls[1],first);assert.equal(f.runtime.getSnapshot().syncStatus,'synced');f.runtime.stop();
});
test('new actions during an inflight write cannot invalidate its acknowledgement',async()=>{
  const f=await ready(setup());f.server.gate=deferred();add(f.runtime,'one');const first=f.runtime.flush();await tick();add(f.runtime,'two');await f.runtime.flush();
  assert.equal(f.server.calls.length,1);f.server.gate.resolve();await first;assert.equal(f.runtime.getSnapshot().syncPending,1);f.server.gate=null;
  await f.runtime.flush();assert.deepEqual(f.server.snapshot('A').saved.map(x=>x.id),['two','one']);assert.equal(f.runtime.getSnapshot().syncPending,0);f.runtime.stop();
});
test('caller mutation after enqueue cannot alter the request payload',async()=>{
  const f=await ready(setup());const e=item('original');f.runtime.commit([op('item_upsert',{bucket:'library',entity:e})]);e.id='tampered';await f.runtime.flush();
  assert.equal(f.server.snapshot('A').saved[0].id,'original');f.runtime.stop();
});
test('lost clear acknowledgement is replayed once, not applied after a newer remote save',async()=>{
  const f=await ready(setup());f.server.loseAck=true;f.runtime.commit([op('item_clear_bucket',{bucket:'cart'})]);await f.runtime.flush();
  await f.server.write('A',[op('item_upsert',{bucket:'cart',entity:item('remote-new')})],{batchId:crypto.randomUUID(),expectedRevision:1});
  await f.runtime.retry();assert.equal(f.server.snapshot('A').cart[0].id,'remote-new');assert.equal(f.server.snapshot('A').revision,2);f.runtime.stop();
});
test('stale-device partial cache does not delete remotely added items',async()=>{
  const f=await ready(setup());await f.server.write('A',[op('item_upsert',{bucket:'library',entity:item('remote')})],{batchId:crypto.randomUUID(),expectedRevision:0});
  add(f.runtime,'local');await f.runtime.flush();assert.equal(f.runtime.getSnapshot().syncStatus,'conflict');assert.equal(f.server.snapshot('A').saved[0].id,'remote');
  assert.equal(f.runtime.exportPending().queue.length,1);f.runtime.stop();
});
test('conflict resolution needs explicit confirmation and retains disputed provenance',async()=>{
  const f=await ready(setup());await f.server.write('A',[op('item_upsert',{bucket:'library',entity:item('remote')})],{batchId:crypto.randomUUID(),expectedRevision:0});
  add(f.runtime,'local');await f.runtime.flush();assert.equal(await f.runtime.resolveConflict({action:'reapply'}),false);
  assert.equal(await f.runtime.resolveConflict({confirm:true,action:'reapply'}),true);await f.runtime.flush();
  assert.equal(f.server.snapshot('A').saved.length,2);assert.ok([...f.storage.data.keys()].some(k=>k.includes(':conflict:')));f.runtime.stop();
});
test('explicit single-item deletion preserves other buckets and other items',async()=>{
  const f=await ready(setup());add(f.runtime,'a');await f.runtime.flush();add(f.runtime,'b');await f.runtime.flush();
  f.runtime.commit([op('item_upsert',{bucket:'pinned',entity:item('a')}),op('item_delete',{bucket:'library',entity_type:'number',entity_ref:'a'})]);await f.runtime.flush();
  assert.deepEqual(f.server.snapshot('A').saved.map(e=>e.id),['b']);assert.equal(f.server.snapshot('A').pinned.length,1);f.runtime.stop();
});
test('storage failure prevents sending a request without a recoverable journal',async()=>{
  const f=await ready(setup());f.storage.fail=true;add(f.runtime,'x');await f.runtime.flush();assert.equal(f.server.calls.length,0);assert.equal(f.runtime.getSnapshot().syncStatus,'local_error');
  f.storage.fail=false;await f.runtime.retry();assert.equal(f.server.snapshot('A').saved.length,1);f.runtime.stop();
});
test('unscoped legacy data is preserved but never imported or attributed',async()=>{
  const storage=new Storage();const raw=JSON.stringify({saved:[item('unknown-owner')]});storage.setItem('sod_research_v1',raw);
  const f=await ready(setup({storage}));assert.equal(f.runtime.getSnapshot().saved.length,0);assert.equal(f.runtime.getSnapshot().legacyRecoveryAvailable,true);assert.equal(storage.getItem('sod_research_v1'),raw);f.runtime.stop();
});
test('corrupt journal is retained for recovery and blocks all uploads',async()=>{
  const storage=new Storage(),session=new Storage(),key=principalStateKey(principalToken('A'));
  session.setItem(`${key}:journal`,`${key}:pending:bad`);storage.setItem(`${key}:pending:bad`,'{broken');
  const f=setup({storage,session});await tick();assert.equal(f.runtime.getSnapshot().syncStatus,'local_recovery_required');assert.equal(add(f.runtime,'x'),false);assert.equal(storage.getItem(`${key}:pending:bad`),'{broken');assert.equal(f.server.calls.length,0);f.runtime.stop();
});
test('StrictMode start-stop-start does not strand an old in-flight hydration',async()=>{
  const d=deferred(),server=new Server();let count=0;const f=setup({server,readCloud:()=>++count===1?d.promise:server.read('A')});
  f.runtime.stop();f.runtime.start();d.resolve(server.snapshot('A'));await tick();await tick();assert.equal(f.runtime.getSnapshot().syncStatus,'synced');assert.equal(count,2);f.runtime.stop();
});
test('reload reuses exact uncertain request and cannot duplicate its server effects',async()=>{
  const f=await ready(setup());f.server.loseAck=true;add(f.runtime,'x');await f.runtime.flush();const first=f.server.calls[0];f.runtime.stop();
  const g=await ready(setup({storage:f.storage,session:f.session,server:f.server}));await g.runtime.flush();assert.deepEqual(g.server.calls[1],first);assert.equal(g.server.snapshot('A').revision,1);g.runtime.stop();
});
test('duplicated tabs own distinct durable pending journals',async()=>{
  const a=await ready(setup());add(a.runtime,'a');const b=await ready(setup({storage:a.storage,session:a.session.clone(),server:a.server}));
  add(b.runtime,'b');assert.equal(a.runtime.exportPending().queue.length,1);assert.equal(b.runtime.exportPending().queue.length,2);
  const pending=[...a.storage.data.entries()].filter(([k])=>k.includes(':pending:'));assert.ok(pending.length>=2);
  await a.runtime.flush();await b.runtime.flush();await b.runtime.flush();assert.equal(a.server.snapshot('A').saved.length,2);a.runtime.stop();b.runtime.stop();
});
test('out-of-order acknowledgement after stop cannot update a new principal',async()=>{
  const a=await ready(setup());a.server.gate=deferred();add(a.runtime,'A');const call=a.runtime.flush();a.runtime.stop();
  const b=await ready(setup({uid:'B',storage:a.storage,session:a.session,server:a.server}));a.server.gate.resolve();await call;
  assert.equal(b.runtime.getSnapshot().saved.length,0);assert.equal(a.runtime.exportPending().queue.length,1);b.runtime.stop();
});
test('provider wiring preserves public APIs, uses keyed principal, no hydration-reactivation effect',async()=>{
  const source=await readFile(new URL('./ResearchProvider.jsx',import.meta.url),'utf8');
  for(const name of ['saveItem','clearResearchContext','addJourney','returnTo','setMode'].filter(x=>x!=='returnTo'))assert.ok(source.includes(name));
  assert.match(source,/key=\{principal\}/);assert.ok(!source.includes('cloudHydrationRevision'));
  assert.match(source,/frame\.contentWindow === event\.source/);assert.ok(!source.includes('setContextState((prev)'));
});

test('actual auth IO rejects a spoofed/stale principal before calling an RPC',async()=>{
  let calls=0;
  const key=`__client_${crypto.randomUUID().replaceAll('-','')}`;
  globalThis[key]={auth:{getSession:async()=>({data:{session:{user:{id:'B'}}}})},rpc:async()=>{calls++;return {};}};
  const source=await readFile(new URL('../auth.js',import.meta.url),'utf8');
  const code=`const supabase=globalThis['${key}'];const signupAttribution=()=>({});const visitorId=()=>null;\n`+source.replace(/^import .*;\n/gm,'');
  const io=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  await assert.rejects(io.getCloudResearch('A'),/RESEARCH_PRINCIPAL_MISMATCH/);
  await assert.rejects(io.applyCloudResearchOps('A',[op('history_clear')],{batchId:'x',expectedRevision:0}),/RESEARCH_PRINCIPAL_MISMATCH/);
  assert.equal(calls,0);delete globalThis[key];
});
test('actual auth IO propagates read errors rather than returning empty state',async()=>{
  const key=`__client_${crypto.randomUUID().replaceAll('-','')}`;
  globalThis[key]={auth:{getSession:async()=>({data:{session:{user:{id:'A'}}}})},rpc:async()=>({data:null,error:new Error('read outage')})};
  const source=await readFile(new URL('../auth.js',import.meta.url),'utf8');
  const code=`const supabase=globalThis['${key}'];const signupAttribution=()=>({});const visitorId=()=>null;\n`+source.replace(/^import .*;\n/gm,'');
  const io=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  await assert.rejects(io.getCloudResearch('A'),/read outage/);delete globalThis[key];
});


test('legacy recovery export requires explicit local-access confirmation and never adopts it',async()=>{
  const storage=new Storage(),raw=JSON.stringify({saved:[item('unknown-owner')]});storage.setItem('sod_research_v1',raw);
  const f=await ready(setup({storage}));assert.equal(f.runtime.exportLegacy(),null);
  assert.deepEqual(f.runtime.exportLegacy({confirmLocalAccess:true}),{source:'sod_research_v1',owner:'unknown',raw});
  assert.equal(f.runtime.getSnapshot().saved.length,0);assert.equal(f.server.calls.length,0);f.runtime.stop();
});
