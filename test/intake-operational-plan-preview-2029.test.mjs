import test from "node:test";
import assert from "node:assert/strict";
import {previewOperationalL1Task,previewOperationalIntakeDigest}
  from "../src/lib/research/intakeOperationalPlanPreview2029.js";

const event={kind:"repeated_ingest_failure",sourceRef:"channel_updates:10000000-0000-4000-8000-000000000001",
 sourceRevisionSha256:"a".repeat(64),sourceAccess:"public",
 serverEvidenceVerified:true,safeRedactedContext:true,consecutiveFailures:2};
const grant={id:"operational:l1:readonly",enabled:true,expiresAt:"2026-11-21T00:00:00Z",
 action:"operational_readonly_diagnosis",eventClasses:["repeated_ingest_failure"],
 model:"claude-haiku-4-5",maxInputTokens:1000,maxOutputTokens:200};
const plan=(overrides={})=>previewOperationalL1Task({
 event,grant,nowIso:"2026-11-20T17:00:00Z",...overrides
});

test("500 events are classified but cause zero provider calls and contain no source payload",()=>{
 const items=Array.from({length:500},(_,i)=>({
   kind:"new_public_link",sourceRef:"channel_updates:"+i,
   sourceRevisionSha256:"a".repeat(64),sourceAccess:"public",
   serverEvidenceVerified:true,secret:"source pii",
 }));
 const r=previewOperationalIntakeDigest(items);
 assert.equal(r.state,"PREVIEW_ONLY");
 assert.equal(r.counts.received,500);
 assert.equal(r.counts.free,500);
 assert.equal(r.counts.autoModelCalls,0);
 assert.equal(r.providerCallAuthorized,false);
 assert.equal(JSON.stringify(r).includes("source pii"),false);
 assert.equal(previewOperationalIntakeDigest([...items,items[0]]).state,"INVALID_BATCH");
});

test("verified L1 incident may be planned but not executed by client preview",()=>{
 const r=plan();
 assert.equal(r.state,"L1_DIAGNOSIS_CANDIDATE");
 assert.equal(r.providerCallAuthorized,false);
 assert.ok(r.needServerChecks.includes("record_model_cost_and_identity_attribution_after_call"));
 assert.equal(r.allowedOutput,"read_only_diagnosis_or_fix_proposal");
});

test("scope, model, tokens, expiry and private context all fail closed",()=>{
 for(const bad of [
  {...grant,enabled:false},{...grant,model:""}, {...grant,action:"bulk_research"},
  {...grant,maxOutputTokens:2000},{...grant,expiresAt:"2026-11-01"},
  {...grant,eventClasses:["something_else"]}
 ]) assert.equal(plan({grant:bad}).state,"NO_L1_CALL");
 assert.equal(plan({grant:null}).state,"NO_L1_CALL");
 assert.equal(plan({event:{...event,sourceAccess:"private"}}).state,"NO_L1_CALL");
 assert.equal(plan({event:{...event,kind:"bulk_corpus_scan"}}).state,"NO_L1_CALL");
 assert.equal(plan({nowIso:"nonsense"}).state,"NO_L1_CALL");
});
