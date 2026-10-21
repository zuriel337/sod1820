import test from "node:test";
import assert from "node:assert/strict";
import {projectCrossingResearch,projectPairResearch} from "../src/lib/research/crossingUnifiedProjection.js";

test("shared crossing projection preserves source, methods and rarity",()=>{
 const rows=projectCrossingResearch({
  expression:"אב",values:{ragil:3,misratar:10},
  candidates:[{id:"a",phrase:"גד",ragil:3,misratar:10},{id:"b",phrase:"וו",ragil:3,misratar:10}],
  columns:["ragil","misratar"],familySizes:{"רגיל|3":2,"מסתתר|10":3}
 });
 assert.equal(rows.length,2);
 assert.ok(rows.every(r=>r.sourceId && r.methods.length===2 && r.rarity));
});
test("pair projection retains both equal-method and cross-method links",()=>{
 const r=projectPairResearch({
  left:{ragil:10,misratar:20},right:{ragil:10,misratar:10},
  methodKeys:["ragil","misratar"]
 });
 assert.equal(r.same.length,1);
 assert.equal(r.cross.length,1);
});

test("legacy base ordering remains independent of optional rarity",()=>{
 const rows=projectCrossingResearch({
  expression:"אב",values:{ragil:3,misratar:10,miluy:30},
  candidates:[
   {id:"a",phrase:"משפט ארוך",ragil:3,misratar:10,miluy:30},
   {id:"b",phrase:"גד",ragil:3,misratar:10,miluy:99}
  ],
  columns:["ragil","misratar","miluy"],
  familySizes:{"רגיל|3":1,"מסתתר|10":1,"מילוי|30":100}
 });
 assert.deepEqual(rows.map(x=>x.sourceId),["a","b"]);
 assert.equal(rows[0].methods[2].label,"מילוי");
});
