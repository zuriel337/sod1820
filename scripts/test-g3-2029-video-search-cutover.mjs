import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

const app2029 = read("src/App2029.jsx");
const videoPage = read("src/pages/VideoAssetPage.jsx");
const video2029 = read("src/pages/Video2029Page.jsx");
const vercel = JSON.parse(read("vercel.json"));
const og = read("api/og.js");
const migration = read("supabase/migrations/20260928133000_g3_2029_video_search_cutover_v1.sql");
const roadmap = read("SOD1820_MASTER_ROADMAP.md");
const plan = read("docs/2029-implementation-dependency-plan-v1.md");
const closure = read("docs/2029-search-indexing-closure-map-v1.md");

assert.match(app2029, /Video2029Page/);
assert.match(app2029, /path="\/video\/:assetId"/);
assert.match(video2029, /Sod2029Shell/);
assert.match(video2029, /surface="video"/);

const rewrites = vercel.rewrites || [];
assert.ok(rewrites.some(r => r.source === "/video/(.*)" && r.destination === "/2029.html"), "video must enter App2029");
assert.ok(rewrites.some(r => r.source === "/post/(.*)" && r.destination === "/2029.html"), "post must enter App2029");
assert.ok(rewrites.some(r => r.source === "/video/(.*)" && /api\/og\?path=\/video\/\$1&crawler=search/.test(r.destination || "") && Array.isArray(r.has)), "search crawler video metadata must be server-side");
assert.ok(rewrites.some(r => r.source === "/post/(.*)" && /api\/og\?path=\/post\/\$1&crawler=search/.test(r.destination || "") && Array.isArray(r.has)), "search crawler post metadata must be server-side");

assert.match(og, /key\.startsWith\('\/video\/'\)/);
assert.match(og, /video_media_assets_v1/);
assert.match(og, /key\.startsWith\('\/post\/'\) \? key\.slice\('\/post\/'\.length\)/);
assert.match(og, /videoCanonical \|\| canonical/);

assert.match(migration, /'https:\/\/sod1820\.co\.il\/post\/'\|\|p\.slug as page_url/);
assert.match(migration, /null::text as page_url/);
assert.match(migration, /false as dedicated_page/);
assert.match(migration, /'https:\/\/sod1820\.co\.il\/post\/'\|\|h\.slug/);

assert.match(videoPage, /\/els\?cipher=/);
assert.match(videoPage, /חזרה לעולם/);
assert.match(videoPage, /2029\(\?:\\\/\|\$\)/);

assert.match(roadmap, /2029 Search \/ Video Discovery Foundation/);
assert.match(roadmap, /source\/asset → 2029 projection → 2029 route/);
assert.match(plan, /#### 7D\.2 Unified Video \+ Search Discovery 2029/);
assert.match(plan, /Legacy routes\/data may feed the projection/);
assert.match(closure, /targets the \*\*2029 product tree only\*\*/);
assert.match(closure, /post-owned video converges on the 2029/);

console.log("g3-2029-video-search-cutover: PASS");
