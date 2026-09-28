import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

const migration = read("supabase/migrations/20260928101719_search_indexing_2029_v1.sql");
const entity = read("src/pages/EntityPageBase.jsx");
const sitemap = read("api/sitemap.js");
const legacy = read("src/legacy/legacy.jsx");
const seo = read("src/lib/seo.js");
const robots = read("public/robots.txt");
const vercel = JSON.parse(read("vercel.json"));
const map = read("docs/2029-search-indexing-closure-map-v1.md");

// Phrase indexability is one DB decision shared by robots + sitemap.
assert.match(migration, /create or replace view public\.sitemap_phrases_v1[\s\S]*security_invoker=true/i);
assert.match(migration, /coalesce\(is_verified,false\)[\s\S]*coalesce\(is_published,false\)[\s\S]*visibility_tier/i);
assert.match(migration, /create or replace function public\.is_phrase_indexable\(p_phrase text\)/i);
assert.match(migration, /from public\.sitemap_phrases_v1/i);
assert.match(entity, /rpc\("is_phrase_indexable", \{ p_phrase:/);
assert.match(entity, /const entityNoindex = searchAdmitted !== true/);
assert.match(entity, /const showEntityLd = searchAdmitted === true/);
assert.match(sitemap, /sitemap_phrases_v1\?select=phrase,lastmod/);
assert.match(sitemap, /if \(!phrase \|\| \/\^\\d\+\$\/\.test\(phrase\)\) continue/);

// Missing/unverifiable post slugs fail closed at client SEO level.
assert.match(legacy, /title: "העמוד לא נמצא"[\s\S]*noindex: true/);
assert.match(legacy, /title: "העמוד אינו זמין כרגע"[\s\S]*noindex: true/);
assert.match(legacy, /clearPostVideoJsonLd\(\)/);

// Video uploadDate uses ISO 8601 with timezone.
assert.match(seo, /function videoUploadDate\(raw\)/);
assert.match(seo, /T00:00:00\+00:00/);
assert.match(seo, /uploadDate: videoUploadDate/);

// Public search surfaces are not intentionally disallowed in robots.txt.
assert.match(robots, /User-agent:\s*\*/i);
assert.match(robots, /Allow:\s*\//i);
for (const publicPath of ["/video", "/number", "/codes", "/post", "/world", "/or-geula"]) {
  assert.equal(new RegExp(`Disallow:\\s*${publicPath}(?:\\s|$)`, "i").test(robots), false,
    `${publicPath} must not be intentionally blocked for public crawlers`);
}

// Vercel still has an SPA catch-all, but ROUTE_LEGITIMACY_2029 closes the main legacy /:slug
// soft-404 source at Edge. The map must remain explicit about residual nested/dynamic false IDs.
const spaCatchAll = (vercel.rewrites || []).some(r => r.source === "/(.*)" && r.destination === "/index.html");
assert.equal(spaCatchAll, true, "SPA catch-all still exists; route legitimacy must remain an explicit Edge layer");
assert.match(map, /LIVE_VERIFY/);
assert.match(map, /RESIDUAL/);
assert.match(map, /HTTP 404 at Edge/);
assert.match(map, /GSC_VERIFIED/);

console.log("search-indexing-2029: PASS");
