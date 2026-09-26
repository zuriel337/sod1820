#!/usr/bin/env node
// Deterministic packaging for the research-run Edge transport.
// Bundles the committed canonical W2 modules into one deployable Edge file.
// No deploy occurs here.

import { writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const ESBUILD_VERSION = "0.28.2";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FUNCTION_DIR = "supabase/functions/research-run";
const ENTRY = join(FUNCTION_DIR, "index.ts");
const OUT_DIR = join(FUNCTION_DIR, ".build");
const OUT_FILE = join(OUT_DIR, "index.ts");
const MANIFEST_FILE = join(OUT_DIR, "manifest.json");

function cleanCommittedTreeGuard() {
  const gitHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: ROOT, encoding: "utf8" }).trim();
  if (status) throw new Error("research-run packaging requires a clean committed tree; refusing uncommitted/untracked source");
  return gitHead;
}

async function main() {
  readFileSync(join(ROOT, ENTRY), "utf8");
  const gitHead = cleanCommittedTreeGuard();

  mkdirSync(join(ROOT, OUT_DIR), { recursive: true });
  const rawOut = join(OUT_DIR, "_raw.js");
  execFileSync("npx", [
    "--yes", `esbuild@${ESBUILD_VERSION}`,
    ENTRY,
    "--bundle",
    "--platform=neutral",
    "--format=esm",
    "--target=es2022",
    "--minify-syntax",
    `--outfile=${rawOut}`,
  ], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });

  const content = readFileSync(join(ROOT, rawOut), "utf8");
  rmSync(join(ROOT, rawOut));

  const relativeImports = [...content.matchAll(/\bimport\s*(?:[^'"]*?from\s*)?["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith(".") || specifier.startsWith("/"));
  if (relativeImports.length) throw new Error(`unresolved relative imports: ${relativeImports.join(",")}`);

  writeFileSync(join(ROOT, OUT_FILE), content, "utf8");
  const manifest = {
    name: "research-run",
    entrypoint_path: "index.ts",
    verify_jwt: true,
    generated_from: {
      entry: ENTRY,
      contract: "public-number-research-run-v1",
      bundler: `esbuild@${ESBUILD_VERSION}`,
      git_head: gitHead,
      bundle_sha256: createHash("sha256").update(content, "utf8").digest("hex"),
      generated_at: new Date().toISOString(),
    },
    files: [{ name: "index.ts", content }],
  };
  writeFileSync(join(ROOT, MANIFEST_FILE), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Packaged ${ENTRY} -> ${OUT_FILE} (${content.length} bytes, verify_jwt=true).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
