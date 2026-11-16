// Shell budget ratchet (ZURIEL 16.11.2026: "no session may dress the old shell again").
//
// What every 2029 page pays before its own code: the eager entry graph and the System Frame (Sod2029Shell) with its CSS. This gate reads the
// production build (dist/.vite/manifest.json, run after `npm run build`) and fails when any of those grows past the committed baseline, or when one
// of the always-loaded files gains a new STATIC import. The baseline only moves down on its own (`--lower`); moving it up is a ZURIEL decision that
// must be recorded in the baseline history (by: "ZURIEL" and a reason) — the history is checked here, so a silent raise fails.
//
// The right way to add a capability to the frame is a lazy slot (React.lazy + Suspense), a signed-in-only import, or a load on demand — the
// failure message says so. Static imports are compared exactly (adding one fails; removing one passes and asks for `--lower`).
//
//   npm run build && node scripts/test-2029-shell-budget.mjs           check (full)
//   node scripts/test-2029-shell-budget.mjs --imports-only               check the static imports only (no build needed)
//   node scripts/test-2029-shell-budget.mjs --lower                      after a reduction: write the lower numbers into the baseline
//
// Builds that set VITE_* flags (some acceptance jobs) change the bundle slightly: there the byte/file numbers are reported, not enforced, unless
// SHELL_BUDGET_ENFORCE=1. The perf-contracts-2029 job builds without them and enforces everything.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const BASELINE = path.join(root, "scripts/2029-shell-budget-baseline.json");
const args = new Set(process.argv.slice(2));
const lower = args.has("--lower");
const importsOnly = args.has("--imports-only");

// The always-loaded sources whose STATIC imports are pinned (React.lazy/dynamic import() are not static and stay free).
export const GUARDED_SOURCES = Object.freeze([
  "src/main2029.jsx",
  "src/App2029.jsx",
  "src/components/experience2029/Sod2029Shell.jsx",
  "src/components/experience2029/SystemFrame2029.jsx",
  "src/lib/supabase.js",
  "src/lib/AuthContext.jsx",
  "src/lib/research/ResearchProvider.jsx",
]);

