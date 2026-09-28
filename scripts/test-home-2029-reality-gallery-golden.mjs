import assert from "node:assert/strict";
import fs from "node:fs";

const home = fs.readFileSync("src/pages/Home2029Page.jsx", "utf8");
const projection = fs.readFileSync("src/lib/research/home2029Projection.js", "utf8");
const css = fs.readFileSync("src/components/experience2029/sod2029-closed.css", "utf8");
const roadmap = fs.readFileSync("SOD1820_MASTER_ROADMAP.md", "utf8");

assert.match(home, /data-experience-capability="home-reality-gallery"/);
assert.match(home, /\/2029\/number\/\$\{id\}/);
assert.match(home, /source:\s*"reality_stream"/);
assert.equal(home.includes('navigate("/archive")'), false);
assert.match(projection, /getGalleryUpdates\(10\)/);
assert.match(projection, /realityGallery/);
assert.match(projection, /legacyLog/);
assert.match(css, /\.sod29-home-reality-gallery\{/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(roadmap, /Reality Stream 2029 \/ Home Golden Gallery/);
assert.match(roadmap, /number_sets.*currently empty live/);

console.log("Home 2029 Reality Gallery Golden: PASS");
