import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
import { createRazielInterview, interviewContext } from "../supabase/functions/_shared/razielInterview.js";
import { numberResearcherHandler as handler } from "./helpers/number-researcher-handler.mjs";
import { fixture, UID, OTHER_UID, TOKEN, SERVICE, ANON, SOURCE, Q1, Q2, OLD, CORRECTED, correction } from "./fixtures/raziel-interview-787.mjs";

const req = (token = TOKEN) => new Request("https://fixture.invalid/number-researcher", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
const api = f => createRazielInterview({ supabaseUrl: "https://fixture.invalid", serviceKey: SERVICE, anonKey: ANON, fetchImpl: f.fetchImpl });
const writes = f => f.calls.filter(c => ["research_artifact_save", "admin_research_review", "fn_research_path_append_v1"].includes(c.name));
const privateReads = f => f.calls.filter(c => ["research_objects", "fn_raziel_context", "agent_user_memory"].includes(c.name));
async function start(f, a = api(f)) {
  const result = await a.handle(req(), { action: "start", source_ref: SOURCE, question_ids: [Q1,Q2], request_id: randomUUID() });
  assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(result.next_question.id,Q1); return result;
}
const payload = (state, extra = {}) => ({ action: "correct", path_id: state.path_id, expected_revision_no: state.revision_no,
  question_id: Q1, ...correction, request_id: randomUUID(), ...extra });
async function initial(f, a = api(f)) {
  const state = await start(f,a);
  const result = await a.handle(req(),payload(state,{ interpretation: OLD, reason: "בדיקת המצב הקודם במוק", scope: "מקור הפיילוט בלבד", exceptions: [] }));
  assert.equal(result.ok,true,JSON.stringify(result)); return result;
}
test("actual endpoint: correction -> subsequent mocked synthesis -> fresh-session next question",async()=>{
  const f=fixture(), invoke=handler(f,false);
  const started=await invoke({op:"interview",action:"start",source_ref:SOURCE,question_ids:[Q1,Q2],request_id:randomUUID()});
  assert.equal(started.status,200); assert.equal(f.models.length,0);
  const before=await invoke({op:"interview",...payload(started.body,{interpretation:OLD,reason:"מצב קודם במוק",scope:"סיפור המטוס",exceptions:[]})});
  assert.equal(before.body.ok,true);
  const beforeDecision=before.body.last_decision.id;
  const body=payload(before.body);
  const after=await invoke({op:"interview",...body, actor:OTHER_UID, role:"admin",meta:{governance:{approved_by:OTHER_UID}}});
  assert.equal(after.body.ok,true,JSON.stringify(after.body));
  assert.equal(after.body.last_decision.interpretation,CORRECTED);
  assert.equal(after.body.last_decision.approved_by,UID);
  assert.equal(after.body.last_decision.predecessor_id,beforeDecision);
  assert.equal(f.objects.get(beforeDecision).status,"rejected");
  assert.equal(f.objects.get(beforeDecision).statement,OLD,"old interpretation preserved");
  assert.equal(f.objects.get(after.body.last_decision.id).kind,"hypothesis");
  assert.equal(f.objects.get(after.body.last_decision.id).privacy_scope,"private");
  assert.equal(f.models.length,0,"human save operations never use a model");
  const answer=await handler(f)({values:[787],message:"מה השתנה אחרי התיקון?",interview_path_id:after.body.path_id});
  assert.equal(answer.status,200); assert.equal(answer.body.degraded,false,JSON.stringify(answer.body));
  assert.ok(answer.body.answer.includes(CORRECTED));
  assert.equal(f.models.length,1);
  const prompt=f.models[0].messages[0].content;
  const pack=JSON.parse(prompt.match(/== ראיון מקור-קשור · פירוש אדם מיוחס, לא עובדה\/קנון ==\n([^\n]+)/)[1]);
  assert.equal(pack.decisions.length,1); assert.equal(pack.decisions[0].id,after.body.last_decision.id);
  assert.equal(pack.decisions[0].reason,correction.reason); assert.equal(pack.decisions[0].scope,correction.scope);
  assert.deepEqual(pack.decisions[0].exceptions,correction.exceptions); assert.equal(pack.decisions[0].source_ref,SOURCE);
  assert.equal(pack.decisions[0].canonical,false); assert.ok(!JSON.stringify(pack).includes(OLD));
  assert.equal(answer.body.context_snapshot.interview.next_question_ref,Q2);
  const fresh=await handler(f,false)({op:"interview",action:"load"});
  assert.equal(fresh.body.last_decision.id,after.body.last_decision.id);
  assert.equal(fresh.body.next_question.id,Q2);
  assert.deepEqual(fresh.body.progress,{basis:"SELECTED_QUESTIONS_ONLY_NOT_CORPUS_COVERAGE",selected:2,resolved:1,remaining:1});
  assert.equal(f.models.length,1,"resume needs no model or corpus scan");
  const w=writes(f);
  assert.ok(w.every(c=>c.token===TOKEN),"writes retain verified caller JWT");
  const ordered=w.slice(w.findIndex(c=>c.body?.p_statement===CORRECTED)).map(c=>`${c.name}:${c.body?.p_decision||""}`);
  assert.deepEqual(ordered,["research_artifact_save:","admin_research_review:reject","admin_research_review:approve","fn_research_path_append_v1:"]);
});

for(const token of ["",ANON,SERVICE,"forged-token","synthetic-user-token","synthetic-anonymous-token"]) {
  test(`anonymous/forged/non-admin denied before personal read or write (${token||"no bearer"})`,async()=>{
    const f=fixture(); const result=await handler(f,false)({op:"interview",action:"start",source_ref:SOURCE,question_ids:[Q1],request_id:randomUUID(),user_ref:UID,role:"admin",actor:UID},token);
    assert.equal(result.body.ok,false); assert.ok([401,403].includes(result.status));
    assert.equal(privateReads(f).length,0);assert.equal(writes(f).length,0);assert.equal(f.models.length,0);
  });
}
test("another admin cannot resume another user's private Path or inject it into a model",async()=>{
  const f=fixture(),state=await initial(f); f.calls.length=0;
  const result=await handler(f)({values:[787],message:"resume",interview_path_id:state.path_id,user_ref:UID},"synthetic-other-admin-token");
  assert.equal(result.status,404);assert.equal(f.models.length,0);assert.equal(privateReads(f).length,0);
  assert.ok(f.calls.some(c=>c.name==="fn_research_path_resume_v1"&&c.token==="synthetic-other-admin-token"));
  const resume=await handler(f,false)({op:"interview",action:"load",path_id:state.path_id},"synthetic-other-admin-token");
  assert.equal(resume.status,404);assert.equal(resume.body.ok,false);
});
test("stale expected revision fails before artifact/review mutation",async()=>{
  const f=fixture(),state=await initial(f);f.calls.length=0;
  const result=await api(f).handle(req(),payload(state,{expected_revision_no:0}));
  assert.equal(result.error,"revision_conflict");assert.equal(writes(f).length,0);
});
test("same claim UID cannot reject/reapprove its predecessor",async()=>{
  const f=fixture(),state=await initial(f);f.calls.length=0;
  const result=await api(f).handle(req(),payload(state,{interpretation:OLD.replace(/\./g,"!")}));
  assert.equal(result.error,"artifact_identity_conflict");
  assert.equal(f.objects.get(state.last_decision.id).status,"approved");
  assert.equal(writes(f).filter(c=>c.name==="admin_research_review").length,0);
});
test("deduplicated different row with mismatched provenance is not adopted",async()=>{
  const f=fixture(),state=await initial(f);
  const row={...structuredClone(f.objects.get(state.last_decision.id)),id:randomUUID(),statement:CORRECTED};f.objects.set(row.id,row);f.calls.length=0;
  const result=await api(f).handle(req(),payload(state));
  assert.equal(result.error,"artifact_identity_conflict");assert.equal(writes(f).filter(c=>c.name==="admin_research_review").length,0);
});
test("request replay is idempotent; changed payload with reused request id is rejected",async()=>{
  const f=fixture(),a=api(f),state=await initial(f,a),body=payload(state);
  const after=await a.handle(req(),body);assert.equal(after.ok,true,JSON.stringify(after));const count=writes(f).length;
  const replay=await api(f).handle(req(),body);assert.equal(replay.ok,true);assert.equal(replay.idempotent_replay,true);assert.equal(writes(f).length,count);
  const changed=await a.handle(req(),{...body,reason:"different reason"});assert.equal(changed.error,"request_key_reused");assert.equal(writes(f).length,count);
});
test("latest decision follows Path order; completing selected questions is not corpus completion",async()=>{
  const f=fixture(),a=api(f),state=await initial(f,a);
  const second=await a.handle(req(),payload(state,{question_id:Q2,interpretation:"דוגמת נגד מדומה: התאמה ללא סיפור הודיה אינה מעידה על אירוע."}));
  assert.equal(second.ok,true);assert.equal(second.next_question,null);assert.equal(second.completion,"selected_questions_complete");
  const revised=await a.handle(req(),payload(second));assert.equal(revised.ok,true,JSON.stringify(revised));
  assert.equal(revised.last_decision.question_id,Q1);assert.equal(revised.last_decision.interpretation,CORRECTED);
  assert.equal(revised.progress.selected,2);assert.equal(revised.progress.resolved,2);
});
test("malformed attribution and cross-domain approval cannot be consumed as interview learning",async()=>{
  const f=fixture(),state=await initial(f),row=f.objects.get(state.last_decision.id);
  row.meta.ext.raziel_interview.domain="unrelated_domain";
  const other=await api(f).handle(req(),{action:"load",path_id:state.path_id});assert.equal(other.decisions.length,0);assert.equal(other.next_question.id,Q1);
  row.meta.ext.raziel_interview.domain="source_interpretation";row.meta.governance.approved_by=OTHER_UID;
  const forged=await api(f).handle(req(),{action:"load",path_id:state.path_id});assert.equal(forged.ok,false);assert.equal(forged.error,"decision_actor_mismatch");
});

for(const point of ["artifact","predecessor_review","approval","checkpoint"]) {
  test(`partial failure at ${point}: no success/advance; safe retry completes`,async()=>{
    const f=fixture(),a=api(f),state=await initial(f,a),body=payload(state);
    if(point==="artifact")f.failOnce("research_artifact_save");
    if(point==="predecessor_review")f.failOnce("admin_research_review",b=>b.p_decision==="reject");
    if(point==="approval")f.failOnce("admin_research_review",b=>b.p_decision==="approve");
    if(point==="checkpoint")f.failOnce("fn_research_path_append_v1");
    const failure=await a.handle(req(),body);assert.equal(failure.ok,false);assert.equal(failure.stage,point);assert.equal(failure.saved,false);assert.equal(failure.partial_write_possible,true);assert.equal(failure.next_question,null);
    assert.equal(f.paths.get(state.path_id).latest.revision_no,state.revision_no);
    const fresh=await api(f).handle(req(),{action:"load",path_id:state.path_id});
    if(point!=="artifact") { assert.equal(fresh.decisions.length,0);assert.equal(fresh.next_question.id,Q1,"partial replacement reopens affected question"); }
    const after=await api(f).handle(req(),body);assert.equal(after.ok,true,JSON.stringify(after));assert.equal(after.next_question.id,Q2);
    assert.equal(after.last_decision.interpretation,CORRECTED);assert.equal(after.revision_no,state.revision_no+1);
  });
}
for(const action of ["reject","approve"]) {
  test(`HTTP200 ok:true without actual ${action} cannot fabricate success`,async()=>{
    const f=fixture(),state=await initial(f); f.failOnce("admin_research_review",b=>b.p_decision===action,{ok:true,status:action==="reject"?"rejected":"approved"});
    const result=await api(f).handle(req(),payload(state));assert.equal(result.ok,false);
    assert.equal(result.error,action==="reject"?"predecessor_review_unconfirmed":"approval_unconfirmed");
    assert.equal(f.paths.get(state.path_id).latest.revision_no,state.revision_no);
  });
}
test("two concurrent distinct replacements: one checkpoint wins, loser stays inert",async()=>{
  const f=fixture(),a=api(f),state=await initial(f,a);let arrived=0,release;
  const barrier=new Promise(resolve=>{release=resolve;});
  f.beforeReview=async body=>{if(body.p_decision==="reject"&&body.p_id===state.last_decision.id){arrived++;if(arrived===2)release();await barrier;}};
  const results=await Promise.all([a.handle(req(),payload(state)),a.handle(req(),payload(state,{interpretation:CORRECTED+" גרסה מתחרה במוק."}))]);
  assert.equal(results.filter(r=>r.ok).length,1,JSON.stringify(results));assert.equal(results.filter(r=>!r.ok).length,1);
  const hypotheses=[...f.objects.values()].filter(r=>r.kind==="hypothesis");
  assert.equal(hypotheses.filter(r=>r.status==="approved").length,1);assert.equal(hypotheses.filter(r=>r.status==="candidate").length,1);
  assert.equal(f.paths.get(state.path_id).latest.revision_no,state.revision_no+1);
});
for(const change of ["rejected","superseded","missing","pending_successor"]) {
  test(`fresh session does not consume ${change} interpretation`,async()=>{
    const f=fixture(),state=await initial(f),row=f.objects.get(state.last_decision.id);
    if(change==="rejected")row.status="rejected";
    if(change==="superseded")row.meta.ext.revision={superseded_by:randomUUID()};
    if(change==="missing")f.objects.delete(row.id);
    if(change==="pending_successor") {const successor={...structuredClone(row),id:randomUUID(),status:"candidate"};successor.meta.ext.raziel_interview.predecessor_id=row.id;f.objects.set(successor.id,successor);}
    const loaded=await api(f).handle(req(),{action:"load",path_id:state.path_id});
    assert.equal(loaded.ok,true,JSON.stringify(loaded));assert.equal(loaded.decisions.length,0);assert.equal(loaded.next_question.id,Q1);
    assert.ok(!interviewContext(loaded).includes(OLD));
  });
}
test("non-pilot/private Person references in edited Path cannot widen service reads",async()=>{
  const f=fixture(),state=await start(f),secretId=randomUUID();
  f.objects.set(secretId,{id:secretId,kind:"fact",value:999,source_ref:SOURCE,status:"approved",privacy_scope:"private",owner_person_id:OTHER_UID,statement:"PRIVATE_SENTINEL",meta:{}});
  f.paths.get(state.path_id).latest.representation.raziel_interview.question_ids=[secretId];
  const result=await api(f).handle(req(),{action:"load",path_id:state.path_id});assert.equal(result.ok,false);assert.ok(!JSON.stringify(result).includes("PRIVATE_SENTINEL"));
  assert.ok(f.calls.filter(c=>c.name==="research_objects").every(c=>new URL(c.url).searchParams.get("owner_person_id")==="is.null"));
});
test("save-key mismatched representation cannot claim a started interview",async()=>{
  const f=fixture();f.failOnce("fn_research_path_append_v1",()=>true,{ok:true,path_id:randomUUID(),representation:{raziel_interview:{contract:"other"}}});
  const result=await api(f).handle(req(),{action:"start",source_ref:SOURCE,question_ids:[Q1,Q2],request_id:randomUUID()});
  assert.equal(result.ok,false);assert.equal(result.error,"request_key_reused");
});
test("raw owner failure stays redacted",async()=>{
  const f=fixture(),state=await start(f);f.failOnce("research_artifact_save",()=>true,{ok:false,error:"PRIVATE_DB_MESSAGE_SENTINEL",note:SOURCE});
  const result=await api(f).handle(req(),payload(state));assert.equal(result.error,"owner_failed");assert.ok(!JSON.stringify(result).includes("PRIVATE_DB"));
});
test("existing provider quota denial makes zero model/personal calls",async()=>{
  const f=fixture(),state=await initial(f);f.calls.length=0;f.gateAllowed=false;
  const result=await handler(f)({values:[787],message:"what next",interview_path_id:state.path_id});
  assert.equal(result.body.error,"quota");assert.equal(f.models.length,0);assert.equal(privateReads(f).length,0);
});
test("failed conversation persistence does not erase answer or claim saved",async()=>{
  const f=fixture(),state=await initial(f);f.failOnce("agent_user_memory",(_,c)=>c.method==="POST",{},503);
  const result=await handler(f)({values:[787],message:"answer",interview_path_id:state.path_id});
  assert.equal(result.body.degraded,false);assert.equal(result.body.persisted,false);assert.ok(result.body.answer);
  assert.equal(f.paths.get(state.path_id).latest.revision_no,state.revision_no);
});
for(const name of ["number-researcher","raziel-attention"]) {
  test(`${name}: last 40 exchanges and last 12 prompt exchanges keep latest correction`,async()=>{
    const f=fixture();for(let i=0;i<45;i++)f.memory.push({id:randomUUID(),created_at:i,user_ref:UID,content:`user-${i}`,data:{reply:`reply-${i}`,context_snapshot:{sequence:i}}});
    const source=readFileSync(new URL(`../supabase/functions/${name}/index.ts`,import.meta.url),"utf8"),startAt=source.indexOf("async function loadThreadFull"),endAt=source.indexOf("\n}",startAt)+2;
    const fn=runInNewContext(stripTypeScriptTypes(source.slice(startAt,endAt))+"\nloadThreadFull",{
      rest:async path=>(await f.fetchImpl(`https://fixture.invalid/rest/v1/${path}`,{headers:{Authorization:`Bearer ${SERVICE}`}})).json(),humanize:s=>s,
    });
    const empty=await fn("");assert.equal(empty.history.length,0);assert.equal(f.calls.length,0);
    const full=await fn(UID);assert.equal(full.history[0].text,"user-5");assert.equal(full.history.at(-1).text,"reply-44");assert.equal(full.snapshot.sequence,44);
    const prompt=await fn(UID,12);assert.equal(prompt.history[0].text,"user-33");assert.equal(prompt.snapshot.sequence,44);
  });
}
for(const mode of ["failure","success"]) {
  test(`RazielRoom decision ${mode}: truthful acknowledgement and candidate retention`,async()=>{
    const source=readFileSync(new URL("../src/components/admin/RazielRoom.jsx",import.meta.url),"utf8"),startAt=source.indexOf("const runCommand ="),endAt=source.indexOf("\n  //",startAt);
    let candidates=[{id:randomUUID(),subject_ref:"787"}];const notes=[];
    const fn=runInNewContext(source.slice(startAt,endAt)+"\nrunCommand",{
      cands:candidates,setBusyC:()=>{},setCands:update=>{candidates=update(candidates);},
      decideCandidate:async()=>{if(mode==="failure")throw Error("synthetic failure");return {decision_id:randomUUID(),decision:"approve"};},
      push:(_role,note)=>notes.push(note),
    });
    await fn({kind:"approve",v:"787"});
    assert.equal(candidates.length,mode==="failure"?1:0);
    if(mode==="failure"){assert.ok(notes[0].includes("לא התקבל אישור"));assert.ok(!notes[0].includes("✅ אושר"));}
    else assert.ok(notes[0].includes("ההחלטה נרשמה"));
  });
}
