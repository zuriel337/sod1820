import test from 'node:test';import assert from 'node:assert/strict';
import {runLifeJourneyReflection,boundLifeReflectionFacts} from '../src/lib/research/lifeJourneyReflection.js';
import {lifeEventWriteRequest,saveLifeEventObservation,listLifeJourneyPaths,researchLifeEventDate} from '../src/lib/research/lifeJourneyContinuity.js';
const ownerId='11111111-1111-4111-8111-111111111111',personRef=`person:${ownerId}:self`,userId='synthetic-user';
const members=[{source_ref:personRef,name:'דוד משפחהפרטית',meta:{first_name:'דוד',surname:'משפחהפרטית',birthdate_iso:'2000-01-01'}}];
const tracks=[{id:'combo_gem',status:'ok',value:14,words:['יד','דוד']}];
const cards={tarot:{cards:['המצב','האתגר','העצה'].map((position,i)=>({position,n:i+1,arcana:'קלף בדיקה'}))}};
function fixture(){const calls=[];const client={rpc:async(fn,args)=>{calls.push([fn,args]);return {data:fn==='fn_person_life_input_v1'?{ok:true,person:{ref:personRef,first:'דוד',name:'דוד משפחהפרטית',surname:'משפחהפרטית'}}:fn==='fn_tarot_sos'?cards:{tracks}};},functions:{invoke:async(fn,{body})=>{calls.push([fn,body]);return {data:{reflection_interpretation:{message:'מסר פרשני לבדיקה',motifs:[]}}};}}};return {client,calls};}
const input={ownerId,userId,personRef,consent:true};
test('reflection uses first name only, gated AI and three cards; no content logger or personal fields',async()=>{
 const {client,calls}=fixture();const out=await runLifeJourneyReflection({...input,client});
 assert.equal(out.status,'ok');assert.equal(out.payload.messageReflection.cards.length,3);
 assert.deepEqual(calls.map(c=>c[0]),['fn_person_life_input_v1','fn_name_research_graded','ai-analyze','fn_tarot_sos']);
 const ai=calls.find(c=>c[0]==='ai-analyze')[1];assert.equal(ai.subject,'דוד');assert.ok(ai.facts.length<2000);
 assert.equal(JSON.stringify(ai).includes('משפחהפרטית'),false);assert.equal(JSON.stringify(ai).includes('2000-01-01'),false);assert.equal(JSON.stringify(ai).includes(ownerId),false);
 assert.deepEqual(calls[1][1],{p_name:'דוד',p_surname:null,p_birthdate:null,p_question:null});
});
test('missing consent or principal makes zero calls; non-self reflection does not invoke AI',async()=>{
 const {client,calls}=fixture();await assert.rejects(runLifeJourneyReflection({...input,client,consent:false}));await assert.rejects(runLifeJourneyReflection({...input,client,userId:null}));assert.equal(calls.length,0);
 await assert.rejects(runLifeJourneyReflection({...input,client,personRef:`person:${ownerId}:p:relative`}));assert.equal(calls.filter(c=>c[0]==='ai-analyze').length,0);
});
test('cancel or changed principal after AI cannot draw cards or publish reflection',async()=>{
 const {client,calls}=fixture();const controller=new AbortController();
 client.functions.invoke=async()=>{controller.abort();return {data:{reflection_interpretation:{message:'late'}}};};
 await assert.rejects(runLifeJourneyReflection({...input,client,signal:controller.signal}));assert.equal(calls.some(c=>c[0]==='fn_tarot_sos'),false);
});
test('quota/malformed AI fails before Tarot; evidence text ends only at complete lines',async()=>{
 const {client,calls}=fixture();client.functions.invoke=async()=>({data:{error:'quota'}});
 await assert.rejects(runLifeJourneyReflection({...input,client}));assert.equal(calls.some(c=>c[0]==='fn_tarot_sos'),false);
 const lines='heading\n- [id1] evidence\n- [id2] '+ 'x'.repeat(2000);
 assert.equal(boundLifeReflectionFacts(lines),'heading\n- [id1] evidence');assert.throws(()=>boundLifeReflectionFacts('heading'));
});
const draft={ownerId,eventId:'33333333-3333-4333-8333-333333333333',requestId:'44444444-4444-4444-8444-444444444444',title:'אירוע',occurredOn:'2000-01-01',personRef,notes:'פרטי'};
test('event draft whitelists inputs; revisions and retry receipts are preserved',async()=>{
 const req=lifeEventWriteRequest({...draft,privacy_scope:'public',engine_verified:true});assert.equal(req.privacy_scope,undefined);assert.equal(req.p_expected_revision,0);
 assert.throws(()=>lifeEventWriteRequest({...draft,occurredOn:'not-a-date'}));
 const out=await saveLifeEventObservation({rpc:async()=>({data:{ok:false,error:'revision_conflict',revision:3}})},draft);assert.equal(out.revision,3);
});
test('path reader trims sentinel and uses last visible item for continuation',async()=>{
 const out=await listLifeJourneyPaths({rpc:async()=>({data:{ok:true,page_size:1,has_more:true,items:[{path_id:'a',updated_at:'one'},{path_id:'b',updated_at:'two'}]}})},{ownerId});
 assert.equal(out.items.length,1);assert.deepEqual(out.next,{id:'a',at:'one'});
});
test('event research requires explicit analysis and exact selected revision; preserves input snapshot',async()=>{
 const calls=[];const item={event_id:draft.eventId,record_id:'record',revision:2,input:{title:'אירוע',occurred_on:'2001-01-01',person_ref:personRef,notes:'לא ל-AI'}};
 const client={rpc:async(fn,args)=>{calls.push([fn,args]);return {data:fn==='fn_person_life_events_v1'?{ok:true,page_size:1,items:[item]}:fn==='fn_person_life_input_v1'?{ok:true,person:{ref:personRef,first:'דוד',name:'דוד משפחהפרטית',surname:'משפחהפרטית'}}:{meeting_points:[]}};}};
 const args={client,userId,ownerId,eventId:draft.eventId,expectedRevision:2,consent:true};
 await assert.rejects(researchLifeEventDate({...args,consent:false}));assert.equal(calls.length,0);
 await assert.rejects(researchLifeEventDate({...args,expectedRevision:1}),/revision_changed/);
 const result=await researchLifeEventDate(args);assert.equal(result.state,'ready');assert.equal(result.source.revision,2);assert.equal(result.inputSnapshot.event.occurred_on,'2001-01-01');
 assert.equal(calls.some(([fn])=>fn==='ai-analyze'),false);
});

test('ineligible server input stops every reflection engine and AI call',async()=>{
 const {client,calls}=fixture();client.rpc=async(fn)=>{calls.push([fn]);return {error:{message:'LIFE_PERSON_UNAVAILABLE'}};};
 await assert.rejects(runLifeJourneyReflection({...input,client}));assert.deepEqual(calls.map(c=>c[0]),['fn_person_life_input_v1']);
});
test('a cancelled event write does not start a request',async()=>{
 let calls=0;const controller=new AbortController();controller.abort();
 await assert.rejects(saveLifeEventObservation({rpc:async()=>{calls++;return {data:{ok:true}};}},draft,controller.signal));assert.equal(calls,0);
});
