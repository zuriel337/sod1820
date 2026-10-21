import test from "node:test";
import assert from "node:assert/strict";
import {independentLegacyMethods,legacyMethodPoints,scoreLegacyCross,rankLegacyByRarity} from "../src/lib/research/crossingLegacyRarity.js";
const m=(label,value)=>({label,value});
test("dependent big-method aliases collapse only if base present",()=>{
 const x=[m("רגיל",26),m("גדול",26),m("קדמי",776),m("משולש גדול",776),m("מסתתר",123)];
 assert.deepEqual(independentLegacyMethods(x).map(z=>z.label),["רגיל","קדמי","מסתתר"]);
});
test("legacy rarity bands and fallback",()=>{
 assert.deepEqual([null,2,5,10,20,60,100].map(legacyMethodPoints),[6,30,22,15,9,4,2]);
});
test("score includes family size, anchor, resonance capped at 12",()=>{
 const c={methods:[m("רגיל",776),m("מסתתר",358)]};
 const x=scoreLegacyCross(c,{"רגיל|776":3,"מסתתר|358":9},{776:4,358:1});
 assert.deepEqual(x,{score:67,indepCount:2,rarestSize:3,resonance:4,resoBonus:12,trivial:false});
});
test("missing ancillary datasets do not prevent a result",()=>{
 const r=scoreLegacyCross({methods:[m("רגיל",123),m("גדול",123)]});
 assert.equal(r.trivial,true);
 assert.equal(r.indepCount,1);
 assert.equal(r.score,6);
});
test("rarity ranking descending",()=>{
 const ranked=rankLegacyByRarity([{id:"common",methods:[m("רגיל",123)]},{id:"rare",methods:[m("רגיל",776)]}],{"רגיל|123":200,"רגיל|776":2});
 assert.deepEqual(ranked.map(x=>x.id),["rare","common"]);
});
