import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

function functionSource(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.ok(start >= 0);let depth = 0;
  for (let i = text.indexOf("{", start); i < text.length; i++) {
    if (text[i] === "{") depth++;else if (text[i] === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error("unclosed function");
}

test("cross matcher admits adjacent cells and rejects gaps without changing the legacy mode", async () => {
  const engine = await readFile(new URL("../tools/els/els-code.template.html", import.meta.url), "utf8");
  const chars = Array(80).fill("א");chars[1]="ש";chars[3]="ב";chars[5]="ת";chars[21]="ש";chars[22]="ב";chars[23]="ת";
  const ctx = vm.createContext({ T:chars.join(""), st:{}, scopeN:()=>80, researchGeometry:()=>({c0:0,cw:10,r0:0,r1:7}),
    searchSpace:()=>[1,2], distanceToAnchors:(p)=>p[0]===1?0:1, gridStep:s=>s, gapF:()=>1, proxF:()=>1, rarF:()=>1, lenF:()=>1, starsFromTq:()=>1, bookOf:()=>"", gem:()=>1 });
  vm.runInContext(functionSource(engine,"crossFindMultiHit"),ctx);
  ctx.axis={skip:10,positions:[0,10,20]};ctx.rare=new Map([["שבת",1]]);
  const connected=vm.runInContext('crossFindMultiHit(axis,0,["שבת"],5,rare,1,{scopeLength:80,connectedOnly:true})',ctx);
  assert.equal(connected.detail[0].p0,21);assert.equal(connected.detail[0].step,1);
  const legacy=vm.runInContext('crossFindMultiHit(axis,0,["שבת"],5,rare,1,{scopeLength:80})',ctx);
  assert.equal(legacy.detail[0].p0,1);assert.equal(legacy.detail[0].step,2);
});
