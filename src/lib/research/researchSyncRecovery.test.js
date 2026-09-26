import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchSyncRuntime } from './researchSyncRuntime.js';
import { emptyResearchState, applyResearchOps, principalStateKey } from './researchSyncState.js';
class Storage {
  data = new Map();
  get length() { return this.data.size; }
  key(i) { return [...this.data.keys()][i] ?? null; }
  getItem(k) { return this.data.get(k) ?? null; }
  setItem(k,v) { this.data.set(k,String(v)); }
  removeItem(k) { this.data.delete(k); }
}
const tick = () => new Promise(r=>setImmediate(r));
const op = (kind,payload={})=>({kind,op_id:crypto.randomUUID(),...payload});
const add=(r,id)=>r.commit([op('item_upsert',{bucket:'library',entity:{id,type:'number'}})]);
function fixture({userId='A',storage=new Storage(),session=new Storage(),server}={}) {
  server ||= {states:new Map(),calls:[],fail:false,gate:null};
  const get=uid=>{if(!server.states.has(uid))server.states.set(uid,{...emptyResearchState(),revision:0});return server.states.get(uid);};
  const runtime=createResearchSyncRuntime({userId,storage,session,delay:60000,
    readCloud:async uid=>server.gate?server.gate.promise:structuredClone(get(uid)),
    writeCloud:async(uid,ops,args)=>{
      server.calls.push(structuredClone({uid,ops,args}));
      if(server.fail)throw new Error('offline');
      if(args.expectedRevision!==get(uid).revision)throw new Error('RESEARCH_SYNC_CONFLICT');
      const state={...applyResearchOps(get(uid),ops),revision:get(uid).revision+1};server.states.set(uid,state);
      return {ok:true,batch_id:args.batchId,applied_revision:state.revision,snapshot:structuredClone(state)};
    }});
  runtime.start();return {runtime,storage,session,server,get};
}
test('JSON null cache is quarantined instead of crashing or silently replacing it',async()=>{
  const storage=new Storage();storage.setItem(principalStateKey('user:A'),'null');
  const f=fixture({storage});await tick();assert.equal(f.runtime.getSnapshot().syncStatus,'local_recovery_required');
  assert.equal(f.server.calls.length,0);assert.equal(storage.getItem(principalStateKey('user:A')),'null');f.runtime.stop();
});
test('closed-tab pending journal remains selectable with exact original batch identity',async()=>{
  const a=fixture();await tick();a.server.fail=true;add(a.runtime,'offline');await a.runtime.flush();const sent=a.server.calls[0];a.runtime.stop();
  const b=fixture({storage:a.storage,session:new Storage(),server:a.server});await tick();
  const recovery=b.runtime.listRecoveryJournals();assert.equal(recovery.length,1);assert.equal(b.runtime.getSnapshot().recoveryJournals.length,1);
  assert.equal(await b.runtime.recoverJournal({key:recovery[0].key}),false);
  assert.equal(await b.runtime.recoverJournal({key:recovery[0].key,confirm:true}),true);
  a.server.fail=false;await b.runtime.flush();assert.deepEqual(a.server.calls[1],sent);
  assert.equal(b.get('A').saved[0].id,'offline');b.runtime.stop();
});
test('journal recovery never lists another principal data',async()=>{
  const a=fixture();await tick();add(a.runtime,'A-private');a.runtime.stop();
  const b=fixture({userId:'B',storage:a.storage,server:a.server});await tick();assert.deepEqual(b.runtime.listRecoveryJournals(),[]);b.runtime.stop();
});
test('conflict confirmation is serialized and cannot discard concurrently accepted actions',async()=>{
  const f=fixture();await tick();f.get('A').revision=1;add(f.runtime,'local');await f.runtime.flush();
  let resolve;f.server.gate={promise:new Promise(r=>{resolve=r;})};
  const first=f.runtime.resolveConflict({confirm:true,action:'keep_remote'});
  assert.equal(await f.runtime.resolveConflict({confirm:true,action:'reapply'}),false);
  assert.equal(add(f.runtime,'not-accepted-during-resolution'),false);
  resolve(structuredClone(f.get('A')));assert.equal(await first,true);assert.equal(f.runtime.getSnapshot().syncPending,0);f.runtime.stop();
});
