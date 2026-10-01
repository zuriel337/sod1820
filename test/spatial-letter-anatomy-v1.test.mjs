import test from "node:test";
import assert from "node:assert/strict";
import { buildWordLetterAnatomySpecs } from "../src/lib/spatial/hebrewLetterAnatomy.js";
import { compileLetterAnatomyScene, compileConvergenceScene, compileMotionProjection } from "../src/lib/spatial/semanticSceneCompiler.js";

test("Letter Anatomy keeps numeric truth out of specs and compiles engine result",()=>{
  const specs=buildWordLetterAnatomySpecs("אופק אדנק");
  assert.equal(specs.map(x=>x.expansions[0].spelling).join(" "),"אלף ויו פא קוף אלף דלת נון קוף");
  assert.equal(JSON.stringify(specs).includes("1237"),false);
  const scene=compileLetterAnatomyScene({expression:"אופק אדנק",methodKey:"מילוי",letterSpecs:specs,engineTrace:{engine_verified:true,value:1237,source:"canonical_engine"}});
  assert.equal(scene.sceneNodes.at(-1).label,"1237");
  assert.deepEqual(scene.availableActions.find(x=>x.action==="switch_depth").options,["visible","full","hidden"]);
});
test("final letters retain identity and explicit base linkage",()=>{
  const [spec]=buildWordLetterAnatomySpecs("ך");
  assert.equal(spec.letter.codepoint,"ך");
  assert.equal(spec.letter.base_codepoint,"כ");
  assert.equal(spec.letter.is_final,true);
});
test("compiler fails closed without verified engine trace",()=>{
  assert.throws(()=>compileLetterAnatomyScene({expression:"התגלות",methodKey:"מסתתר",letterSpecs:[],engineTrace:{engine_verified:false,value:1237}}),/ENGINE_VERIFIED/);
});


test("Golden 1237 convergence has one value node and three independently verified routes",()=>{
  const routes=[
    {expression:"אופק אדנק",methodKey:"מילוי",variantSource:"engine_default",engineTrace:{engine_verified:true,value:1237}},
    {expression:"התגלות",methodKey:"מסתתר",engineTrace:{engine_verified:true,value:1237}},
    {expression:"וראית את אחרי",methodKey:"רגיל",engineTrace:{engine_verified:true,value:1237}}
  ];
  const scene=compileConvergenceScene({convergenceId:"golden-1237-ofek-hitgalut-achorai",value:1237,routes});
  assert.equal(scene.sceneNodes.filter(n=>n.kind==="number").length,1);
  assert.equal(scene.sceneNodes.filter(n=>n.kind==="convergence_route").length,3);
  assert.equal(scene.sceneRelations.filter(r=>r.kind==="converges_to").length,3);
  assert.equal(scene.sceneNodes[0].ref.truth_score,null);
});
test("convergence fails closed when a route disagrees with the shared value",()=>{
  assert.throws(()=>compileConvergenceScene({convergenceId:"bad",value:1237,routes:[
    {expression:"א",methodKey:"רגיל",engineTrace:{engine_verified:true,value:1}},
    {expression:"ב",methodKey:"רגיל",engineTrace:{engine_verified:true,value:2}}
  ]}),/MATCHING_ENGINE_VERIFIED/);
});


test("motion projection consumes Golden convergence without minting truth",()=>{
  const scene=compileConvergenceScene({convergenceId:"golden-1237",value:1237,routes:[
    {expression:"אופק אדנק",methodKey:"מילוי",engineTrace:{engine_verified:true,value:1237}},
    {expression:"התגלות",methodKey:"מסתתר",engineTrace:{engine_verified:true,value:1237}},
    {expression:"וראית את אחרי",methodKey:"רגיל",engineTrace:{engine_verified:true,value:1237}}
  ]});
  const motion=compileMotionProjection(scene,{projectionId:"tzofen-batarbut-001"});
  assert.equal(motion.may_add_truth,false);
  assert.deepEqual(motion.aspect_profiles,["9:16","1:1","16:9"]);
  assert.equal(motion.cues.filter(c=>c.action==="reveal_route").length,3);
  assert.equal(motion.cues.filter(c=>c.action==="converge").length,1);
  assert.ok(motion.reduced_motion.every(c=>c.tier==="T0"));
});
