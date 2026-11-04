import test from 'node:test';
import assert from 'node:assert/strict';
import { buildElsMatrixShareUrl, readElsMatrixShare } from '../src/lib/elsMatrixShare.js';
const state = () => ({status:'ok',term:'תורה',termRaw:'תורה',scope:'torah',verification:{state:'MATCH',corpus_id:'fixture'},
 axis:{hitId:'50_-1_205',start:205,skip:50,length:4},geometry:{cw:40},
 ui:{ctxR:1,windowSize:'small',windowRequested:'small',zoom:1.6,fit:false,heat:true,niqqud:true,hideMain:true,showN:3,findingRadius:8},
 findings:[{t:'אמת',color:'#112233',shown:['49_1_25'],sourceHits:[{selected:true,hitId:'1_1_50'}]}],
 id:'PRIVATE_ID',slug:'PRIVATE_SLUG',description:'PRIVATE_DESCRIPTION',matrix:{rows:['PRIVATE_GRID']},chat:'PRIVATE_CHAT'});
const encode = value => '#els-matrix=' + Buffer.from(JSON.stringify(value)).toString('base64url');
const unpack = url => JSON.parse(Buffer.from(new URL(url).hash.split('=')[1], 'base64url').toString());

test('portable link preserves exact backward occurrence, selected findings/source and presentation',()=>{
 const url = new URL(buildElsMatrixShareUrl(state(),'https://preview.example'));
 assert.equal(url.pathname,'/code');assert.equal(url.search,'?mode=classic');
 const {present,loadItem}=readElsMatrixShare(url.hash);
 assert.equal(present,true);assert.equal(loadItem.hitId,'50_-1_205');assert.equal(loadItem.start,205);assert.equal(loadItem.dir,-1);
 assert.deepEqual(loadItem.words,[{t:'אמת',color:'#112233',sh:['49_1_25'],sourceShown:['1_1_50']}]);
 assert.equal(loadItem.view.zoom,1.6);assert.equal(loadItem.view.heat,true);assert.equal(loadItem.hideMain,true);
 assert.equal(loadItem.corpusId,'fixture');assert.equal(loadItem.searchWindow.windowColumns,40);
 assert.doesNotMatch(JSON.stringify(unpack(url)),/PRIVATE_|verification|MATCH|chat/);
});
test('both corpora; no private metadata or unselected candidate; no implied verification',()=>{
 const current=state();current.scope='tanakh';current.findings[0].hits=[
  {hitId:'49_1_25',selected:true,verified:true},{hitId:'48_1_29',selected:true,verified:false}];
 current.findings.push({t:'PRIVATE_UNSELECTED',color:'#112233',shown:[],hits:[],sourceHits:[]});
 const {loadItem}=readElsMatrixShare(new URL(buildElsMatrixShareUrl(current,'https://example.test')).hash);
 assert.equal(loadItem.scope,'tanakh');assert.deepEqual(loadItem.words[0].sh,['49_1_25']);assert.equal(loadItem.verification,undefined);
 assert.equal(loadItem.words.length,1);
});
test('reject unverified, malformed and oversized inputs without truncating selections',()=>{
 assert.equal(buildElsMatrixShareUrl({...state(),verification:{state:'CANDIDATE'}},'https://example.test'),null);
 for(const hitId of ['50_0_205','50_1_-1','0_1_205','1_1_205','50.5_1_205']){
  assert.equal(buildElsMatrixShareUrl({...state(),axis:{hitId}},'https://example.test'),null);
 }
 const current=state();current.findings[0].shown=Array(4096).fill('10001_1_100000');
 assert.equal(buildElsMatrixShareUrl(current,'https://example.test'),null);
 assert.equal(buildElsMatrixShareUrl(state(),'javascript:alert(1)'),null);
});
test('foreign fragments ignored; malformed share fails closed',()=>{
 assert.deepEqual(readElsMatrixShare('#other'),{present:false,loadItem:null});
 for(const hash of ['#els-matrix=','#els-matrix=bad%','#els-matrix='+ 'a'.repeat(17000),encode({v:2}),encode(null)]){
  assert.deepEqual(readElsMatrixShare(hash),{present:true,loadItem:null});
 }
});
test('recipient whitelist discards injected commands, paths, record identity and trust flags',()=>{
 const payload=unpack(buildElsMatrixShareUrl(state(),'https://example.test'));
 Object.assign(payload,{researchCommand:true,verification:{state:'MATCH'},slug:'PRIVATE',postUrl:'https://other.test',__proto__:null});
 payload.view.script='bad';payload.findings[0].candidate=true;
 const result=readElsMatrixShare(encode(payload));
 assert.ok(result.loadItem);assert.doesNotMatch(JSON.stringify(result),/researchCommand|verification|PRIVATE|other.test|script|candidate/);
 for(const change of [{scope:'other'},{corpusId:''},{findings:[{t:'אמת',color:'url(bad)',shown:[],sourceShown:[]}]}]){
  assert.equal(readElsMatrixShare(encode({...payload,...change})).loadItem,null);
 }
});
test('new selection produces different link and never mutates the captured old one',()=>{
 const current=state(),a=buildElsMatrixShareUrl(current,'https://example.test');
 current.axis.hitId='50_1_5';current.findings=[];
 const b=buildElsMatrixShareUrl(current,'https://example.test');
 assert.notEqual(a,b);assert.equal(readElsMatrixShare(new URL(a).hash).loadItem.hitId,'50_-1_205');
 assert.equal(readElsMatrixShare(new URL(b).hash).loadItem.hitId,'50_1_5');
});
