import test from "node:test";
import assert from "node:assert/strict";
import { publicContextLabel, contextDisplayTitle, contextDisplayPosition, withRazielSurfaceContext } from "../src/components/experience2029/razielSessionSeam2029.js";
const ID="00edc0d8-b792-45d9-aa86-d04b44600a3f";
test("opaque identity and source keys never become display titles, including before truncation",()=>{
  for(const value of [ID,ID.toUpperCase(),`ממצא ${ID}`,"topic-discovery-wall--trump-#methods","#methods","/topic/trump","surfaceFocus","post-5107",`topic-${'x'.repeat(500)}`]) assert.equal(publicContextLabel(value),"",value);
});
test("authored Hebrew, English source names and scientific terms are preserved",()=>{
  for(const value of ["משיח בן דוד","Donald Trump","Sha'arei Orah","COVID-19","B-52","DNA/RNA","E=mc²","424"]) assert.equal(publicContextLabel(value),value);
});
test("selection may use a subject's human title only for the same exact identity and type",()=>{
  const c={subject:{id:ID,type:"topic",label:"משיח בן דוד"}};
  assert.equal(contextDisplayTitle(c,{id:ID,type:"topic",label:ID}),"משיח בן דוד");
  assert.equal(contextDisplayTitle(c,{id:"other",type:"topic",label:ID}),"");
  assert.equal(contextDisplayTitle(c,{id:ID,type:"person",label:ID}),"");
  assert.equal(contextDisplayTitle({subject:{type:"topic",label:"כותרת ללא זהות"}},{type:"topic",label:ID}),"");
  assert.equal(contextDisplayTitle({subject:{id:ID,label:"כותרת ללא סוג"}},{id:ID,label:ID}),"");
  assert.equal(contextDisplayTitle(c,{id:"other",type:"phrase",label:"ביטוי שנבחר"}),"ביטוי שנבחר");
  assert.equal(contextDisplayTitle({subject:{id:ID,type:"topic",label:ID}}),"");
});
test("section title is backed by exact source location or the actual active section",()=>{
  const c={selection:{locator:"topic-discovery-wall--trump-#methods"},dimensions:{surfaceFocus:{locator:"#other",sectionLabel:"מקור אחר"},surfaceSections:[{id:"methods",targetId:"topic-discovery-wall--trump-#methods",label:"חישובים במקור"}],activeSectionId:"methods"}};
  assert.equal(contextDisplayPosition(c),"חישובים במקור");
  c.selection.locator="#missing";assert.equal(contextDisplayPosition(c),"");
  c.dimensions.surfaceFocus={locator:"#missing",sectionLabel:"המקטע שנבחר"};assert.equal(contextDisplayPosition(c),"המקטע שנבחר");
  delete c.selection.locator;assert.equal(contextDisplayPosition(c),"חישובים במקור");
  assert.equal(contextDisplayPosition({dimensions:{surfaceSections:[{label:"ללא זיהוי מקטע"}]}}),"");
});
test("presentation leaves canonical IDs, locators, return URL and transport unchanged",()=>{
  const c={subject:{id:ID,type:"topic",label:"משיח בן דוד",href:"/topic/exact"},selection:{entityId:ID,entityType:"topic",locator:"#exact"},returnTo:{href:"/world?source=exact#item"},dimensions:{surfaceSections:[{id:"exact",label:"מקור"}]}};
  const original=JSON.stringify(c);Object.freeze(c);
  contextDisplayTitle(c,c.selection);contextDisplayPosition(c);
  assert.equal(JSON.stringify(c),original);assert.strictEqual(withRazielSurfaceContext(c),c);
});
