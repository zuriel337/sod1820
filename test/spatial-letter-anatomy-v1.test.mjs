import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildWordLetterAnatomySpecs } from "../src/lib/spatial/hebrewLetterAnatomy.js";
import { compileLetterAnatomyScene, compileConvergenceScene, compileMotionProjection, compileMistaterTensionScene, compileTriangleMethodScene, compileRegularLedgerScene } from "../src/lib/spatial/semanticSceneCompiler.js";

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


test("Experience renderer consumes a verified scene and does not hardcode Golden numeric truth",()=>{
  const component=readFileSync(new URL("../src/components/experience2029/LetterAnatomyGolden2029.jsx",import.meta.url),"utf8");
  const hub=readFileSync(new URL("../src/pages/EntityHubPreviewPage.jsx",import.meta.url),"utf8");
  const mistaterComponent=readFileSync(new URL("../src/components/experience2029/MistaterTensionGolden2029.jsx",import.meta.url),"utf8");
  assert.equal(component.includes("1237"),false);
  assert.match(component,/engine_verified===true/);
  assert.match(hub,/fn_method_value/);
  assert.match(hub,/value!==Number\(label\)/);
  assert.match(hub,/gematria_method_trace/);
  assert.match(hub,/compileMistaterTensionScene/);
  assert.equal(mistaterComponent.includes("1237"),false);
  assert.match(mistaterComponent,/data-experience-capability="mistater-tension"/);
});


test("Mistater tension consumes canonical adjacent-difference trace and projects five live edges",()=>{
  const trace={
    input:"התגלות",
    steps:[{
      word:"התגלות",
      pairs:[
        {difference:395,left_value:5,right_value:400},
        {difference:397,left_value:400,right_value:3},
        {difference:27,left_value:3,right_value:30},
        {difference:24,left_value:30,right_value:6},
        {difference:394,left_value:6,right_value:400},
      ],
      letter_values:[5,400,3,30,6,400],
      word_subtotal:1237,
    }],
    result:1237,
    method_key:"מסתתר",
    trace_kind:"ADJACENT_DIFFERENCE",
    verification:{parity:true,trace_value:1237,canonical_value:1237},
    provenance:{engine:"gematria",function:"fn_misratar",method_version:1},
  };
  const scene=compileMistaterTensionScene({expression:"התגלות",methodTrace:trace});
  const edges=scene.sceneRelations.filter(r=>r.kind==="tension_between");
  assert.equal(scene.projection_kind,"adjacent_letter_tension");
  assert.equal(edges.length,5);
  assert.deepEqual(edges.map(e=>e.ref.difference),[395,397,27,24,394]);
  assert.equal(scene.sceneNodes.find(n=>n.kind==="engine_result").label,"1237");
  assert.ok(edges.every(e=>e.ref.source==="canonical_method_trace"));
});

test("Mistater tension fails closed if a pair is not internally consistent with the canonical trace",()=>{
  const bad={
    input:"התגלות",
    steps:[{word:"התגלות",pairs:[{difference:396,left_value:5,right_value:400}],letter_values:[5,400],word_subtotal:396}],
    result:396,
    method_key:"מסתתר",
    trace_kind:"ADJACENT_DIFFERENCE",
    verification:{parity:true,trace_value:396,canonical_value:396},
  };
  assert.throws(()=>compileMistaterTensionScene({expression:"התגלות",methodTrace:bad}),/PAIR_MISMATCH/);
});

test("Kadmi potential triangle and Triangle Word prefix triangle remain distinct projections",()=>{
  const kadmiTrace={
    input:"אבג",
    steps:[
      {index:1,scope:"letter",token:"א",position:1,base_value:1,contribution:1,running_subtotal:1},
      {index:2,scope:"letter",token:"ב",position:2,base_value:3,contribution:3,running_subtotal:4},
      {index:3,scope:"letter",token:"ג",position:3,base_value:6,contribution:6,running_subtotal:10},
    ],
    result:10,
    method_key:"קדמי",
    trace_kind:"LETTER_LEDGER",
    verification:{parity:true,trace_value:10,canonical_value:10},
  };
  const wordTrace={
    input:"אבג",
    steps:[
      {index:1,token:"א",base_value:1,prefix_subtotal:1,original_position:1},
      {index:2,token:"ב",base_value:2,prefix_subtotal:3,original_position:2},
      {index:3,token:"ג",base_value:3,prefix_subtotal:6,original_position:3},
    ],
    result:10,
    method_key:"משולש מילה",
    trace_kind:"CUMULATIVE_PREFIX",
    verification:{parity:true,trace_value:10,canonical_value:10},
  };
  const kadmi=compileTriangleMethodScene({expression:"אבג",methodKey:"קדמי",methodTrace:kadmiTrace});
  const word=compileTriangleMethodScene({expression:"אבג",methodKey:"משולש מילה",methodTrace:wordTrace});
  assert.equal(kadmi.projection_kind,"letter_potential_triangle");
  assert.equal(word.projection_kind,"word_prefix_triangle");
  assert.deepEqual(kadmi.sceneNodes.filter(n=>n.kind==="letter_potential").map(n=>n.label),["א","ב","ג"]);
  assert.deepEqual(word.sceneNodes.filter(n=>n.kind==="triangle_prefix_row").map(n=>n.label),["א","אב","אבג"]);
  assert.notEqual(kadmi.sceneNodes[0].ref.projection_kind,word.sceneNodes[0].ref.projection_kind);
});


