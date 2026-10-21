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
