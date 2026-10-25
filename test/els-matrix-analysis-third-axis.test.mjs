import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const NATIVE = new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url);
const ENGINE = new URL("../tools/els/els-code.template.html", import.meta.url);
const EMBED = new URL("../src/components/TzofenEmbed.jsx", import.meta.url);

test("the open Research matrix exposes one explicit, verified long-axis analysis", async () => {
  const [native, engine] = await Promise.all([readFile(NATIVE, "utf8"), readFile(ENGINE, "utf8")]);
  assert.match(native, /נתח צירים ארוכים/);
  assert.match(native, /requestLens\("long-axis-analysis", target\)/);
  assert.match(engine, /LONG_AXIS_ANALYSIS_CONTRACT="els_long_axis_analysis_v1"/);
  assert.match(engine, /d\.lens==="long-axis-analysis"/);
  assert.match(engine, /coverage:"displayed-window"/);
  assert.match(engine, /verifyExplicitResearchCandidates\(ranked,"LONG_AXIS_ANALYSIS_V1"/);
  assert.match(engine, /status=plain\?"SOURCE_EXACT":"VERIFIED"/);
  assert.match(engine, /independentOfSavedResearch:true/);
  assert.doesNotMatch(native.slice(native.indexOf("function StructuralPriorityRail"), native.indexOf("function SearchProgress")), /localStorage|sessionStorage|supabase|fetch\(/);
});

test("a third term is searched only inside the selected or verified cross meetings", async () => {
  const [native, engine] = await Promise.all([readFile(NATIVE, "utf8"), readFile(ENGINE, "utf8")]);
  assert.match(native, /מצא ציר שלישי/);
  assert.match(native, /meetingScope === "selected"/);
  assert.match(native, /meetingScope === "all"/);
  assert.match(native, /requestLens\("cross-third-axis", target\)/);
  assert.match(engine, /CROSS_THIRD_AXIS_CONTRACT="els_cross_third_axis_v1"/);
  assert.match(engine, /d\.lens==="cross-third-axis"/);
  assert.match(engine, /target\.setId!==results\.id/);
  assert.match(engine, /crossThirdAxisCandidates\(zone,target\.term,maxDistance,window,2\)/);
  assert.match(engine, /axisDistance>bound\|\|companionDistances\.some\(companion=>companion\.distance>bound\)/);
  assert.match(engine, /policy:"CROSS_THIRD_AXIS_V1"/);
  assert.doesNotMatch(native.slice(native.indexOf("function CrossThirdAxisResearch"), native.indexOf("function CrossResultsRail")), /localStorage|sessionStorage|supabase|fetch\(/);
});

test("both research programs reuse the sole mounted canonical ELS engine", async () => {
  const [native, embed] = await Promise.all([readFile(NATIVE, "utf8"), readFile(EMBED, "utf8")]);
  assert.equal((native.match(/<TzofenEmbed/g) || []).length, 1);
  assert.match(embed, /type: "request-lens"/);
  assert.match(embed, /d\.type === "lens" \|\| d\.type === "lens-progress"/);
  assert.doesNotMatch(native, /createStore\(|new .*Engine|new ResearchProvider/);
});
