import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as tick} from 'node:timers/promises';
import {beginPostReadingSource} from '../src/lib/supabase.js';
import {fetchPost2029ReadingProjection} from '../src/lib/research/post2029ReadingProjection.js';

test('one route-owned source read can start before the Post code consumer; no duplicate or different-slug reuse',async()=>{
 const row={id:90001,slug:'native-public',title:'fixture',content:'<p>Original source.</p>',source:'sod1820',tags:[]};let calls=0,resolve;
 const request=beginPostReadingSource(row.slug,{readPost:async(slug,options)=>{calls++;assert.equal(slug,row.slug);assert.equal(options.throwOnError,true);assert.equal(options.signal.aborted,false);return new Promise(r=>resolve=r);}});
 await tick();assert.equal(calls,1,'read starts before the lazy consumer mounts');
 await assert.rejects(request.read('other'),/post_source_identity_mismatch/);
 resolve(row);const p=await fetchPost2029ReadingProjection(row.slug,{readPost:request.read});assert.equal(p.sourcePost,row);assert.equal(p.post.content,'<p>Original source.</p>');assert.equal(calls,1);request.cancel();await assert.rejects(request.read(row.slug),e=>e.name==='AbortError');
});
test('cancellation discards a late source and independent identity/route requests cannot inherit it',async()=>{
 let resolve,aborted=false;const first=beginPostReadingSource('old',{readPost:async(_slug,{signal})=>{signal.addEventListener('abort',()=>aborted=true);return new Promise(r=>resolve=r);}});
 await tick();first.cancel();assert.equal(aborted,true);resolve({id:1,slug:'old'});
 const next=beginPostReadingSource('new',{readPost:async()=>({id:2,slug:'new'})});
 await assert.rejects(first.read('old'),e=>e.name==='AbortError');assert.deepEqual(await next.read('new'),{id:2,slug:'new'});next.cancel();
});
test('an early permission failure is observed without a consumer and is not an empty success',async()=>{
 const denied=new Error('permission denied fixture');denied.code='42501';const unhandled=[];const observe=e=>unhandled.push(e);process.on('unhandledRejection',observe);
 try{const request=beginPostReadingSource('denied',{readPost:async()=>{throw denied;}});await tick();await tick();assert.deepEqual(unhandled,[]);await assert.rejects(request.read('denied'),e=>e===denied);request.cancel();}finally{process.off('unhandledRejection',observe);}
});
