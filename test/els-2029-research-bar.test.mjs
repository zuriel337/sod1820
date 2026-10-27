import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../src/pages/Els2029Page.jsx", import.meta.url), "utf8");
const bar = readFileSync(new URL("../src/components/experience2029/ElsResearchBar2029.jsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/components/experience2029/els2029-research.css", import.meta.url), "utf8");

test("research bar renders only in the Research profile and keeps Classic mounted in place", () => {
  assert.match(page, /\{researchProfile && \(!guidedProfile \|\| researchLoad\?\.guidedDiscovery === true \|\| savedRecord\.row\) \? <ElsResearchBarConnected/);
  assert.match(page, /<ElsNativeWithRaziel[^>]*initialSeed=/);
  assert.match(page, /data-els-research-composition/);
});

test("research bar is presentation-only: no search, verify or bridge calls", () => {
  assert.doesNotMatch(bar, /supabase|invoke|verifyEls2029|els-search-bridge|fetch\(/);
  assert.match(bar, /disabled=\{!razielAvailable\}/);
});

test("research styling is scoped and Classic receives no rules", () => {
  assert.doesNotMatch(css, /els29-native-/);
});