// Static import specifiers of one source file: `import x from "y"`, `import "y.css"`, `export ... from "y"` (multi-line import lists included).
export function staticImports(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const out = new Set();
  for (const m of code.matchAll(/^\s*(?:import|export)\s+(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/gm)) out.add(m[1]);
  return [...out].sort();
}

const gzip = (file) => zlib.gzipSync(fs.readFileSync(path.join(root, "dist", file))).length;

export function measureBuild(manifest, { sizeOf = gzip } = {}) {
  const records = Object.entries(manifest);
  const entry = records.find(([key, r]) => key === "2029.html" || r?.isEntry)?.[0];
  assert.ok(entry, "2029 entry missing from the Vite manifest");
  const closure = (start) => { const seen = new Set(); const visit = (k) => { if (!k || seen.has(k)) return; seen.add(k); for (const d of manifest[k]?.imports || []) visit(d); }; visit(start); return seen; };
  const eager = closure(entry);
  const shellKey = records.find(([, r]) => r?.name === "Sod2029Shell" && !r.isEntry)?.[0];
  assert.ok(shellKey, "Sod2029Shell chunk missing from the Vite manifest");
  const frame = [...closure(shellKey)].filter((k) => !eager.has(k));
  const js = (keys) => keys.map((k) => manifest[k].file).filter((f) => f?.endsWith(".js"));
  const css = (keys) => [...new Set(keys.flatMap((k) => manifest[k].css || []))];
  const eagerCss = new Set(css([...eager]));
  const sum = (files) => files.reduce((total, f) => total + sizeOf(f), 0);
  return {
    eagerJsFiles: js([...eager]).length,
    eagerJsGzip: sum(js([...eager])),
    frameJsFiles: js(frame).length,
    frameJsGzip: sum(js(frame)),
    frameCssGzip: sum(css(frame).filter((f) => !eagerCss.has(f))),
  };
}

export function readStaticImports() {
  return Object.fromEntries(GUARDED_SOURCES.map((p) => [p, staticImports(fs.readFileSync(path.join(root, p), "utf8"))]));
}

// The history is the audit trail: every entry that raises a number or adds a static import must be a recorded ZURIEL decision.
export function validateHistory(baseline) {
  const h = baseline.history;
  assert.ok(Array.isArray(h) && h.length > 0, "baseline history is missing");
  const last = h.at(-1);
  assert.deepEqual(last.metrics, baseline.metrics, "baseline metrics must equal the last history entry (edit the history, not the numbers)");
  assert.deepEqual(last.staticImports, baseline.staticImports, "baseline static imports must equal the last history entry");
  for (let i = 1; i < h.length; i++) {
    const before = h[i - 1], after = h[i];
    const raised = Object.keys(after.metrics).filter((k) => after.metrics[k] > (before.metrics[k] ?? Infinity));
    const added = Object.entries(after.staticImports).flatMap(([file, list]) => list.filter((s) => !(before.staticImports[file] || []).includes(s)).map((s) => `${file} -> ${s}`));
    if (raised.length || added.length) {
      assert.equal(after.by, "ZURIEL", `history entry ${i} (${after.date}) raises ${[...raised, ...added].join(", ")} without a ZURIEL decision`);
      assert.ok(typeof after.reason === "string" && after.reason.trim().length >= 10, `history entry ${i}: a raise needs its reason`);
    }
  }
}

function gitSha() { try { return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch { return null; } }

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
  validateHistory(baseline);
  const imports = readStaticImports();
  const failures = [];
  const removals = [];
  for (const file of GUARDED_SOURCES) {
    const want = baseline.staticImports[file] || [];
    const have = imports[file];
    for (const spec of have.filter((s) => !want.includes(s)))
      failures.push(`${file}: new static import "${spec}". The frame and the entry load on every page: make it a lazy slot (React.lazy + Suspense), import it only for a signed-in viewer, or load it on demand. A deliberate raise is a ZURIEL decision recorded in ${path.relative(root, BASELINE)} (history, by: "ZURIEL").`);
    for (const spec of want.filter((s) => !have.includes(s))) removals.push(`${file}: "${spec}" removed`);
  }

  let metrics = null;
  const flagged = Object.keys(process.env).filter((k) => k.startsWith("VITE_"));
  const enforceBytes = !flagged.length || process.env.SHELL_BUDGET_ENFORCE === "1";
  if (!importsOnly) {
    const manifestPath = path.join(root, "dist/.vite/manifest.json");
    assert.ok(fs.existsSync(manifestPath), "dist/.vite/manifest.json missing: run `npm run build` first (or use --imports-only)");
    metrics = measureBuild(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
    const rows = [];
    for (const [key, base] of Object.entries(baseline.metrics)) {
      const now = metrics[key];
      const limit = base + (baseline.tolerance[key] ?? 0);
      const status = now > limit ? "GROWTH" : now < base ? "lower" : "ok";
      rows.push([key, base, now, now - base, limit, status]);
      if (status === "GROWTH" && enforceBytes)
        failures.push(`${key}: ${now} > ${limit} (baseline ${base} + tolerance ${baseline.tolerance[key] ?? 0}). Every page pays this before its own code. Move the new part behind a lazy slot or a signed-in/on-demand load; a deliberate raise is a ZURIEL decision recorded in the baseline history.`);
    }
    console.log("2029 shell budget (gzip bytes / files, from dist/.vite/manifest.json)");
    for (const [k, b, n, d, l, s] of rows) console.log(`  ${k.padEnd(14)} baseline ${String(b).padStart(7)}  now ${String(n).padStart(7)}  delta ${String(d >= 0 ? "+" + d : d).padStart(7)}  limit ${String(l).padStart(7)}  ${s}`);
    if (!enforceBytes) console.log(`  (bytes reported, not enforced: this build sets ${flagged.join(", ")}; perf-contracts-2029 enforces them)`);
  }
  for (const r of removals) console.log(`  static import ${r} — run with --lower to record the reduction`);

  if (lower) {
    if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
    assert.ok(metrics, "--lower needs the build (not --imports-only)");
    const next = { metrics: Object.fromEntries(Object.entries(baseline.metrics).map(([k, v]) => [k, Math.min(v, metrics[k])])), staticImports: imports };
    const changed = JSON.stringify(next.metrics) !== JSON.stringify(baseline.metrics) || JSON.stringify(next.staticImports) !== JSON.stringify(baseline.staticImports);
    if (!changed) { console.log("nothing to lower"); process.exit(0); }
    baseline.metrics = next.metrics; baseline.staticImports = next.staticImports;
    baseline.history.push({ date: new Date().toISOString().slice(0, 10), by: "ratchet", sha: gitSha(), reason: "measured reduction (--lower)", metrics: next.metrics, staticImports: next.staticImports });
    validateHistory(baseline);
    fs.writeFileSync(BASELINE, JSON.stringify(baseline, null, 2) + "\n");
    console.log(`baseline lowered and recorded (${path.relative(root, BASELINE)})`);
    process.exit(0);
  }
  if (failures.length) { console.error("2029 shell budget: FAIL\n  " + failures.join("\n  ")); process.exit(1); }
  console.log(`2029 shell budget: PASS${importsOnly ? " (static imports only)" : ""}`);
}
