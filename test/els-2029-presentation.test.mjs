import test from 'node:test';
import assert from 'node:assert/strict';
import { projectVerseWords, projectPresentation } from '../src/components/experience2029/elsPresentation2029.js';

test('verse words use canonical inclusive positions, niqqud and maqaf without filling mismatches', () => {
 const verse=projectVerseWords({from:10,to:19,text:'בְּרֵאשִׁית־בָּרָא א',ref:'מקור'});
 assert.deepEqual([...verse.parity.values()],[0,0,0,0,0,0,1,1,1,0]);
 assert.deepEqual([...verse.parity.keys()],[10,11,12,13,14,15,16,17,18,19]);
 assert.equal(projectVerseWords({from:10,to:20,text:'בראשית ברא א'}),null);
 assert.equal(projectVerseWords({from:null,to:3,text:'ברא'}),null);
});

test('presenter preserves first reveal at overlapping cells and excludes hidden/unverified hits', () => {
 const state={status:'ok',verification:{state:'MATCH'},scope:'torah',term:'אב',axis:{hitId:'2_1_10'},matrix:{marks:[{i:10,type:'main'},{i:12,type:'main'}]},findings:[
  {t:'גד',hits:[{hitId:'1_1_12',shown:true,verified:true}]},
  {t:'הו',hits:[{hitId:'1_1_30',shown:false,verified:true},{hitId:'1_1_40',shown:true,verified:false}]},
 ]};
 const p=projectPresentation(state);
 assert.deepEqual(p.steps.map(s=>s.label),['אב','גד']);
 assert.equal(p.earliest.get(12),0);assert.equal(p.earliest.get(13),1);
 assert.equal(p.earliest.has(30),false);assert.equal(p.earliest.has(40),false);
 assert.equal(projectPresentation({...state,verification:{state:'PENDING'}}).steps.length,0);
});
