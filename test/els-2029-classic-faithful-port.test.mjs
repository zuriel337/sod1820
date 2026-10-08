import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/pages/Els2029Page.jsx", import.meta.url), "utf8");
const nativeClassic = readFileSync(new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url), "utf8");
const embed = readFileSync(new URL("../src/components/TzofenEmbed.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/components/experience2029/elsNativeClassic2029.css", import.meta.url), "utf8");
const provider = readFileSync(new URL("../src/lib/research/ResearchProvider.jsx", import.meta.url), "utf8");
const template = readFileSync(new URL("../tools/els/els-code.template.html", import.meta.url), "utf8");

test("Classic 2029 mounts a native workspace instead of exposing the old full iframe by default", () => {
  assert.match(page, /import ElsNativeClassic2029 from/);
  assert.match(page, /data-els-classic-2029="native-v1"/);
  assert.ok(page.includes("<ElsNativeClassic2029 initialSeed={classicSeed} />"));
  assert.doesNotMatch(page, /<TzofenEmbed/);
  assert.doesNotMatch(page, /href="\/lab\/els"/);

  assert.match(nativeClassic, /data-els-native-classic="v4"/);
  assert.match(nativeClassic, /aria-label="חיפוש ELS"/);
  assert.ok(nativeClassic.includes("<MatrixControls state={engineState} onControl={requestControl} onContext={requestContext} />"));
  assert.match(nativeClassic, /<MatrixSnapshot state=\{engineState\}/);
  assert.match(nativeClassic, /<FindingsRail/);
});

