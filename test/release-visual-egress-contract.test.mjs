// Source contract for the Release Visual "Mobile + Accessibility" egress guard. Pure text checks — no Playwright, no network —
// so it can run in the always-on Live Contracts gate as well as in the Release Visual job itself.
//
// The behaviour of the guard is proved elsewhere (release-visual-egress-guard.test.mjs and the tripwire browser proof). This file
// guards the WIRING: a later edit that drops the guard from the inline spec, re-introduces a page-level route.continue()
// (which would bypass a context-level guard), un-gates the proof step, or widens the allow-list silently must fail here.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const workflow = read(".github/workflows/release-visual-gate.yml");

function inlineSpec() {
  const open = "cat > .release-gate/release-visual.spec.cjs <<'EOF'";
  const start = workflow.indexOf(open);
  assert.ok(start > 0, "the inline spec heredoc must exist");
  const end = workflow.indexOf("\n          EOF", start);
  assert.ok(end > start, "the inline spec heredoc must be terminated");
  return workflow.slice(start + open.length, end).split("\n").map((line) => line.replace(/^ {10}/, "")).join("\n");
}
const spec = inlineSpec();
// Negative checks look at code only: the explanatory comments legitimately name the forbidden calls.
const code = spec.replace(/^\s*\/\/.*$/gm, "");

test("the inline spec installs the fail-closed egress guard for every test, after the storage guard", () => {
  assert.match(spec, /require\('\.\.\/tests\/fixtures\/release-visual-egress\.cjs'\)/);
  const hook = spec.match(/test\.beforeEach\(async \(\{ context \}\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(hook, "a context-level beforeEach must install the guards");
  const body = hook[1];
  const storage = body.indexOf("installStorageEgressGuard(context)");
  const guard = body.indexOf("installReleaseVisualEgress(context, { baseUrl: BASE })");
  assert.ok(storage >= 0 && guard > storage, "installReleaseVisualEgress(context, { baseUrl: BASE }) must follow installStorageEgressGuard(context)");
  assert.match(body, /await installReleaseVisualEgress/, "the guard installation must be awaited (a failure must fail the test, not be skipped)");
});

test("afterEach fails the test on a leak and always disposes the guard", () => {
  const hook = spec.match(/test\.afterEach\(async \(\{ context \}, testInfo\) => \{([\s\S]*?)\n\}\);/);
  assert.ok(hook, "an afterEach hook must exist");
  assert.match(hook[1], /egress\.finish\(testInfo\)/);
  assert.match(hook[1], /finally \{ await egress\.dispose\(\); \}/);
  assert.match(hook[1], /release_visual_egress_guard_missing/, "a missing guard must throw (fail closed)");
});

test("service workers are blocked so no request can bypass the context-level routes", () => {
  assert.match(spec, /test\.use\(\{ serviceWorkers: 'block' \}\)/);
});

test("no page-level route can bypass the guard: no continue(), no fetch-through, no unroute, no HAR replay, no unguarded request client", () => {
  assert.doesNotMatch(code, /\.continue\(/, "route.continue() bypasses context-level routes; use route.fulfill or route.fallback");
  assert.doesNotMatch(code, /route\.fetch\(|\.request\.fetch\(/, "route.fetch() sends the request on without the guard");
  assert.doesNotMatch(code, /\bunroute(All)?\b/, "removing routes would remove the guard");
  assert.doesNotMatch(code, /routeFromHAR|routeWebSocket|serviceWorkers:\s*'allow'/);
  assert.doesNotMatch(code, /XMLHttpRequest|sendBeacon|window\.open\(/, "the spec itself must not issue network calls outside the routed page");
  // APIRequestContext calls are not intercepted by routes: they may only GET the local preview.
  const calls = [...code.matchAll(/\.request\.(\w+)\(([^)]*)\)/g)].map((m) => ({ method: m[1], arg: m[2].trim() }));
  assert.ok(calls.length > 0, "the spec is expected to fetch the local 2029 document through page.request");
  for (const { method, arg } of calls) {
    assert.equal(method, "get", `page.request.${method} is not intercepted by the guard`);
    assert.ok(arg.startsWith("`${BASE}"), `page.request.get(${arg}) must target the local preview (BASE)`);
  }
  // Extra PAGES of the same context are covered by the context-level routes; a new CONTEXT or browser would not be.
  assert.doesNotMatch(code, /\.newContext\(|chromium\.launch\(|firefox\.launch\(|webkit\.launch\(/, "a second context/browser would not be guarded");
});

test("the spec's page-level mocks still end requests locally or defer to the guard", () => {
  const ends = (code.match(/route\.fulfill|route\.fallback|route\.abort/g) || []).length;
  assert.ok(ends >= 10, `expected the spec's mocks to fulfill/fallback (found ${ends})`);
  assert.equal((code.match(/route\.fallback\(\)/g) || []).length, 2, "the two former route.continue() sites must use route.fallback()");
});

test("the proof step runs before the acceptance step, is blocking, and runs all three proofs", () => {
  const job = workflow.slice(workflow.indexOf("mobile-accessibility:"));
  const proof = job.indexOf("- name: Prove the telemetry-write guard");
  const accept = job.indexOf("- name: Run visual release acceptance");
  const install = job.indexOf("- name: Install Playwright runner and Chromium");
  assert.ok(install >= 0 && proof > install, "the proof needs Playwright installed first");
  assert.ok(proof > 0 && accept > proof, "the proof must run before the visual acceptance step");
  const step = job.slice(proof, accept);
  for (const file of ["test/release-visual-egress-contract.test.mjs", "test/release-visual-egress-guard.test.mjs", "test/release-visual-egress-guard.browser.mjs"]) {
    assert.ok(step.includes(file), `${file} must run in the proof step`);
  }
  assert.doesNotMatch(step, /continue-on-error|\|\|\s*true|if:\s*always\(\)/, "the proof step must be blocking");
  const acceptStep = job.slice(accept, accept + 400);
  assert.doesNotMatch(acceptStep, /continue-on-error/, "the acceptance step must stay blocking");
});

test("the always-on Live Contracts gate runs this contract", () => {
  assert.ok(read(".github/workflows/live-contracts-2029.yml").includes("test/release-visual-egress-contract.test.mjs"));
});

test("allow-list changes are deliberate: the extra GET read list and the guard's single continue() are pinned", async () => {
  const src = read("tests/fixtures/release-visual-egress.cjs");
  assert.match(src, /const EXTRA_GET_RPCS = Object\.freeze\(\['canonical_follow_subject'\]\);/);
  const code = src.replace(/^\s*\/\/.*$/gm, "");
  assert.equal((code.match(/\.continue\(/g) || []).length, 1, "the guard may continue() exactly the allow-listed GET read and nothing else");
  assert.match(src, /require\('\.\/public-readonly-egress\.cjs'\)/, "the guard must build on the reviewed shared read-only guard");
  assert.match(src, /finish\(testInfo/);
  assert.match(src, /release_visual_egress_leak/);
});
