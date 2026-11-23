import test from "node:test";
import assert from "node:assert/strict";
import {fieldMetricTriage} from "../scripts/2029-field-triage.mjs";
const metric=(route,device,vals)=>({
  build_label:"2029-TEST",route,device,measurement_scope:"document_navigation_hard_load_only",
  lcp_n:80,lcp_p75_ms:1900,inp_n:40,inp_p75_ms:170,cls_n:80,cls_p75:0.02,...vals,
});
test("mobile community layout shift is visible instead of hidden by global average",()=>{
  const r=fieldMetricTriage([metric("/community/chat","mobile",{cls_p75:0.1345})]);
  assert.equal(r.status,"ATTENTION");assert.equal(r.issues[0].metric,"cls");
  assert.equal(r.issues[0].route,"/community/chat");
  assert.equal(r.issues[0].target,0.1);
});
test("mobile post INP > 500ms surfaces POOR even with good LCP",()=>{
  const r=fieldMetricTriage([metric("/post/:item","mobile",{inp_p75_ms:624})]);
  assert.equal(r.status,"ATTENTION");assert.equal(r.issues[0].metric,"inp_ms");assert.equal(r.issues[0].severity,"poor");
});
test("small INP sample remains UNKNOWN, no false healthy report",()=>{
  const r=fieldMetricTriage([metric("/","mobile",{inp_n:7,inp_p75_ms:85})]);
  assert.equal(r.status,"PARTIAL");assert.equal(r.coverage[0].metric,"inp_ms");
});
test("SPA transition metric is not mislabeled as hard-navigation RUM",()=>{
  const r=fieldMetricTriage([{...metric("/world","mobile",{}),measurement_scope:"spa_transition"}]);
  assert.equal(r.status,"PARTIAL");assert.equal(r.coverage[0].reason,"INVALID_OR_UNSUPPORTED_MEASUREMENT_SCOPE");
});
test("no field rows does not imply site is green",()=>{
  const r=fieldMetricTriage([]);
  assert.equal(r.status,"UNKNOWN");
  assert.match(r.limitations,/missing samples/);
});
