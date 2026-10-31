// Read-only audit of the cumulative delivery, not an integration or deployment script.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = "docs/reviews/els-raziel-cumulative-integration-package-20261031.json";
const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), "utf8"));
const args = process.argv.slice(2);
assert.ok(args.every(arg => arg === "--check-origin" || arg.startsWith("--remote-copy=")), "Unknown audit option");
const git = (argv, cwd = root, input = undefined) => execFileSync("git", argv, {
  cwd, input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024,
}).trim();
const lines = value => value ? value.split("\n") : [];
const object = (ref, path, cwd = root) => {
  try { return git(["rev-parse", "--verify", `${ref}:${path}`], cwd); } catch { return null; }
};
const { SOURCE_HEAD: head, CUMULATIVE_START_SHA: start } = manifest;
const range = `${start}..${head}`;
const expected = manifest.ORDERED_COMMITS.map(entry => entry.sha);
const actual = lines(git(["rev-list", "--reverse", "--topo-order", range]));
assert.deepEqual(actual, expected, "Missing, duplicated or misordered source commit");
assert.equal(new Set(expected).size, 75);
assert.deepEqual(expected.slice(-4), [
  "d99c952208f79457b227cee2e364f86197fe4c96",
  "25177b717ed59deb0bab7bc7d306b5af7efd47ab",
  "f8b9dd9c226121e000a410e83956f39e1335c584",
  "4ea9ac370bd8a873d96dd8f4cb13c2a5515ad468",
]);

for (const [index, entry] of manifest.ORDERED_COMMITS.entries()) {
  assert.equal(entry.position, index + 1);
  assert.match(entry.sha, /^[a-f0-9]{40}$/);
  assert.deepEqual(lines(git(["show", "-s", "--format=%P", entry.sha]))[0].split(" "), entry.parents);
  for (const parent of entry.parents) {
    const position = expected.indexOf(parent);
    assert.ok(position === -1 || position < index, `Parent follows its child: ${entry.sha}`);
  }
  assert.deepEqual(lines(git(["diff", "--name-only", entry.parents[0], entry.sha])), entry.files);
  assert.ok(entry.capability && entry.classification && entry.essential_for_latest_delivery);
  assert.ok(entry.tests.status && entry.dependencies.history_parents);
}

const sourcePaths = lines(git(["diff", "--name-only", start, head]));
assert.deepEqual(sourcePaths, manifest.FILES.map(row => row.path));
assert.equal(sourcePaths.length, 178);
const earlierRange = `${start}..${manifest.BASE_OF_LAST_TWO_SLICES}`;
assert.equal(Number(git(["rev-list", "--count", "--no-merges", earlierRange])), 70);
assert.equal(Number(git(["rev-list", "--count", "--merges", earlierRange])), 1);
assert.equal(lines(git(["diff", "--name-only", start, manifest.BASE_OF_LAST_TWO_SLICES])).length, 169);
assert.equal(manifest.ORDERED_COMMITS.filter(row => row.kind === "merge").length, 1);

for (const row of manifest.FILES) {
  assert.equal(object(head, row.path), row.source_blob, `Wrong source blob: ${row.path}`);
  assert.equal(object(start, row.path), row.base_blob, `Wrong baseline blob: ${row.path}`);
  for (const dependency of row.local_dependencies) {
    assert.equal(typeof dependency, "string", `Unresolved import in ${row.path}`);
    assert.ok(object(head, dependency), `Missing source dependency: ${dependency}`);
  }
}
for (const [key, target] of Object.entries(manifest.CENTRAL_TARGETS)) {
  assert.equal(git(["merge-base", head, target.head]), start);
  assert.equal(lines(git(["cherry", target.head, head, start])).filter(row => row.startsWith("-")).length, 0);
  for (const row of manifest.FILES) {
    assert.equal(object(target.head, row.path), row.central_blobs[key], `Target drift: ${key}:${row.path}`);
  }
  for (const path of manifest.DEPENDENCIES.base_dependency_paths) {
    assert.ok(object(target.head, path), `Missing existing dependency in ${key}: ${path}`);
  }
}

