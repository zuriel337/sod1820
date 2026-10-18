import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { cp, copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyPreviewArtifactInventory } from "../scripts/preview-artifact-inventory.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = resolve(root, "preview-deploy/dist");
const temporary = [];

after(async () => {
  await Promise.all(temporary.map((path) => rm(path, { recursive: true, force: true })));
});

async function miniRepository() {
  const directory = await mkdtemp(resolve(tmpdir(), "sod-preview-builder-gate-"));
  temporary.push(directory);
  for (const path of [
    "scripts/build-integrated-preview.mjs",
    "scripts/preview-readonly-worker.mjs",
    "src/lib/numberReviewPreview2029.js",
  ]) {
    await mkdir(dirname(resolve(directory, path)), { recursive: true });
    await copyFile(resolve(root, path), resolve(directory, path));
  }
  await mkdir(resolve(directory, "public"), { recursive: true });
  await writeFile(resolve(directory, "public/baseline.txt"), "tracked\n");
  await writeFile(resolve(directory, ".gitignore"), "*.log\n.env\n.env.local\n.env.*.local\npreview-deploy/dist/\n");
  execFileSync("git", ["init", "-q"], { cwd: directory });
  execFileSync("git", ["add", "."], { cwd: directory });
  execFileSync("git", ["-c", "user.name=Preview Gate", "-c", "user.email=preview@example.invalid", "commit", "-qm", "fixture"], { cwd: directory });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" }).trim();
  return { directory, commit };
}

function buildEnv(commit, target = "2029") {
  const env = {
    ...process.env,
    SOD_BUILD_TARGET: target,
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "gpt/perf-unified-wave4-preview-20261018",
    VERCEL_GIT_COMMIT_SHA: commit,
    VERCEL_URL: "sod1820-integrity-test-sod1820-s-projects.vercel.app",
  };
  return env;
}

function runBuilder(directory, env) {
  return spawnSync(process.execPath, ["scripts/build-integrated-preview.mjs"], {
    cwd: directory,
    env,
    encoding: "utf8",
  });
}

test("missing and every non-exact SOD_BUILD_TARGET reject before Vite or output", async () => {
  for (const target of [null, "", "legacy", "2029 ", " 2029", "2029\n"]) {
    const { directory, commit } = await miniRepository();
    const env = buildEnv(commit, target === null ? "2029" : target);
    if (target === null) delete env.SOD_BUILD_TARGET;
    const result = runBuilder(directory, env);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /external SOD_BUILD_TARGET=2029/);
    assert.doesNotMatch(result.stderr, /vite|ERR_MODULE_NOT_FOUND/i,
      "the exact target gate must run before Vite module resolution");
    assert.equal(existsSync(resolve(directory, "preview-deploy/dist")), false);
  }
});

test("tracked worker-source drift plus an untracked public file rejects with unchanged HEAD and no output", async () => {
  const { directory, commit } = await miniRepository();
  const workerPath = resolve(directory, "scripts/preview-readonly-worker.mjs");
  await writeFile(workerPath, `${await readFile(workerPath, "utf8")}\n// tracked worker edit\n`);
  await writeFile(resolve(directory, "public/untracked-preview-input.txt"), "must reject\n");
  assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" }).trim(), commit);
  const result = runBuilder(directory, buildEnv(commit));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source checkout must be clean/);
  assert.match(result.stderr, /scripts\/preview-readonly-worker\.mjs/);
  assert.match(result.stderr, /public\/untracked-preview-input\.txt/);
  assert.doesNotMatch(result.stderr, /vite|ERR_MODULE_NOT_FOUND/i);
  assert.equal(existsSync(resolve(directory, "preview-deploy/dist")), false);
});

test("a staged build input rejects before Vite and leaves no output", async () => {
  const { directory, commit } = await miniRepository();
  await writeFile(resolve(directory, "public/baseline.txt"), "staged mutation\n");
  execFileSync("git", ["add", "public/baseline.txt"], { cwd: directory });
  const result = runBuilder(directory, buildEnv(commit));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source checkout must be clean/);
  assert.doesNotMatch(result.stderr, /vite|ERR_MODULE_NOT_FOUND/i);
  assert.equal(existsSync(resolve(directory, "preview-deploy/dist")), false);
});

