#!/usr/bin/env node
// scripts/package-expression-extract.mjs
//
// Deterministic Git↔deploy packaging for the expression-extract Edge Function.
//
// Problem this solves: the Supabase Edge deploy sandbox mounts the function entrypoint at
// approximately /source/index.ts (one level deep), which is NOT the same depth as this file's real
// position in the repo (supabase/functions/expression-extract/index.ts). A raw upload of this file's
// own committed imports (../../../src/lib/triage.js, correct for the real repo layout) therefore
// fails to resolve at deploy time. The previous, now-corrected approach worked around this by hand-
// editing import paths and hand-trimming the shared library files into a second, forked copy before
// every deploy -- exactly the "two hand-edited implementations" this script exists to make impossible.
//
// This script bundles supabase/functions/expression-extract/index.ts with esbuild, which resolves
// every relative import against the REAL repository file tree (src/lib/triage.js,
// src/lib/analysisFlow.js, src/lib/gematria.js, src/theme.js -- read UNMODIFIED, byte-identical to
// what the browser bundle imports) and tree-shakes the result into a single self-contained ESM file
// with ZERO remaining relative imports. There is nothing left for any deploy sandbox to resolve at
// any mount depth -- this is a structural fix, not a guessed path depth.
//
// Usage:
//   node scripts/package-expression-extract.mjs
//   -> writes supabase/functions/expression-extract/.build/index.ts   (the bundle, gitignored)
//   -> writes supabase/functions/expression-extract/.build/manifest.json
//      { entrypoint_path, verify_jwt, files: [{ name: "index.ts", content }] }
//      ready to hand, unmodified, to a deploy call (mcp__Supabase__deploy_edge_function or the
//      Supabase CLI/Management API) -- Human-Gated, not invoked by this script.
//
// This script performs NO deploy call itself and reads NO secret. It is pure build tooling.
//
// esbuild is invoked via a pinned `npx esbuild@<version>` (child process), not imported as a project
// dependency -- this keeps the packaging tool fully decoupled from package.json/package-lock.json
// (Vite already carries its own, separately-versioned esbuild internally; this script must not force
// that shared version to move). npx caches the pinned version after the first run.

import { writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const ESBUILD_VERSION = "0.28.2"; // pinned; bump deliberately, independent of any other tool in this repo

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const FUNCTION_DIR = "supabase/functions/expression-extract";
const ENTRY = join(FUNCTION_DIR, "index.ts");
const OUT_DIR = join(FUNCTION_DIR, ".build");
const OUT_FILE = join(OUT_DIR, "index.ts");
const MANIFEST_FILE = join(OUT_DIR, "manifest.json");

const CANONICAL_SOURCES = [
  "src/theme.js",
  "src/lib/gematria.js",
  "src/lib/analysisFlow.js",
  "src/lib/triage.js",
  ENTRY,
];

async function main() {
  // Fail loudly, before bundling, if any canonical source file is missing -- never silently package
  // a stale/partial tree.
  for (const p of CANONICAL_SOURCES) {
    readFileSync(join(ROOT, p), "utf8");
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const rawOut = join(OUT_DIR, "_raw.js");

  // minify-syntax (not full minify) drops genuinely dead code -- e.g. theme.js's unrelated
  // POST_CONTENT_CSS/GLOBAL_CSS exports, which this function never imports -- while leaving
  // identifiers and structure readable for review. Correctness never depends on this; it is a
  // size/cleanliness improvement over the raw bundle, not part of the parity proof.
  execFileSync(
    "npx",
    [
      "--yes", `esbuild@${ESBUILD_VERSION}`,
      ENTRY,
      "--bundle",
      "--platform=neutral",
      "--format=esm",
      "--target=es2022",
      "--minify-syntax",
      `--outfile=${rawOut}`,
    ],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
  );

  const content = readFileSync(join(ROOT, rawOut), "utf8");
  rmSync(join(ROOT, rawOut));

  // Structural proof, not a guess: after bundling, no relative import specifier should remain --
  // that is precisely what makes this immune to the deploy sandbox's mount depth.
  const leftoverImports = [...content.matchAll(/\bimport\s*(?:[^'"]*?from\s*)?["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((spec) => spec.startsWith(".") || spec.startsWith("/"));
  if (leftoverImports.length) {
    console.error("PACKAGING FAILED: unresolved relative imports remain in the bundle:", leftoverImports);
    process.exit(1);
  }

  writeFileSync(join(ROOT, OUT_FILE), content, "utf8");

  // Provenance: the exact git blob hash of every canonical source file that fed this bundle, so the
  // manifest itself proves (not just claims) which committed content produced it -- cross-checkable
  // with `git ls-tree HEAD -- <path>` or `git hash-object <path>` by anyone, at any later point.
  let git_head = null;
  const source_git_blobs = {};
  try {
    git_head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
    for (const p of CANONICAL_SOURCES) {
      source_git_blobs[p] = execFileSync("git", ["hash-object", p], { cwd: ROOT, encoding: "utf8" }).trim();
    }
  } catch {
    // Not fatal -- packaging still works outside a git checkout; provenance fields stay null/partial.
  }

  const manifest = {
    name: "expression-extract",
    entrypoint_path: "index.ts",
    verify_jwt: true,
    generated_from: {
      entry: ENTRY,
      canonical_sources: CANONICAL_SOURCES.filter((p) => p !== ENTRY),
      bundler: "esbuild",
      git_head,
      source_git_blobs,
      bundle_sha256: createHash("sha256").update(content, "utf8").digest("hex"),
      generated_at: new Date().toISOString(),
    },
    files: [{ name: "index.ts", content }],
  };
  writeFileSync(join(ROOT, MANIFEST_FILE), JSON.stringify(manifest, null, 2), "utf8");

  console.log(`Packaged ${ENTRY} -> ${OUT_FILE} (${content.length} bytes, 0 unresolved relative imports).`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
  console.log(`git HEAD: ${git_head}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
