import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPostConvergencePage2029, checkPostCalculation2029, revalidatePostMeasureSource, postMeasureNumbers } from '../src/lib/research/post2029ReadingProjection.js';
import { sourceGroups, projectCoverageChecks } from '../src/lib/research/contextDepthProjection2029.js';

const post = { id:9001,slug:'future-source',source:'ai',home_hidden:false,tags:['1237','0'],modified:'2026-10-30T14:00:00Z',content:'<button id="claim" data-expression="התגלות" data-method="מסתתר" data-method-version="1" data-result="1237">source</button>' };
const claim = { id:'occurrence',expression:'התגלות',method:'מסתתר',methodVersion:'1',value:1237,sourceRef:'posts:9001',locator:'#claim',sourceVersion:post.modified,binding:'saved_text_annotation' };
const card = (id,score=20) => ({id,slug:'card-'+id,title:'כרטיס '+id,numbers:[1237],status:'approved',quality:null,meter_score:score,findings:[]});
const profile = async () => [{ methodKey:'רגיל',computedValue:844,definitionVersion:1 },{ methodKey:'מסתתר',computedValue:1237,definitionVersion:1,lifecycleActive:true }];
const trace = JSON.parse(readFileSync(new URL('./fixtures/spatial/mistater-1237-trace.json',import.meta.url)));

function backend({ source = post, cards = [card('a',10),card('b',99)], errorTable = null, mutate = null } = {}) {
  const reads=[]; let sourceReads=0;
  const client={from(table){
    const filters=[],sorts=[];let range=null,limit=null;
    const q={select(){return q;},eq(key,value){filters.push([key,value]);return q;},overlaps(){return q;},order(key){sorts.push(key);return q;},range(a,b){range=[a,b];return q;},limit(n){limit=n;return q;},
      then(resolve,reject){
        reads.push({table,filters,sorts,range,limit});
        if(table==='posts') {sourceReads++;mutate?.(sourceReads);}
        let rows=table==='posts'?(source?[source]:[]):cards;
        rows=rows.filter(row=>filters.every(([k,v])=>String(row[k])===String(v)));
        if(range)rows=rows.slice(range[0],range[1]+1);if(limit!=null)rows=rows.slice(0,limit);
        return Promise.resolve({data:rows,error:table===errorTable?{message:'offline'}:null}).then(resolve,reject);
      }};return q;
  }};
  return {client,reads};
}

