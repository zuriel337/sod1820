import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const SWITCH = new URL("../src/components/experience2029/ElsMatrixProfileSwitch.jsx", import.meta.url);
const PAGE = new URL("../src/pages/Els2029Page.jsx", import.meta.url);
const REPRESENTATION = new URL("../src/components/experience2029/Els2029Representation.jsx", import.meta.url);

test("Guided/Research/Classic switch stays controlled and uses one profile model", async () => {
  const source = await readFile(SWITCH, "utf8");
  assert.match(source, /els2029MatrixMode\.js/);
  assert.match(source, /ELS_MATRIX_PROFILE\.GUIDED/);
  assert.match(source, /ELS_MATRIX_PROFILE\.RESEARCH/);
  assert.match(source, /ELS_MATRIX_PROFILE\.CLASSIC/);
  assert.match(source, /aria-pressed=\{selected\}/);
  assert.match(source, /onChange\?\.\(option\.key\)/);
  assert.doesNotMatch(source, /useState\s*\(/);
  assert.doesNotMatch(source, /fetch\s*\(|supabase|localStorage|sessionStorage/);
});

test("ELS 2029 opens in Guided Discovery and mode changes do not own replay or search", async () => {
  const page = await readFile(PAGE, "utf8");
  assert.match(page, /Els2029Page\(\{ previewAdvanced = false \}\)/);
  assert.match(page, /return ELS_MATRIX_PROFILE\.GUIDED/);
  assert.match(page, /projectElsMatrixProfile/);
  assert.match(page, /<ElsMatrixProfileSwitch profile=\{matrixProfile\} onChange=\{setMatrixProfile\} \/>/);
  assert.match(page, /const guidedProfile = profileModel\.profile === ELS_MATRIX_PROFILE\.GUIDED/);
  assert.match(page, /const advancedResearchProfile = profileModel\.profile === ELS_MATRIX_PROFILE\.RESEARCH/);
  assert.match(page, /const researchProfile = profileModel\.profile !== ELS_MATRIX_PROFILE\.CLASSIC/);
  assert.match(page, /<Els2029Representation layers=\{replayLayers\} profile=\{matrixProfile\}/);

  const replayEffect = page.slice(page.indexOf("if (elsState.loading || elsState.blocked || !replayKey)"), page.indexOf("const replayProjection"));
  assert.doesNotMatch(replayEffect, /matrixProfile|researchProfile/);

  assert.match(page, /advancedResearchProfile \?\s*<aside className="sod29-inspector"/);
  assert.match(page, /aria-label="ELS adaptive action slots"/);
  assert.match(page, /aria-label=\{guidedProfile \? "תוצאות הגילוי המודרך" : "סביבת המחקר של הצופן"\}/);
  assert.match(page, /data-els-classic-2029="native-v1"/);
  assert.match(page, /active=\{!library && \(!guidedProfile \|\| researchLoad\?\.guidedDiscovery === true \|\| directSavedOpen\)\}/);
  assert.match(page, /data-els-guided-tools="single-window-v1"/);
  assert.match(page, /data-els-guided-workspace="separate-v1"/);
  assert.match(page, /hidden=\{guidedProfile && !directSavedOpen && researchLoad\?\.guidedDiscovery !== true\}/);
  assert.doesNotMatch(page, /href="\/lab\/els"/);
  assert.match(page, /one canonical Tzofen engine/);
  assert.doesNotMatch(page, /display: researchProfile \? "none" : "block"/);
});

test("Classic representation remains a flat projection of the same canonical layers", async () => {
  const source = await readFile(REPRESENTATION, "utf8");
  assert.match(source, /profile = "RESEARCH"/);
  assert.match(source, /data-els-matrix-profile=/);
  assert.match(source, /CLASSIC · 2D REPRESENTATION/);
  assert.match(source, /מטריצה קלאסית · אותו occurrence/);
  assert.match(source, /projectEls2029Representation\(layers\)/);
  assert.doesNotMatch(source, /verifyEls2029Selection|els-search-bridge|supabase/);
});
