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

// ---- CI wiring ----------------------------------------------------------------------------------------------------------------------
const INSTALL_COMMANDS = ["npm install --no-save --no-package-lock @playwright/test@1.55.0", "npx playwright install --with-deps chromium"];
const PROOF_SCRIPT = "scripts/release-visual-egress-proof.sh";
const PROOF_STEP = "- name: Prove the telemetry-write guard (fail-closed; no live network)";
const stepBlock = (text, header) => {
  const start = text.indexOf(header);
  assert.ok(start >= 0, `step "${header}" must exist`);
  const rest = text.slice(start + header.length);
  const next = rest.search(/\n {6}- name: /);
  return text.slice(start, next < 0 ? text.length : start + header.length + next);
};

test("CI wiring: the Release Visual job installs Playwright 1.55.0 and its Chromium, then proves the guard before the app starts or the acceptance run begins", () => {
  const job = workflow.slice(workflow.indexOf("mobile-accessibility:"));
  assert.match(job, /runs-on: ubuntu-24\.04/, "the acceptance job runs on the image Playwright 1.55 supports");
  const order = ["- name: Install Playwright runner and Chromium", PROOF_STEP, "- name: Start built app", "- name: Run visual release acceptance"].map((h) => job.indexOf(h));
  assert.ok(order.every((i) => i >= 0), "install, proof, start and acceptance steps must all exist");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "order must be: install Playwright, prove the guard, start the app, run the acceptance");
  const install = stepBlock(job, "- name: Install Playwright runner and Chromium");
  for (const cmd of INSTALL_COMMANDS) assert.ok(install.includes(cmd), `the install step must run: ${cmd}`);
  const proof = stepBlock(job, PROOF_STEP);
  assert.ok(proof.includes(`run: bash ${PROOF_SCRIPT}`), "the proof step must run the shared proof script");
  assert.doesNotMatch(proof, /continue-on-error|\|\|\s*true|if:\s*always\(\)|if:\s*false/, "the proof step must be blocking");
  const acceptance = stepBlock(job, "- name: Run visual release acceptance");
  assert.doesNotMatch(acceptance, /continue-on-error|if:\s*(always\(\)|false)/, "the acceptance step must stay blocking");
  assert.ok(acceptance.includes("npx playwright test .release-gate/release-visual.spec.cjs"), "the acceptance runs under the same Playwright the proof ran on");
  assert.doesNotMatch(job, /PLAYWRIGHT_BROWSERS_PATH|executablePath|--proxy-server|channel:\s*'chrome'/, "the job must not swap the browser between proof and acceptance");
});