test("Native Classic is projection-only and keeps one canonical Tzofen engine instance as parity fallback", () => {
  assert.match(nativeClassic, /import TzofenEmbed from "..\/TzofenEmbed.jsx"/);
  assert.equal((nativeClassic.match(/<TzofenEmbed/g) || []).length, 1);
  assert.match(nativeClassic, /\n          hiddenBridge\n          engineOnly=\{!classicOpen\}/);
  assert.match(nativeClassic, /engineOnly=\{!classicOpen\}/);
  assert.doesNotMatch(nativeClassic, /hiddenBridge=\{!classicOpen\}/);
  assert.match(nativeClassic, /onState=\{handleEngineState\}/);
  assert.match(nativeClassic, /onGate=\{\(\) => setClassicOpen\(true\)\}/);
  assert.match(nativeClassic, /פתח את כל הכלים הקלאסיים/);
  assert.doesNotMatch(nativeClassic, /\(engineSeed \|\| classicOpen\) \?/);

  assert.match(embed, /engineOnly = false/);
  assert.match(embed, /data-tzofen-projection=\{engineOnly \? "engine-only" : "classic-visible"\}/);
  assert.match(embed, /width: "min\(1280px, calc\(100vw - 24px\)\)"/);
  assert.match(embed, /clipPath: "inset\(50%\)"/);
  assert.match(embed, /onGate\?\.\(d\)/);
  assert.match(embed, /\(!hiddenBridge \|\| \(showResearchBusWhenHiddenBridge && !engineOnly\)\) && hasAxisFinding && !gate/);
  assert.match(nativeClassic, /showResearchBusWhenHiddenBridge/);
  assert.doesNotMatch(nativeClassic, /findAll\(|verifyBatch\(|crossFindMulti\(|els_search|fn_els/);
});

test("Native scope and simple cross search delegate to the canonical search path", () => {
  assert.match(nativeClassic, /searchRequest=\{searchRequest\}/);
  assert.match(nativeClassic, /requestSearch\("regular", \{ term, scope: activeScope \}\)/);
  assert.match(nativeClassic, /requestSearch\("cross", \{ axis, term, scope: activeScope \}\)/);
  assert.match(nativeClassic, /switchScope\("torah"\)/);
  assert.match(nativeClassic, /switchScope\("tanakh"\)/);
  assert.match(nativeClassic, /data-els-native-cross="simple"/);
  assert.doesNotMatch(nativeClassic, /runCrossSimple\(|crossFindMulti\(|discoverVerified\(|tanakhLocked\(|canCross\(/);

  assert.match(embed, /searchRequest = null/);
  assert.match(embed, /postToTool\(\{ type: "native-search", request: searchRequest \}\)/);

  assert.match(template, /function selectSearchScope\(nextScope,rerunCurrent\)/);
  assert.match(template, /next==="tanakh"&&tanakhLocked\(\)/);
  assert.match(template, /d\.type==="native-search"/);
  assert.match(template, /if\(!onboarded\(\)\)\{openOnboard\(\);postHost\(\{type:"onboarding-required"\}\);return;\}/);
  assert.match(embed, /onOnboardingRequired = null/);
  assert.match(embed, /d\.type === "onboarding-required"/);
  assert.match(nativeClassic, /onOnboardingRequired=\{\(\) => setClassicOpen\(true\)\}/);
  assert.match(template, /if\(!canCross\(\)\)\{gate\("cross"\);return;\}/);
  assert.match(template, /if\(!selectSearchScope\(scope,false\)\)return;/);
  assert.match(template, /run\(\);   \/\/ run\(\) משתמש ב-runCrossSimple\/logSearch\/gate הקיימים/);
});

test("Native finding editor delegates normalization, recompute and colors to canonical st.words", () => {
  assert.match(nativeClassic, /findingsRequest=\{findingsRequest\}/);
  assert.match(nativeClassic, /onFindingsChange=\{requestFindingsChange\}/);
  assert.match(nativeClassic, /type="color"/);
  assert.match(nativeClassic, /findings\.length >= 12/);
  assert.doesNotMatch(nativeClassic, /recomputeWords\(|recolorOnly\(|PALETTE|function\s+norm\(/);

  assert.match(embed, /findingsRequest = null/);
  assert.match(embed, /postToTool\(\{ type: "update-findings", findings: findingsRequest\.findings \}\)/);

  assert.match(template, /if\(d\.type==="update-findings"&&Array\.isArray\(d\.findings\)\)/);
  assert.match(template, /if\(next\.length>=12\)break/);
  assert.match(template, /if\(!t\|\|seen\.has\(t\)\)continue/);
  assert.match(template, /const word=old\|\|/);
  assert.match(template, /if\(membershipChanged\)recomputeWords\(\)/);
  assert.match(css, /\.els29-native-color-picker/);
});

test("Native matrix controls reuse the canonical Tzofen presentation helpers", () => {
  assert.match(nativeClassic, /controlRequest=\{controlRequest\}/);
  assert.match(nativeClassic, /occurrence-prev/);
  assert.match(nativeClassic, /occurrence-next/);
  assert.match(nativeClassic, /zoom-out/);
  assert.match(nativeClassic, /zoom-in/);
  assert.match(nativeClassic, /fit-toggle/);

  assert.match(embed, /controlRequest = null/);
  assert.match(embed, /postToTool\(\{ type: "native-control", action: controlRequest\.action \}\)/);

  assert.match(template, /function shiftOccurrence\(delta\)/);
  assert.match(template, /function toggleFit\(\)/);
  assert.match(template, /function adjustZoom\(delta\)/);
  assert.match(template, /d\.type==="native-control"/);
  assert.match(template, /d\.action==="occurrence-prev"\)shiftOccurrence\(-1\)/);
  assert.match(template, /d\.action==="occurrence-next"\)shiftOccurrence\(1\)/);
  assert.match(template, /d\.action==="zoom-out"\)adjustZoom\(-0\.2\)/);
  assert.match(template, /d\.action==="zoom-in"\)adjustZoom\(0\.2\)/);
  assert.match(template, /d\.action==="fit-toggle"\)toggleFit\(\)/);
  assert.match(template, /querySelector\("\.pv"\)\.onclick=\(\)=>shiftOccurrence\(-1\)/);
  assert.match(template, /querySelector\("\.nx"\)\.onclick=\(\)=>shiftOccurrence\(1\)/);
  assert.match(template, /querySelector\("\.fitbtn"\)\.onclick=toggleFit/);
});

test("Native letter click uses a bounded read-only canonical source lens", () => {
  assert.match(nativeClassic, /requestLens\("letter-context", \{ i: index \}\)/);
  assert.match(nativeClassic, /requestLens\("verse-context", \{ hitId: engineState\.axis\.hitId \}\)/);
  assert.match(nativeClassic, /lensRequest=\{lensRequest\}/);
  assert.match(nativeClassic, /onLens=\{handleLens\}/);

  assert.match(template, /async function letterContextLens\(target\)/);
  assert.match(template, /const b=blockOf\(\),r=Math\.floor\(i\/b\.S\)/);
  assert.match(template, /i>=scopeN\(\)/);
  assert.match(template, /await ensureVerseText\(\)/);
  assert.match(template, /const loc=locateLetter\(i\)/);
  assert.match(template, /lens:"letter-context"/);
  assert.match(template, /d\.type==="request-lens"&&d\.lens==="letter-context"/);
  assert.doesNotMatch(template.slice(template.indexOf("async function letterContextLens"), template.indexOf("const isAnon")), /findAll|verifyBatch|crossFind|els_search/);
});

test("Native matrix keeps governed rows/marks, RTL parity, pan and fit without ELS calculation", () => {
  assert.match(nativeClassic, /matrix\?\.rows/);
  assert.match(nativeClassic, /matrix\?\.marks/);
  assert.match(nativeClassic, /mark\?\.type === "main"/);
  assert.match(nativeClassic, /mark\?\.type === "finding"/);
  assert.match(nativeClassic, /state\?\.verification\?\.state === "MATCH"/);
  assert.match(nativeClassic, /onPointerDown=\{onPointerDown\}/);
  assert.match(nativeClassic, /scrollLeft = drag\.left - dx/);
  assert.match(nativeClassic, /is-fit/);
  assert.match(css, /\.els29-native-matrix\{[\s\S]*direction:rtl/);
  assert.match(css, /\.els29-native-matrix-row\{[\s\S]*direction:rtl/);
  assert.match(css, /\.els29-native-matrix\.is-fit/);
  assert.match(css, /\.els29-native-matrix-scroll\.is-dragging/);
  assert.match(css, /\.els29-native-cell\.is-axis/);
  assert.match(css, /\.els29-native-cell\.is-finding/);
  assert.match(css, /\.els29-native-cell\.is-selected/);
});

test("Native empty and candidate states remain truth-safe", () => {
  assert.match(nativeClassic, /data-els-native-state=\{state\?\.status \|\| "idle"\}/);
  assert.match(nativeClassic, /נמצא מועמד שעדיין לא אומת/);
  assert.match(nativeClassic, /אין כרגע מופע מאומת להצגה/);
  assert.match(nativeClassic, /אין סמכות שלילית/);
  assert.match(nativeClassic, /MATCH מהמנוע הקנוני/);
});

test("Native matrix is keyboard-scrollable and exposes an accessible source path", () => {
  assert.match(nativeClassic, /tabIndex=\{0\}/);
  assert.match(nativeClassic, /aria-describedby=\{summaryId\}/);
  assert.match(nativeClassic, /els29-native-sr-only/);
  assert.match(nativeClassic, /אותיות ציר מסומנות/);
  assert.match(nativeClassic, /אותיות ממצאים מסומנות/);
  assert.match(nativeClassic, /מקור הממצא/);
  assert.match(nativeClassic, /aria-hidden="true"/);
  assert.match(css, /\.els29-native-matrix-scroll:focus-visible/);
});

test("Classic engine stays mounted across Classic/Research profile switches so working state can be preserved", () => {
  assert.match(page, /const \[classicSeed\] = useState\(\(\) => clean\(selection\?\.term \|\| subject\?\.label \|\| ""\)\)/);
  assert.doesNotMatch(page, /display: researchProfile \? "none" : "block"/);
  assert.doesNotMatch(page, /aria-hidden=\{researchProfile\}/);
  assert.ok(page.indexOf("<ElsNativeClassic2029") < page.indexOf("<details className=\"sod29-els-research-details\""));
  assert.ok(page.includes("<ElsNativeClassic2029 initialSeed={classicSeed} />"));
  assert.equal((nativeClassic.match(/<TzofenEmbed/g) || []).length, 1);
});

test("canonical tzofen state still feeds the shared Research Context replay selection", () => {
  assert.match(provider, /d\.source !== "tzofen" \|\| d\.type !== "state" \|\| d\.status !== "ok"/);
  assert.match(provider, /const elsSelection = \{/);
  assert.match(provider, /entityType: "els", locator, term, corpus: scope/);
  assert.match(provider, /actions\.setResearchContext\(next\)/);
});

console.log("ELS Native Classic 2029 matrix parity slice: PASS");
