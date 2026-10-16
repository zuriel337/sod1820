// The Home evidence runner's input and isolation rules, exercised through its real command line under the shared isolation (scripts/ci-isolation/run.mjs):
// it refuses the legacy UTF-8 corpus, a corpus with an undecodable image, and a corpus without a complete departure post; it refuses to run outside the
// isolation; it has no empty-body fallback. These all stop BEFORE any browser, server or request, so the test needs no build and sends nothing.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";

const repo = new URL("../", import.meta.url).pathname;
const runner = join(repo, "docs/perf-evidence-20261016/home-stability-v3/runner.mjs");
const isolation = join(repo, "scripts/ci-isolation/run.mjs");
const SB = "https://linswmnnkjxvweumprav.supabase.co";
let hasPlaywright = false;
for (const base of [import.meta.url, `file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`]) {
  try { createRequire(base).resolve("playwright"); hasPlaywright = true; break; } catch { /* try the next location */ }
}
const hasCc = spawnSync("cc", ["--version"]).status === 0;
const skip = !hasPlaywright || !hasCc || process.platform !== "linux";

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]), Buffer.from("IHDR"), Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]), Buffer.alloc(8)]);
const json = (value) => Buffer.from(JSON.stringify(value)).toString("base64");
const post = (slug, words) => json([{ id: 1, slug, content: `<p>${"מילה ".repeat(words)}</p>` }]);
function corpus(rows) {
  const dir = mkdtempSync(join(tmpdir(), "home-runner-test-"));
  const file = join(dir, "snapshot.json.gz"), bytes = zlib.gzipSync(JSON.stringify(rows));
  writeFileSync(file, bytes);
  return { file, sha: crypto.createHash("sha256").update(bytes).digest("hex"), out: join(dir, "out.json") };
}
function run({ file, sha, out }, extra = [], { isolated = true, env = {} } = {}) {
  const args = ["--fx", file, "--arms", `A=${repo}dist-does-not-exist`, "--mode", "back", "--out", out, ...extra];
  const command = isolated ? [isolation, "--", "node", runner, ...args] : [runner, ...args];
  const result = spawnSync("node", command, { encoding: "utf8", env: { ...process.env, SOD_CI_SNAPSHOT_SHA256: sha, ...env }, timeout: 120000 });
  return { status: result.status, text: `${result.stdout}\n${result.stderr}`, wrote: existsSync(out) };
}

test("the legacy corpus (UTF-8 string bodies, 18 corrupted images) is refused by the shared decoder; nothing is written", { skip }, () => {
  const legacy = join(repo, "docs/perf-evidence-20261015/scroll-integration/fixtures-combined.json.gz");
  const sha = crypto.createHash("sha256").update(readFileSync(legacy)).digest("hex");
  const result = run({ file: legacy, sha, out: join(mkdtempSync(join(tmpdir(), "home-runner-test-")), "out.json") });
  assert.notEqual(result.status, 0);
  assert.match(result.text, /BLOCKED: Noncanonical or corrupted response body/);
  assert.equal(result.wrote, false);
});

test("a shared-format corpus with one undecodable image is refused, naming counts and not identifiers", { skip }, () => {
  const broken = Buffer.from(png.toString("utf8"), "utf8");   // what a text conversion does to the bytes
  const input = corpus({
    [`GET ${SB}/rest/v1/posts?select=*&slug=in.(some-private-slug)&limit=1 `]: { status: 200, type: "application/json", body: post("some-private-slug", 400) },
    [`GET ${SB}/storage/v1/object/public/gallery/ok.png `]: { status: 200, type: "image/png", body: png.toString("base64") },
    [`GET ${SB}/storage/v1/object/public/gallery/secret-name.png `]: { status: 200, type: "image/png", body: broken.toString("base64") },
  });
  const result = run(input);
  assert.notEqual(result.status, 0);
  assert.match(result.text, /BLOCKED: 1 of 2 image responses in the corpus are not decodable \(utf8-replacement-characters\)/);
  assert.doesNotMatch(result.text, /secret-name|some-private-slug/);
  assert.equal(result.wrote, false);
});

