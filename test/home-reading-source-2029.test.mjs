import test from 'node:test';
import assert from 'node:assert/strict';
import {beginHomeReadingSource,getLatestPostCards,supabase} from '../src/lib/supabase.js';

test('one route-owned primary read starts before its component consumes it, with the same bounded metadata request',async()=>{
 let calls=0,options;const rows=[{slug:'public',sourcePost:{slug:'public'}}];
 const source=beginHomeReadingSource({readCards:async args=>{calls++;options=args;return rows;}});
 await Promise.resolve();assert.equal(calls,1);assert.equal(options.limit,4);assert.equal(options.includeMetadata,true);assert.equal(options.throwOnError,true);assert.ok(options.signal instanceof AbortSignal);
 assert.strictEqual(await source.read(),rows);assert.strictEqual(await source.read(),rows);assert.equal(calls,1);source.cancel();
});
test('route/identity cancellation aborts I/O and rejects a late success instead of publishing partial data',async()=>{
 let release,signal;const source=beginHomeReadingSource({readCards:args=>{signal=args.signal;return new Promise(r=>release=r);}});
 await Promise.resolve();source.cancel();assert.equal(signal.aborted,true);release([{slug:'old-reader'}]);await assert.rejects(source.read(),{name:'AbortError'});
});
test('failure before code admission is observed and remains a failed read; another route never reuses it',async()=>{
 const failure=Error('controlled read failure');const first=beginHomeReadingSource({readCards:async()=>{throw failure;}});await new Promise(r=>setImmediate(r));await assert.rejects(first.read(),e=>e===failure);
 const second=beginHomeReadingSource({readCards:async()=>[{slug:'new-route'}]});assert.deepEqual(await second.read(),[{slug:'new-route'}]);first.cancel();second.cancel();
});
test('the legacy card reader keeps its failure fallback and projection; only an explicit route-owned call gets abort/error propagation',async()=>{
 const original=supabase.from;let passedSignal=null,failing=true,reads=0;
 supabase.from=()=>{const q={select(){return this;},not(){return this;},order(){return this;},limit(){return this;},abortSignal(signal){passedSignal=signal;return this;},then(resolve){reads++;return Promise.resolve(failing?{error:Error('offline')}:{data:[{id:1,slug:'kept',title:'<b>Public title</b>',tags:[],source:'wordpress',wp_id:9},{id:2,slug:'draft',tags:['טיוטה']}],error:null}).then(resolve);}};return q;};
 try{assert.deepEqual(await getLatestPostCards(),[]);const ctl=new AbortController();await assert.rejects(getLatestPostCards({signal:ctl.signal,throwOnError:true}),/offline/);assert.equal(passedSignal,ctl.signal);
 failing=false;const rows=await getLatestPostCards({includeMetadata:true});assert.equal(rows.length,1);assert.equal(rows[0].title,'Public title');assert.equal(rows[0].wp_id,9);assert.equal(rows[0].sourcePost.slug,'kept');assert.equal(reads,3);
 }finally{supabase.from=original;}
});
