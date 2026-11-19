import test from 'node:test';
import assert from 'node:assert/strict';
import { elsStructureView, inspectElsStructures, restoreElsStructureInspection, structureInspectionKey, verifiedElsStructureCards } from '../src/lib/research/elsStructureInspection.js';

// Engine-state fixture using the existing vector-geometry Golden. This is adapter
// regression evidence, not a live backend verification claim.
const state=()=>({status:'ok',term:'תורהקדשה',termRaw:'תורה קדשה',scope:'torah',corpusLetters:304805,
 verification:{state:'MATCH',corpus_id:'fixture-torah'},axis:{hitId:'10065_1_50890',length:8},
 geometry:{S:10065,cw:41,c0:500,r0:2,r1:20},ui:{zoom:1.6,ctxR:1,showN:3},findings:[
  {t:'התורה',color:'#112233',shown:['20132_-1_131400'],hits:[{hitId:'20132_-1_131400',selected:true,verified:true}]},
  {t:'אמיתית',color:'#334455',shown:['10066_-1_111271'],hits:[{hitId:'10066_-1_111271',selected:true,verified:true}]},
  {t:'בריתאור',shown:['2_1_60935'],hits:[{hitId:'2_1_60935',selected:true,verified:true}]}
 ]});
test('selected canonical identities reuse scale-equivalent vector geometry and exact crossing',()=>{
 const s=state(),r=inspectElsStructures(s);assert.ok(r.ok);
 const relation=r.geometry.relations.find(x=>x.a.startsWith('התורה:')&&x.b.startsWith('אמיתית:'));
 assert.equal(relation.latticeOffset,3);assert.deepEqual(relation.primitiveVector,[1,1]);
 assert.equal(relation.support.count,3);assert.equal(relation.truthPromotion,false);
 assert.ok(r.geometry.intersections.some(x=>x.positions.includes(60941)));
 const key=structureInspectionKey(r);s.findings=[];s.ui.zoom=2;
 const restored=restoreElsStructureInspection(r);
 assert.equal(restored.view.zoom,1.6);assert.equal(restored.words.length,3);assert.equal(structureInspectionKey(r),key);
 assert.equal(r.modelCalls,0);assert.equal(r.lexiconLoaded,false);
});
test('unselected and unverified candidates cannot enter structural inspection',()=>{
 const s=state();s.findings[0].hits=[{selected:true,verified:false,hitId:'20132_-1_131400'},{selected:false,verified:true,hitId:'20132_-1_131400'}];
 assert.ok(!inspectElsStructures(s).lines.some(x=>x.term==='התורה'));
 s.verification.state='CANDIDATE';assert.equal(inspectElsStructures(s).ok,false);
});
test('same-column separated terms are reported as same line, source is distinct, invalid identities excluded',()=>{
 const s=state();s.findings=[{t:'אמת',shown:[],hits:[{selected:true,verified:true,hitId:'10065_1_201865'}],sourceHits:[{selected:true,hitId:'1_1_50890'}]},
 {t:'חסד',shown:[],hits:[{selected:true,verified:true,hitId:'10065_1_252190'},{selected:true,verified:true,hitId:'10065_-1_0'}]}];
 const r=inspectElsStructures(s);assert.ok(r.ok);assert.equal(r.excluded,1);
 assert.equal(r.lines.filter(x=>x.kind==='source').length,1);
 assert.ok(r.geometry.relations.some(x=>x.a==='אמת:10065_1_201865'&&x.b==='חסד:10065_1_252190'&&x.latticeOffset===0&&x.support.count===0));
 assert.equal(restoreElsStructureInspection(r).words[0].sourceShown[0],'1_1_50890');
});
test('inspection caps fail closed and comparison identity includes corpus and window',()=>{
 const s=state(),r=inspectElsStructures(s);
 s.geometry.cw=39;assert.notEqual(structureInspectionKey(r),structureInspectionKey(inspectElsStructures(s)));
 s.verification.corpus_id='another';assert.notEqual(structureInspectionKey(r),structureInspectionKey(inspectElsStructures(s)));
 s.findings=[{t:'אמת',shown:[],hits:Array.from({length:64},(_,i)=>({hitId:`2_1_${i*8}`,selected:true,verified:true}))}];
 assert.equal(inspectElsStructures(s).ok,false);
});

test('a relationship view places distant verified parallels on shared rows',()=>{
 const s=state();
 s.term='התשפז';s.axis={hitId:'16965_1_83718'};
 s.geometry={S:16965,cw:80,c0:15818,r0:0,r1:17};
 s.findings=[{t:'ימיננג',hits:[{selected:true,verified:true,hitId:'16965_-1_109170'}]}];
 const cards=verifiedElsStructureCards(inspectElsStructures(s));
 assert.equal(cards.length,1);
 assert.match(cards[0].reasons[0],/16,965.*כיוונים הפוכים.*8,478/);
 const view=elsStructureView(cards[0],16965,s.corpusLetters);
 assert.deepEqual(view.bands,['16965_1_83718','16965_-1_109170']);
 assert.equal(view.rowStart,0);assert.equal(view.colCount,5);
});

test('relationship evidence shows exact common cells and the text between disjoint occurrences',()=>{
 const s=state(),cards=verifiedElsStructureCards(inspectElsStructures(s));
 const crossing=cards.find(card=>card.types.includes('intersection'));
 const shared=elsStructureView(crossing,s.geometry.S,s.corpusLetters);
 assert.deepEqual(shared.shared,[60941]);assert.equal(shared.bands.length,1);
 s.findings=[{t:'אמת',hits:[{selected:true,verified:true,hitId:'10065_1_201865'}]},
   {t:'חסד',hits:[{selected:true,verified:true,hitId:'10065_1_252190'}]}];
 const same=verifiedElsStructureCards(inspectElsStructures(s)).find(card=>card.members.every(line=>line.kind!=='axis'));
 const line=elsStructureView(same,s.geometry.S,s.corpusLetters);
 assert.deepEqual(line.between,[232060,242125]);assert.equal(line.bands.length,1);
});
