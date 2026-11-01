import test from 'node:test';import assert from 'node:assert/strict';import {setImmediate as tick} from 'node:timers/promises';
import {supabase} from '../src/lib/supabase.js';import {resolveEntityHubNode} from '../src/lib/research/entityHubProjection.js';
async function fixture({parallel=true,identity=null,label=null,identityError=null,labelError=null,labelReject=false}={}){
 const original=supabase.from,calls=[],release={};
 supabase.from=table=>{assert.equal(table,'nodes');let field;const q={select(){return this;},eq(k){if(k==='identity_key'||k==='label')field=k;return this;},limit(){return this;},then(resolve,reject){calls.push(field);return new Promise((r,j)=>{release[field]=()=>field==='label'&&labelReject?j(labelError):r({data:field==='identity_key'?identity:label,error:field==='identity_key'?identityError:labelError});}).then(resolve,reject);}};return q;};
 try{
  const pending=resolveEntityHubNode({type:'number',key:'3928',parallelNumeric:parallel});const outcome=pending.then(value=>({value}),error=>({error}));await tick();await tick();assert.deepEqual(new Set(calls),new Set(parallel?['identity_key','label']:['identity_key']));
  if(parallel)release.label();release.identity_key();await tick();if(!parallel&&!identity?.[0]&&!identityError)release.label();return await outcome;
 }finally{supabase.from=original;}
}
test('bounded numeric overlap preserves exact identity priority and missing-node fallback',async()=>{
 const a={id:'canonical',type:'number',identity_key:'3928'},b={id:'historical-label',type:'number',label:'3928'};
 assert.deepEqual(await fixture({identity:[a],label:[b]}),{value:a});assert.deepEqual(await fixture({identity:[],label:[b]}),{value:b});assert.deepEqual(await fixture({identity:[],label:[]}),{value:null});assert.deepEqual(await fixture({parallel:false,identity:[],label:[b]}),{value:b});
});
test('denied identity fails closed; an unused rejected label cannot override a valid identity',async()=>{
 const denied={code:'42501',message:'denied'},a={id:'canonical'};assert.deepEqual(await fixture({identityError:denied,label:[a]}),{error:denied});assert.deepEqual(await fixture({identity:[a],labelError:denied,labelReject:true}),{value:a});assert.deepEqual(await fixture({identity:[],labelError:denied,labelReject:true}),{error:denied});
});
