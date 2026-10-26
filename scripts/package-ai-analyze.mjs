#!/usr/bin/env node
// Deterministic Git↔deploy packaging for ai-analyze.
//
// ai-analyze now imports the same canonical Raziel Result-Bundle consumer used by the browser-side
// research tree. The Supabase upload sandbox cannot reliably resolve that cross-tree relative import,
// so this script resolves the REAL repository graph with pinned esbuild and emits one self-contained
// ESM entrypoint. It never deploys and never reads a secret. Every bundled local source must be
// committed at HEAD before an artifact is produced.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ESBUILD_VERSION = "0.28.2";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FUNCTION_NAME = "ai-analyze";
const FUNCTION_DIR = `supabase/functions/${FUNCTION_NAME}`;
const ENTRY = `${FUNCTION_DIR}/index.ts`;
const OUT_DIR = `${FUNCTION_DIR}/.build`;
const OUT_FILE = `${OUT_DIR}/index.ts`;
const MANIFEST_FILE = `${OUT_DIR}/manifest.json`;
const RAW_FILE = `${OUT_DIR}/_raw.js`;
const META_FILE = `${OUT_DIR}/_meta.json`;

function localSources(metafile) {
  const out = [];
  for (const key of Object.keys(metafile?.inputs || {})) {
    if (isAbsolute(key) || /^[a-z]+:/i.test(key)) continue;
    const rel = relative(ROOT, join(ROOT, key));
    if (!rel.startsWith("..")) out.push(rel.split("\\").join("/"));
  }
  return [...new Set(out)].sort();
}

function proveCommittedSources(sources) {
  const gitHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const sourceGitBlobs = {};
  const failures = [];
  for (const source of sources) {
    let committed;
    let working;
    try {
      committed = execFileSync("git", ["rev-parse", `HEAD:${source}`], { cwd: ROOT, encoding: "utf8" }).trim();
    } catch {
      failures.push(`${source}: missing from HEAD`);
      continue;
    }
    try {
      working = execFileSync("git", ["hash-object", source], { cwd: ROOT, encoding: "utf8" }).trim();
    } catch {
      failures.push(`${source}: missing from working tree`);
      continue;
    }
    if (working !== committed) failures.push(`${source}: working tree differs from HEAD`);
    else sourceGitBlobs[source] = committed;
  }
  if (failures.length) {
    throw new Error(`COMMITTED-SOURCE PROVENANCE GUARD FAILED:\n  - ${failures.join("\n  - ")}`);
  }
  return { gitHead, sourceGitBlobs };
}

async function main() {
  readFileSync(join(ROOT, ENTRY), "utf8");
  mkdirSync(join(ROOT, OUT_DIR), { recursive: true });
  const executable = process.env.SOD_CI_ISOLATION === "1"
    ? process.env.SOD_CI_ESBUILD
    : "npx";
  if (!executable) throw new Error("Isolated packaging requires SOD_CI_ESBUILD");
  if (process.env.SOD_CI_ISOLATION === "1") {
    const version = execFileSync(executable, ["--version"], { encoding: "utf8" }).trim();
    if (version !== ESBUILD_VERSION) throw new Error("Pinned isolated esbuild version mismatch");
  }
  execFileSync(executable, [
    ...(process.env.SOD_CI_ISOLATION === "1" ? [] : ["--yes", `esbuild@${ESBUILD_VERSION}`]),
    ENTRY,
    "--bundle",
    "--platform=neutral",
    "--format=esm",
    "--target=es2022",
    "--minify-syntax",
    `--outfile=${RAW_FILE}`,
    `--metafile=${META_FILE}`,
  ], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });

  const content = readFileSync(join(ROOT, RAW_FILE), "utf8");
  const metafile = JSON.parse(readFileSync(join(ROOT, META_FILE), "utf8"));
  rmSync(join(ROOT, RAW_FILE));
  rmSync(join(ROOT, META_FILE));

  const leftoverImports = [...content.matchAll(/\bimport\s*(?:[^'"]*?from\s*)?["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith(".") || specifier.startsWith("/"));
  if (leftoverImports.length) throw new Error(`Unresolved relative imports: ${leftoverImports.join(", ")}`);

  const sources = localSources(metafile);
  if (!sources.includes(ENTRY)) throw new Error("esbuild dependency graph omitted the entrypoint");
  const { gitHead, sourceGitBlobs } = proveCommittedSources(sources);
  writeFileSync(join(ROOT, OUT_FILE), content, "utf8");
  const manifest = {
    name: FUNCTION_NAME,
    entrypoint_path: "index.ts",
    verify_jwt: true,
    generated_from: {
      entry: ENTRY,
      contract: "ai_analyze_contract_v2+raziel_result_bundle_consumer_v1",
      canonical_sources: sources.filter((source) => source !== ENTRY),
      bundler: `esbuild@${ESBUILD_VERSION}`,
      git_head: gitHead,
      source_git_blobs: sourceGitBlobs,
      bundle_sha256: createHash("sha256").update(content, "utf8").digest("hex"),
      generated_at: new Date().toISOString(),
    },
    files: [{ name: "index.ts", content }],
  };
  writeFileSync(join(ROOT, MANIFEST_FILE), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Packaged ${ENTRY} -> ${OUT_FILE} (${content.length} bytes, ${sources.length} committed sources, verify_jwt=true).`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
  console.log(`git HEAD: ${gitHead}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