test('cards keep stable source order and separate owners; a higher score is not selected',async()=>{
  const b=backend();const r=await readPostConvergencePage2029(post,{client:b.client});
  assert.equal(r.status,'ready');assert.deepEqual(r.cards.map(c=>c.id),['a','b']);
  assert.equal(r.cards[0].meterScore,10);assert.equal(r.cards[0].quality,null);
  assert.equal(r.cards[0].basis,'shared_number_indirect');assert.equal(r.cards[0].sourceRef,'topic_cards:a');
  assert.equal(r.selected,undefined);assert.deepEqual(b.reads.find(r=>r.table==='topic_cards_public').sorts,['id']);
});
test('privacy and source access are checked before titles or counts',async()=>{
  for(const source of [null,{...post,home_hidden:true},{...post,tags:['טיוטה']},{...post,source:'gpt-draft'}]){
    const b=backend({source});const r=await readPostConvergencePage2029(post,{client:b.client});
    assert.equal(r.status,'source_unavailable');assert.equal(r.cards,undefined);
    assert.equal(b.reads.some(r=>r.table==='topic_cards_public'),false);
  }
  const b=backend({cards:[card('safe'),{...card('private'),findings:{_do_not_publish:true}},{...card('candidate'),status:'candidate'}]});
  const r=await readPostConvergencePage2029(post,{client:b.client});assert.deepEqual(r.cards.map(c=>c.id),['safe']);
});
test('permission revoked while reading withholds the entire result',async()=>{
  const source={...post};const b=backend({source,mutate:n=>{if(n===2)source.home_hidden=true;}});
  const r=await readPostConvergencePage2029(post,{client:b.client});assert.equal(r.status,'source_unavailable');assert.equal(r.cards,undefined);
});
test('changed source body with the same timestamp cannot reuse the old snapshot',async()=>{
  const b=backend({source:{...post,content:'new'}});
  assert.equal((await revalidatePostMeasureSource(post,{client:b.client})).status,'source_changed');
});
test('empty, untested and failed reads remain distinct; only visible cards count',async()=>{
  assert.equal((await readPostConvergencePage2029(post,{client:backend({cards:[]}).client})).cards.length,0);
  const source={...post,tags:[]};assert.equal((await readPostConvergencePage2029(source,{client:backend({source}).client})).status,'not_tested');
  assert.equal((await readPostConvergencePage2029(post,{client:backend({errorTable:'topic_cards_public'}).client})).status,'failed');
  assert.equal((await readPostConvergencePage2029(post,{client:backend({errorTable:'posts'}).client})).status,'source_failed');
});
test('bounded pages expose a new record on the next read without a manual id list',async()=>{
  const cards=Array.from({length:10},(_,n)=>card(String(n)));const b=backend({cards});
  const first=await readPostConvergencePage2029(post,{client:b.client,pageSize:8});assert.equal(first.hasMore,true);assert.equal(first.cards.length,8);
  const next=await readPostConvergencePage2029(post,{client:b.client,offset:first.nextOffset});assert.deepEqual(next.cards.map(c=>c.id),['8','9']);
  cards.push(card('new-after-build'));
  const fresh=await readPostConvergencePage2029(post,{client:b.client,offset:8});assert.ok(fresh.cards.some(c=>c.id==='new-after-build'));
});
test('exact expression/method/version/value has result parity distinct from steps',async()=>{
  const b=backend();const r=await checkPostCalculation2029(post,claim,{client:b.client,profileReader:profile});
  assert.equal(r.status,'ready');assert.equal(r.resultMatch,'matched');assert.equal(r.steps,'not_tested');assert.equal(r.methodVersion,'1');
  const full=await checkPostCalculation2029(post,claim,{client:b.client,profileReader:profile,traceReader:async()=>trace,checkSteps:true});assert.equal(full.steps,'matched');
  const wrong=await checkPostCalculation2029(post,claim,{client:b.client,profileReader:profile,traceReader:async()=>({...trace,input:'אחר'}),checkSteps:true});assert.equal(wrong.resultMatch,'matched');assert.equal(wrong.steps,'unavailable_or_mismatch');
});
test('missing method/value/locator and numeric tags are not decoded calculation claims',async()=>{
  for(const change of [{method:null},{value:null},{locator:null},{binding:'tag'},{sourceRef:'posts:other'}]){
    const r=await checkPostCalculation2029(post,{...claim,...change},{client:backend().client,profileReader:()=>{throw Error('must not read');}});
    assert.equal(r.status,'incomplete_claim');
  }
  assert.deepEqual(postMeasureNumbers(post),[1237,0]);
});
test('zero survives; missing values do not coerce to zero; spelling stays exact',async()=>{
  const source={...post,content:post.content.replace('התגלות',' א ').replace('1237','0')};
  const r=await checkPostCalculation2029(source,{...claim,expression:' א ',value:0},{client:backend({source}).client,
    profileReader:async()=>[{methodKey:'מסתתר',computedValue:0,definitionVersion:1}]});
  assert.equal(r.status,'ready');assert.equal(r.focus.expression,' א ');assert.equal(r.focus.root,0);
});
test('an invented tuple absent from the live source is not a source claim',async()=>{
  const r=await checkPostCalculation2029(post,{...claim,expression:'אחר'},{client:backend().client,profileReader:profile});
  assert.equal(r.status,'incomplete_claim');
});
test('unknown/different methods and changed versions never fall back to regular',async()=>{
  for(const change of [{method:'משולש מילה'},{value:999},{methodVersion:'2'}]){
    const r=await checkPostCalculation2029(post,{...claim,...change},{client:backend().client,profileReader:profile});assert.notEqual(r.status,'ready');
  }
  const r=await checkPostCalculation2029(post,claim,{client:backend().client,
    profileReader:async()=>[{methodKey:'מסתתר',computedValue:1237,definitionVersion:2}]});
  assert.equal(r.status,'method_version_unavailable_or_changed');assert.equal(r.resultMatch,'not_tested');
});
test('revocation during a mismatched profile read still hides all derived results',async()=>{
  const source={...post},b=backend({source});
  const r=await checkPostCalculation2029(post,claim,{client:b.client,profileReader:async()=>{source.home_hidden=true;return [];}});
  assert.equal(r.status,'source_unavailable');assert.equal(r.resultMatch,undefined);
});
test('canonical display aliases do not merge different methods that happen to have the same value',async()=>{
  const source={...post,content:post.content.replace('מסתתר','משולש')};
  const result=await checkPostCalculation2029(source,{...claim,method:'משולש'},{client:backend({source}).client,
    profileReader:async()=>[{methodKey:'קדמי',displayLabel:'משולש',computedValue:1237,definitionVersion:1},
      {methodKey:'משולש מילה',displayLabel:'משולש מילה',computedValue:1237,definitionVersion:1}]});
  assert.equal(result.status,'ready');assert.equal(result.focus.method,'קדמי');assert.equal(result.claim.method,'משולש');
});
test('existing reviewed adapters remain a separately attributed route, never a tag-based claim',async()=>{
  const source={...post,content:'<h2>מקור שמור ללא סימוני חישוב</h2>'};
  const projected={sourcePost:source,golden:true,post:{...source,content:post.content.replace(' data-method-version="1"','')}};
  const unit={...claim,methodVersion:null,binding:'existing_reviewed_post_projection'};
  const result=await checkPostCalculation2029(source,unit,{client:backend({source}).client,profileReader:profile,sourceProjection:projected});
  assert.equal(result.status,'ready');assert.equal(result.sourceMethodVersion,null);
  const denied=await checkPostCalculation2029(source,unit,{client:backend({source}).client,profileReader:profile});
  assert.equal(denied.status,'incomplete_claim');
});
test('unavailable trace or failed trace is never a checked explanation',async()=>{
  for(const [reader,state] of [[async()=>null,'unavailable'],[async()=>{throw Error('offline');},'failed'],[async()=>({...trace,provenance:{method_version:2}}),'version_mismatch']]){
    const r=await checkPostCalculation2029(post,claim,{client:backend().client,profileReader:profile,traceReader:reader,checkSteps:true});assert.equal(r.resultMatch,'matched');assert.equal(r.steps,state);
  }
});
test('same-source tags/body and copied media remain dependent with all placements retained',()=>{
  const sources=[{kind:'tag',ref:'posts:1#tag'},{kind:'post_body',ref:'posts:1#body'},
    {kind:'image',ref:'posts:1#image',artifactRef:'media:one'},{kind:'image',ref:'posts:2#copy',artifactRef:'media:one'},
    {kind:'image',ref:'private',access:{scope:'private'}}];
  assert.deepEqual(sourceGroups(sources),['posts:1','media:one']);assert.equal(sources.length,5);
});
test('six coverage dimensions require explicit checks and retain their limits',()=>{
  const dims=projectCoverageChecks({calculations:{state:'partial',scope:'one exact claim',missing:'not all claims'},
    links:{state:'not_found'},convergence:{state:'failed'},independence:{state:'not_tested'}});
  assert.equal(dims.length,6);assert.equal(dims.find(d=>d.key==='calculations').scope,'one exact claim');
  assert.deepEqual(dims.slice(0,4).map(d=>d.state),['partial','not_found','failed','not_tested']);assert.equal(dims.some(d=>d.score!=null),false);
});