test("CI wiring: the proof script runs the contract, the policy matrix, the browser proof and the hooks integration, failing fast", () => {
  const script = read(PROOF_SCRIPT);
  assert.match(script, /set -euo pipefail/);
  const lines = script.split("\n").filter((l) => l.startsWith("node "));
  assert.deepEqual(lines, [
    "node --test test/release-visual-egress-contract.test.mjs test/release-visual-egress-guard.test.mjs",
    "node test/release-visual-egress-guard.browser.mjs",
    "node test/release-visual-egress-hooks.integration.mjs",
  ]);
  for (const line of lines) for (const file of line.match(/test\/[\w.-]+\.mjs/g)) assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist`);
  assert.ok((fs.statSync(path.join(root, PROOF_SCRIPT)).mode & 0o111) !== 0, "the proof script must be executable");
});

test("CI wiring: the proof-only workflow is manual, read-only and proves on the same Playwright and Chromium without touching anything else", () => {
  const proofOnly = read(".github/workflows/release-visual-egress-proof.yml");
  const header = proofOnly.replace(/^\s*#.*$/gm, "");
  const triggers = header.slice(header.indexOf("\non:"), header.indexOf("\npermissions:"));
  assert.match(triggers, /workflow_dispatch/);
  assert.doesNotMatch(triggers, /pull_request|push|schedule|workflow_run|deployment_status|workflow_call/, "manual dispatch only");
  assert.match(header, /\npermissions:\n {2}contents: read\n/, "contents: read and nothing else");
  assert.doesNotMatch(header.slice(header.indexOf("\npermissions:")), /(deployments|statuses|actions|checks|packages|id-token|pull-requests|issues): (read|write)|contents: write/);
  assert.equal((header.match(/\n {2}[\w-]+:\n {4}name:/g) || []).length, 1, "exactly one job");
  assert.match(header, /runs-on: ubuntu-24\.04/);
  assert.match(header, /node-version-file: \.nvmrc/);
  for (const cmd of INSTALL_COMMANDS) assert.ok(header.includes(cmd), `must install exactly like the Release Visual job: ${cmd}`);
  assert.ok(header.includes(`run: bash ${PROOF_SCRIPT}`));
  assert.doesNotMatch(header, /npm run build|npm run preview|vite|release-canary|canary|gh api|GH_TOKEN|secrets\.|SUPABASE|VERCEL|deploy|\.release-gate|upload-artifact|playwright test/i, "proof only: no build, preview, acceptance, canary, deployment lookup, secret or artifact");
  assert.match(proofOnly, /PROOF ONLY/);
});

test("CI wiring: the hooks integration runs the workflow's own hook block under the real Playwright Test runner", () => {
  const integration = read("test/release-visual-egress-hooks.integration.mjs");
  assert.ok(integration.includes(".github/workflows/release-visual-gate.yml") && integration.includes("cat > .release-gate/release-visual.spec.cjs <<'EOF'"), "the hook block must be extracted from the workflow, not copied");
  assert.ok(integration.includes('cli.js') && integration.includes('"test", "--config"'), "it must drive the real runner CLI");
  for (const probe of ["PROBE writes", "PROBE bypass", "PROBE abort"]) assert.ok(integration.includes(probe), `${probe} must be run`);
  assert.ok(integration.includes("release_visual_egress_leak"));
  assert.ok(integration.includes("await run("), "the runner must be spawned asynchronously: the tripwire and page servers live in the same process");
  assert.doesNotMatch(integration, /spawnSync|execSync/, "a synchronous spawn would freeze the in-process servers");
});

test("the always-on Live Contracts gate runs this contract, and this contract needs no browser", () => {
  assert.ok(read(".github/workflows/live-contracts-2029.yml").includes("test/release-visual-egress-contract.test.mjs"));
  const self = read("test/release-visual-egress-contract.test.mjs");
  const imports = [...self.matchAll(/^import [^\n]* from ["']([^"']+)["'];?$/gm)].map((m) => m[1]);
  assert.ok(imports.length >= 4 && imports.every((name) => name.startsWith("node:")), `the contract must import Node built-ins only (got ${imports}) so Live Contracts can run it without Playwright`);
  assert.doesNotMatch(self, /^(const|let|var) [^\n]*= require\(/m, "no require() call: the contract stays pure");
});

// ---- the guard module -------------------------------------------------------------------------------------------------------------------
test("guard module invariants: one owning route, ledger before any await, never continues, no 'unverified' category, allow-list is data", () => {
  const src = read("tests/fixtures/release-visual-egress.cjs");
  const code = src.replace(/^\s*\/\/.*$/gm, "");
  assert.equal((code.match(/\.continue\(/g) || []).length, 0, "the guard must never continue() a request: it either falls back (reads) or fulfills (denials)");
  assert.equal((code.match(/await context\.route\(/g) || []).length, 1, "exactly one route owns every decision");
  const handlerStart = code.indexOf("await context.route(/.*/, async (route) => {");
  assert.ok(handlerStart > 0, "the owning route must match every URL");
  const bodyStart = code.indexOf("{", code.indexOf("async (route) =>", handlerStart));
  const ledger = code.indexOf("denied.set(request", handlerStart);
  const fulfill = code.indexOf("route.fulfill(", handlerStart);
  assert.ok(bodyStart > handlerStart && ledger > bodyStart && fulfill > ledger, "the ledger entry must be written before the denial is fulfilled");
  assert.doesNotMatch(code.slice(bodyStart, ledger), /\bawait\b/, "no await may precede the ledger entry: the request must be recorded before anything can cancel it");
  assert.doesNotMatch(code, /unverified/i, "there is no 'unverified' category: a blocked request is proven denied or it is a leak");
  assert.doesNotMatch(code, /installPublicReadOnlyEgress/, "the shared guard is used for its canonical read policy only; this module owns the route");
  assert.match(code, /const \{ allowsPublicRead \} = require\('\.\/public-readonly-egress\.cjs'\);/);
  assert.match(code, /JSON\.parse\(fs\.readFileSync\(path\.join\(__dirname, 'release-visual-egress-allowlist\.json'\), 'utf8'\)\)/);
  assert.match(code, /validateAllowlist\(ALLOWLIST\);/, "the allow-list must be validated at load");
  assert.match(code, /problem: 'not_denied_by_this_guard'/);
  assert.match(code, /await settle\(\);/);
  assert.match(code, /throw new Error\(`release_visual_egress_leak:/);
  assert.match(code, /routeWebSocket/);
  assert.match(code, /navigator\.sendBeacon = \(\) => false/);
});

test("allow-list changes are documented before they are made: every allowed host and RPC appears in the guard document with its reason", () => {
  const list = JSON.parse(read("tests/fixtures/release-visual-egress-allowlist.json"));
  assert.deepEqual(list.thirdParty.map((e) => e.host), ["fonts.googleapis.com", "fonts.gstatic.com"], "adding a host is a deliberate, documented change");
  assert.deepEqual(list.canonicalExtraGetRpcs.map((e) => e.name), ["canonical_follow_subject"]);
  assert.match(list.policy, /DEFAULT-DENY/);
  const doc = read("docs/reviews/audit-remediation-20261106/RELEASE-VISUAL-EGRESS-GUARD.md");
  const section = doc.slice(doc.indexOf("## 6."));
  assert.ok(section.length > 200, "section 6 (the allow-list register) must exist");
  for (const entry of [...list.thirdParty, ...list.canonicalExtraGetRpcs]) {
    const id = entry.host || entry.name;
    assert.ok(section.includes(id), `${id} must be listed in section 6 of RELEASE-VISUAL-EGRESS-GUARD.md`);
  }
  assert.match(section, /not allow-listed|NOT allow-listed/i, "the register must also list what is known to be blocked and why");
});
