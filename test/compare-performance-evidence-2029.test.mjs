import test from "node:test";
import assert from "node:assert/strict";
import {comparePerformanceGroups} from "../scripts/compare-performance-evidence-2029.mjs";

const group=(lcp, inp, counts={lcp:100,inp:50})=>({
  route:"/",device:"mobile",measurement_scope:"navigation",cohort:"human",
  metrics:{
    lcp_ms:{p75:lcp,n:counts.lcp},inp_ms:{p75:inp,n:counts.inp},
    cls:{p75:0.01,n:100},ttfb_ms:{p75:700,n:100},fcp_ms:{p75:1100,n:100},
  },
});
test("faster LCP alone cannot hide worsened mobile INP",()=>{
  const result=comparePerformanceGroups({baseline:[group(3000,220)],candidate:[group(2100,360)]});
  assert.equal(result.status,"REGRESSION");
  assert.equal(result.groups[0].metrics.lcp_ms.status,"IMPROVEMENT");
  assert.equal(result.groups[0].metrics.inp_ms.status,"REGRESSION");
});
test("true measured improvement requires matched group with sufficient samples",()=>{
  const result=comparePerformanceGroups({baseline:[group(3100,250)],candidate:[group(2600,220)]});
  assert.equal(result.status,"IMPROVED");
});
test("not enough INP interactions is UNKNOWN not success even with better LCP",()=>{
  const result=comparePerformanceGroups({baseline:[group(3300,240,{lcp:100,inp:12})],candidate:[group(2400,190,{lcp:110,inp:10})]});
  assert.equal(result.status,"UNKNOWN");
  assert.equal(result.groups[0].metrics.inp_ms.status,"UNKNOWN");
});
test("different cohort and device are not comparable",()=>{
  const before=group(2800,250),after={...group(1800,110),device:"desktop"};
  const result=comparePerformanceGroups({baseline:[before],candidate:[after]});
  assert.equal(result.status,"UNKNOWN");
  assert.ok(result.groups.every(x=>x.reason==="UNMATCHED_GROUP"));
});
test("missing evidence is UNKNOWN, never 0 or a green status",()=>{
  assert.equal(comparePerformanceGroups({baseline:null,candidate:[]}).status,"UNKNOWN");
  assert.equal(comparePerformanceGroups({baseline:[],candidate:[]}).status,"UNKNOWN");
});
test("a minor non-significant movement is not proof of faster product",()=>{
  const result=comparePerformanceGroups({baseline:[group(2100,180)],candidate:[group(2080,179)]});
  assert.equal(result.status,"NO_MEASURED_IMPROVEMENT");
});
