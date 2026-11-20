import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_COST_SEGMENT_V1 as C, AI_COST_REPORTING_POLICY_V1 as P,
  attributeAiCostCohort, previewAiCostsByCohort,
} from "../src/lib/research/intakeOperationalCostPreview2029.js";

const user = (id, extra={}) => ({tokenLogId:id,costIls:"0.123456",identityVerified:true,
  userId:"u"+id,userRole:"user",visitorPresent:false,...extra});
const report=(rows,extra={})=>previewAiCostsByCohort(rows,{adminVerified:true,viewerUserId:"u1",...extra});

test("observability is NOT a monetary cap and only admin-safe aggregation is produced",()=>{
 assert.equal(P.monthlyLimitEnabled,false);
 assert.equal(P.mode,"observability_only");
 assert.equal(previewAiCostsByCohort([user(1)],{adminVerified:false}).state,"DENIED");
 assert.equal(report([user(1)]).bySegment.length,7);
});

test("owner's exact login differs from other admins; paying customer requires verified payment",()=>{
 const rows=[
  user(1,{userRole:"admin"}),
  user(2,{userRole:"admin"}),
  user(3,{paymentVerifiedAtEvent:true}),
  user(4,{paymentVerifiedAtEvent:false}),
  user(5,{identityVerified:false}),
  {tokenLogId:6,costIls:"0.123456",visitorPresent:true},
  {tokenLogId:7,costIls:"0.123456",systemOperationVerified:true},
  {tokenLogId:8,costIls:"0.123456"},
 ];
 const r=report(rows);
 assert.deepEqual(r.bySegment.map(x=>x.calls),[1,1,1,1,1,1,2]);
 assert.equal(attributeAiCostCohort(rows[0],{viewerUserId:"u1"}),C.MY_ACCOUNT);
 assert.equal(attributeAiCostCohort(rows[1],{viewerUserId:"u1"}),C.OTHER_ADMIN);
 assert.equal(attributeAiCostCohort(rows[2]),C.PAYING_CUSTOMER);
 assert.equal(attributeAiCostCohort(rows[3]),C.REGISTERED);
 assert.equal(attributeAiCostCohort(rows[5]),C.ANONYMOUS);
 assert.equal(attributeAiCostCohort(rows[6]),C.SYSTEM);
 assert.equal(attributeAiCostCohort(rows[7]),C.UNKNOWN);
 assert.equal(r.knownCostIls,"0.9876");
 assert.equal(r.unassignedCalls,2);
 assert.equal(r.notAnInvoice,true);
 assert.equal(r.includesInfrastructureCosts,false);
 assert.equal(r.sourcePiiIncluded,false);
 assert.equal(JSON.stringify(r).includes("u1"),false);
});

test("unknown prices never count as free; every source call is counted once",()=>{
 const rows=[user(1,{costIls:"0"}),user(2,{costIls:null}),user(3,{costIls:"-1"}),
 user(4,{costIls:"2.000001"}),user(4,{costIls:"9999"}),{...user(5),tokenLogId:0}];
 const r=report(rows);
 assert.equal(r.state,"PARTIAL_DUPLICATE_OR_INVALID_ROWS");
 assert.equal(r.calls,4);
 assert.equal(r.pricedCalls,undefined);
 assert.equal(r.unpricedCalls,2);
 assert.equal(r.knownCostIls,"2.0000");
 assert.equal(r.skippedInvalidOrDuplicateRows,2);
 assert.equal(r.bySegment.find(x=>x.segment===C.REGISTERED).costCertainty,"PARTIAL");
});

test("50-shekel is not a stop threshold; reports arbitrarily larger measured cost",()=>{
 const r=report([user(1,{costIls:"501.9952"})]);
 assert.equal(r.knownCostIls,"501.9952");
 assert.equal(r.state,"OK");
});

test("no false attribution based on source/model names; unknown stays unknown",()=>{
 const rows=[{tokenLogId:1,costIls:"13.0733",source:"research-extract",model:"claude-sonnet-5"}];
 const r=report(rows);
 assert.equal(r.bySegment.find(x=>x.segment===C.UNKNOWN).knownCostIls,"13.0733");
 assert.equal(r.bySegment.find(x=>x.segment===C.MY_ACCOUNT).knownCostIls,"0.0000");
});

test("bounded projection refuses unbounded rows or non-admin request",()=>{
 assert.equal(report(Array(5001).fill({})).state,"DENIED");
 assert.equal(report(null).state,"DENIED");
});