test("a decodable corpus without a complete departure post is refused for a return (no stand-in post)", { skip }, () => {
  const input = corpus({
    [`GET ${SB}/rest/v1/site_flags?select=* `]: { status: 200, type: "application/json", body: json([]) },
    [`GET ${SB}/rest/v1/posts?select=*&slug=in.(short-post)&limit=1 `]: { status: 200, type: "application/json", body: post("short-post", 3) },
  });
  const result = run(input, ["--post", "auto"]);
  assert.notEqual(result.status, 0);
  assert.match(result.text, /BLOCKED: the corpus has no complete body for the departure post \(0 complete post bodies present\)/);
  const pinned = run(corpus({ [`GET ${SB}/rest/v1/posts?select=*&slug=in.(long-post)&limit=1 `]: { status: 200, type: "application/json", body: post("long-post", 400) } }), ["--post", "/post/another-post"]);
  assert.match(pinned.text, /BLOCKED: the corpus has no complete body for the departure post \(1 complete post bodies present; required: 1, missing: 1\)/);
});

test("the corpus is required and exact: no default corpus, and a wrong SHA256 is refused", { skip }, () => {
  const input = corpus({ [`GET ${SB}/rest/v1/site_flags?select=* `]: { status: 200, type: "application/json", body: json([]) } });
  const missing = spawnSync("node", [isolation, "--", "node", runner, "--arms", "A=x", "--out", input.out], { encoding: "utf8", env: { ...process.env, SOD_CI_SNAPSHOT_SHA256: input.sha } });
  assert.equal(missing.status, 1);
  assert.match(`${missing.stderr}${missing.stdout}`, /--fx <snapshot\.json\.gz> required/);
  const wrong = run({ ...input, sha: "0".repeat(64) });
  assert.match(wrong.text, /BLOCKED: Frozen snapshot SHA256 mismatch/);
  const none = run(input, [], { env: { SOD_CI_SNAPSHOT_SHA256: "" } });
  assert.match(none.text, /BLOCKED: A frozen SOD_CI_SNAPSHOT \+ exact SOD_CI_SNAPSHOT_SHA256 is required; no live fallback/);
});

test("outside the shared isolation the runner does not start", { skip }, () => {
  const input = corpus({ [`GET ${SB}/rest/v1/site_flags?select=* `]: { status: 200, type: "application/json", body: json([]) } });
  const result = run(input, [], { isolated: false });
  assert.notEqual(result.status, 0);
  assert.match(result.text, /Run with scripts\/ci-isolation\/run\.mjs; safe network configuration required before connecting/);
});

test("the runner has no mechanism of its own: shared policy only, no empty-body or synthesized response", () => {
  const source = readFileSync(runner, "utf8");
  assert.match(source, /requestPolicy\(req, origin, fixtures, key\)/);
  assert.match(source, /frozenSnapshot\(FX, FX_SHA\)/);
  assert.match(source, /args: browserArgs/);
  assert.match(source, /installTransportBoundary\(ctx\)/);
  assert.match(source, /from '\.\.\/\.\.\/\.\.\/scripts\/perf-execution-2029\/serve\.mjs'/, "the isolation-aware static server");
  assert.doesNotMatch(source, /perf\/serve\.mjs/);
  // the v3 fallbacks that answered a request the corpus could not: empty script/css for other hosts, {} for /api, 204 for any non-GET
  assert.doesNotMatch(source, /body: ''.*contentType|contentType: u\.includes\('css'\)/);
  assert.doesNotMatch(source, /fulfill\(\{ status: 200, contentType: 'application\/json', body: '\{\}' \}\)/);
  assert.doesNotMatch(source, /READ_RPC|blockedWrites/);
  assert.doesNotMatch(source, /Buffer\.from\(f\.body, 'utf8'\)|fixtures\[k\]\b/);
  // an unmapped request or an undecodable image invalidates the sample and its identifiers leave the evidence
  assert.match(source, /catch \(error\) \{ st\.misses\.add\(key\); st\.violations\.push/);
  assert.match(source, /o\.invalid\.push\(`\$\{broken\.length\} image\(s\) the page could not decode`\)/);
  assert.match(source, /missDigest\(\[\.\.\.st\.misses\]\)/);
  assert.doesNotMatch(source, /o\.missKeys\s*=/);
  assert.match(source, /mode: 0o600/);
});
