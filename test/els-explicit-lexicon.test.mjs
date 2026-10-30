import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { elsLexiconWindowKey, prepareElsLexiconFinding } from '../src/lib/research/elsLexiconResearch.js';
const source = readFileSync(new URL('../tools/els/els-code.template.html', import.meta.url), 'utf8');
function fn(name) {
  let start=source.indexOf(`function ${name}(`), depth=0;
  assert.ok(start>=0,name);if(source.slice(start-6,start)==='async ')start-=6;
  for(let i=source.indexOf('{',start);i<source.length;i++){
    if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0)return source.slice(start,i+1);
  }
  throw new Error(name);
}
const normalize=text=>text.replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'}[c]));
function runtime(text, entries, axis, box) {
  const ctx=vm.createContext({T:text,scopeN:()=>text.length,norm:normalize,performance:{now:()=>0},setTimeout:callback=>callback(), axis,box,entries,
    distanceToAnchors:(positions,anchors,S)=>Math.min(...positions.flatMap(p=>anchors.map(a=>Math.abs(Math.floor(p/S)-a[0])+Math.abs(p%S-a[1]))))});
  vm.runInContext(['guidedMatrixRays','guidedMatrixDisplayTerm','guidedMatrixDistance','scanMatrixLexicon'].map(fn).join('\n'),ctx);
  vm.runInContext('const lexicon={words:new Map(entries.map(term=>[term,{lexiconSources:["test_fixture"]}])),profile:{entryCount:entries.length}};let stopped=false;const updates=[];',ctx);
  return ctx;
}
const result=ctx=>vm.runInContext('scanMatrixLexicon(axis,box,lexicon,()=>stopped,p=>updates.push(p))',ctx).then(x=>JSON.parse(JSON.stringify(x)));

test('canonical explicit scan finds planted exact words in all eight traversals, without dictionary enumeration',async()=>{
  const S=31,grid=Array(S*S).fill('ת'),word='אבגדה';
  const paths=[[2,2,0,1],[5,8,0,-1],[2,12,1,0],[9,16,-1,0],[12,2,1,1],[21,10,-1,-1],[12,24,1,-1],[23,18,-1,1]];
  const expected=[];
  for(const [r,c,dr,dc] of paths){const start=r*S+c,step=dr*S+dc;[...word].forEach((ch,i)=>grid[start+i*step]=ch);expected.push(`${Math.abs(step)}_${Math.sign(step)}_${start}`);}
  const ctx=runtime(grid.join(''),[word,'אבגד'],{positions:[30*S+28,30*S+29]}, {S,r0:0,r1:30,c0:0,c1:30});
  vm.runInContext('lexicon.words[Symbol.iterator]=()=>{throw new Error("must use direct lookups")}',ctx);
  const scan=await result(ctx);assert.equal(scan.coverage.complete,true);
  for(const hitId of expected)assert.ok(scan.items.some(i=>i.hitId===hitId&&i.term===word),hitId);
  assert.ok(scan.items.every(i=>i.term.length>=5&&i.status==='CANDIDATE'));
  assert.ok(scan.items.some(i=>i.kind==='source'));assert.ok(scan.items.some(i=>i.kind==='els'));
  assert.equal(scan.modelCalls,0);assert.equal(scan.findingMutation,false);
});
test('axis fragments are not promoted; no-hit completes, cancellation returns no result',async()=>{
  const box={S:10,r0:0,r1:9,c0:0,c1:9},text='אבגדה'+'ת'.repeat(95),axis={positions:[0,1,2,3,4]};
  const ctx=runtime(text,['אבגדה'],axis,box),scan=await result(ctx);
  assert.equal(scan.items.length,0);assert.ok(scan.coverage.axisFragments>0);assert.equal(scan.coverage.complete,true);
  vm.runInContext('stopped=true',ctx);assert.equal(await result(ctx),null);
});
test('result cap and wall time remain explicit partial outcomes',async()=>{
  const box={S:31,r0:0,r1:30,c0:0,c1:30},axis={positions:[0,31,62,93,124]},ctx=runtime('א'.repeat(961),['אאאאא'],axis,box);
  const scan=await result(ctx);assert.equal(scan.items.length,300);assert.equal(scan.coverage.stop,'RESULT_LIMIT');assert.equal(scan.coverage.complete,false);
  let clock=0;ctx.performance.now=()=>clock+=6000;
  const timed=await result(ctx);assert.equal(timed.coverage.stop,'TIME_LIMIT');assert.equal(timed.coverage.complete,false);
});
test('bounded rays do not wrap across cropped columns or corpus end',async()=>{
  const text='אבגדה'.repeat(23),box={S:20,r0:0,r1:5,c0:3,c1:15},ctx=runtime(text,['אבגדה','הדגבא'],{positions:[10,30,50]},box);
  const scan=await result(ctx);
  for(const item of scan.items)for(const p of item.positions){assert.ok(p<text.length);assert.ok(p%20>=3&&p%20<=15);}
});
const state={status:'ok',term:'אבגדה',termRaw:'אבגדה',scope:'torah',verification:{state:'MATCH',corpus_id:'test'},
  axis:{hitId:'10_1_2',skip:10,start:2,direction:'fwd'},geometry:{S:10,c0:0,cw:10,r0:0,r1:8},findings:[],ui:{}};
