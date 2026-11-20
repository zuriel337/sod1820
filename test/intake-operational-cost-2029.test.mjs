import test from "node:test";
import assert from "node:assert/strict";
import {
  OPERATIONAL_COST_POLICY_V1, quoteOperationalAiUpperBound,
  previewOperationalAiBudget, operationalBudgetMonth,
} from "../src/lib/research/intakeOperationalCostPreview2029.js";

const quote = (extra={}) => quoteOperationalAiUpperBound({
  pricingVerified:true, rateEffectiveForOperation:true,
  maxInputTokens:1000, maxOutputTokens:200,
  usdPerMillionInput:"3.0", usdPerMillionOutput:"15.0", ilsPerUsd:"3.5",
  ...extra,
});

test("nominal cost quote uses fixed-point ceil, safety margin and never authorizes provider", () => {
  const q=quote();
  // 1000*3 + 200*15 USD per million tokens = 0.006 USD;
  // FX 3.5 -> 0.021 ILS; 25% safety = 0.02625 ILS => 3 agorot.
  assert.equal(q.state,"QUOTED");
  assert.equal(q.upperBoundAgorot,3);
  assert.equal(q.upperBoundIls,"0.03");
  assert.equal(q.providerCallAuthorized,false);
  assert.equal(OPERATIONAL_COST_POLICY_V1.monthlyCapAgorot,5000);
});

test("unknown/stale/effective dates, negative or unsafe FX and prices fail closed", () => {
  const inputs=[
    {pricingVerified:false},{rateEffectiveForOperation:false},
    {usdPerMillionInput:null},{usdPerMillionOutput:"0"},
    {usdPerMillionInput:"NaN"},{usdPerMillionOutput:"-1"},
    {ilsPerUsd:"Infinity"},{ilsPerUsd:"-3"},{ilsPerUsd:"3.1234567"},
    {maxInputTokens:0},{maxInputTokens:4097},{maxOutputTokens:513},
    {maxInputTokens:0.5},{maxOutputTokens:1.5},
  ];
  for(const input of inputs) {
    const q=quote(input);
    assert.equal(q.state,"DENIED",JSON.stringify(input));
    assert.equal(q.providerCallAuthorized,false);
  }
});

test("ILS 50 cap counts reserved plus settled, and has per-call bound", () => {
  const allowed=previewOperationalAiBudget({spentAgorot:4900,reservedAgorot:0,upperBoundAgorot:100});
  assert.equal(allowed.state,"WOULD_FIT_UNDER_SNAPSHOT");
  assert.equal(allowed.providerCallAuthorized,false);
  assert.equal(allowed.remainingAfterAgorot,0);
  for(const inp of [
    {spentAgorot:4999,reservedAgorot:0,upperBoundAgorot:2},
    {spentAgorot:4900,reservedAgorot:99,upperBoundAgorot:2},
    {spentAgorot:5001,reservedAgorot:0,upperBoundAgorot:1},
    {spentAgorot:0,reservedAgorot:5001,upperBoundAgorot:1},
  ]) assert.equal(previewOperationalAiBudget(inp).reason,"monthly_ils_cap_exceeded");
  assert.equal(previewOperationalAiBudget({spentAgorot:0,reservedAgorot:0,upperBoundAgorot:101}).reason,"per_operation_limit");
});

test("no unverified, negative, fractional or missing snapshot becomes authority", () => {
  for(const input of [
    {},{spentAgorot:-1,reservedAgorot:0,upperBoundAgorot:1},
    {spentAgorot:0,reservedAgorot:0,upperBoundAgorot:0},
    {spentAgorot:0,reservedAgorot:0,upperBoundAgorot:1.3},
    {spentAgorot:NaN,reservedAgorot:0,upperBoundAgorot:1},
  ]) assert.equal(previewOperationalAiBudget(input).state,"DENIED");
});

test("sequential simulation exhausts exact balance but never asserts concurrency safety", () => {
  let reserved=0,accepted=0,denied=0;
  for(let i=0;i<10;i++){
    const next=previewOperationalAiBudget({spentAgorot:4900,reservedAgorot:reserved,upperBoundAgorot:20});
    if(next.state==="WOULD_FIT_UNDER_SNAPSHOT"){accepted++;reserved+=20;}
    else denied++;
  }
  assert.equal(accepted,5);
  assert.equal(denied,5);
  assert.equal(reserved,100);
});

test("month follows Asia/Jerusalem midnight, not UTC or US billing month", () => {
  assert.equal(operationalBudgetMonth("2026-11-30T21:59:59Z"),"2026-11");
  assert.equal(operationalBudgetMonth("2026-11-30T22:00:00Z"),"2026-12");
  assert.equal(operationalBudgetMonth("bad"),null);
});
