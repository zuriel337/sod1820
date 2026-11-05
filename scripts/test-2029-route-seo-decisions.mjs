// Every public route registered in src/App2029.jsx must carry an EXPLICIT search/indexing decision.
// Replaces the Legacy route-SEO gate (check-observability-seo-gate, which read the retired src/App.jsx).
// No second SEO engine and no blanket baseline: the sources of truth are the existing ones, read as they are.
//   A. api/og.js        - the route (or its static prefix, for parameter routes) is registered in the server metadata layer
//   B. route-legitimacy - exact single-segment route in KNOWN_SINGLE_SEGMENT_ROUTES (Edge legitimacy owner)
//   C. vercel.json      - an explicit X-Robots-Tag noindex header matching the route
//   D. page             - the page component calls applySeo({ ... noindex: true })
//   E. preview flag     - the <Route> is compiled out of production by a build-time VITE_* === "true" flag
// A route with none of A-E fails the gate: there is no baseline and no allow-list.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const app = read("src/App2029.jsx");
const og = read("api/og.js");
const routeLegitimacy = read("route-legitimacy.js");
const vercel = JSON.parse(read("vercel.json"));

// --- routes ---------------------------------------------------------------------------------------------------------
const routes = [];
for (const m of app.matchAll(/<Route\b([\s\S]*?)(?:\/>|<\/Route>)/g)) {
  const pathMatch = m[1].match(/path="([^"]+)"/);
  if (!pathMatch) continue;
  const before = app.slice(Math.max(0, m.index - 160), m.index);
  routes.push({ path: pathMatch[1], element: m[1], before });
}
assert.ok(routes.length > 40, `expected the 2029 router to register its routes (found ${routes.length})`);

// --- import map (component name -> file) ------------------------------------------------------------------------------
const files = new Map();
for (const m of app.matchAll(/(?:const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\("([^"]+)"\)|import\s+(\w+)\s+from\s+"([^"]+)")/g)) {
  const name = m[1] || m[3];
  const spec = m[2] || m[4];
  if (spec.startsWith(".")) files.set(name, path.join("src", spec.replace(/^\.\//, "")));
}
const pageNoindex = (element) => {
  for (const c of element.matchAll(/<([A-Z]\w+)/g)) {
    const file = files.get(c[1]);
    if (file && fs.existsSync(file) && /applySeo\([\s\S]{0,600}?noindex:\s*true/.test(fs.readFileSync(file, "utf8"))) return file;
  }
  return null;
};

// --- decision sources ---------------------------------------------------------------------------------------------------
const staticPrefix = (route) => route.split(/[:*]/)[0];
const registeredInOg = (route) => {
  const hasParam = /[:*]/.test(route);
  const literal = hasParam ? staticPrefix(route) : route;
  const escaped = literal.replace(/\//g, "\\\\?/");
  return [`'${literal}'`, `"${literal}"`, `\`${literal}\``, `'${literal}/`, `"${literal}/`].some((s) => og.includes(s))
    || (hasParam && new RegExp(escaped.replace(/\\\\\?\//g, "\\\\\\/")).test(og));
};
// og.js also dispatches by regular expression (e.g. /^\/forum(?:\/|$)/): evaluate those real literals against a sample path.
const ogRegexes = [...og.matchAll(/\/(\^\\\/[^\n]*?)\/[gimsuy]*\.test\(decodedKey\)/g)].flatMap((m) => {
  try { return [new RegExp(m[1])]; } catch { return []; }
});
const registeredByOgRegex = (route) => ogRegexes.some((re) => re.test(sample(route)));
// /tag/:slug and /category/:slug: og.js asks the taxonomy route owner; the real function answers (no copy of its rules here).
const { postsTaxonomyRoute2029 } = await import(new URL("../src/lib/research/postsTaxonomy2029Route.js", import.meta.url));
assert.match(og, /postsTaxonomyRoute2029\(key,/, "api/og.js must keep asking the taxonomy route owner");
assert.match(og, /\}\s*else if \(taxonomy\)\s*\{/, "api/og.js must keep a taxonomy metadata branch");
const registeredByTaxonomyOwner = (route) => /^\/(tag|category)\//.test(route) && Boolean(postsTaxonomyRoute2029(sample(route), ""));
const knownSingleSegment = (route) => /^\/[^/:*]+$/.test(route) && routeLegitimacy.includes(`"${route}",`);
const toRegex = (source) => new RegExp("^" + source
  .replace(/\(\.\*\)/g, ".*").replace(/:[A-Za-z]+\*/g, ".*").replace(/:[A-Za-z]+/g, "[^/]+").replace(/\?/g, "\\?") + "$");
const sample = (route) => route.replace(/:[A-Za-z]+/g, "x");
const noindexHeaders = (vercel.headers || []).filter((h) => (h.headers || []).some((x) => String(x.key).toLowerCase() === "x-robots-tag" && /noindex/i.test(x.value)));
const vercelNoindex = (route) => noindexHeaders.some((h) => { try { return toRegex(h.source).test(sample(route)); } catch { return false; } });
const flagNames = new Set([...app.matchAll(/const\s+(\w+)\s*=\s*import\.meta\.env\.VITE_[A-Z0-9_]+\s*===\s*"true"\s*;/g)].map((m) => m[1]));
const previewFlagged = (before) => /import\.meta\.env\.VITE_[A-Z0-9_]+\s*===\s*"true"\s*&&\s*$/.test(before)
  || [...flagNames].some((n) => new RegExp(`\\b${n}\\s*&&\\s*$`).test(before));

// --- evaluation ---------------------------------------------------------------------------------------------------------
const undecided = [];
const decisions = new Map();
for (const { path: route, element, before } of routes) {
  if (route === "*") continue; // asserted below
  if (route === "/:slug") continue; // post/slug addresses: Edge legitimacy (route-legitimacy.js postSlugVariants) - asserted below
  const found = [];
  if (registeredInOg(route)) found.push("api/og.js");
  if (registeredByOgRegex(route)) found.push("api/og.js (regex dispatch)");
  if (registeredByTaxonomyOwner(route)) found.push("api/og.js (taxonomy owner)");
  if (knownSingleSegment(route)) found.push("route-legitimacy");
  if (vercelNoindex(route)) found.push("vercel noindex header");
  const noindexFile = pageNoindex(element);
  if (noindexFile) found.push(`page noindex (${noindexFile})`);
  if (previewFlagged(before)) found.push("build-time preview flag");
  if (found.length === 0) undecided.push(route);
  decisions.set(route, found);
}
assert.deepEqual(undecided, [], `public 2029 routes without an explicit search/indexing decision:\n  ${undecided.join("\n  ")}\n` +
  "Register the route in api/og.js / route-legitimacy.js, add an explicit X-Robots-Tag noindex header in vercel.json, or set noindex in the page's applySeo.");

// Catch-alls: the slug route is resolved by the Edge legitimacy layer; unknown addresses end in a noindex 404.
assert.match(read("middleware-core.js"), /route-legitimacy\.js/, "middleware must bind the route legitimacy owner for /:slug");
assert.match(routeLegitimacy, /export function postSlugVariants/);
assert.match(read("src/pages/NotFound2029Page.jsx"), /noindex:\s*true/, "the wildcard 404 must be noindex");
assert.match(app, /<Route path="\*" element=\{<PublicServices2029Page kind="not-found" \/>\} \/>/);

if (process.env.SEO_DECISIONS_VERBOSE) for (const [r, f] of decisions) console.log(r.padEnd(34), f.join(" + "));
console.log(`2029 route SEO decisions: PASS (${decisions.size} routes decided)`);