const origin={term:'אבגדה',corpus:'torah',corpusId:'test',skip:10,start:2,dir:1};
test('exact admission preserves current snapshot and rejects stale or foreign results',()=>{
  const item={term:'חמששש',hitId:'11_-1_80',skip:11,dir:-1,start:80},scan={ok:true,origin,items:[item]};
  const load=prepareElsLexiconFinding(state,scan,item,'color');assert.ok(load);
  assert.deepEqual(load.words[0].sh,[item.hitId]);assert.equal(load.start,2);assert.equal(state.findings.length,0);
  assert.equal(prepareElsLexiconFinding(state,{...scan,origin:{...origin,corpusId:'other'}},item),null);
  assert.equal(prepareElsLexiconFinding(state,scan,{...item}),null);
  const plain={...item,skip:1,hitId:'1_-1_80'};
  assert.deepEqual(prepareElsLexiconFinding(state,{...scan,items:[plain]},plain).words[0].sourceShown,[plain.hitId]);
  assert.notEqual(elsLexiconWindowKey(state),elsLexiconWindowKey({...state,geometry:{...state.geometry,cw:9}}));
  assert.equal(elsLexiconWindowKey({...state,verification:{state:'MISMATCH'}}),'');
});
test('new UI is lazy and explicit; model, storage, Provider and background promises absent',()=>{
  const ui=readFileSync(new URL('../src/components/experience2029/ElsLexiconResearch2029.jsx',import.meta.url),'utf8');
  assert.match(ui,/onClick=\{start\}/);assert.match(ui,/CanonicalProgress/);
  assert.doesNotMatch(ui,/ai-analyze|askRaziel|localStorage|setInterval|new Worker|fetch\(/);
  assert.match(source,/d\.lens==="matrix-lexicon"\)matrixLexiconLens/);
});

test('lens refuses missing/unverified axis and oversized windows before lexicon I/O',async()=>{
  const messages=[],ctx=vm.createContext({st:{res:null,occ:0,scope:'torah'},postHost:m=>messages.push(m),hasGov:r=>!!r?.hits?.some(h=>h.v==='MATCH'),isGov:h=>h?.v==='MATCH',hitKey:h=>`${h.skip}_${h.dir}_${h.start}`,
    searchUncommitted:()=>false,blockOf:()=>({S:100,c0:0,cw:100,r0:0,r1:100}),guidedLoadDynamicLexicon:()=>{throw new Error('must not load');}});
  vm.runInContext('let _lexiconScanSeq=0,_lexiconScanRequest=null;'+fn('matrixLexiconLens'),ctx);
  await vm.runInContext('matrixLexiconLens({scanId:"a",scope:"torah",hitId:"10_1_2"})',ctx);
  assert.equal(messages.at(-1).reason,'results-changed');
  ctx.st.res={hits:[{v:'MATCH',skip:10,dir:1,start:2}]};
  await vm.runInContext('matrixLexiconLens({scanId:"b",scope:"torah",hitId:"10_1_2"})',ctx);
  assert.equal(messages.at(-1).reason,'window-too-large');
});
test('lens shares one lazy request, ignores duplicate start and discards completion after cancel',async()=>{
  let release,loads=0;const messages=[],axis={v:'MATCH',skip:10,dir:1,start:2,positions:[2,12,22,32,42]},box={S:10,c0:0,cw:10,r0:0,r1:8};
  const ctx=vm.createContext({st:{res:{hits:[axis]},occ:0,scope:'torah'},postHost:m=>messages.push(m),hasGov:()=>true,isGov:h=>h?.v==='MATCH',hitKey:h=>`${h.skip}_${h.dir}_${h.start}`,
    searchUncommitted:()=>false,blockOf:()=>box,occ:()=>axis,CORPUS_ID:{torah:'test'},norm:normalize,
    guidedLoadDynamicLexicon:()=>{loads++;return new Promise(resolve=>{release=resolve;});},scanMatrixLexicon:()=>{throw new Error('cancelled run must not scan');}});
  vm.runInContext('let _lexiconScanSeq=0,_lexiconScanRequest=null;'+fn('matrixLexiconLens'),ctx);
  const task=vm.runInContext('matrixLexiconLens({scanId:"a",scope:"torah",hitId:"10_1_2"})',ctx);
  await vm.runInContext('matrixLexiconLens({scanId:"a",scope:"torah",hitId:"10_1_2"})',ctx);assert.equal(loads,1);
  await vm.runInContext('matrixLexiconLens({scanId:"a",cancel:true})',ctx);release({});await task;
  assert.equal(messages.length,1);assert.equal(messages[0].pending,true);
  await vm.runInContext('matrixLexiconLens({scanId:"a",scope:"torah",hitId:"10_1_2"})',ctx);assert.equal(loads,1);
});
