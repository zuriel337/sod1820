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

// ---- the desktop profile and the signatures (closing round) ----
test("the profile is explicit: an unknown profile, an input the profile cannot make and a malformed arm commit are refused before anything starts", { skip }, () => {
  const input = corpus({ [`GET ${SB}/rest/v1/site_flags?select=* `]: { status: 200, type: "application/json", body: json([]) } });
  const unknown = run(input, ["--profile", "tablet"]);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.text, /--profile mobile\|desktop/);
  const touchOnDesktop = run(input, ["--profile", "desktop", "--input", "touch"]);
  assert.notEqual(touchOnDesktop.status, 0);
  assert.match(touchOnDesktop.text, /--input wheel\|key for the desktop profile/);
  const wheelOnMobile = run(input, ["--input", "wheel"]);
  assert.notEqual(wheelOnMobile.status, 0);
  assert.match(wheelOnMobile.text, /--input touch for the mobile profile/);
  const shaless = run(input, ["--mode", "load", "--armShas", "A=not-a-commit"]);   // a cold load needs no departure post, so the corpus check passes and the commit check is the one that stops it
  assert.notEqual(shaless.status, 0);
  assert.match(shaless.text, /--armShas A=<40-hex commit>/);
  assert.equal(unknown.wrote || touchOnDesktop.wrote || wheelOnMobile.wrote || shaless.wrote, false);
});

test("the desktop profile is a mouse and a keyboard, not a wide touch screen; the mobile profile is the one every earlier result was taken with", () => {
  const source = readFileSync(runner, "utf8");
  assert.match(source, /isMobile: !DESKTOP, hasTouch: !DESKTOP/);
  assert.match(source, /deviceScaleFactor: DPR/);
  assert.match(source, /const PROFILE = A\.profile \|\| 'mobile'/);
  assert.match(source, /DPR = A\.dpr \? \+A\.dpr : \(DESKTOP \? 1 : 2\)/);
  // every scroll the person makes goes through one helper: a touch swipe on mobile, wheel notches on desktop; nothing else calls the touch API for scrolling
  assert.match(source, /async function scrollBy\(page, cdp, dist\) \{\n  if \(!DESKTOP\) return swipe\(cdp, dist\);\n  await page\.mouse\.move\(/);
  assert.match(source, /await page\.mouse\.wheel\(0, dist \/ n\)/);
  assert.equal((source.match(/swipe\(cdp,/g) || []).length, 2, "swipe is defined once and called only by scrollBy");
  // opening the departure control: a tap on mobile, a mouse move and a click on desktop
  assert.match(source, /async function openControl\(page, x, y\) \{\n  if \(!DESKTOP\) return page\.touchscreen\.tap\(x, y\);\n  await page\.mouse\.move\(x, y\); await sleep\(60\); return page\.mouse\.click\(x, y\);/);
  assert.doesNotMatch(source, /await page\.touchscreen\.tap\(link\.x, link\.y\)/);
  // the input that interrupts a restore: a key press or wheel notches on desktop; all four kinds of input are recorded by the page
  assert.match(source, /if \(INPUT_KIND === 'key'\) \{ await page\.keyboard\.press\('PageDown'\); return; \}/);
  for (const kind of ["touchstart", "wheel", "keydown", "pointerdown"]) assert.match(source, new RegExp(`addEventListener\\('${kind}'`));
});

test("every result file carries its signatures; a value that is not known is null, never filled in afterwards", () => {
  const source = readFileSync(runner, "utf8");
  assert.match(source, /fs\.writeFileSync\(A\.out, JSON\.stringify\(\{ profile, signatures, arms, runs \}, null, 1\)\);/);
  assert.match(source, /commit: ARM_SHAS\[n\] \|\| null/, "an arm without a commit is recorded as null");
  assert.match(source, /stableDuringRun: buildAtStart\[n\]\.signature === buildAtEnd\[n\]\.signature/);
  assert.match(source, /corpusClass: CORPUS_CLASS/);
  assert.match(source, /const CORPUS_CLASS = A\.corpus \|\| null;   \/\/ 'synthetic' \| 'central' \| \.\.\.: said by the caller, never guessed/);
  for (const field of ["fixtureSha256", "fixtureFileSha256", "runnerSha256", "readinessSha256", "repoHead", "repoTrackedFilesDirty", "playwright", "cpuModel", "cpuThrottle", "network", "browser: 'Chromium '"]) assert.ok(source.includes(field), field);
  // the build-artifact signature is taken from the dist trees themselves, not from a name or a path
  assert.match(source, /treeSignature\(path\.resolve\(arms\[n\]\)\)/);
  assert.match(source, /sha256File\(f\)/);
  const matrix = readFileSync(join(repo, "docs/perf-evidence-20261016/home-stability-v3/run-matrix.sh"), "utf8");
  assert.match(matrix, /SIG="--profile \$PROFILE"/);
  assert.match(matrix, /--armShas \$SHAS/);
  assert.match(matrix, /--corpus \$CORPUS/);
});

test("cycles: every Back after the first return is a fresh entry reported on its own; the last one can be the healthy one", () => {
  const source = readFileSync(runner, "utf8");
  assert.match(source, /const CYCLES = Math\.max\(1, \+\(A\.cycles \|\| 1\)\)/);
  assert.match(source, /const name = cycle === 1 \? 'backAgain' : cycle === 2 \? 'backThird' : `backAgain\$\{cycle\}`/);
  assert.match(source, /if \(RECOVER && cycle === CYCLES\) ctl\.phase = 'back2'/);
  for (const field of ["cls", "docH", "holdsAtEnd", "block", "shifts", "identity"]) assert.ok(new RegExp(`entry\\.${field}|${field}:`).test(source), field);
});

test("the committed form of a result has no content text and keeps everything else", () => {
  const dir = mkdtempSync(join(tmpdir(), "scrub-test-")), out = join(dir, "out");
  writeFileSync(join(dir, "x-AB.json"), JSON.stringify({ profile: { runner: 4 }, signatures: { input: { fixtureSha256: "abc" } }, runs: [{ arm: "A", cls: 0.02, anchor: { text: "private words", finalDisp: 3 }, depart: { anchorText: "more private words", docH: 100 }, heroText: "heading", emptyText: "none yet", cardsAtEnd: { box: 5, cards: [{ h: 9, metaText: "date text" }], probe: { html: "<p>private</p>" } } }] }));
  writeFileSync(join(dir, "x-AB.summary.json"), "{}");
  const result = spawnSync("node", [join(repo, "docs/perf-evidence-20261016/home-stability-v3/scrub-results.mjs"), dir, out], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(zlib.gunzipSync(readFileSync(join(out, "x-AB.json.gz"))));
  const text = JSON.stringify(data);
  for (const secret of ["private words", "more private", "heading", "none yet", "date text", "<p>private</p>"]) assert.ok(!text.includes(secret), secret);
  assert.deepEqual([data.runs[0].cls, data.runs[0].anchor.finalDisp, data.runs[0].depart.docH, data.runs[0].cardsAtEnd.box, data.signatures.input.fixtureSha256], [0.02, 3, 100, 5, "abc"]);
  assert.ok(existsSync(join(out, "x-AB.summary.json")));
});
