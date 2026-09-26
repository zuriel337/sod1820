#!/usr/bin/env node
// scripts/package-research-run.mjs
//
// Deterministic Git<->deploy packaging for the research-run Edge Function.
//
// Same deploy-sandbox problem as scripts/package-expression-extract.mjs: the Supabase Edge deploy
// sandbox mounts the function entrypoint roughly one level deep, which is NOT this file's real
// position in the repo (supabase/functions/research-run/index.ts), so a raw upload of this file's own
// committed relative imports (../../../src/lib/research/*.js) cannot resolve at deploy time.
//
// This script bundles supabase/functions/research-run/index.ts with esbuild, which resolves every
// relative import against the REAL repository file tree and tree-shakes the result into a single
// self-contained ESM file with ZERO remaining relative imports. There is nothing left for any deploy
// sandbox to resolve at any mount depth.
//
// COMMITTED-SOURCE PROVENANCE GUARD: research-run's canonical source tree (researchComposerW2.js ->
// researchPlanV2.js -> razielRouteGrammar.js -> ..., researchW2ExecutorsBase.js -> numericResearch.js
// -> ..., researchRunRequest.js) is materially larger and more likely to change than
// expression-extract's fixed two-file list, so this script does not hand-maintain a canonical source
// list. Instead it bundles FIRST with `--metafile`, reads back esbuild's own record of every local
// file it actually pulled into the bundle, and only THEN proves each of those files' WORKING-TREE git
// blob (`git hash-object <path>`) matches what is committed at HEAD (`git rev-parse HEAD:<path>`).
// Any mismatch -- an uncommitted edit, an untracked file, a source missing from HEAD -- HARD-FAILS
// packaging (no bundle, no manifest produced): this requires a clean committed tree for every file
// the bundle actually used, proved from esbuild's own dependency graph rather than a guessed list.
//
// esbuild is invoked via a pinned `npx esbuild@<version>` (child process), not a project dependency --
// same reasoning as package-expression-extract.mjs (keeps this decoupled from Vite's own esbuild).
//
// This script performs NO deploy call itself and reads NO secret. It is pure build tooling.

import { writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const ESBUILD_VERSION = "0.28.2"; // pinned; bump deliberately, independent of any other tool in this repo

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const FUNCTION_DIR = "supabase/functions/research-run";
const ENTRY = join(FUNCTION_DIR, "index.ts");
const OUT_DIR = join(FUNCTION_DIR, ".build");
const OUT_FILE = join(OUT_DIR, "index.ts");
const MANIFEST_FILE = join(OUT_DIR, "manifest.json");
const RAW_FILE = join(OUT_DIR, "_raw.js");
const META_FILE = join(OUT_DIR, "_meta.json");

// esbuild's metafile "inputs" keys are POSIX paths relative to `cwd` (ROOT here). Keep only the ones
// that point at a real, repo-relative source file -- never an absolute path, a URL-style specifier
// (jsr:/npm:/https:) or a path that escapes the repo.
function discoverBundledLocalSources(metafile) {
  const keys = Object.keys(metafile?.inputs || {});
  const out = [];
  for (const key of keys) {
    if (isAbsolute(key) || /^[a-z]+:/i.test(key)) continue; // absolute or scheme-prefixed (jsr:, npm:, https:)
    const abs = join(ROOT, key);
    const rel = relative(ROOT, abs);
    if (rel.startsWith("..")) continue; // must stay inside the repo
    out.push(rel.split("\\").join("/"));
  }
  return [...new Set(out)].sort();
}

function committedSourceGuard(sources) {
  let git_head;
  try {
    git_head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch (e) {
    console.error("COMMITTED-SOURCE PROVENANCE GUARD FAILED: not a git checkout (or no HEAD) --", e.message);
    process.exit(1);
  }

  const source_git_blobs = {};
  const failures = [];
  for (const p of sources) {
    let committed;
    try {
      committed = execFileSync("git", ["rev-parse", `HEAD:${p}`], { cwd: ROOT, encoding: "utf8" }).trim();
    } catch {
      failures.push(`${p}: not found at HEAD (untracked, or missing from the committed tree)`);
      continue;
    }
    let working;
    try {
      working = execFileSync("git", ["hash-object", p], { cwd: ROOT, encoding: "utf8" }).trim();
    } catch {
      failures.push(`${p}: missing from the working tree`);
      continue;
    }
    if (working !== committed) {
      failures.push(`${p}: working tree (${working}) != HEAD (${committed}) -- uncommitted change`);
      continue;
    }
    source_git_blobs[p] = committed;
  }

  if (failures.length) {
    console.error("COMMITTED-SOURCE PROVENANCE GUARD FAILED -- refusing to package. This requires a");
    console.error("clean committed tree for every source esbuild actually bundled; \"git_head\" in the");
    console.error("manifest would otherwise not truthfully mean that:");
    for (const f of failures) console.error(`  - ${f}`);
    console.error("Commit or discard the difference, then re-run.");
    process.exit(1);
  }

  return { git_head, source_git_blobs };
}

async function main() {
  // Fail loudly, before anything else, if the entrypoint itself is unreadable.
  readFileSync(join(ROOT, ENTRY), "utf8");

  mkdirSync(join(ROOT, OUT_DIR), { recursive: true });

  // minify-syntax (not full minify) drops genuinely dead code while leaving identifiers and structure
  // readable for review. Correctness never depends on this; it is a size/cleanliness improvement over
  // the raw bundle, not part of the provenance proof.
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
      `--outfile=${RAW_FILE}`,
      `--metafile=${META_FILE}`,
    ],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
  );

  const content = readFileSync(join(ROOT, RAW_FILE), "utf8");
  const metafile = JSON.parse(readFileSync(join(ROOT, META_FILE), "utf8"));
  rmSync(join(ROOT, RAW_FILE));
  rmSync(join(ROOT, META_FILE));

  // Structural proof, not a guess: after bundling, no relative import specifier should remain -- that
  // is precisely what makes this immune to the deploy sandbox's mount depth.
  const leftoverImports = [...content.matchAll(/\bimport\s*(?:[^'"]*?from\s*)?["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((spec) => spec.startsWith(".") || spec.startsWith("/"));
  if (leftoverImports.length) {
    console.error("PACKAGING FAILED: unresolved relative imports remain in the bundle:", leftoverImports);
    process.exit(1);
  }

  const bundledSources = discoverBundledLocalSources(metafile);
  if (!bundledSources.includes(ENTRY.split("\\").join("/"))) {
    console.error("PACKAGING FAILED: esbuild's own metafile does not list the entrypoint as bundled -- refusing to trust the dependency graph.");
    process.exit(1);
  }

  // Hard gate: every source esbuild actually pulled into the bundle must exactly match its committed
  // HEAD blob before a single byte is written to the tracked output paths.
  const { git_head, source_git_blobs } = committedSourceGuard(bundledSources);

  writeFileSync(join(ROOT, OUT_FILE), content, "utf8");

  // Provenance: source_git_blobs/git_head come from committedSourceGuard() above, which already
  // PROVED (not just recorded) that every one of these blobs -- discovered from esbuild's own
  // dependency graph, not a hand-maintained list -- is exactly what's committed at this HEAD.
  const manifest = {
    name: "research-run",
    entrypoint_path: "index.ts",
    verify_jwt: true,
    generated_from: {
      entry: ENTRY,
      contract: "public-number-research-run-v1",
      canonical_sources: bundledSources.filter((p) => p !== ENTRY.split("\\").join("/")),
      bundler: `esbuild@${ESBUILD_VERSION}`,
      git_head,
      source_git_blobs,
      bundle_sha256: createHash("sha256").update(content, "utf8").digest("hex"),
      generated_at: new Date().toISOString(),
    },
    files: [{ name: "index.ts", content }],
  };
  writeFileSync(join(ROOT, MANIFEST_FILE), JSON.stringify(manifest, null, 2), "utf8");

  console.log(`Packaged ${ENTRY} -> ${OUT_FILE} (${content.length} bytes, ${bundledSources.length} committed sources, verify_jwt=true).`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
  console.log(`git HEAD: ${git_head}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
