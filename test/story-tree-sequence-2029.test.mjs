import test from "node:test";
import assert from "node:assert/strict";
import { buildStoryTreeSequence2029 } from "../src/lib/research/storyTreeSequence2029.js";

const anchor = "3a2804ac-c8c9-4b2f-83c4-b99f47c15c1f";
const flight = "f42e2a16-a3d6-4b7f-ab69-e10522c8f8e2";
const other = "78861b08-6f64-4728-875f-5374ae8db9d5";
const edge1 = "8d63f5d9-ccd9-42b8-8469-edd69f07be31";
const edge2 = "a1d6516b-faba-4c41-bc2e-ae4230e123f9";
const item = (id, slug) => ({ kind:"source", sourceKind:"post", publicState:"published_source_representation", sourceRef:`posts:${id}`, href:`/post/${slug}`, label:`story ${id}` });
const finding = (postId, edge, href) => ({kind:"graph-relation", identity:{relationRef:`edge:${edge}`}, source:{sourceRef:`edge:${edge}`}, projection:{relations:[{id:edge, fromNodeId:postId, toNodeId:anchor, from:{id:postId,type:"post",href},to:{id:anchor,type:"number"},relationType:"documents"}]}});
const posts = [item(5112,"flight"), item(51,"other")];
const findings = [finding(flight,edge1,"/post/flight"),finding(other,edge2,"/post/other")];

test("existing edges and admitted post sources produce ordered next and previous stories",()=>{
  const result = buildStoryTreeSequence2029({anchorNodeId:anchor, graphFindings:findings,publicPostUpdates:posts,currentSourceRef:"posts:5112"});
  assert.equal(result.stories.length,2); assert.equal(result.next.sourceRef,"posts:51");
  assert.equal(result.stories[0].relation.edgeRef,`edge:${edge1}`);
  assert.equal(result.stories[0].relationshipMeaning,"shared_anchor_not_story_to_story_edge");
  assert.equal(result.ordering,"input_not_chronology");
});
test("no graph edge, mismatched anchor, unresolved source, or private projection fails closed",()=>{
  for (const input of [
    {graphFindings:[],publicPostUpdates:posts},
    {graphFindings:findings,publicPostUpdates:[]},
    {graphFindings:findings,publicPostUpdates:posts.map(p=>({...p,publicState:"private"}))},
    {graphFindings:[{...findings[0],identity:{relationRef:`edge:${edge2}`}}],publicPostUpdates:posts},
  ]) assert.equal(buildStoryTreeSequence2029({anchorNodeId:anchor,...input}).stories.length,0);
  assert.equal(buildStoryTreeSequence2029({anchorNodeId:flight,graphFindings:findings,publicPostUpdates:posts}).stories.length,0);
});
test("duplicate or ambiguous paths do not create duplicate or falsely authorized stories",()=>{
  const result=buildStoryTreeSequence2029({anchorNodeId:anchor,graphFindings:[...findings,...findings],publicPostUpdates:[...posts,item(999,"flight")]});
  assert.deepEqual(result.stories.map(x=>x.sourceRef),["posts:51"]);
  assert.equal(result.next,null);
});
test("a raw candidate, relation without exact edge or unknown current never becomes navigation",()=>{
  const result=buildStoryTreeSequence2029({anchorNodeId:anchor,graphFindings:[{kind:"candidate",projection:{relations:findings[0].projection.relations}},findings[1]],publicPostUpdates:posts,currentSourceRef:"posts:999"});
  assert.deepEqual(result.stories.map(x=>x.sourceRef),["posts:51"]); assert.equal(result.currentIndex,-1); assert.equal(result.next,null);
});