async function assertIgnoredInputPreservesOutput(inputPath, expectedPathPattern) {
  const { directory, commit } = await miniRepository();
  const output = resolve(directory, "preview-deploy/dist");
  const sentinel = resolve(output, "sentinel.txt");
  await mkdir(dirname(resolve(directory, inputPath)), { recursive: true });
  await mkdir(output, { recursive: true });
  await writeFile(sentinel, "existing sealed output\n");
  await writeFile(resolve(directory, inputPath), "ignored build input\n");
  assert.match(execFileSync("git", ["check-ignore", "-v", inputPath], {
    cwd: directory,
    encoding: "utf8",
  }), expectedPathPattern);

  const result = runBuilder(directory, buildEnv(commit));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source checkout must be clean/);
  assert.match(result.stderr, expectedPathPattern);
  assert.doesNotMatch(result.stderr, /vite|ERR_MODULE_NOT_FOUND/i,
    "ignored build inputs must reject before Vite module resolution");
  assert.equal(await readFile(sentinel, "utf8"), "existing sealed output\n");
  assert.deepEqual(await readdir(output), ["sentinel.txt"], "pre-existing output must remain untouched");
}

test("an ignored public input rejects before Vite and preserves existing output", async () => {
  await assertIgnoredInputPreservesOutput("public/preview-audit-ignored.log", /public\/preview-audit-ignored\.log/);
});

test("an ignored Vite production env rejects before Vite and preserves existing output", async () => {
  await assertIgnoredInputPreservesOutput(".env.production.local", /\.env\.production\.local/);
});

async function walk(directory, base = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(absolute, base));
    else if (entry.isFile()) paths.push(relative(base, absolute).split(sep).join("/"));
  }
  return paths.sort();
}

test("inventory covers index, both workers, every public file and every Vite manifest artifact", { skip: !existsSync(resolve(dist, "preview-artifacts.json")) }, async () => {
  const { inventory } = await verifyPreviewArtifactInventory(dist);
  const paths = new Set(inventory.artifacts.map((entry) => entry.path));
  for (const required of ["index.html", "2029.html", "preview-readonly-sw.js", "sw.js", ".vite/manifest.json", "preview-build.json", "preview-artifacts.json"]) {
    assert.ok(paths.has(required), `inventory missing ${required}`);
  }
  assert.ok([...paths].some((path) => path.startsWith("assets/") && path.endsWith(".js")), "Vite assets are inventoried");
  for (const path of await walk(resolve(root, "public"))) assert.ok(paths.has(path), `public artifact missing from inventory: ${path}`);
  const manifest = JSON.parse(await readFile(resolve(dist, ".vite/manifest.json"), "utf8"));
  for (const entry of Object.values(manifest)) {
    for (const path of [entry.file, ...(entry.css || []), ...(entry.assets || [])].filter(Boolean)) {
      assert.ok(paths.has(path), `Vite manifest artifact missing from inventory: ${path}`);
    }
  }
});

test("inventory verification rejects an extra deployed file and a mutated deployed file", { skip: !existsSync(resolve(dist, "preview-artifacts.json")) }, async () => {
  const extraCopy = await mkdtemp(resolve(tmpdir(), "sod-preview-extra-"));
  const mutatedCopy = await mkdtemp(resolve(tmpdir(), "sod-preview-mutated-"));
  temporary.push(extraCopy, mutatedCopy);
  await cp(dist, extraCopy, { recursive: true });
  await cp(dist, mutatedCopy, { recursive: true });
  await writeFile(resolve(extraCopy, "unexpected.txt"), "extra\n");
  await assert.rejects(() => verifyPreviewArtifactInventory(extraCopy), /artifact set mismatch/);
  const indexPath = resolve(mutatedCopy, "index.html");
  await writeFile(indexPath, `${await readFile(indexPath, "utf8")}\nmutated\n`);
  await assert.rejects(() => verifyPreviewArtifactInventory(mutatedCopy), /artifact (size|digest) mismatch/);
});
