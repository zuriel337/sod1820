import test from 'node:test';
import assert from 'node:assert/strict';
import { runLifeJourneyResearch, lifeJourneyContext, lifeNumberContext, resolveLifePerson, projectLifeName } from '../src/lib/research/lifeJourneyResearch.js';
import { normalizeResearchContext } from '../src/lib/research/researchContext.js';
const ownerId='synthetic-owner';
const personRef=`person:${ownerId}:self`;
const familyRef=`person:${ownerId}:p:synthetic-relative`;
const members=[{source_ref:personRef,name:'אור שלום',meta:{first_name:'אור',surname:'שלום',birthdate_iso:'2000-01-01'}},{source_ref:familyRef,name:'טל בדיקה',meta:{}}];
const input={ownerId,personRef,members,userId:'synthetic-account'};
const name={graded:true,combo:{tracks:[{id:'literal',status:'ok',sample:{ref:'בראשית א:ג',text:'יהי אור'}}]},sources:[]};

test('all selected canonical engines run independently with exact inputs; booleans are not numeric results',async()=>{
 const calls=[];
 const client={functions:{invoke:async(fn,{body})=>{calls.push([fn,body]);return {data:{result:{contract:'els_search_page_v1',status:'EXECUTED_EMPTY',completion:{executed:true},hits:[]}}};}},rpc:async(fn,args)=>{calls.push([fn,args]);return {data:fn==='fn_name_research_graded'?name:fn==='fn_all_methods'?{רגיל:583,מהמאגר:false}:fn==='els_search_v1'?{status:'EXECUTED_EMPTY',results:[]}: {meeting_points:[]},error:null};}};
 const results=await runLifeJourneyResearch({...input,client,engines:['name','methods','date','family','els'],familyRefs:[familyRef]});
 for(const r of Object.values(results)) assert.equal(r.state,'ready');
 assert.deepEqual(results.methods.data.methods,[['רגיל',583]]);
 assert.deepEqual(calls.find(([fn])=>fn==='fn_name_research_graded')[1],{p_name:'אור',p_surname:'שלום',p_birthdate:null,p_question:null});
 assert.ok(calls.some(([fn,args])=>fn==='fn_cross_research'&&args.p_items.includes('טל בדיקה')));
 assert.equal(calls.find(([fn])=>fn==='els-search-bridge')[1].skip_max,40);
});
test('failure is not empty success or zero and does not discard another engine',async()=>{
 const client={rpc:async(fn)=>({data:fn==='fn_all_methods'?{רגיל:0}:null,error:null})};
 const results=await runLifeJourneyResearch({...input,client,engines:['name','methods']});
 assert.equal(results.name.state,'error');assert.equal(results.methods.state,'ready');assert.equal(results.methods.data.methods[0][1],0);
});
test('private refs and access must resolve before any call; deleted family fails closed',async()=>{
 let calls=0;const client={rpc:async()=>{calls++;return {data:{meeting_points:[]}};}};
 await assert.rejects(runLifeJourneyResearch({...input,userId:null,client,engines:['name']}));
 await assert.rejects(runLifeJourneyResearch({...input,personRef:'person:other:self',client,engines:['name']}));
 const result=await runLifeJourneyResearch({...input,client,engines:['family'],familyRefs:['person:synthetic-owner:p:deleted']});
 assert.equal(result.family.state,'error');assert.equal(calls,0);
 assert.equal(resolveLifePerson(members,'other',personRef),null);
});
test('missing date does not call cross engine and cannot become a zero finding',async()=>{
 let calls=0;const client={rpc:async()=>{calls++;return {data:{}};}};
 const result=await runLifeJourneyResearch({...input,personRef:familyRef,client,engines:['date']});
 assert.equal(result.date.state,'unavailable');assert.equal(calls,0);
});
test('aborted runs cannot publish late engine results',async()=>{
 const controller=new AbortController();let publish=0;let release;
 const pending=new Promise(resolve=>{release=resolve;});
 const run=runLifeJourneyResearch({...input,client:{rpc:()=>pending},engines:['name'],signal:controller.signal,onResult:()=>publish++});
 controller.abort();release({data:name});assert.deepEqual(await run,{});assert.equal(publish,0);
});
test('saved navigation and numeric return survive normalization without raw personal inputs or findings',()=>{
 const ctx=lifeJourneyContext({...input,engines:['name','date','els'],familyRefs:[familyRef,'person:other:p:x'],previous:{subject:{label:'private'},dimensions:{term:'SECRET'},returnTo:{label:'SECRET'}}});
 const number=normalizeResearchContext(lifeNumberContext(ctx,583));
 const serialized=JSON.stringify(number);
 for(const forbidden of ['אור','שלום','טל בדיקה','2000-01-01','SECRET']) assert.equal(serialized.includes(forbidden),false);
 assert.equal(number.returnTo.dimensions.lifePersonRef,personRef);
 assert.deepEqual(number.returnTo.dimensions.lifeFamilyRefs,[familyRef]);
 assert.equal(number.subject.href,'/2029/number/583');
});
test('normalization retains source groups and malformed name responses fail closed',()=>{
 assert.equal(projectLifeName(name).groups[0].tracks[0].sample.text,'יהי אור');
 assert.throws(()=>projectLifeName(null));assert.throws(()=>projectLifeName({}));
});

test('ELS gate denial and incomplete response fail closed without hiding other engines',async()=>{
 for(const response of [{error:{message:'gate_denied'},data:null},{data:{result:{contract:'els_search_page_v1',status:'OK',hits:[]}}}]){
  const client={functions:{invoke:async()=>response},rpc:async()=>({data:{רגיל:583}})};
  const results=await runLifeJourneyResearch({...input,client,engines:['els','methods']});
  assert.equal(results.els.state,'error');assert.equal(results.methods.state,'ready');
 }
});
