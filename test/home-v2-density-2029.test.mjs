import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homeCss = readFileSync(new URL("../src/components/experience2029/homeComposition2029.css", import.meta.url), "utf8");
const gatewayCss = readFileSync(new URL("../src/components/experience2029/discoveryGateways2029.css", import.meta.url), "utf8");
const body = readFileSync(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");

test("Home V2 uses only shared System Frame semantic color roles", () => {
  for (const css of [homeCss, gatewayCss]) {
    assert.doesNotMatch(css, /(?:#[0-9a-f]{3,8}|rgba?\s*\()/i, "No page-local colors");
  }
  assert.match(homeCss, /--s29-panel/);
  assert.match(homeCss, /--s29-brand-gold/);
  assert.match(homeCss, /--s29-discovery/);
});

test("mobile hero has no permanent oversized blank reserve", () => {
  assert.doesNotMatch(homeCss, /min-height:\s*750px|block-size:\s*470px/);
  assert.match(homeCss, /\.h29-hero2 \.h29-hero-copy \{ min-block-size: 0; \}/);
});

test("mobile editorial cards are fully visible and support accessible targets", () => {
  assert.match(homeCss, /\.h29-updates, \.h29-notable \{ display: grid;/);
  assert.match(homeCss, /scroll-snap-type: none/);
  assert.match(homeCss, /\.h29-updates \.h29-card-main \{ flex-direction: row;/);
  assert.match(homeCss, /\.h29-card-main \{ min-height: 44px;/);
  assert.match(homeCss, /focus-visible/);
  assert.match(body, /<DiscoveryGateways2029/);
  assert.match(body, /<HomeBuildSignup2029/);
});

test("the Home does not create a theme or change the Number page", () => {
  assert.doesNotMatch(homeCss, /--research-blue|--number-blue/);
  assert.match(homeCss, /prefers-reduced-motion: reduce/);
});
