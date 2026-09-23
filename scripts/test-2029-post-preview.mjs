import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/App2029.jsx", "utf8");
const page = fs.readFileSync("src/pages/Post2029Page.jsx", "utf8");
const projection = fs.readFileSync("src/lib/research/post2029Projection.js", "utf8");
const timeFlow = fs.readFileSync("src/lib/timeFlow.js", "utf8");
const css = fs.readFileSync("src/pages/post2029.css", "utf8");
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

assert.match(app, /Post2029Page/);
assert.match(app, /path="\/2029\/post\/:slug"/);
assert.equal(vercel.rewrites.some((row) => row.source === "/2029/post/(.*)" && row.destination === "/2029.html"), true);

assert.match(page, /<Sod2029Shell surface="post"/);
assert.match(page, /fetchPost2029Projection/);
assert.match(page, /fetchGematriaMethodTrace/);
assert.match(page, /useResearch/);
assert.match(page, /method: row\.methodKey/);
assert.match(page, /shell\.openNumber/);
assert.match(page, /function PostPulse/);
assert.match(page, /חדש מאז הפרסום/);
assert.match(page, /ראה עוד/);
assert.match(page, /previewCalculations/);
assert.match(page, /contributorCalculations/);
assert.match(page, /sod29-post-pulse-findings/);
assert.match(page, /function TemporalNowLens/);
assert.match(page, /פתח בציר ההתגלות/);
assert.match(page, /רמז זמן פעיל/);
assert.equal(page.includes("אבני רונן"), false, "Temporal lens must consume contributor provenance from DB, not hard-code a person");
assert.equal(page.includes("תשפ״ז"), false, "Temporal lens must consume current Hebrew year from shared resolver");
assert.match(page, /scrollIntoView/);
assert.match(page, /is-pulse-target/);
assert.equal(page.includes("localStorage"), false, "Golden Pulse must not invent local seen-state storage");
assert.equal(page.includes("מאז שהיית כאן"), false, "Golden Pulse must not claim per-user unread state before a canonical seen-state owner exists");
assert.equal(page.includes("POST AS INFORMATION UNITS"), false, "public Post2029 must not expose internal information-architecture labels");
assert.match(page, /רמזים שנוספו אחרי המקור/);
assert.match(page, /מה אומת ומה נשאר רמז/);
assert.equal(page.includes("../legacy/"), false);
assert.equal(page.includes("legacy.jsx"), false);

assert.match(projection, /getPostBySlug/);
assert.match(projection, /number_readings/);
assert.match(projection, /readings:/);
assert.match(projection, /contributorCalculations/);
assert.match(projection, /extractContributorAddition/);
assert.match(projection, /getCurrentTemporalContext/);
assert.match(projection, /research_contributions/);
assert.match(projection, /number_anchors/);
assert.match(projection, /fn_method_value/);
assert.match(projection, /temporalLens/);
assert.match(projection, /source_media/);
assert.match(projection, /authored_content/);
assert.match(projection, /transcript/);
assert.match(projection, /research_update/);
assert.match(projection, /timeBasis: "posts\.modified"/);
assert.equal(/\b787\b|\b1445\b|\b1613\b/.test(projection), false, "Post projection must not hard-code Golden calculation values");
assert.match(css, /max-width:390px/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(css, /sod29-post-pulse/);
assert.match(css, /var\(--s29-accent\)/);
assert.match(css, /sod29-post-time-lens/);

assert.match(timeFlow, /export function getCurrentTemporalContext/);
assert.match(timeFlow, /ISRAEL_TIME_ZONE/);
assert.match(timeFlow, /renderGematriya/);
assert.match(timeFlow, /getDayContext/);
assert.equal(timeFlow.includes("787"), false, "Shared temporal resolver must not hard-code the current Hebrew-year gematria");
assert.equal(timeFlow.includes("תשפז"), false, "Shared temporal resolver must derive the Hebrew year dynamically");

// Keep this gate branch-local until ZURIEL approves Post2029 cutover.
console.log("2029 Post Golden Preview acceptance: PASS");
