import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {isElsLexiconCandidate, prepareElsLexiconFindings, filterElsForwardSource} from '../src/lib/research/elsLexiconResearch.js';
import {groupElsLexiconDiscoveries} from '../src/lib/research/elsStructureInspection.js';

const source=readFileSync(new URL('../tools/els/els-code.template.html',import.meta.url),'utf8');
function fn(name){
  let start=source.indexOf(`function ${name}(`),depth=0;
  assert.ok(start>=0,name);if(source.slice(start-6,start)==='async ')start-=6;
  for(let i=source.indexOf('{',start);i<source.length;i++){
    if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0)return source.slice(start,i+1);
  }
  throw new Error(name);
}
const normalize=s=>s.replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'}[c]));
function fixture(){
  const box={S:31,r0:0,r1:30,c0:0,c1:30},axis={skip:31,dir:1,start:170,positions:[170,201,232,263,294]};
  const term='אבגדהוזחטיכל',grid=Array(961).fill('ת');
  const parts=[term.slice(0,6),term.slice(6)].map(exactLetters=>({exactLetters,baseTerm:'מילהאחרת',relation:'prefixed-form',lexiconSources:['test_fixture']}));
  const row=(start,step)=>({canonicalLetters:term,exactLetters:term,start,step,tokens:parts,relation:'bounded-word-split',orientation:'test'});
  const rows=[row(80,31),row(32,1),row(927,-1),row(95,32),row(853,-30)];
  for(const r of rows)[...term].forEach((ch,i)=>grid[r.start+i*r.step]=ch);
  const inspection={segmentations:rows,readings:[],coverage:{returnedRays:24,totalRays:90,candidatesExamined:9216,maxCandidateWindows:9216},boundaries:[],rays:[]};
  const context=vm.createContext({T:grid.join(''),axis,box,inspection,lexicon:{profile:{entryCount:1}},norm:normalize,
    performance:{now:()=>10},scopeN:()=>grid.length,
    distanceToAnchors:(positions,anchors,S)=>Math.min(...positions.flatMap(p=>anchors.map(a=>Math.abs(Math.floor(p/S)-a[0])+Math.abs(p%S-a[1]))))});
  vm.runInContext(['guidedMatrixDisplayTerm','guidedMatrixDistance','projectMatrixLanguageInspection','scanMatrixLexicon'].map(fn).join('\n'),context);
  return context;
}
const project=ctx=>JSON.parse(JSON.stringify(vm.runInContext('projectMatrixLanguageInspection(inspection,axis,box,lexicon,{mode:"language",minLength:5,maxLength:16,maxDistance:120,minMembers:2},0)',ctx)));

test('language projection keeps canonical letters and spaces, including forward/reverse source and diagonal ELS',()=>{
  const ctx=fixture(),result=project(ctx);
  assert.equal(result.items.length,5);
  for(const item of result.items){
    assert.equal(normalize(item.label).replaceAll(' ',''),item.term);
    assert.ok(!item.label.includes('מילהאחרת'),'derived headword is never projected as letters');
    assert.equal(item.status,'CANDIDATE');assert.equal(item.positions.map(p=>ctx.T[p]).join(''),item.term);
  }
  assert.equal(result.coverage.complete,false);assert.equal(result.coverage.stop,'BOUNDED_LANGUAGE_SAMPLE');
  assert.equal(result.modelCalls,0);assert.equal(result.findingMutation,false);
  assert.equal(filterElsForwardSource(result.items,true).length,4);
  assert.ok(filterElsForwardSource(result.items,true).some(i=>i.skip===1&&i.dir===-1));
});
test('invented letters, changed segmentation, corpus bounds and row-wrap are rejected before projection',()=>{
  for(const mutate of [
    row=>{row.canonicalLetters='ת'.repeat(12);},
    row=>{row.tokens[0].exactLetters='ת'.repeat(6);},
    row=>{row.start=960;},
    row=>{row.start=29;row.step=1;},
  ]){
    const ctx=fixture();ctx.inspection.segmentations=[structuredClone(ctx.inspection.segmentations[0])];
    mutate(ctx.inspection.segmentations[0]);assert.equal(project(ctx).items.length,0);
  }
  const ctx=fixture(),wrapped=structuredClone(ctx.inspection.segmentations[0]);
  wrapped.start=29;wrapped.step=1;ctx.inspection.segmentations=[wrapped];
  const grid=[...ctx.T];[...wrapped.canonicalLetters].forEach((ch,i)=>grid[29+i]=ch);ctx.T=grid.join('');
  assert.equal(project(ctx).items.length,0,'even correct letters cannot wrap a source row');
});
test('same operation calls existing reader once, bounds plan and yields before late cancellation',async()=>{
  const ctx=fixture();let calls=0,ticks=0;
  ctx.guidedMatrixLanguageInspection=()=>{calls++;return ctx.inspection;};
  ctx.setTimeout=resolve=>{ticks++;resolve();};
  const result=await vm.runInContext('scanMatrixLexicon(axis,box,lexicon,()=>false,()=>{},{mode:"language",maxDistance:999,minMembers:99,minLength:1,maxLength:99})',ctx);
  assert.equal(calls,1);assert.equal(ticks,2);assert.equal(result.plan.maxDistance,120);assert.equal(result.plan.minMembers,6);
  assert.equal(result.plan.minLength,5);assert.equal(result.plan.maxLength,16);
  ctx.cancelled=()=>ticks>=4;
  assert.equal(await vm.runInContext('scanMatrixLexicon(axis,box,lexicon,cancelled,()=>{},{mode:"language"})',ctx),null);
  assert.equal(calls,2);
  assert.equal(await vm.runInContext('scanMatrixLexicon(axis,box,lexicon,()=>true,()=>{},{mode:"language"})',ctx),null);
  assert.equal(calls,2);
});
test('long phrase uses existing atomic exact replay, preserving view and rejecting stale identity',()=>{
  const ctx=fixture(),result=project(ctx),state={status:'ok',term:'תתתתת',termRaw:'תתתתת',scope:'torah',corpusLetters:961,
    axis:{hitId:'31_1_170'},verification:{state:'MATCH',corpus_id:'fixture'},geometry:{S:31,r0:0,r1:30,c0:0,cw:31},findings:[],ui:{zoom:1.5}};
  result.ok=true;result.origin={term:state.term,corpus:'torah',corpusId:'fixture',skip:31,start:170,dir:1};
  const item=result.items.find(i=>i.skip===31),load=prepareElsLexiconFindings(state,result,[item],'gold');
  assert.ok(load);assert.equal(load.words[0].t,item.term);assert.deepEqual(load.words[0].sh,[item.hitId]);
  assert.equal(load.hitId,state.axis.hitId);assert.equal(state.findings.length,0);
  assert.equal(prepareElsLexiconFindings({...state,verification:{state:'MATCH',corpus_id:'other'}},result,[item]),null);
  assert.equal(prepareElsLexiconFindings(state,{...result,plan:{mode:'words'}},[item]),null);
  const grouped=groupElsLexiconDiscoveries(state,result);
  assert.equal(grouped.ok,true);assert.equal(grouped.excluded,0);assert.ok(grouped.groups.some(g=>g.items.includes(item)||g.items.some(i=>i.hitId===item.hitId)));
  assert.equal(isElsLexiconCandidate({...item,language:{...item.language,tokens:[{letters:'אחר'}]}},result),false);
});

