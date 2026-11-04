import test from 'node:test';
import assert from 'node:assert/strict';
import { groupElsLexiconDiscoveries } from '../src/lib/research/elsStructureInspection.js';
import { prepareElsLexiconFindings } from '../src/lib/research/elsLexiconResearch.js';

// Synthetic geometry, not a claim about letters in a real corpus. Actual letters
// and replay admission are exercised separately in the native browser regression.
function fixture() {
  const S=35,start=5*S+10,term='אבגדה';
  const state={status:'ok',term,termRaw:term,scope:'torah',corpusLetters:2000,
    verification:{state:'MATCH',corpus_id:'fixture'},axis:{hitId:`35_1_${start}`,length:5},
    geometry:{S,c0:0,cw:35,r0:0,r1:34},ui:{zoom:1.6},findings:[]};
  const scan={ok:true,box:{S,c0:0,c1:34,r0:0,r1:34},origin:{term,corpus:'torah',corpusId:'fixture',start,skip:S,dir:1},items:[]};
  const add=(word,r,c,dr=1,dc=0)=>{
    const start=r*S+c,step=dr*S+dc;
    const item={term:word,label:word,start,skip:Math.abs(step),dir:Math.sign(step),hitId:`${Math.abs(step)}_${Math.sign(step)}_${start}`,
      positions:Array.from(word,(_,i)=>start+i*step),kind:Math.abs(step)===1?'source':'els',status:'CANDIDATE'};
    scan.items.push(item);return item;
  };
  return {state,scan,add};
}
test('one candidate pool exposes parallel, crossing, corridor and transversal groups without admission',()=>{
  const {state,scan,add}=fixture();
  add('חמששש',5,13);add('בתוכנ',5,11);add('אבגדוזחט',7,8,0,1);
  const before=JSON.stringify({state,scan}),out=groupElsLexiconDiscoveries(state,scan);
  assert.equal(out.ok,true);
  for(const type of ['parallel','intersection','corridor','transversal'])assert.ok(out.groups.some(g=>g.types.includes(type)),type);
  assert.ok(out.groups.some(g=>g.includesAxis));assert.equal(out.modelCalls,0);
  assert.equal(out.pairCount,6);assert.equal(JSON.stringify({state,scan}),before);
  for(const g of out.groups){assert.equal(g.status,'CANDIDATE');assert.equal(g.truthPromotion,false);assert.ok(g.items.every(i=>scan.items.includes(i)));}
  assert.equal(new Set(out.groups.map(g=>g.id)).size,out.groups.length,'multiple relation types reuse one group');
});
test('same-column continuation is not two separate parallels; no nested axis fragments inflate a group',()=>{
  const {state,scan,add}=fixture();add('חמששש',11,10);add('אבגדה',5,10);
  const out=groupElsLexiconDiscoveries(state,scan);
  assert.ok(out.groups.some(g=>g.types.includes('continuation')));
  assert.ok(!out.groups.some(g=>g.types.includes('parallel')));
  assert.ok(!out.groups.some(g=>g.items.some(i=>i.term==='אבגדה')));
});
test('a capped corridor keeps its defining axis and boundary, never silently drops the structure',()=>{
  const {state,scan,add}=fixture();
  state.term=state.termRaw='אבגדהוזחט';scan.origin.term=state.term;
  const boundary=add('חמששששששש',5,18);
  for(let c=11;c<18;c++){add('שלושש',5,c);add('בתוכנ',9,c);}
  const out=groupElsLexiconDiscoveries(state,scan);
  const corridor=out.groups.find(g=>g.types.includes('corridor')&&g.items.includes(boundary));
  assert.ok(corridor);assert.ok(corridor.includesAxis);assert.ok(corridor.membersTruncated);
  assert.ok(corridor.totalMembers>8);assert.equal(corridor.memberIds.length,8);
});
test('repeated words and compact clusters retain distinct occurrences, including reverse traversal',()=>{
  const {state,scan,add}=fixture();add('חמששש',5,13);add('חמששש',9,15,-1);add('שלושש',5,17);
  const out=groupElsLexiconDiscoveries(state,scan);
  assert.ok(out.groups.some(g=>g.types.includes('motif')&&g.items.length===2));
  assert.ok(out.groups.some(g=>g.types.includes('cluster')&&g.items.length===3));
  assert.ok(out.groups.some(g=>g.types.includes('parallel')&&g.items.some(i=>i.dir===-1)));
});
test('parallel direction alone is insufficient without overlap; long separation is not a compact group',()=>{
  const {state,scan,add}=fixture();add('חמששש',20,13);add('שלושש',5,30);
  const out=groupElsLexiconDiscoveries(state,scan);
  assert.equal(out.groups.length,0);
});
test('existing vector Golden: different raw skips remain one parallel family, even away from the axis',()=>{
  const state={status:'ok',term:'תורהקדשה',termRaw:'תורה קדשה',scope:'torah',corpusLetters:304805,
    verification:{state:'MATCH',corpus_id:'fixture-torah'},axis:{hitId:'10065_1_50890'},
    geometry:{S:10065,cw:41,c0:535,r0:2,r1:20},ui:{},findings:[]};
  const items=[['התורה',20132,-1,131400],['אמיתית',10066,-1,111271],['בריתאור',2,1,60935]].map(([term,skip,dir,start])=>
    ({term,label:term,skip,dir,start,hitId:`${skip}_${dir}_${start}`,positions:Array.from(term,(_,i)=>start+i*skip*dir),kind:'els'}));
  const scan={ok:true,origin:{term:state.term,corpus:'torah',corpusId:'fixture-torah',skip:10065,dir:1,start:50890},
    box:{S:10065,c0:535,c1:575,r0:2,r1:20},items};
  const out=groupElsLexiconDiscoveries(state,scan);
  assert.ok(out.groups.some(g=>g.types.includes('parallel')&&g.items.some(i=>i.term==='התורה')&&g.items.some(i=>i.term==='אמיתית')));
  assert.ok(out.groups.some(g=>g.types.includes('intersection')&&g.items.some(i=>i.term==='בריתאור')));
});
test('unknown corpus, stale origin and oversized candidates fail closed; invalid positions excluded',()=>{
  const {state,scan,add}=fixture();const item=add('חמששש',5,13);
  assert.equal(groupElsLexiconDiscoveries({...state,corpusLetters:undefined},scan).ok,false);
  assert.equal(groupElsLexiconDiscoveries(state,{...scan,origin:{...scan.origin,start:0}}).ok,false);
  assert.equal(groupElsLexiconDiscoveries(state,{...scan,items:Array(301).fill(item)}).ok,false);
  item.positions[1]++;
  const out=groupElsLexiconDiscoveries(state,scan);assert.equal(out.excluded,1);assert.equal(out.groups.length,0);
});
test('group admission uses one existing exact load, preserves selections/viewport and colors each new term',()=>{
  const {state,scan,add}=fixture(),a=add('חמששש',5,13),b=add('שלושש',5,15),source=add('מקורימ',6,4,0,1);
  state.findings=[{t:'קודמימ',color:'existing',hits:[{hitId:'35_1_1',selected:true,verified:true}],sourceHits:[]}];
  const before=JSON.stringify(state),load=prepareElsLexiconFindings(state,scan,[a,b,source],words=>`slot-${words.length}`);
  assert.ok(load);assert.equal(load.words.length,4);assert.equal(load.view.zoom,1.6);
  assert.deepEqual(load.words[0].sh,['35_1_1']);assert.equal(load.words[0].color,'existing');
  assert.equal(load.words[1].color,'slot-1');assert.equal(load.words[2].color,'slot-2');
  assert.deepEqual(load.words[3].sourceShown,[source.hitId]);assert.equal(JSON.stringify(state),before);
  assert.equal(prepareElsLexiconFindings(state,scan,[a,{...b}]),null,'foreign member rejected atomically');
  assert.equal(prepareElsLexiconFindings({...state,geometry:{...state.geometry,cw:34}},scan,[a,b]),null,'old window rejected');
  state.findings=Array.from({length:12},(_,i)=>({t:`קודמ${'א'.repeat(i+1)}`,hits:[],sourceHits:[]}));
  assert.equal(prepareElsLexiconFindings(state,scan,[a,b]),null,'no partial overwrite at finding cap');
});
test('bounds remain explicit in dense input and pure grouping stays bounded',()=>{
  const {state,scan,add}=fixture();
  for(let r=0;r<10;r++)for(let c=0;c<30;c++)add('חמששש',r,c>=10?c+1:c);
  const start=performance.now(),out=groupElsLexiconDiscoveries(state,scan);
  assert.ok(out.ok);assert.equal(out.candidates,300);assert.ok(out.groups.length<=240);
  assert.ok(out.groups.every(g=>g.memberIds.length<=8));
  assert.equal(out.truncated,out.totalGroups>240);
  for(const [type,count] of Object.entries(out.typeCounts))if(count>0)
    assert.ok(out.groups.some(g=>g.types.includes(type)),`${type} cannot disappear behind another family's display cap`);
  const proximityIndex=out.groups.findIndex(g=>g.types.every(t=>t==='cluster'));
  if(proximityIndex>=0)assert.ok(out.groups.slice(proximityIndex).every(g=>g.types.every(t=>t==='cluster')),'proximity-only clusters cannot bury exact relations');
  console.info(`dense grouping: ${Math.round(performance.now()-start)}ms, ${out.totalGroups} groups before display cap`);
});
