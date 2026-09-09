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
//     (b) a page component file that calls applySeo(...) itself, OR
//     (c) an explicit SEO_GATE_DELEGATE wrapper whose target satisfies (b).
//   A route with neither silently inherits stale title/canonical from the previous SPA route —
//   the exact bug this remediation pass fixed for 7 routes (see routes.jsx history 2026-09-07).
//
// This is a heuristic static check, not a full audit — dynamic routes with runtime-only branches,
// re-exported components, or applySeo() calls behind indirection may produce false positives.
// Explicit SEO_GATE_DELEGATE markers are fail-loud: the target must exist and itself resolve to
// applySeo() (directly or through another explicit delegate), so wrappers cannot silently bypass the gate.
// It does NOT check analytics/interaction instrumentation (that requires judgment about what a
// component's "core action" is — see the human-read audit for that). Run manually for now:
//   node scripts/check-observability-seo-gate.mjs
// Wired into CI via .github/workflows/observability-seo-gate.yml (SOD1820_OBSERVABILITY_SEO_BUILD_GATE_CI).
//
// BASELINE (CI_BASELINE_RECONCILIATION, 2026-09-07): gap-DETECTION logic below (everything through
// building `gaps`/`skipped`) is UNCHANGED from the original script — this section only adds
// reviewable, explicit reporting on top of it, per instruction not to touch checker semantics:
//   - A detected gap whose (path, component) exact pair appears in
//     scripts/observability-seo-gate-baseline.json is a known, already-reviewed debt: printed for
//     visibility, does NOT fail the process.
//   - Any detected gap NOT in the baseline is NEW: printed, and DOES fail the process (exit 1).
//   - A baseline entry that no longer matches a detected gap is RESOLVED: printed as informational
//     ("remove me"), does NOT fail — but leaving it in place also does not re-allow a future
//     regression on that route once removed, since matching is exact (path AND component), not a
//     wildcard/prefix — the moment the entry is deleted, that route is fully back under NEW-gap
//     rules with no special-casing needed here.
// No continue-on-error, no prefix/regex suppression: baseline membership is an exact-pair lookup.

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
  "/admin", "/research-viewer", "/entity-hub-preview", "/explorer-preview", "/meaning-lab", "/מעבדת-משמעות",
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

function resolveFileRef(fromFile, rel) {
  const resolved = path.resolve(path.dirname(fromFile), rel);
  for (const ext of ["", ".jsx", ".js"]) {
    if (existsSync(resolved + ext)) return resolved + ext;
  }
  return null;
}

function hasSeoCoverage(file, seen = new Set()) {
  const canonicalFile = path.resolve(file);
  if (seen.has(canonicalFile)) return false;
  seen.add(canonicalFile);

  const src = read(canonicalFile);
  if (/\bapplySeo\s*\(/.test(src)) return true;

  // Explicit wrapper delegation only. This avoids guessing through arbitrary child imports while
  // allowing thin route wrappers (experiments/access shells/etc.) to name their actual SEO owner.
  const delegated = src.match(/^\s*\/\/\s*SEO_GATE_DELEGATE:\s*(\S+)\s*$/m)?.[1];
  if (!delegated) return false;
  const target = resolveFileRef(canonicalFile, delegated);
  return target ? hasSeoCoverage(target, seen) : false;
}

const gaps = [];
const skipped = [];
for (const { path: routePath, component } of routes) {
  if (isOutOfScope(routePath)) continue;
  if (routeMetaKeys.has(routePath)) continue; // (a) covered by ROUTE_META
  const file = resolveComponentFile(component);
  if (!file) { skipped.push({ routePath, component, reason: "could not resolve component file" }); continue; }
  if (hasSeoCoverage(file)) continue; // (b) direct applySeo or (c) explicit delegated SEO owner
  gaps.push({ routePath, component, file: path.relative(ROOT, file) });
}

// --- 4. Baseline partitioning (reporting-only — does not touch gap detection above) ---
const BASELINE_PATH = path.join(ROOT, "scripts/observability-seo-gate-baseline.json");
const baselineKey = (r) => `${r.path} ${r.component}`;
let baselineEntries = [];
if (existsSync(BASELINE_PATH)) {
  try {
    baselineEntries = JSON.parse(read(BASELINE_PATH)).routes || [];
  } catch (e) {
    console.error(`⚠️  Could not parse ${path.relative(ROOT, BASELINE_PATH)}: ${e.message}`);
    process.exitCode = 1;
  }
}
const baselineSet = new Set(baselineEntries.map(baselineKey));
const gapKey = (g) => `${g.routePath} ${g.component}`;

const knownGaps = gaps.filter((g) => baselineSet.has(gapKey(g)));
const newGaps = gaps.filter((g) => !baselineSet.has(gapKey(g)));
const detectedGapKeys = new Set(gaps.map(gapKey));
const resolvedBaseline = baselineEntries.filter((r) => !detectedGapKeys.has(baselineKey(r)));

console.log(`SEO/Indexability Build Gate — ${routes.length} routes scanned, ${gaps.length} gap(s) (${knownGaps.length} baseline, ${newGaps.length} new), ${skipped.length} unresolved.\n`);

if (newGaps.length) {
  console.log("❌ NEW gaps (not in baseline — FAIL):");
  for (const g of newGaps) console.log(`   ${g.routePath}  →  ${g.component}  (${g.file})`);
  console.log("");
}
if (knownGaps.length) {
  console.log("⚠️  BASELINE gaps (known, reviewed, allowed — see scripts/observability-seo-gate-baseline.json):");
  for (const g of knownGaps) console.log(`   ${g.routePath}  →  ${g.component}  (${g.file})`);
  console.log("");
}
if (resolvedBaseline.length) {
  console.log("✅ RESOLVED baseline entries (no longer a gap — remove from baseline file):");
  for (const r of resolvedBaseline) console.log(`   ${r.path}  →  ${r.component}`);
  console.log("");
}
if (skipped.length) {
  console.log("⚠️  Could not resolve (check manually):");
  for (const s of skipped) console.log(`   ${s.routePath} → ${s.component}: ${s.reason}`);
  console.log("");
}

if (gaps.length === 0) {
  console.log("✅ Every in-scope public route has either a ROUTE_META entry or its own applySeo() call.");
} else if (newGaps.length === 0) {
  console.log(`✅ No new gaps — all ${knownGaps.length} remaining gap(s) are already in the reviewed baseline.`);
}

process.exitCode = process.exitCode || (newGaps.length ? 1 : 0);
