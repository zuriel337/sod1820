import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const els = read("src/pages/Els2029Page.jsx");
const og = read("api/og.js");
const app2029 = read("src/App2029.jsx");

// Share: one canonical component, no local share bypass.
assert.match(frame, /import ShareActions from "\.\.\/ShareActions\.jsx"/);
assert.match(frame, /<ShareActions/);
assert.equal(frame.includes("shareOrCopy"), false);

// Availability: 2029 ELS consumes the same live site_flags resolver as Legacy projections.
assert.match(els, /useFeatureState\("lock_els"\)/);
assert.match(els, /FeatureClosedNotice/);
assert.match(els, /elsState\.blocked/);
assert.equal(els.includes(".from(\"site_flags\")"), false, "ELS must not create a local site_flags reader");

// Telemetry: standalone 2029 runtime uses the same semantic owners, not a new analytics family.
for (const owner of ["initGA", "trackPageview", "initMarketing", "trackMarketingPageview", "trackVisit", "startPageEngagement"]) {
  assert.ok(app2029.includes(owner), `App2029 must consume canonical telemetry owner: ${owner}`);
}
assert.match(app2029, /<RouteEffects2029 \/>/);
assert.equal(app2029.includes("@vercel/analytics"), false);
assert.equal(app2029.includes("@vercel/speed-insights"), false);

// OG: every currently public isolated 2029 route family gets an explicit existing-owner projection.
for (const route of ["/2029", "/world", "/books", "/els", "/heichal", "/היכל"]) {
  assert.ok(og.includes(`'${route}':`), `missing canonical OG projection for ${route}`);
}
assert.match(og, /key\.startsWith\('\/book\/'\) \|\| key\.startsWith\('\/books\/'\)/);
assert.match(og, /bookPrefix = key\.startsWith\('\/books\/'\)/);

console.log("2029 canonical contract wiring acceptance: PASS");
