import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");

const page=read("src/pages/Post2029Page.jsx");
const rail=read("src/components/experience2029/ReadingContextRail2029.jsx");
const projection=read("src/lib/research/post2029ReadingProjection.js");
const frame=read("src/components/experience2029/SystemFrame2029.jsx");
const css=read("src/pages/post2029-reading.css");
const app=read("src/App2029.jsx");
const vercel=JSON.parse(read("vercel.json"));

// Canonical Post family uses the isolated 2029 runtime without a parallel post store.
assert.match(app,/path="\/post\/:slug" element={<Post2029Page \/>}/);
assert.equal((vercel.rewrites||[]).some((r)=>r.source==="/post/(.*)"&&r.destination==="/2029.html"),true);
assert.match(projection,/getPostBySlug/);
assert.equal(projection.includes('.from("post2029'),false);

// Source is the reading center; system intelligence sits outside it.
assert.match(page,/sod29-reading-source/);
assert.match(page,/dangerouslySetInnerHTML=\{\{ __html: post\.content/);
assert.match(page,/ReadingContextRail2029/);
assert.match(page,/sod29-reading-spine/);
assert.equal(page.includes("AI Summary"),false);
assert.equal(page.includes("תוספת הבינה המלאכותית"),false);

// Region tracking is projection metadata; no AI copy is inserted into authored paragraphs.
assert.match(page,/\[data-source-heading='true'\]/);
assert.match(page,/IntersectionObserver/);
assert.match(projection,/GOLDEN_REGIONS/);
assert.match(projection,/Golden calibration only/);

// One global control plane: the rail triggers existing SystemFrame capabilities.
assert.match(page,/shell\.openRaziel/);
assert.match(page,/shell\.openNumber/);
assert.match(page,/shell\.openAction/);
assert.match(page,/shell\.go/);
assert.equal(rail.includes("RazielProjection"),false);
assert.equal(rail.includes("sod29-command-island"),false);

// Raziel is still the one SystemFrame companion, now accepting bounded reading focus.
assert.match(frame,/payload\?\.readingFocus/);
assert.match(frame,/readingFocus=\{transient\?\.payload\?\.readingFocus/);
assert.match(frame,/data-reading-focus-card="true"/);
assert.match(frame,/explain_reading_focus/);

// Gematria verification stays canonical; no local arithmetic.
assert.match(projection,/supabase\.rpc\("fn_method_value"/);
assert.match(projection,/p_method_key:\s*"רגיל"/);
for (const forbidden of ["calcGem","METHODS =","DEPTH_METHODS","charCodeAt"]) {
  assert.equal(projection.includes(forbidden),false,`Post projection must not calculate locally: ${forbidden}`);
}

// Reading Rail exists only as responsive reading geometry; mobile collapses it.
assert.match(css,/grid-template-areas:"rail spine source"/);
assert.match(css,/\.sod29-reading-rail/);
assert.match(css,/\.sod29-reading-mobile-cue/);
assert.match(css,/@media\(max-width:980px\)/);
assert.match(css,/\.sod29-reading-spine,.sod29-reading-rail\{display:none\}/);
assert.match(css,/prefers-reduced-motion:reduce/);

// Exact return keeps the source-region locator across deepening.
assert.match(page,/returnTo:\s*exactReturn/);
assert.match(page,/#source-region-/);
assert.match(page,/locator:/);

console.log("Post2029 Reading Surface Golden contract: PASS");