test("Triangle renderer exposes distinct semantic capabilities without inventing a 14 fixture",()=>{
  const component=readFileSync(new URL("../src/components/experience2029/TriangleMethodGolden2029.jsx",import.meta.url),"utf8");
  assert.equal(component.includes(">14<"),false);
  assert.match(component,/kadmi-potential/);
  assert.match(component,/triangle-word/);
  assert.match(component,/letter_potential_triangle/);
  assert.match(component,/word_prefix_triangle/);
});


test("1237 convergence Experience is trace-driven and preserves the three canonical route identities",()=>{
  const component=readFileSync(new URL("../src/components/experience2029/ConvergenceGolden2029.jsx",import.meta.url),"utf8");
  const hub=readFileSync(new URL("../src/pages/EntityHubPreviewPage.jsx",import.meta.url),"utf8");
  assert.match(component,/data-experience-capability="convergence-1237"/);
  assert.match(component,/engineTrace\?\.engine_verified/);
  assert.match(component,/הפעל גילוי/);
  assert.match(component,/ציון אמת/);
  assert.match(hub,/p_method_key: "מילוי", p_phrase: "אופק אדנק"/);
  assert.match(hub,/p_method_key: "מסתתר", p_phrase: "התגלות"/);
  assert.match(hub,/p_method_key: "רגיל", p_phrase: "וראית את אחרי"/);
  assert.match(hub,/compileConvergenceScene/);
  assert.match(hub,/compileMotionProjection/);
});


test("Regular ledger consumes canonical visible-letter trace without recomputing truth",()=>{
  const trace={
    input:"וראית את אחרי",
    steps:[
      {index:1,token:"ו",base_value:6,contribution:6,running_subtotal:6},
      {index:2,token:"ר",base_value:200,contribution:200,running_subtotal:206},
      {index:3,token:"א",base_value:1,contribution:1,running_subtotal:207},
      {index:4,token:"י",base_value:10,contribution:10,running_subtotal:217},
      {index:5,token:"ת",base_value:400,contribution:400,running_subtotal:617},
      {index:6,token:" ",base_value:0,contribution:0,running_subtotal:617},
      {index:7,token:"א",base_value:1,contribution:1,running_subtotal:618},
      {index:8,token:"ת",base_value:400,contribution:400,running_subtotal:1018},
      {index:9,token:" ",base_value:0,contribution:0,running_subtotal:1018},
      {index:10,token:"א",base_value:1,contribution:1,running_subtotal:1019},
      {index:11,token:"ח",base_value:8,contribution:8,running_subtotal:1027},
      {index:12,token:"ר",base_value:200,contribution:200,running_subtotal:1227},
      {index:13,token:"י",base_value:10,contribution:10,running_subtotal:1237},
    ],
    result:1237,
    method_key:"רגיל",
    trace_kind:"LETTER_LEDGER",
    verification:{parity:true,trace_value:1237,canonical_value:1237},
  };
  const scene=compileRegularLedgerScene({
    expression:"וראית את אחרי",
    methodTrace:trace,
    sourceRef:{book:"שמות",chapter:33,verse:23},
  });
  assert.equal(scene.projection_kind,"regular_visible_letter_ledger");
  assert.equal(scene.sceneNodes.filter(n=>n.kind==="visible_letter").length,11);
  assert.equal(scene.sceneNodes.find(n=>n.kind==="engine_result").label,"1237");
  assert.deepEqual(scene.sceneNodes[0].ref.sourceRef,{book:"שמות",chapter:33,verse:23});
});

test("Regular verse Experience requires both canonical trace and canonical source lookup",()=>{
  const component=readFileSync(new URL("../src/components/experience2029/RegularVerseGolden2029.jsx",import.meta.url),"utf8");
  const hub=readFileSync(new URL("../src/pages/EntityHubPreviewPage.jsx",import.meta.url),"utf8");
  assert.equal(component.includes("1237"),false);
  assert.match(component,/שמות לג:כג/);
  assert.match(component,/הפסוק הוא הקשר המקור/);
  assert.match(hub,/from\("tanach_verses"\)/);
  assert.match(hub,/compileRegularLedgerScene/);
  assert.match(hub,/golden-1237-regular/);
});
