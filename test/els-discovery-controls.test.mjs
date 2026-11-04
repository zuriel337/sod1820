import test from 'node:test';
import assert from 'node:assert/strict';
import {filterElsForwardSource, expandElsLexiconPlan, ELS_LEXICON_PRESETS, prepareElsLexiconFindings} from '../src/lib/research/elsLexiconResearch.js';
import {groupElsLexiconDiscoveries} from '../src/lib/research/elsStructureInspection.js';

test('source filter hides only forward unit step, never reversals or ELS',()=>{
  const rows=[{skip:1,dir:1},{skip:1,dir:-1},{skip:2,dir:1},{skip:35,dir:-1}];
  assert.deepEqual(filterElsForwardSource(rows,true),rows.slice(1));
  assert.deepEqual(filterElsForwardSource(rows,false),rows);assert.equal(rows.length,4);
});
test('explicit expansion preserves plan and stops at declared maximum',()=>{
  const first={...ELS_LEXICON_PRESETS.quick};
  const next=expandElsLexiconPlan(first);assert.equal(next.maxDistance,30);
  assert.equal(first.maxDistance,12);assert.equal(next.minLength,4);
  assert.equal(expandElsLexiconPlan({...first,maxDistance:120}),null);
});
test('filter precedes groups: removing an actual shared source removes its relationship without mutating results',()=>{
  const S=35,start=185,term='אבגדה',state={status:'ok',term,termRaw:term,scope:'torah',corpusLetters:2000,
    verification:{state:'MATCH',corpus_id:'fixture'},axis:{hitId:`35_1_${start}`},geometry:{S,c0:0,cw:35,r0:0,r1:34},ui:{},findings:[]};
  const source={term:'חמששש',skip:1,dir:1,start:183,hitId:'1_1_183',positions:[183,184,185,186,187],kind:'source'};
  const scan={ok:true,origin:{term,corpus:'torah',corpusId:'fixture',skip:35,dir:1,start},box:{S,c0:0,c1:34,r0:0,r1:34},items:[source]};
  assert.ok(groupElsLexiconDiscoveries(state,scan).groups.some(g=>g.types.includes('intersection')));
  assert.equal(groupElsLexiconDiscoveries(state,{...scan,items:filterElsForwardSource(scan.items,true)}).groups.length,0);
  assert.equal(scan.items.length,1);assert.ok(prepareElsLexiconFindings(state,scan,[source]));
  const backwards={...source,term:'שששמח',start:187,dir:-1,hitId:'1_-1_187',positions:[187,186,185,184,183]};
  const reverseScan={...scan,items:[backwards]};
  assert.ok(groupElsLexiconDiscoveries(state,{...reverseScan,items:filterElsForwardSource(reverseScan.items,true)}).groups.length);
  assert.ok(prepareElsLexiconFindings(state,reverseScan,[backwards]));
});
test('minimum group size is real, not a label over pairs',()=>{
  const S=35,start=185,term='אבגדה',state={status:'ok',term,termRaw:term,scope:'torah',corpusLetters:2000,
    verification:{state:'MATCH',corpus_id:'fixture'},axis:{hitId:`35_1_${start}`},geometry:{S,c0:0,cw:35,r0:0,r1:34},ui:{},findings:[]};
  const items=[188,190].map((start,i)=>({term:i?'שלושש':'חמששש',skip:S,dir:1,start,hitId:`35_1_${start}`,positions:Array.from({length:5},(_,j)=>start+j*S),kind:'els'}));
  const scan={ok:true,origin:{term,corpus:'torah',corpusId:'fixture',skip:S,dir:1,start},box:{S,c0:0,c1:34,r0:0,r1:34},items};
  const groups=groupElsLexiconDiscoveries(state,scan,{minMembers:3}).groups;
  assert.ok(groups.length);assert.ok(groups.every(g=>g.totalMembers>=3));
  assert.ok(groups.some(g=>g.types.includes('parallel')&&g.includesAxis&&g.items.length===2));
  assert.equal(groupElsLexiconDiscoveries(state,scan,{minMembers:4}).groups.length,0);
});
