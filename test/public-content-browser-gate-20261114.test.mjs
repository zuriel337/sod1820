// The CI wiring of the two real-browser proofs of the public content package (14.11.2026).
//   * The old side is the FIXED historical commit 9c4cad1372200759e9afe6e9c38709209d4ee02a, never the PR base, and nothing in the step moves it.
//   * The new side is the checked-out tested commit; the G1 base commit (PR_BASE_SHA) is a different step and is untouched.
//   * Both proofs must run and pass: with PUBLIC_CONTENT_PROOF_REQUIRED=1 a missing historical build, tested build or browser FAILS (it never
//     skips), a comparison of one directory with itself fails, and the TAP summary must be exactly 2/2/0/0/0/0.
// Repository files and child processes only: no browser, no network, no database. The real-browser proofs themselves run in CI.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), "utf8");
const workflow = read(".github/workflows/live-contracts-2029.yml");
const HISTORICAL = "9c4cad1372200759e9afe6e9c38709209d4ee02a";
const PROOFS = ["test/m0d-contributor-stale-client.browser.mjs", "test/m0d-world-candidate-visible.browser.mjs"];

// One step of the workflow: from its "- name:" line to the next step at the same indentation.
function step(namePart) {
  const start = workflow.split("\n").findIndex((line) => /^      - name: /.test(line) && line.includes(namePart));
  assert.ok(start >= 0, `step "${namePart}" exists`);
  const lines = workflow.split("\n").slice(start);
  const end = lines.findIndex((line, index) => index > 0 && /^      (- name: |# )/.test(line));
  return lines.slice(0, end > 0 ? end : lines.length).join("\n");
}

test("the old side of the comparison is the fixed historical commit, not the PR base, and nothing moves it", () => {
  const build = step("Build the tested site and the pinned historical site");
  assert.match(build, new RegExp(`HISTORICAL_SITE_SHA: ${HISTORICAL}\\n`), "the pin is the literal commit");
  assert.equal((build.match(/[0-9a-f]{40}/g) || []).filter((sha) => sha !== HISTORICAL).length, 0, "no other commit in the step");
  assert.doesNotMatch(build, /PR_BASE_SHA|github\.event|ls-remote|refs\/heads|github\.sha|vercel|alias/i, "the pin is not derived from the PR, a branch, a deployment or an alias");
  assert.match(build, /git fetch --no-tags --depth=1 origin "\$HISTORICAL_SITE_SHA"/);
  assert.match(build, /test "\$\(git rev-parse FETCH_HEAD\)" = "\$HISTORICAL_SITE_SHA"/, "the fetched commit is verified");
  assert.match(build, /git archive "\$HISTORICAL_SITE_SHA"/, "the old side is built from that commit");
  assert.match(build, /SOD_BUILD_TARGET=2029 npx vite build\n[\s\S]*git archive/, "the tested site is built first, from the checked-out commit");
  assert.match(build, /TESTED="\$\(git rev-parse HEAD\)"[\s\S]*= "\$HISTORICAL_SITE_SHA"[\s\S]*exit 1/, "testing the historical commit itself fails");
  assert.match(build, /set -euo pipefail/, "a missing build or commit fails the step");
  assert.match(build, /test -s "\$PWD\/dist\/2029\.html"/);
  assert.match(build, /test -s "\$RUNNER_TEMP\/old-site\/dist\/2029\.html"/);
});

test("the G1 base commit still comes from the PR base and the proofs still run in the same job", () => {
  const g1 = step("G1 base commit");
  assert.match(g1, /PR_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/, "G1 keeps the real PR base");
  assert.doesNotMatch(g1, new RegExp(HISTORICAL), "the pin never reaches the G1 step");
  assert.equal((workflow.match(new RegExp(HISTORICAL, "g")) || []).length, 1, "the workflow names the historical commit exactly once, in the build step's env");
});

test("the two proofs run with the requirement flag, both files, and the summary must be exactly 2 tests, 2 pass, nothing skipped", () => {
  const run = step("Public content in a real browser");
  assert.match(run, /PUBLIC_CONTENT_PROOF_REQUIRED: "1"/);
  assert.match(run, /OLD_DIST: \$\{\{ runner\.temp \}\}\/old-site\/dist/);
  assert.match(run, /NEW_DIST: \$\{\{ github\.workspace \}\}\/dist/);
  assert.match(run, /set -euo pipefail/, "a failing proof fails the pipe");
  for (const file of PROOFS) assert.ok(run.includes(file), `${file} is run`);
  assert.match(run, /node --test --test-reporter=tap/);
  assert.match(run, /assert-tap-summary\.mjs --tests 2 --pass 2 --fail 0 --skipped 0 --todo 0 --cancelled 0/);
  assert.ok(run.indexOf("--tests 2") > run.indexOf(PROOFS[1]), "the summary is checked after the run");
});

// Child processes -------------------------------------------------------------------------------------------------------------------------
const tapRun = (files, env) => {
  const result = spawnSync(process.execPath, ["--test", "--test-reporter=tap", ...files], {
    cwd: root, env: { PATH: process.env.PATH, HOME: process.env.HOME || tmpdir(), ...env }, encoding: "utf8", timeout: 120000 });
  const out = `${result.stdout}\n${result.stderr}`;
  const count = (key) => Number((new RegExp(`^# ${key} (\\d+)`, "m").exec(out) || [])[1]);
  return { status: result.status, out, tests: count("tests"), pass: count("pass"), fail: count("fail"), skipped: count("skipped") };
};
const fakeSite = (dir) => { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, "2029.html"), "<!doctype html>"); return dir; };

