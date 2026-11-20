import test from "node:test";
import assert from "node:assert/strict";
import {previewOperationalL1Task,previewOperationalIntakeDigest} from "../src/lib/research/intakeOperationalPlanPreview2029.js";

const nowIso="2026-11-20T16:30:00Z";
const event={kind:"repeated_ingest_failure",sourceRef:"channel_updates:10000000-0000-4000-8000-000000000001",
  sourceRevisionSha256:"a".repeat(64),sourceAccess:"public",
  serverEvidenceVerified:true,safeRedactedContext:true,consecutiveFailures:2};
const grant={id:"operational:l1:readonly",enabled:true,expiresAt:"2026-11-21T00:00:00Z",
  action:"operational_readonly_diagnosis",eventClasses:["repeated_ingest_failure"],
  model:"claude-haiku-4-5",maxInputTokens:1000,maxOutputTokens:200};
const pricing={model:"claude-haiku-4-5",pricingVerified:true,rateEffectiveForOperation:true,
  usdPerMillionInput:"1.0000",usdPerMillionOutput:"5.0000",ilsPerUsd:"3.010"};
const costLedger={month:"2026-11",spentAgorot:100,reservedAgorot:0,reconciledWithProviderInvoice:true};
const preview=(overrides={})=>previewOperationalL1Task({event,grant,pricing,costLedger,nowIso,...overrides});

test("500 mundane source events never produce a model call or source payload",()=>{
 const events=Array.from({length:500},(_,i)=>({
  kind:i%3===0?"new_public_link":"new_group_message",
  sourceRef:"channel_updates:"+String(i).padStart(10,"0"),
  sourceRevisionSha256:"a".repeat(64),sourceAccess:"public",
  serverEvidenceVerified:true,safeRedactedContext:true,
  secret:"UNTRUSTED_SOURCE_TEXT_MUST_NOT_ESCAPE",
 }));
 const d=previewOperationalIntakeDigest(events);
 assert.equal(d.state,"PREVIEW_ONLY");
 assert.equal(d.counts.received,500);
 assert.equal(d.counts.free,500);
 assert.equal(d.counts.autoModelCalls,0);
 assert.equal(d.providerCallAuthorized,false);
 assert.equal(JSON.stringify(d).includes("UNTRUSTED_SOURCE_TEXT"),false);
 assert.equal(previewOperationalIntakeDigest([...events,events[0]]).state,"INVALID_BATCH");
});

test("candidate preview STILL has no authority until atomic server reservation",()=>{
 const x=preview();
 assert.equal(x.state,"AWAITING_ATOMIC_SERVER_RESERVATION");
 assert.equal(x.providerCallAuthorized,false);
 assert.ok(x.maxQuoteAgorot>=1);
 assert.equal(x.budgetPeriod,"2026-11");
 assert.ok(x.requiredServerChecks.includes("atomic_reserve_with_idempotent_task_key"));
});

test("standing grant must match kind, action, model and expiry",()=>{
 for(const bad of [
  {...grant,enabled:false},
  {...grant,expiresAt:"2026-11-01T00:00:00Z"},
  {...grant,eventClasses:["unrelated"]},
  {...grant,action:"bulk_research"},
  {...grant,maxOutputTokens:2000},
 ]) assert.equal(preview({grant:bad}).state,"NO_L1_CALL");
 assert.equal(preview({pricing:{...pricing,model:"other-model"}}).reason,"pricing_or_budget_state_unavailable");
 assert.equal(preview({grant:null}).state,"NO_L1_CALL");
});

test("unknown rates, FX, budget state and month all fail closed",()=>{
 assert.equal(preview({costLedger:{...costLedger,month:"2026-10"}}).state,"NO_L1_CALL");
 assert.equal(preview({costLedger:{...costLedger,reconciledWithProviderInvoice:false}}).state,"NO_L1_CALL");
 assert.equal(preview({pricing:{...pricing,ilsPerUsd:null}}).reason,"unknown_or_invalid_fx_or_rate");
 assert.equal(preview({costLedger:{...costLedger,spentAgorot:4999,reservedAgorot:1}}).reason,"monthly_ils_cap_exceeded");
 assert.equal(preview({nowIso:"invalid"}).state,"NO_L1_CALL");
});

test("confidential incident and manual corpus tasks never become L1 candidate",()=>{
 for(const kind of ["private_to_public_leak","identity_link_conflict","bulk_corpus_scan","research_extraction"]) {
  const r=preview({event:{...event,kind}});
  assert.equal(r.state,"NO_L1_CALL");
  assert.equal(r.providerCallAuthorized,false);
 }
 const r=preview({event:{...event,sourceAccess:"private"}});
 assert.equal(r.state,"NO_L1_CALL");
});
