import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
const gateways = readFileSync(new URL("../src/components/experience2029/DiscoveryGateways2029.jsx", import.meta.url), "utf8");
const signup = readFileSync(new URL("../src/components/experience2029/HomeBuildSignup2029.jsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/pages/Home2029Page.jsx", import.meta.url), "utf8");

test("Home 2029 does not repeat the featured post under itself", () => {
  assert.match(home, /getLatestPostCards\(\{ limit: 5 \}\)/);
  assert.match(home, /visiblePosts = \(nowHero \? data\.posts : data\.posts\.filter\(post => post\.slug !== lead\?\.slug\)\)/);
  assert.match(home, /visiblePosts\.map\(\(post, index\)/);
  assert.match(home, /showFixedStory/);
});

test("Dimension Five is a video-series gateway, never one of the writer identities", () => {
  assert.match(gateways, /href: "\/category\/מימד חמש"/);
  assert.match(gateways, /מימד חמש · סדרת סרטונים/);
  assert.doesNotMatch(home, /is-dim|data\.dimensionPost|<b>מימד חמש<\/b>/);
  assert.match(home, /<Section label="כותבים וערוצים"/);
});

test("Construction meter is sourced from release map and pulse from existing public reader", () => {
  assert.match(signup, /BUILD_PROGRESS, FIRST_STAGE_RELEASE_GATES/);
  assert.match(signup, /זה אינו אחוז ההשלמה של האתר כולו/);
  assert.match(signup, /role="progressbar"/);
  assert.match(home, /<HomeBuildSignup2029 pulsePanel=\{pulsePanel\}/);
  assert.match(page, /pulsePanel=\{<HomeSystemPulse/);
});

test("Newsletter form is opt-in and uses existing signup Edge function with attribution", () => {
  assert.match(signup, /newsletter-signup\?format=json/);
  assert.match(signup, /signupAttribution\(\)/);
  assert.match(signup, /getVisitorId\(\)/);
  assert.match(signup, /event\.preventDefault\(\)/);
  assert.match(signup, /if \(response\.ok/);
  assert.doesNotMatch(signup, /\.from\(['"]subscribers['"]\)|\.insert\(/);
});
