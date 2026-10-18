import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
const gateways = readFileSync(new URL("../src/components/experience2029/DiscoveryGateways2029.jsx", import.meta.url), "utf8");
const signup = readFileSync(new URL("../src/components/experience2029/HomeBuildSignup2029.jsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/pages/Home2029Page.jsx", import.meta.url), "utf8");
const readQueries = readFileSync(new URL("../src/lib/postReadQueries2029.js", import.meta.url), "utf8");
const projection = readFileSync(new URL("../src/lib/research/home2029Projection.js", import.meta.url), "utf8");

test("Home 2029 never repeats featured, story, updated or arrived Post identities", () => {
  // the bounded Home read keeps its 16 latest cards; the limit now lives in the shared read-query module (same value)
  assert.match(home, /getLatestPostCards\(\{ limit: HOME_LATEST_POST_LIMIT_2029 \}\)/);
  assert.match(readQueries, /export const HOME_LATEST_POST_LIMIT_2029 = 16;/);
  assert.match(home, /reserveHomePost\(reserved, lead\)/);
  assert.match(home, /reserveHomePost\(reserved, \{ slug: "flydubai-fz1073/);
  // four latest-update cards claim distinct Posts (the number is one named constant)
  assert.match(home, /const HOME_UPDATE_SLOTS = 4;/);
  assert.match(home, /claimHomeItems\(data.posts, reserved, HOME_UPDATE_SLOTS\)/);
  assert.match(home, /claimHomeItems\(sourceRows.filter\(item => item.kind === "source"\), latestPlacement.reserved, 4\)/);
  assert.match(home, /visiblePosts\.map\(\(post, index\)/);
  assert.match(page, /arrivals=\{\(homeArrivals\) =>/);
  assert.match(page, /items=\{homeArrivals\}/);
});

test("Dimension Five is a video-series category, never a writer identity", () => {
  assert.match(gateways, /category: "מימד חמש"/);
  // read through the bounded Home card reader (category admission only), no whole-Post read for the strip
  assert.match(gateways, /fetchHomePostCards2029\(\{ category: "מימד חמש"/);
  assert.doesNotMatch(gateways, /getPostsFromSupabase/);
  assert.doesNotMatch(home, /is-dim|data\.dimensionPost|<b>מימד חמש<\/b>/);
  assert.match(home, /<Section label="כותבים וערוצים"/);
});

test("construction meter is sourced from canonical release map without the removed system pulse", () => {
  assert.match(signup, /BUILD_PROGRESS, FIRST_STAGE_RELEASE_GATES/);
  assert.match(signup, /זה אינו אחוז ההשלמה של האתר כולו/);
  assert.match(signup, /role="progressbar"/);
  assert.match(home, /<HomeBuildSignup2029 \/>/);
  assert.doesNotMatch(home, /pulsePanel|systemPulse|home:pulse/);
  assert.doesNotMatch(page, /HomeSystemPulse|pulsePanel|systemPulse|home-system-pulse/);
  assert.doesNotMatch(projection, /fx_home_pulse|fetchHomeSystemPulse2029|PULSE_WINDOW_DAYS|PULSE_LATEST_LIMIT/);
});

test("newsletter signup uses canonical opt-in endpoint with attribution", () => {
  assert.match(signup, /newsletter-signup\?format=json/);
  assert.match(signup, /signupAttribution\(\)/);
  assert.match(signup, /getVisitorId\(\)/);
  assert.match(signup, /event\.preventDefault\(\)/);
  assert.match(signup, /if \(response\.ok/);
  assert.doesNotMatch(signup, /\.from\(['"]subscribers['"]\)|\.insert\(/);
});
