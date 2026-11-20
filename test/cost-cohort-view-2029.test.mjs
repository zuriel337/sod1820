import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {readAiCostCohorts2029,normalizeAiCostCohortResponse}
  from "../src/lib/research/costCohortView2029.js";

const record={v:1,not_invoice:true,includes_infrastructure:false,
  unknown_not_zero:true,pricing_basis:"internal_ai_token_ledger",
  total:{calls:250,unpriced_calls:0,cost_ils:14.548,unattributed_calls:205},
  by_segment:[
    {segment:"my_account",calls:23,unpriced_calls:0,cost_ils:0.8878},
    {segment:"registered_customer_unknown",calls:16,unpriced_calls:0,cost_ils:0.3205},
    {segment:"anonymous_visitor",calls:6,unpriced_calls:0,cost_ils:0.266},
    {segment:"unattributed_unknown",calls:205,unpriced_calls:0,cost_ils:13.0733},
  ],by_source:[],by_model:[],by_day:[]};

test("admin cohort summary normalizes exact priced ledger with 205 explicitly unknown",()=>{
 const r=normalizeAiCostCohortResponse(record);
 assert.equal(r.state,"LEDGER_REPORT");
 assert.equal(r.total.calls,250);
 assert.equal(r.total.knownCostIls,14.548);
 assert.equal(r.total.unassignedCalls,205);
 assert.equal(r.notInvoice,true);
 assert.equal(r.unknownNotZero,true);
});

test("unknown/incorrect billing evidence returns unknown instead of pretending zero",()=>{
 for(const bad of [
  null,{}, {...record,not_invoice:false},{...record,includes_infrastructure:true},
  {...record,by_segment:[{segment:"private_user_123",calls:1,cost_ils:2,unpriced_calls:0}]},
  {...record,total:{...record.total,cost_ils:null}},
 ]) assert.equal(normalizeAiCostCohortResponse(bad),null);
});

test("reader calls only bounded admin RPC and fails closed when unavailable",async()=>{
 const calls=[];
 const client={rpc:async (name,args)=>{calls.push({name,args});return {data:record,error:null};}};
 const d=await readAiCostCohorts2029({client,days:30});
 assert.equal(d.state,"LEDGER_REPORT");
 assert.deepEqual(calls,[{name:"admin_ai_cost_cohorts_v1",args:{p_days:30}}]);
 assert.equal((await readAiCostCohorts2029({client,days:10000})).state,"UNKNOWN");
 assert.equal((await readAiCostCohorts2029({client:{rpc:async()=>({error:{message:"forbidden"}})}})).state,"UNKNOWN");
});

test("review-only SQL does not leak identity and requires admin with bounded period",()=>{
 const sql=readFileSync(new URL("../supabase/proposed/admin_ai_cost_cohorts_v1_REVIEW_ONLY.sql",import.meta.url),"utf8");
 assert.match(sql,/v_uid uuid := auth\.uid\(\)/);
 assert.match(sql,/u\.role = 'admin'/);
 assert.match(sql,/p_days > 365/);
 assert.match(sql,/revoke all on function public\.admin_ai_cost_cohorts_v1/);
 assert.match(sql,/membership_subscription_pilot_charges/);
 assert.match(sql,/unattributed_unknown/);
 assert.doesNotMatch(sql,/jsonb_build_object\([^;]*'email'/);
});
