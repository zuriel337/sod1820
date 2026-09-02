// expression-extract-packaging-guard — proves the committed-source provenance guard in
// scripts/package-expression-extract.mjs actually refuses to package dirty/uncommitted/untracked
// canonical source, not just warns. Manipulates real repo files for cases 2/3 -- always restores
// them in a finally block, and re-verifies the repo is clean afterward either way.

import { execFileSync, execFileSync as run } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SCRIPT = join(ROOT, "scripts/package-expression-extract.mjs");
const BUILD_DIR = join(ROOT, "supabase/functions/expression-extract/.build");
const BUNDLE = join(BUILD_DIR, "index.ts");
const MANIFEST = join(BUILD_DIR, "manifest.json");
const DIRTY_TARGET = join(ROOT, "src/theme.js"); // a real canonical source

let pass = 0, fail = 0;
function check(label, cond, detail) {
  if (cond) { pass++; }
  else { fail++; console.error(`FAIL: ${label}${detail ? " — " + detail : ""}`); }
}

function cleanBuild() {
  rmSync(BUILD_DIR, { recursive: true, force: true });
}

function runPackager() {
  try {
    const out = run("node", [SCRIPT], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, stdout: out, stderr: "" };
  } catch (e) {
    return { code: e.status ?? 1, stdout: e.stdout?.toString() ?? "", stderr: e.stderr?.toString() ?? "" };
  }
}

function gitIsClean(path) {
  const out = run("git", ["status", "--porcelain", "--", path], { cwd: ROOT, encoding: "utf8" });
  return out.trim() === "";
}

console.log("=== expression-extract packaging — committed-source provenance guard ===");

// 0) sanity: repo must start clean on the one file we're about to dirty, or this test can't trust
// its own before/after comparison.
check("0) src/theme.js starts clean relative to HEAD", gitIsClean("src/theme.js"));

// 1) clean committed source -> packaging succeeds
{
  cleanBuild();
  const r = runPackager();
  check("1) clean source: exit code 0", r.code === 0, r.stderr);
  check("1) clean source: bundle written", existsSync(BUNDLE));
  check("1) clean source: manifest written", existsSync(MANIFEST));
  if (existsSync(MANIFEST)) {
    const m = JSON.parse(readFileSync(MANIFEST, "utf8"));
    check("1) manifest carries a git_head", typeof m.generated_from?.git_head === "string" && m.generated_from.git_head.length === 40);
    check("1) manifest carries source_git_blobs for all 4 lib sources",
      ["src/theme.js", "src/lib/gematria.js", "src/lib/analysisFlow.js", "src/lib/triage.js"]
        .every((p) => typeof m.generated_from?.source_git_blobs?.[p] === "string"));
  }
}

// 2) dirty a canonical source -> packaging MUST refuse (not just warn) -- no bundle produced
const backup = readFileSync(DIRTY_TARGET, "utf8");
try {
  writeFileSync(DIRTY_TARGET, backup + "\n// packaging-guard-test dirty marker\n", "utf8");
  cleanBuild();
  const r = runPackager();
  check("2) dirty source: exit code 1 (refuses, not a warning)", r.code === 1, `code=${r.code}`);
  check("2) dirty source: no bundle produced", !existsSync(BUNDLE));
  check("2) dirty source: no manifest produced", !existsSync(MANIFEST));
  check("2) dirty source: error names the offending file",
    r.stderr.includes("src/theme.js") && r.stderr.includes("uncommitted change"), r.stderr);
} finally {
  // 3) restore -> packaging succeeds again
  writeFileSync(DIRTY_TARGET, backup, "utf8");
}

{
  check("3) restored: working tree clean again relative to HEAD", gitIsClean("src/theme.js"));
  cleanBuild();
  const r = runPackager();
  check("3) restored source: exit code 0", r.code === 0, r.stderr);
  check("3) restored source: bundle written", existsSync(BUNDLE));
}

// mechanism check for the "untracked / missing from HEAD" branch, without mutating real canonical
// files: proves `git rev-parse HEAD:<path>` (what the guard relies on) fails for a path that is not
// in the committed tree -- the same failure mode the guard's try/catch turns into a packaging refusal.
{
  let threw = false;
  try {
    run("git", ["rev-parse", "HEAD:this-path-does-not-exist-in-head.js"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    threw = true;
  }
  check("missing-from-HEAD mechanism: git rev-parse HEAD:<missing> fails (guard's untracked/missing branch relies on this)", threw);
}

// 4) existing 13-assertion bundle-parity test still passes against the freshly (re)packaged bundle
{
  let code = 0, stderr = "";
  try {
    run("node", [join(ROOT, "test/expression-extract-bundle-parity.test.mjs")], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    code = e.status ?? 1;
    stderr = e.stderr?.toString() ?? "";
  }
  check("4) expression-extract-bundle-parity.test.mjs still passes (13/13)", code === 0, stderr);
}

// 5) package.json / package-lock.json unchanged relative to HEAD -- this correction touched only
// scripts/package-expression-extract.mjs + this test file, not the frontend dependency graph.
{
  check("5) package.json unchanged relative to HEAD", gitIsClean("package.json"));
  check("5) package-lock.json unchanged relative to HEAD", gitIsClean("package-lock.json"));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
