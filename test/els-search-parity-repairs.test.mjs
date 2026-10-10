import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {letters} from '../tools/els/router-harness.mjs';
const template=readFileSync(new URL('../tools/els/els-code.template.html',import.meta.url),'utf8');
function source(name){const start=template.indexOf(`function ${name}(`);assert.ok(start>=0);let depth=0;for(let i=template.indexOf('{',start);i<template.length;i++){if(template[i]==='{')depth++;else if(template[i]==='}'&&--depth===0)return template.slice(start,i+1);}throw Error(name);}
function context(code,values={}){const c=vm.createContext(values);vm.runInContext(code,c);return c;}
const normalization='const norm=s=>s.replace(/[^א-ת]/g,"").replace(/[ךםןףץ]/g,c=>({ך:"כ",ם:"מ",ן:"נ",ף:"פ",ץ:"צ"}[c]));';

test('saved legacy skip 15 is recovered independently of the capped discovery sample',()=>{
 const c=context([normalization,'const scopeN=()=>304805;',...['lb','fwdSetup','fwdScan','fixedSkipCandidates'].map(source),'this.f=fixedSkipCandidates;'].join('\n'),{T:letters});
 const hits=c.f('אחרית',15);
 assert.ok(hits.some(h=>h.dir===1&&h.start===97896));
 assert.ok(hits.some(h=>h.dir===-1&&h.start===36259));
 assert.ok(hits.every(h=>h.skip===15&&h.positions.every((p,k)=>letters[p]==='אחרית'[k])));
 assert.equal(c.f('אחרית',0).length,0);
});

test('axis dictionary scan finds both reading directions with correct displayed offsets and no palindrome duplicates',()=>{
 const c=context(normalization+'\n'+source('scanLineWords')+'\nthis.scan=scanLineWords;',{DICT:['המן','תורה','אבא']});
 const scan=c.scan(Array.from('תורהנמהאבא',(letter,i)=>({letter,i})),'ציר');
 assert.deepEqual(JSON.parse(JSON.stringify(scan.words.find(w=>w.term==='המנ').matches)),[{at:4,length:3,direction:-1}]);
 assert.equal(scan.words.find(w=>w.term==='אבא').matches.length,1);
 const limited=c.scan(Array.from('תורהנמהאבא',letter=>({letter})),'ציר',1,2);
 assert.equal(limited.words.length,1);assert.equal(limited.truncated,true);
});

test('pending scope changes publish only the committed snapshot and rollback emits a consistent state',()=>{
 const previous={status:'ok',scope:'torah',axis:{hitId:'50_1_5'}};
 const c=context([source('searchUncommitted'),source('elsState'),source('operationStatus'),'this.read=elsState;this.finish=operationStatus;'].join('\n'),{
  _nativeSearchOperation:{kind:'search',requestId:7,status:'searching',startedAt:Date.now(),previousScope:'torah',previousState:previous},_nativeFindingsOperation:null,
  st:{scope:'tanakh'},emitted:[],postHost:()=>{},updateScopeUI:()=>{},scopeN:()=>0,
 });
 c.emitState=()=>c.emitted.push(c.st.scope);
 assert.equal(c.read(),previous);
 c.finish(c._nativeSearchOperation,'cancelled');
 assert.equal(c.st.scope,'torah');assert.deepEqual(c.emitted,['torah']);
});

test('finding projection pages after applying radius and keeps late selected hits available',()=>{
 const hits=Array.from({length:125},(_,i)=>({skip:2+i,dir:1,start:i,axisDistance:i%5,cost:0,v:'MATCH'}));
 const w={t:'משה',hits,total:125,inwin:125,nativeRevision:3,nativePage:1};
 const c=context(source('nativeFindingResults')+'\nthis.project=nativeFindingResults;',{
  selectedHitsOf:()=>[hits[120]],shownHitsOf:()=>[hits[120]],isGov:h=>h.v==='MATCH',isSourceHit:()=>false,withinFindingRadius:h=>h.axisDistance===0,withinFindingSearchRadius:h=>h.axisDistance===0,hitKey:h=>`${h.skip}_${h.dir}_${h.start}`,
 });
 const r=c.project(w);
 assert.equal(r.available,25);assert.equal(r.pageTotal,1);assert.equal(r.hits.length,25);
 assert.ok(r.hits.some(h=>h.hitId==='122_1_120'&&h.selected));
 c.withinFindingRadius=()=>true;c.withinFindingSearchRadius=()=>true;w.nativePage=2;
 const second=c.project(w);
 assert.equal(second.pageTotal,4);assert.equal(second.hits.filter(h=>!h.selectedOnly).length,40);
 assert.equal(second.hits[0].candidateIndex,80);assert.ok(second.hits.some(h=>h.selectedOnly&&h.candidateIndex===120));
});


test('canonical ordered pages reject failed, foreign, malformed and incomplete replies',async()=>{
 const cid='fixture-corpus',payloads=[],hit={skip:2,dir:1,start:1,positions:[1,3,5]};
 const reply=()=>({ok:true,result:{contract:'els_search_page_v1',status:'OK',scope:'torah',corpus_id:cid,input:{normalized:'אבא'},hits:[hit],completion:{executed:true,has_more:true,continuation:{after:{skip:2,start:1,dir:1}}}}});
 const c=context(normalization+'\nasync '+source('orderedSearchPage')+'\nthis.page=orderedSearchPage;',{
  CORPUS_ID:{torah:cid},TORAH_N:20,T:'א'.repeat(30),engineCall:async(_op,payload)=>{payloads.push(payload);return c.reply;},
 });
 c.reply=reply();const first=await c.page('אבא','torah',null,{});
 assert.equal(first.hits[0].v,'MATCH');assert.equal(first.state.completeThrough,1,'a full page is not a completed range');
 await c.page('אבא','torah',first.state,{});assert.equal(payloads[1].after_start,1);
 for(const corrupt of [r=>r.ok=false,r=>r.result.corpus_id='foreign',r=>r.result.scope='tanakh',r=>r.result.hits=[{...hit,positions:[1,3,21]}],r=>r.result.completion.executed=false,r=>r.result.completion.continuation.after.dir=0]){
  c.reply=reply();corrupt(c.reply);const bad=await c.page('אבא','torah',null,{});
  assert.equal(bad.hits.length,0);assert.ok(bad.state.error);assert.equal(bad.state.completeThrough,1);
 }
 c.reply=reply();c.reply.result.status='EXECUTED_EMPTY';c.reply.result.hits=[];c.reply.result.completion.has_more=false;
 const empty=await c.page('אבא','torah',null,{});assert.equal(empty.state.completeThrough,50);assert.equal(empty.hits.length,0);
 assert.equal(empty.status,undefined,'the browser tracks only range coverage, never mints a corpus-wide negative');
});

test('palindrome deduplication keeps the exact selected reverse axis through continuation',()=>{
 const back={skip:2,dir:-1,start:5,positions:[5,3,1],v:'MATCH'},forward={...back,dir:1,start:1,positions:[1,3,5]};
 const c=context(source('mergeOrderedHits')+'\nthis.merge=mergeOrderedHits;',{hitKey:h=>`${h.skip}_${h.dir}_${h.start}`,isGov:h=>h.v==='MATCH'});
 const merged=c.merge({t:'אבא',hits:[back]}, {hits:[forward,back],state:{}},'2_-1_5');
 assert.equal(merged.hits.length,1);assert.equal(merged.hits[0].dir,-1);assert.equal(merged.hits[0].start,5);
});
