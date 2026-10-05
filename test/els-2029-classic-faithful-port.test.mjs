import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/pages/Els2029Page.jsx", import.meta.url), "utf8");
const nativeClassic = readFileSync(new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url), "utf8");
const embed = readFileSync(new URL("../src/components/TzofenEmbed.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/components/experience2029/elsNativeClassic2029.css", import.meta.url), "utf8");
const provider = readFileSync(new URL("../src/lib/research/ResearchProvider.jsx", import.meta.url), "utf8");

test("Classic 2029 mounts a native workspace instead of exposing the old full iframe by default", () => {
  assert.match(page, /import ElsNativeClassic2029 from/);
  assert.match(page, /data-els-classic-2029="native-v1"/);
  assert.ok(page.includes("<ElsNativeClassic2029 initialSeed={classicSeed} />"));
  assert.doesNotMatch(page, /<TzofenEmbed/);
  assert.doesNotMatch(page, /href="\/lab\/els"/);

  assert.match(nativeClassic, /data-els-native-classic="v1"/);
  assert.match(nativeClassic, /aria-label="חיפוש ELS"/);
  assert.ok(nativeClassic.includes("<MatrixSnapshot state={engineState} />"));
  assert.match(nativeClassic, /<FindingsRail state=\{engineState\}/);
});

test("Native Classic is projection-only and keeps one canonical Tzofen engine instance as parity fallback", () => {
  assert.match(nativeClassic, /import TzofenEmbed from "..\/TzofenEmbed.jsx"/);
  assert.equal((nativeClassic.match(/<TzofenEmbed/g) || []).length, 1);
  assert.match(nativeClassic, /\n          hiddenBridge\n          engineOnly=\{!classicOpen\}/);
  assert.match(nativeClassic, /engineOnly=\{!classicOpen\}/);
  assert.doesNotMatch(nativeClassic, /hiddenBridge=\{!classicOpen\}/);
  assert.match(nativeClassic, /onState=\{setEngineState\}/);
  assert.match(nativeClassic, /onGate=\{\(\) => setClassicOpen\(true\)\}/);
  assert.match(nativeClassic, /פתח את כל הכלים הקלאסיים/);
  assert.doesNotMatch(nativeClassic, /\(engineSeed \|\| classicOpen\) \?/);

  assert.match(embed, /engineOnly = false/);
  assert.match(embed, /data-tzofen-projection=\{engineOnly \? "engine-only" : "classic-visible"\}/);
  assert.match(embed, /width: "min\(1280px, calc\(100vw - 24px\)\)"/);
  assert.match(embed, /clipPath: "inset\(50%\)"/);
  assert.match(embed, /onGate\?\.\(d\)/);
  assert.doesNotMatch(nativeClassic, /findAll\(|verifyBatch\(|crossFindMulti\(|els_search|fn_els/);
});

test("Native matrix renders only the governed matrix snapshot emitted by the canonical engine", () => {
  assert.match(nativeClassic, /matrix\?\.rows/);
  assert.match(nativeClassic, /matrix\?\.marks/);
  assert.match(nativeClassic, /mark\?\.type === "main"/);
  assert.match(nativeClassic, /mark\?\.type === "finding"/);
  assert.match(nativeClassic, /state\?\.verification\?\.state === "MATCH"/);
  assert.match(css, /\.els29-native-matrix\{[\s\S]*direction:rtl/);
  assert.match(css, /\.els29-native-matrix-row\{[\s\S]*direction:rtl/);
  assert.match(css, /\.els29-native-cell\.is-axis/);
  assert.match(css, /\.els29-native-cell\.is-finding/);
});

test("Native matrix is keyboard-scrollable and exposes a non-color-only text summary", () => {
  assert.match(nativeClassic, /tabIndex=\{0\}/);
  assert.match(nativeClassic, /aria-describedby=\{summaryId\}/);
  assert.match(nativeClassic, /els29-native-sr-only/);
  assert.match(nativeClassic, /אותיות ציר מסומנות/);
  assert.match(nativeClassic, /אותיות ממצאים מסומנות/);
  assert.match(nativeClassic, /aria-hidden="true"/);
  assert.match(css, /\.els29-native-matrix-scroll:focus-visible/);
});

test("Classic engine stays mounted across Classic/Research profile switches so working state can be preserved", () => {
  assert.match(page, /const \[classicSeed\] = useState\(\(\) => clean\(selection\?\.term \|\| subject\?\.label \|\| ""\)\)/);
  assert.match(page, /display: researchProfile \? "none" : "block"/);
  assert.match(page, /aria-hidden=\{researchProfile\}/);
  assert.ok(page.includes("<ElsNativeClassic2029 initialSeed={classicSeed} />"));
  assert.equal((nativeClassic.match(/<TzofenEmbed/g) || []).length, 1);
});

test("canonical tzofen state already feeds the shared Research Context replay selection", () => {
  assert.match(provider, /d\.source !== "tzofen" \|\| d\.type !== "state" \|\| d\.status !== "ok"/);
  assert.match(provider, /const elsSelection = \{/);
  assert.match(provider, /entityType: "els", locator, term, corpus: scope/);
  assert.match(provider, /actions\.setResearchContext\(next\)/);
});

console.log("ELS Native Classic 2029 parity-first slice: PASS");
