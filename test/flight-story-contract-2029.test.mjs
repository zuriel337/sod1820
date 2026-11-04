import test from "node:test";
import assert from "node:assert/strict";
import { buildFlightStoryContract2029, fetchFlightStoryContract2029, FLIGHT_GRAPH_NODE_ID as nodeId, FLIGHT_GRAPH_IDENTITY, FLIGHT_POST_SLUG } from "../src/lib/research/flightStoryContract2029.js";
import { INDIA_CAPTAIN_SOURCE as captain } from "../src/lib/research/topicSourceContext.js";
const edge="20f3b1d0-78d2-474a-b481-85e078bc706f", target="78fe15e1-6fc5-4641-b1cd-831a75c5bab7";
const post={id:5112,slug:FLIGHT_POST_SLUG,title:"טיסה 1073",source:"uploaded_file",tags:[],date:"2026-10-01T00:00:00Z",content:`<p>טיסת Flydubai ירדה יותר מ־14,000 רגל</p><figure><img src="${captain.imageUrl}"><figcaption>${captain.requiredCaption}</figcaption></figure>`};
const entity={kind:"graph-entity",subject:{type:"post",key:FLIGHT_GRAPH_IDENTITY},identity:{sourceIdentity:{nodeId}}};
const relation={kind:"graph-relation",identity:{relationRef:`edge:${edge}`},source:{sourceRef:`edge:${edge}`},projection:{relations:[{id:edge,fromNodeId:nodeId,toNodeId:target,relationType:"documents",to:{id:target,type:"number",label:"1073"}}]}};
test("existing source and graph are kept separate under the shared public DTO",()=>{
  const r=buildFlightStoryContract2029({post,graphFindings:[entity,relation],graphState:"available"});
  assert.equal(r.contentProjection.contractVersion,"public-world-content-projection/v1");
  assert.equal(r.contentProjection.sources[0].sourceRef,"posts:5112");
  assert.equal(r.contentProjection.occurrences.length,2); assert.equal(r.graph.relations[0].edgeRef,`edge:${edge}`);
  assert.equal(r.captain.relation,"not_a_graph_edge"); assert.equal(r.contentProjection.findings.length,0);
  assert.equal(r.contentProjection.coverage.treeRelations.available,false);
  const w=r.witnesses.find(x=>x.id==="flight-descent"); assert.equal(w.readings[0].value,14000);
  assert.equal(w.systemMethods[0].from,14000); assert.equal(w.systemMethods[0].to,14); assert.equal(w.verification,"not_reverified_here");
});
test("private draft and mismatched identity never trigger graph access",async()=>{
  let called=0; const graphReader=async()=>{called++;return [entity,relation]};
  for(const bad of [null,{...post,tags:["טיוטה"]},{...post,id:5113},{...post,slug:"another"}]) {
    const r=await fetchFlightStoryContract2029({postReader:async()=>bad,graphReader}); assert.equal(r.status,"source_unavailable");
  }
  assert.equal(called,0);
});
test("missing changed caption or missing evidence cannot create an occurrence or a relation",()=>{
  const r=buildFlightStoryContract2029({post:{...post,content:"no matching text"},graphFindings:[relation],graphState:"available"});
  assert.equal(r.contentProjection.occurrences.length,1); assert.equal(r.captain.status,"unavailable_or_changed");
  assert.equal(r.witnesses.length,0); assert.equal(r.graph.relations.length,0); assert.equal(r.graph.status,"unavailable");
});
test("graph read failure preserves public post and reports unknown, not an empty graph",async()=>{
  const r=await fetchFlightStoryContract2029({postReader:async()=>post,graphReader:async()=>{throw Error("offline")}});
  assert.equal(r.status,"source_available"); assert.equal(r.graph.status,"failed"); assert.equal(r.contentProjection.sources.length,1);
});
test("post read failure is explicit and never calls graph",async()=>{
  let called=false; const r=await fetchFlightStoryContract2029({postReader:async()=>{throw Error("offline")},graphReader:async()=>{called=true}});
  assert.equal(r.status,"source_read_failed"); assert.equal(r.contentProjection.coverage.sources.available,false); assert.equal(called,false);
});
