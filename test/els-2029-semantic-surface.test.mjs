import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/pages/Els2029Page.jsx", import.meta.url), "utf8");

test("ELS 2029 consumes the existing Research Context and live availability gate", () => {
  assert.match(src, /useResearch\(\)/);
  assert.match(src, /research\.context/);
  assert.match(src, /useFeatureState\("lock_els"\)/);
  assert.match(src, /FeatureClosedNotice/);
  assert.match(src, /updateResearchContext\?\.\(\{ lens: "els" \}\)/);
});

test("ELS 2029 exact replay is fail-closed through the canonical replay request boundary", () => {
  assert.match(src, /selection\?\.entityType === "els"/);
  assert.match(src, /buildEls2029ReplayRequest\(selection\)/);
  assert.match(src, /els2029ReplaySelectionKey\(selection\)/);
  assert.match(src, /verifyEls2029Selection\(selection/);
  assert.match(src, /supabase\.functions\.invoke\("els-search-bridge", \{ body \}\)/);
  assert.match(src, /נדרש term \+ corpus \+ start \+ skip \+ direction/);
  assert.match(src, /replayMatched \? "MATCH · occurrence אומת בשרת"/);
});

test("ELS 2029 is projection-only and does not embed or implement an ELS engine", () => {
  assert.doesNotMatch(src, /TzofenEmbed|tzofen\.html|findAllAdaptive|function\s+findAll|els_search_core_v1/);
  assert.match(src, /לא לחשב אותו מחדש/);
  assert.match(src, /Matrix \/ layers \/ 3D הם representation בלבד/);
  assert.match(src, /קרבה חזותית אינה מעלה Truth או Independence/);
});

test("deep ELS Intelligence extensions remain BUILDING while Raziel is only a verified-context consumer", () => {
  assert.match(src, /ElsRazielEntry/);
  assert.match(src, /ready=\{replayMatched && layeredReady\}/);
  assert.match(src, /רזיאל · ממתין למופע מאומת/);
  for (const label of ["Neighborhood", "Axis Continuation", "Spatial", "Deep Research"]) {
    assert.ok(src.includes(label + " · BUILDING"), label + " must remain a future action slot");
  }
  assert.match(src, /דוגמאות מחקר אמיתיות/);
});

console.log("ELS 2029 semantic surface contract: PASS");
