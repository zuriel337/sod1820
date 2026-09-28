import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isKnownSingleSegmentRoute,
  isSingleSegmentRoute,
  postSlugVariants,
} from "../route-legitimacy.js";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const app = read("src/App.jsx");
const app2029 = read("src/App2029.jsx");
const middleware = read("middleware-core.js");
const migration = read("supabase/migrations/20260928103044_route_legitimacy_2029_v1.sql");
const notFound = read("src/pages/NotFoundPage.jsx");
const vercel = JSON.parse(read("vercel.json"));
const closure = read("docs/2029-search-indexing-closure-map-v1.md");

// Every exact single-segment App route must bypass post-slug validation.
const appRoutes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(m => m[1]);
const singleStatic = appRoutes.filter(p => {
  if (!p.startsWith("/")) return false;
  const rest = p.slice(1);
  return rest && !rest.includes("/") && !rest.includes(":") && !rest.includes("*");
});
for (const route of singleStatic) {
  assert.equal(isKnownSingleSegmentRoute(route), true, `known App route missing from route legitimacy projection: ${route}`);
}

// Every exact single-segment Vercel redirect source must also bypass validation.
const redirectSingles = (vercel.redirects || []).map(r => r.source).filter(p => {
  if (!p.startsWith("/")) return false;
  const rest = p.slice(1);
  return rest && !rest.includes("/") && !rest.includes("(") && !rest.includes(":") && !rest.includes("*");
});
for (const route of redirectSingles) {
  assert.equal(isKnownSingleSegmentRoute(route), true, `known Vercel redirect missing: ${route}`);
}

assert.equal(isSingleSegmentRoute("/real-slug"), true);
assert.equal(isSingleSegmentRoute("/codes/foo"), false);
assert.equal(isKnownSingleSegmentRoute("/definitely-not-a-static-route"), false);

const variants = postSlugVariants("/%D7%AA%D7%A9%D7%A4%D7%96");
assert.ok(variants.decoded.length > 0);
assert.ok(variants.encodedLower == null || variants.encodedLower === variants.encodedLower.toLowerCase());

// DB lookup is exact, indexed, public-read-safe and not SECURITY DEFINER.
assert.match(migration, /create index if not exists idx_posts_slug_route[\s\S]*on public\.posts \(slug\)/i);
assert.match(migration, /create or replace function public\.public_post_slug_exists/i);
assert.match(migration, /where p\.slug = btrim\(p_slug\)[\s\S]*p\.slug = btrim\(p_encoded_slug\)/i);
assert.doesNotMatch(migration, /security\s+definer/i);

// Edge check is bounded, cached, fail-open and returns a real 404 only on known false.
assert.match(middleware, /POST_ROUTE_CACHE_MS = 10 \* 60 \* 1000/);
assert.match(middleware, /POST_ROUTE_CACHE_MAX = 512/);
assert.match(middleware, /rpc\/public_post_slug_exists/);
assert.match(middleware, /if \(!r\.ok\) return null/);
assert.match(middleware, /if \(exists === false\) return routeNotFoundResponse\(\)/);
assert.match(middleware, /status: 404/);
assert.match(middleware, /x-sod-route': 'not-found'/);
assert.match(app2029, /path="\/post\/:slug"/);
assert.match(app2029, /path="\/video\/:assetId"/);
assert.match(middleware, /const post2029 = path\.match\(\/\^\\\/post\\\/\(\[\^\/\]\+\)\\\/\?\$\//);
assert.match(middleware, /publicPostSlugExists\('\/' \+ post2029\[1\]\)/);
assert.match(middleware, /const video2029 = path\.match\(\/\^\\\/video\\\/\(\[\^\/\]\+\)\\\/\?\$\//);
assert.match(middleware, /!\/\^\[0-9a-f\]\{32\}\$\/i\.test\(video2029\[1\]\)/);

// Security/country policy must run before route legitimacy, so this slice changes routing only.
const quarantinePos = middleware.indexOf("Smart Quarantine 2029");
const routePos = middleware.indexOf("Route legitimacy runs only after security/quarantine decisions");
assert.ok(quarantinePos >= 0 && routePos > quarantinePos, "route legitimacy must run after quarantine policy");

// SPA wildcard no longer soft-redirects home; it is noindex.
assert.match(app, /<Route path="\*" element=\{<NotFoundPage \/>\} \/>/);
assert.doesNotMatch(app, /<Route path="\*" element=\{<Navigate to="\/" replace \/>\} \/>/);
assert.match(notFound, /noindex: true/);
assert.match(notFound, /404 · SOD1820/);

// Closure doc stays honest about residual dynamic-route false IDs.
assert.match(closure, /LIVE_VERIFY/);
assert.match(closure, /RESIDUAL/);
assert.match(closure, /fail-open/);

console.log("route-legitimacy-2029: PASS");