const proof = manifest.MERGE_CONTENT_PROOF;
const patchId = (from, to) => git(["patch-id", "--stable"], root, git(["diff", from, to]) + "\n").split(" ")[0];
assert.equal(patchId(proof.first_parent, proof.merge_sha), proof.stable_patch_id_both_deltas);
assert.equal(patchId(proof.side_branch_base, proof.second_parent), proof.stable_patch_id_both_deltas);
const stages = new Set();
for (const stage of manifest.INTEGRATION_STAGES) {
  assert.ok(stage.depends_on.every(id => stages.has(id)), `Unordered capability dependency: ${stage.id}`);
  stages.add(stage.id);
}
for (const entry of manifest.ORDERED_COMMITS) assert.ok(stages.has(entry.slice));
for (const adaptation of manifest.SHARED_FILE_ADAPTATIONS) {
  assert.ok(sourcePaths.includes(adaptation.path), `Undeclared shared file: ${adaptation.path}`);
  for (const sha of adaptation.source_commits || []) {
    assert.match(sha, /^[a-f0-9]{40}$/);
    assert.ok(expected.includes(sha), `Unknown shared adaptation commit: ${sha}`);
  }
}

if (args.includes("--check-origin")) {
  const required = [{ branch: manifest.SOURCE_BRANCH, head }, ...Object.values(manifest.CENTRAL_TARGETS)];
  const output = lines(git(["ls-remote", "--heads", "origin", ...required.map(row => row.branch)]));
  const refs = new Map(output.map(line => line.split("\t")).map(([sha, ref]) => [ref, sha]));
  for (const row of required) assert.equal(refs.get(`refs/heads/${row.branch}`), row.head, `Origin HEAD moved: ${row.branch}`);
}

const copyOption = args.find(arg => arg.startsWith("--remote-copy="));
if (copyOption) {
  const copy = resolve(copyOption.slice("--remote-copy=".length));
  assert.equal(git(["rev-parse", "refs/heads/verified-source"], copy), head);
  assert.deepEqual(lines(git(["rev-list", "--reverse", "--topo-order", range], copy)), expected);
  for (const row of manifest.FILES) assert.equal(object(head, row.path, copy), row.source_blob);
  assert.deepEqual(lines(git(["rev-list", "--objects", "--missing=print", head], copy)).filter(line => line.startsWith("?")), []);
  git(["fsck", "--connectivity-only", "--no-dangling", "refs/heads/verified-source"], copy);
}

// Scope proof for this documentation-only package, including untracked files.
// Central integrators run this from the package checkout, before their own integration.
const allowed = new Set([manifestPath,
  "docs/reviews/els-raziel-cumulative-integration-package-20261031.md",
  "scripts/verify-els-cumulative-integration-package.mjs"]);
const packageDelta = lines(git(["diff", "--name-only", head, "HEAD"]));
const dirty = lines(git(["diff", "HEAD", "--name-only"]));
const untracked = lines(git(["ls-files", "--others", "--exclude-standard"]));
for (const path of [...packageDelta, ...dirty, ...untracked]) {
  assert.ok(allowed.has(path), `Package contains a product/unrelated change: ${path}`);
}

console.log(JSON.stringify({
  status: "PASS", source_head: head, cumulative_start: start,
  commits: expected.length, regular: 74, merges: 1, changed_files: sourcePaths.length,
  stages: stages.size, shared_adaptations: manifest.SHARED_FILE_ADAPTATIONS.length,
  base_dependencies: manifest.DEPENDENCIES.base_dependency_paths.length,
  merge_duplicate_content: "PROVED; apply once", package_product_changes: 0,
  origin_head_check: args.includes("--check-origin") ? "PASS" : "NOT_RUN",
  fresh_remote_copy_check: copyOption ? "PASS" : "NOT_RUN",
}, null, 2));