test("locally a missing prerequisite still SKIPS (never passes); with PUBLIC_CONTENT_PROOF_REQUIRED=1 each proof FAILS and says what is missing", () => {
  const scratch = mkdtempSync(join(tmpdir(), "pc-gate-"));
  try {
    const nothing = { OLD_DIST: join(scratch, "no-old"), NEW_DIST: join(scratch, "no-new") };
    const local = tapRun(PROOFS, nothing);
    assert.deepEqual([local.tests, local.pass, local.fail, local.skipped], [2, 0, 0, 2], "local run: two skips, no pass");
    assert.equal(local.status, 0);

    const ci = tapRun(PROOFS, { ...nothing, PUBLIC_CONTENT_PROOF_REQUIRED: "1" });
    assert.deepEqual([ci.tests, ci.pass, ci.fail, ci.skipped], [2, 0, 2, 0], "required: two failures, no skip");
    assert.notEqual(ci.status, 0);
    assert.match(ci.out, /PUBLIC_CONTENT_PROOF_REQUIRED=1 and the proof cannot run/);
    assert.match(ci.out, /OLD_DIST has no 2029\.html/);
    assert.match(ci.out, /NEW_DIST has no 2029\.html/);

    const noOldVariable = tapRun(PROOFS, { NEW_DIST: fakeSite(join(scratch, "new")), PUBLIC_CONTENT_PROOF_REQUIRED: "1" });
    assert.deepEqual([noOldVariable.pass, noOldVariable.fail, noOldVariable.skipped], [0, 2, 0]);
    assert.match(noOldVariable.out, /OLD_DIST is not set/);

    const sameSite = fakeSite(join(scratch, "same"));
    const same = tapRun(PROOFS, { OLD_DIST: sameSite, NEW_DIST: sameSite, PUBLIC_CONTENT_PROOF_REQUIRED: "1" });
    assert.deepEqual([same.pass, same.fail, same.skipped], [0, 2, 0], "one directory on both sides fails");
    assert.match(same.out, /the same directory/);

    const noBrowser = tapRun(PROOFS, { OLD_DIST: fakeSite(join(scratch, "old")), NEW_DIST: fakeSite(join(scratch, "new2")), CHROMIUM_EXECUTABLE_PATH: join(scratch, "no-chromium"), PUBLIC_CONTENT_PROOF_REQUIRED: "1" });
    assert.deepEqual([noBrowser.pass, noBrowser.fail, noBrowser.skipped], [0, 2, 0], "a missing browser fails, never skips");
    assert.match(noBrowser.out, /no Chromium executable/);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});

const summary = (input, args) => spawnSync(process.execPath, ["scripts/assert-tap-summary.mjs", ...args], { cwd: root, input, encoding: "utf8" });
const ARGS = ["--tests", "2", "--pass", "2", "--fail", "0", "--skipped", "0", "--todo", "0", "--cancelled", "0"];
const tap = (c) => `TAP version 13\n# tests ${c.tests}\n# suites 0\n# pass ${c.pass || 0}\n# fail ${c.fail || 0}\n# cancelled ${c.cancelled || 0}\n# skipped ${c.skipped || 0}\n# todo ${c.todo || 0}\n# duration_ms 5\n`;

test("assert-tap-summary accepts exactly 2/2/0/0/0/0 and refuses a skip, a todo, a failure, a cancelled test, a missing test and an empty report", () => {
  assert.equal(summary(tap({ tests: 2, pass: 2 }), ARGS).status, 0);
  for (const bad of [{ tests: 2, pass: 1, skipped: 1 }, { tests: 2, pass: 1, todo: 1 }, { tests: 2, pass: 1, fail: 1 }, { tests: 2, pass: 1, cancelled: 1 }, { tests: 1, pass: 1 }, { tests: 3, pass: 3 }]) {
    const result = summary(tap(bad), ARGS);
    assert.equal(result.status, 1, JSON.stringify(bad));
    assert.match(result.stderr, /FAILED/);
  }
  assert.equal(summary("", ARGS).status, 1, "an empty report fails");
  assert.equal(summary("TAP version 13\nok 1 - x\n", ARGS).status, 1, "a report without a summary fails");
  assert.equal(summary(tap({ tests: 2, pass: 2 }), []).status, 2, "no expected counts is a usage error");
  assert.equal(summary(tap({ tests: 2, pass: 2 }), ["--passes", "2"]).status, 2, "an unknown key is a usage error");
});

test("both proofs keep their assertions and their old-versus-new meaning (nothing was dropped to make the step pass)", () => {
  const stale = read(PROOFS[0]);
  const world = read(PROOFS[1]);
  for (const text of [stale, world]) {
    assert.match(text, /publicContentProofGate\.mjs/);
    assert.match(text, /assertProofCanRun\(MISSING\)/);
    assert.doesNotMatch(text, /\.skip\(|\bxit\(|\bxtest\(|test\.todo|describe\.skip/, "no test is skipped or marked todo");
  }
  assert.match(stale, /assert\.ok\(a\.log\.includes\('world_contributor_research_v1'\), 'old code reads v1'\)/);
  assert.match(stale, /assert\.ok\(!a\.log\.includes\('world_contributor_research_v2'\), 'old code never reads v2'\)/);
  assert.match(world, /the pre-change site never shows the candidate/);
  assert.match(world, /the new site shows a public candidate labelled «טרם אומת»|labelled «טרם אומת»/);
  assert.equal((stale.match(/assert\./g) || []).length >= 10, true, "the stale-client proof keeps its many assertions");
});
