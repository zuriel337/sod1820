import test from "node:test";
import assert from "node:assert/strict";
import { buildWordLetterAnatomySpecs } from "../src/lib/spatial/hebrewLetterAnatomy.js";
import { compileLetterAnatomyScene } from "../src/lib/spatial/semanticSceneCompiler.js";

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
