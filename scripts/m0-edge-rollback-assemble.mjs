#!/usr/bin/env node
// Rebuild the exact pre-M0 deployed file set of one Edge Function from docs/reviews/m0-security-stabilization-20261112/edge-rollback.
// Read-only and local: it never deploys, never reads a secret, never calls Supabase. Every file is checked against the SHA-256 in
// the manifest; any mismatch stops with a non-zero exit. Output: the files under <out-dir> in the deployed layout and a JSON summary
// (entrypoint, verify_jwt, import_map, files) for the deploy step that ZURIEL approves separately.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const DIR = join(ROOT, "docs/reviews/m0-security-stabilization-20261112/edge-rollback");
export const manifest = JSON.parse(readFileSync(join(DIR, "manifest.json"), "utf8"));
const sha = (b) => createHash("sha256").update(b).digest("hex");

export function rollbackFile(entry) {
  if (entry.source.git) {
    try { return execFileSync("git", ["-C", ROOT, "show", `${entry.source.git}:${entry.source.path}`], { maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] }); }
    catch { const e = new Error(`git object ${entry.source.git}:${entry.source.path} is not in this clone - run: git fetch --shallow-since=2026-09-20 origin main`); e.code = "MISSING_HISTORY"; throw e; }
  }
  return gunzipSync(readFileSync(join(DIR, entry.source.artifact)));
}

export function assemble(slug, outDir = null) {
  const fn = manifest.functions[slug];
  if (!fn) throw new Error(`unknown function ${slug}`);
  const files = fn.files.map((entry) => {
    const bytes = rollbackFile(entry);
    const got = sha(bytes);
    if (got !== entry.rollback_sha256) throw new Error(`${slug}/${entry.deploy_path}: sha256 ${got} != manifest ${entry.rollback_sha256}`);
    if (outDir) { const p = join(outDir, entry.deploy_path); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, bytes); }
    return { path: entry.deploy_path, sha256: got, bytes: bytes.length, exact_deployed_bytes: entry.deployed_sha256 === got };
  });
  return { name: slug, version_to_restore: fn.version, entrypoint: fn.entrypoint, verify_jwt: fn.verify_jwt, import_map: fn.import_map, files };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const [slug, out] = process.argv.slice(2);
  if (!slug) { console.error("usage: node scripts/m0-edge-rollback-assemble.mjs <slug|all> [out-dir]"); process.exit(2); }
  const slugs = slug === "all" ? Object.keys(manifest.functions) : [slug];
  try { for (const s of slugs) console.log(JSON.stringify(assemble(s, out ? join(out, s) : null))); }
  catch (error) { console.error(String(error.message || error)); process.exit(1); }
}
