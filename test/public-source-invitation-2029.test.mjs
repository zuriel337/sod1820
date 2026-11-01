import test from 'node:test';
import assert from 'node:assert/strict';
import {supabase} from '../src/lib/supabase.js';
import {fetchPost2029ReadingProjection,post2029ReadingInternals as I} from '../src/lib/research/post2029ReadingProjection.js';

async function withSource(row,fn,{fail=false}={}){
 const saved={from:supabase.from,rpc:supabase.rpc},calls=[];
 supabase.from=table=>{
  calls.push({table});let signal;
  const result=single=>signal?.aborted?{data:null,error:{name:'AbortError',message:'aborted fixture'}}:fail?{data:null,error:{code:'42501',message:'denied fixture'}}:{data:table==='posts'?(row?[row]:[]):single?{slug:'gapfill-363',title:'public topic'}:[],error:null};
  let q;q=new Proxy({}, {get(_t,k){if(k==='then')return(resolve,reject)=>Promise.resolve(result(false)).then(resolve,reject);if(k==='abortSignal')return(s)=>{signal=s;calls.push({signal:s});return q;};if(k==='maybeSingle')return()=>Promise.resolve(result(true));assert.ok(['select','in','eq','limit','order','not','is','or'].includes(k),'unreviewed read '+String(k));return()=>q;}});return q;
 };
 supabase.rpc=(name)=>{calls.push({rpc:name});return Promise.resolve({data:[],error:null});};
 try{return await fn(calls);}finally{supabase.from=saved.from;supabase.rpc=saved.rpc;}
}
const source={id:5112,slug:I.FZ1073_SLUG,title:'Public source fixture',source:'sod1820',tags:[],content:'<p>Unchanged source fixture.</p>',image_url:'https://public-fixture.invalid/full.jpg',thumb_url:'https://public-fixture.invalid/thumb.jpg'};
test('source invitation preserves source identity and media but does not run unused Golden research; full Post still does',async()=>{
 await withSource(source,async calls=>{
  const p=await fetchPost2029ReadingProjection(source.slug,{sourceInvitation:true});
  assert.equal(p.sourcePost,source);assert.equal(p.identity.id,'5112');assert.equal(p.identity.href,'/post/'+source.slug);assert.equal(p.contextPack,null);assert.deepEqual(p.experience.connections,[]);assert.ok(p.experience.media);
  assert.equal(calls.some(c=>c.rpc),false);assert.equal(calls.filter(c=>c.table==='posts').length,1);
  const media=p.experience.media;calls.length=0;
  const full=await fetchPost2029ReadingProjection(source.slug);
  assert.deepEqual(full.experience.media,media);assert.ok(calls.some(c=>c.rpc==='gematria_method_trace'),'full Post retains its canonical trace path');
 });
});
test('missing or private source never opens a private stage/snapshot for an invitation',async()=>{
 for(const row of[null,{...source,tags:['טיוטה']},{...source,_privateStage:true},{...source,source:'gpt-draft'}])await withSource(row,async calls=>{
  assert.equal(await fetchPost2029ReadingProjection(source.slug,{sourceInvitation:true}),null);
  assert.equal(calls.some(c=>c.table==='research_objects'||c.rpc),false);
 });
 await withSource(source,async()=>{await assert.rejects(fetchPost2029ReadingProjection(source.slug,{sourceInvitation:true}),e=>e.code==='42501');},{fail:true});
});
test('invitation cancellation reaches the existing SDK source query and cannot return partial material',async()=>{
 const controller=new AbortController();controller.abort();
 await withSource(source,async calls=>{await assert.rejects(fetchPost2029ReadingProjection(source.slug,{sourceInvitation:true,signal:controller.signal}),e=>e.name==='AbortError');assert.equal(calls.some(c=>c.signal===controller.signal),true);assert.equal(calls.some(c=>c.rpc),false);});
});
