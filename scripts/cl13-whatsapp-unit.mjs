#!/usr/bin/env node
// CL-13 WhatsApp unit (wa-raziel, then ai-analyze): assembles the exact files of each deploy candidate and of each rollback from
// docs/reviews/cl13-whatsapp-unit-20261113 and checks every SHA-256 against unit.json / edge-rollback-manifest.json.
// Read-only and local: it never deploys, never reads a secret, never calls Supabase.
//
//   node scripts/cl13-whatsapp-unit.mjs verify [--package]       every pin; --package also builds the ai-analyze bundle with pinned esbuild
//   node scripts/cl13-whatsapp-unit.mjs assemble <slug> <A|B> <out-dir>   the files of one candidate in the deployed layout
//   node scripts/cl13-whatsapp-unit.mjs rollback <slug> <out-dir>         the exact pre-unit files of one function
//
// Candidate A = the DEPLOYED bytes + the CL-13 change only (a reviewed diff applied with `git apply`).
// Candidate B = what the branch tree builds (wa-raziel: the files of the tree; ai-analyze: scripts/package-ai-analyze.mjs).
// B differs from A by exactly the accompanying changes listed in unit.json (the committed *.accompanying-*.diff files).
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
export const DIR = "docs/reviews/cl13-whatsapp-unit-20261113";
const read = (path) => readFileSync(join(ROOT, path));
export const UNIT = JSON.parse(read(`${DIR}/unit.json`));
export const MANIFEST = JSON.parse(read(`${DIR}/edge-rollback-manifest.json`));
export const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function gitBlob(commit, path) {
  try { return execFileSync("git", ["-C", ROOT, "show", `${commit}:${path}`], { maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { const e = new Error(`git object ${commit}:${path} is not in this clone - fetch it by SHA: git fetch origin ${commit}`); e.code = "MISSING_HISTORY"; throw e; }
}
// the exact deployed (rollback) bytes of one file of one function, checked against the manifest
export function deployedBytes(slug, deployPath) {
  const fn = MANIFEST.functions[slug], entry = fn.files.find((f) => f.deploy_path === deployPath);
  if (!entry) throw new Error(`${slug}: no deployed file ${deployPath}`);
  const bytes = entry.source.git ? gitBlob(entry.source.git, entry.source.path) : gunzipSync(read(`${DIR}/edge-rollback/${entry.source.artifact}`));
  if (sha(bytes) !== entry.rollback_sha256) throw new Error(`${slug}/${deployPath}: sha256 ${sha(bytes)} != manifest ${entry.rollback_sha256}`);
  return bytes;
}
export function applyDiff(base, diffPath) {
  const dir = mkdtempSync(join(tmpdir(), "wa-unit-"));
  try {
    const name = (read(diffPath).toString("utf8").match(/^--- a\/(\S+)/m) || [])[1];
    writeFileSync(join(dir, name), base);
    execFileSync("git", ["apply", "--whitespace=nowarn", join(ROOT, diffPath)], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
    return readFileSync(join(dir, name));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const treePath = (deployPath) => (deployPath.startsWith("functions/") ? `supabase/${deployPath}` : null);

// package-ai-analyze.mjs needs the sources committed at HEAD; its output is the bundle that candidate B deploys
// A comment line that only holds an e-mail address is redacted exactly as in the rollback artifact (main and the deployed v91 have two such lines).
export const redactPersonalComments = (bytes) => Buffer.from(bytes.toString("utf8").replace(/^(\s*)\/\/ [\w.+-]+@[\w.-]+\s*$/gm, "$1// <redacted personal address>"), "utf8");
export function packageAiAnalyze() {
  execFileSync("node", [join(ROOT, "scripts/package-ai-analyze.mjs")], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  return redactPersonalComments(read("supabase/functions/ai-analyze/.build/index.ts"));
}

// the files of one candidate: Map(deploy_path -> Buffer). `packaged` supplies the ai-analyze bundle for B (built or read by the caller).
export function candidate(slug, variant, { packaged = null } = {}) {
  const spec = UNIT.functions.find((f) => f.slug === slug)?.candidates?.[variant];
  if (!spec) throw new Error(`unknown candidate ${slug}/${variant}`);
  const out = new Map();
  for (const file of spec.files) {
    const s = file.source;
    let bytes;
    if (s.kind === "deployed") bytes = deployedBytes(slug, file.deploy_path);
    else if (s.kind === "tree") bytes = read(s.path);
    else if (s.kind === "deployed+diff") bytes = applyDiff(deployedBytes(slug, file.deploy_path), s.diff);
    else if (s.kind === "candidate+diff") bytes = applyDiff(candidate(slug, s.base_variant, { packaged }).get(file.deploy_path), s.diff);
    else if (s.kind === "package") { bytes = packaged ?? packageAiAnalyze(); }   // `packaged` is passed through redactPersonalComments by a caller that built it
    else throw new Error(`${slug}/${variant}/${file.deploy_path}: unknown source kind ${s.kind}`);
    out.set(file.deploy_path, bytes);
  }
  return out;
}

export function verify({ withPackage = false } = {}) {
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };
  for (const fn of UNIT.functions) {
    for (const [variant, spec] of Object.entries(fn.candidates)) {
      if (spec.files.some((f) => f.source.kind === "package" || f.source.kind === "candidate+diff" && fn.candidates[f.source.base_variant]?.files.some((g) => g.source.kind === "package")) && !withPackage) continue;
      let files; try { files = candidate(fn.slug, variant); } catch (e) { problems.push(`${fn.slug}/${variant}: ${e.message}`); continue; }
      for (const file of spec.files) check(files.has(file.deploy_path) && sha(files.get(file.deploy_path)) === file.sha256, `${fn.slug}/${variant}/${file.deploy_path}: sha256 differs from unit.json`);
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const [cmd, ...args] = process.argv.slice(2);
  try {
    if (cmd === "verify") {
      const problems = verify({ withPackage: args.includes("--package") });
      if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
      console.log("every pin matches" + (args.includes("--package") ? " (the ai-analyze bundle was built)" : " (the ai-analyze bundle B was not built: --package)"));
    } else if (cmd === "assemble") {
      const [slug, variant, out] = args; if (!slug || !variant || !out) throw new Error("usage: assemble <slug> <A|B> <out-dir>");
      for (const [path, bytes] of candidate(slug, variant)) { const p = join(out, path); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, bytes); console.log(JSON.stringify({ path, sha256: sha(bytes), bytes: bytes.length })); }
    } else if (cmd === "rollback") {
      const [slug, out] = args; if (!slug || !out) throw new Error("usage: rollback <slug> <out-dir>");
      for (const f of MANIFEST.functions[slug].files) { const bytes = deployedBytes(slug, f.deploy_path); const p = join(out, f.deploy_path); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, bytes); console.log(JSON.stringify({ path: f.deploy_path, sha256: sha(bytes), bytes: bytes.length })); }
    } else { console.error("usage: cl13-whatsapp-unit.mjs verify [--package] | assemble <slug> <A|B> <out-dir> | rollback <slug> <out-dir>"); process.exit(2); }
  } catch (error) { console.error(String(error.message || error)); process.exit(1); }
}
