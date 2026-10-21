import test from "node:test";
import assert from "node:assert/strict";
import {anagramKey, methodIntersections, legacyCrossCandidates} from "../src/lib/research/crossingParityCore.js";
test("same and cross methods remain distinct",()=>{
 const m=methodIntersections({ragil:10,misratar:30},{ragil:30,misratar:10},["ragil","misratar"]);
 assert.equal(m.filter(x=>x.sameMethod).length,0);
 assert.equal(m.filter(x=>!x.sameMethod).length,2);
});
test("same method pair identified",()=>{
 assert.deepEqual(methodIntersections({ragil:26},{ragil:26},["ragil"]).map(x=>x.value),[26]);
});
test("legacy candidate overlap, deduplication and anagrams",()=>{
 const rows=[
 {id:"1",phrase:"אב",ragil:3,misratar:10},
 {id:"2",phrase:"גד",ragil:3,misratar:10},
 {id:"3",phrase:"גד",ragil:3,misratar:10},
 {id:"4",phrase:"ה",ragil:3,misratar:50},
 ];
 const actual=legacyCrossCandidates({expression:"אב",values:{ragil:3,misratar:10},candidates:rows,columns:["ragil","misratar"]});
 assert.deepEqual(actual.map(x=>x.partner),["גד"]);
 assert.equal(actual[0].sourceId,"2");
});
test("anagram handles finals and letters",()=>assert.equal(anagramKey("מלך"),anagramKey("כלמ")));
