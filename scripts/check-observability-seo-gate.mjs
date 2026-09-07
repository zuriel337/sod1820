#!/usr/bin/env node
// SITE_WIDE_OBSERVABILITY_SEO_REMEDIATION_V1 (2026-09-07) — mechanical Build Gate checker.
//
// EXTEND_EXISTING: reuses the site's own existing SEO source-of-truth (ROUTE_META in routes.jsx,
// applySeo() calls) and existing analytics vocabulary (track()/trackAi()/trackResearch()/emit())
// as ground truth — this is NOT a new analytics/SEO engine, just a grep-based diagnostic over them.
//
// What it checks (the "SEO/INDEXABILITY DECISION" step of the proposed Build Gate from the
// Site-Wide Observability + SEO Completeness Gate V1 audit, work_log AFTER id 4ae30045).
// Refined per ZURIEL's architecture correction (2026-09-07, mid-remediation): the full gate is
//   IDENTITY → OBSERVABILITY → MEANINGFUL ACTION → ENGAGEMENT → ATTRIBUTION + RESEARCH CONTEXT
//   → SEO/INDEXABILITY DECISION.
// "RESEARCH CONTEXT" means: content/post telemetry must key off stable post identity (post.id/
// wp_id, as PostBySlugRoute already does — never posts.tags/posts.categories as an analytical
// taxonomy) and, where available, carry the resolved canonical entity/Research-Bus context —
// never a parallel post-analytics taxonomy or a second graph. This script does not check that
// dimension (it requires judgment about what "resolved Research Context" means per surface); see
// the human-read audit / AFTER work_log for the current state of that bridge.
//   Every <Route path="..."> registered in src/App.jsx must resolve to EITHER
//     (a) an exact-match entry in ROUTE_META (src/routes.jsx), OR
//     (b) a page component file that calls applySeo(...) itself.
//   A route with neither silently inherits stale title/canonical from the previous SPA route —
//   the exact bug this remediation pass fixed for 7 routes (see routes.jsx history 2026-09-07).
//
// This is a heuristic static check, not a full audit — dynamic routes with runtime-only branches,
// re-exported components, or applySeo() calls behind indirection may produce false positives.
// It does NOT check analytics/interaction instrumentation (that requires judgment about what a
// component's "core action" is — see the human-read audit for that). Run manually for now:
//   node scripts/check-observability-seo-gate.mjs
// Not wired into CI/build by this change — wiring it up is a separate decision for ZURIEL/GPT.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_JSX = path.join(ROOT, "src/App.jsx");
const ROUTES_JSX = path.join(ROOT, "src/routes.jsx");

function read(p) { return readFileSync(p, "utf8"); }

// --- 1. ROUTE_META keys (exact pathname match, per App.jsx's own lookup: ROUTE_META[pathname]) ---
const routesSrc = read(ROUTES_JSX);
const metaBlockMatch = routesSrc.match(/export const ROUTE_META = \{([\s\S]*?)\n\};/);
const routeMetaKeys = new Set(
  [...(metaBlockMatch?.[1] || "").matchAll(/^\s*"([^"]+)":/gm)].map(m => m[1])
);

// --- 2. Registered public routes in App.jsx: <Route path="/x" element={<Comp .../>} /> ---
const appSrc = read(APP_JSX);
// Capture the whole element={...} block for each Route, then pick the INNERMOST component tag
// (the real page), skipping known structural wrappers (Locked/Suspense/etc.) that gate access
// but aren't the page itself.
const WRAPPER_TAGS = new Set(["Locked", "Suspense", "React.Suspense", "PaletteProvider", "NumHrefCtx.Provider"]);
const routeRe = /<Route\s+path="([^"]+)"\s+element=\{([\s\S]*?)\}\s*\/>/g;
const routes = [];
let m;
while ((m = routeRe.exec(appSrc))) {
  const [, routePath, elementSrc] = m;
  const tags = [...elementSrc.matchAll(/<([A-Z][\w.]*)/g)].map(t => t[1]);
  const component = tags.filter(t => !WRAPPER_TAGS.has(t)).pop() || tags[0];
  if (component) routes.push({ path: routePath, component });
}

// Admin/dev/internal prefixes explicitly out of scope for the public SEO gate
// (mirrors the audit's own "classified separately, not mixed into the public matrix" rule).
const OUT_OF_SCOPE = [
  "/admin", "/research-viewer", "/entity-hub-preview", "/meaning-lab", "/מעבדת-משמעות",
  "/dev/", "/traffic", "/numbers-report", "/editor", "/lab", "/theme-preview",
];
const isOutOfScope = (p) => OUT_OF_SCOPE.some(prefix => p === prefix || p.startsWith(prefix));

// --- 3. Map component name -> its source file: build a name->relpath table from every
//        `import Default from "..."` and `const X = lazy(() => import("..."))` line in App.jsx,
//        rather than searching per-component (fragile against multi-line/reordered imports). ---
const importMap = new Map();
for (const im of appSrc.matchAll(/^import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\})?\s*from\s*"([^"]+)"/gm)) {
  importMap.set(im[1], im[2]);
}
for (const im of appSrc.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:React\.)?lazy\(\s*\(\)\s*=>\s*import\("([^"]+)"\)/gm)) {
  importMap.set(im[1], im[2]);
}
// A handful of routes render a local wrapper component (defined in App.jsx itself, e.g. GematriaToLab,
// PostBySlugRoute) or React.Fragment/Navigate directly — those aren't resolvable to a page file and
// are intentionally left to "unresolved" rather than guessed at.
function resolveComponentFile(component) {
  const rel = importMap.get(component);
  if (!rel) return null;
  const resolved = path.resolve(path.dirname(APP_JSX), rel);
  for (const ext of ["", ".jsx", ".js"]) {
    if (existsSync(resolved + ext)) return resolved + ext;
  }
  return null;
}

const gaps = [];
const skipped = [];
for (const { path: routePath, component } of routes) {
  if (isOutOfScope(routePath)) continue;
  if (routeMetaKeys.has(routePath)) continue; // (a) covered by ROUTE_META
  const file = resolveComponentFile(component);
  if (!file) { skipped.push({ routePath, component, reason: "could not resolve component file" }); continue; }
  const src = read(file);
  if (/\bapplySeo\s*\(/.test(src)) continue; // (b) self-manages SEO
  gaps.push({ routePath, component, file: path.relative(ROOT, file) });
}

console.log(`SEO/Indexability Build Gate — ${routes.length} routes scanned, ${gaps.length} gap(s), ${skipped.length} unresolved.\n`);

if (gaps.length) {
  console.log("❌ Routes with NO ROUTE_META entry and NO applySeo() call (stale-metadata risk):");
  for (const g of gaps) console.log(`   ${g.routePath}  →  ${g.component}  (${g.file})`);
  console.log("");
}
if (skipped.length) {
  console.log("⚠️  Could not resolve (check manually):");
  for (const s of skipped) console.log(`   ${s.routePath} → ${s.component}: ${s.reason}`);
  console.log("");
}

if (gaps.length === 0) {
  console.log("✅ Every in-scope public route has either a ROUTE_META entry or its own applySeo() call.");
}

process.exitCode = gaps.length ? 1 : 0;
