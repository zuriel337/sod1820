// CI-wiring proof: the EXACT hook block of the Release Visual inline spec (extracted from the workflow heredoc, only the preview URL and the
// relative require paths are substituted) is executed under the REAL Playwright Test runner and the REAL browser of this job, behind a
// local tripwire proxy (no live network). It proves that, as wired in the workflow:
//   * the beforeEach installs the guard and the afterEach runs it, with the same Playwright version and Chromium the acceptance run uses;
//   * a test whose writes and third-party requests are denied passes, with 0 leaks and nothing at the tripwire;
//   * a page-level route.continue() bypass FAILS the test in afterEach (release_visual_egress_leak);
//   * a request that ends in net::ERR_ABORTED without having been denied by the guard FAILS the test the same way.
import http from "node:http";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";

for (const key of ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "ALL_PROXY", "all_proxy"]) delete process.env[key];
const require = createRequire(import.meta.url);
const root = path.resolve(new URL("..", import.meta.url).pathname);
const playwrightDir = path.dirname(require.resolve("@playwright/test/package.json"));
const cli = path.join(playwrightDir, "cli.js");
const playwrightVersion = require("@playwright/test/package.json").version;

// ---- extract the hook block exactly as the workflow defines it --------------------------------------------------------------------
const workflow = fs.readFileSync(path.join(root, ".github/workflows/release-visual-gate.yml"), "utf8");
const open = "cat > .release-gate/release-visual.spec.cjs <<'EOF'";
const start = workflow.indexOf(open);
const end = workflow.indexOf("\n          EOF", start);
assert.ok(start > 0 && end > start, "the inline spec heredoc must exist in release-visual-gate.yml");
const spec = workflow.slice(start + open.length, end).split("\n").map((line) => line.replace(/^ {10}/, "")).join("\n");
const hookBlock = spec.slice(spec.indexOf("const { test, expect } = require('@playwright/test');"), spec.indexOf("const PATH ="));
for (const must of ["installStorageEgressGuard(context)", "installReleaseVisualEgress(context, { baseUrl: BASE })", "test.afterEach", "egress.finish(testInfo)", "release_visual_egress_guard_missing", "serviceWorkers: 'block'"]) {
  assert.ok(hookBlock.includes(must), `the extracted hook block must contain ${must}`);
}
assert.equal(hookBlock.split("const BASE = 'http://127.0.0.1:4173';").length - 1, 1, "BASE must be defined exactly once in the hook block");
assert.equal(hookBlock.split("require('../tests/").length - 1, 2, "the hook block must require exactly the two shared guard modules");

// ---- servers: tripwire proxy (forwards only the proof page) and the proof page ---------------------------------------------------
const tripwire = [];
let pagePort = 0;
const proxy = http.createServer((req, res) => {
  let target = null;
  try { target = new URL(req.url); } catch { /* origin-form request */ }
  if (target && target.hostname === "127.0.0.1" && Number(target.port) === pagePort) {
    const upstream = http.request({ host: "127.0.0.1", port: pagePort, method: req.method, path: target.pathname + target.search, headers: { ...req.headers, host: target.host } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    upstream.on("error", () => { res.writeHead(502); res.end(); });
    req.pipe(upstream);
    return;
  }
  tripwire.push(`HTTP ${req.method} ${req.url}`);
  res.writeHead(204); res.end();
});
proxy.on("connect", (req, socket) => { tripwire.push(`CONNECT ${req.url}`); socket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n"); });
const pageServer = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/html" }); res.end("<!doctype html><meta charset=utf-8><title>hooks proof</title><p>hooks proof</p>"); });
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const BATTERY_HOSTS = ["linswmnnkjxvweumprav.supabase.co", "pixel.unknown.example", "www.google-analytics.com", "abort-demo.test", "escape-demo.test", "fonts.unknown.example"];
const pageLeaks = () => tripwire.filter((t) => BATTERY_HOSTS.some((h) => t.includes(h)));

(async () => {
  pagePort = await listen(pageServer);
  const proxyPort = await listen(proxy);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rv-hooks-proof-"));
  let failed = false;
  try {
    // ---- the generated spec: the real hook block + three probe tests -------------------------------------------------------------
    const hooks = hookBlock
      .replace("const BASE = 'http://127.0.0.1:4173';", `const BASE = 'http://127.0.0.1:${pagePort}';`)
      .split("require('../tests/").join(`require('${root}/tests/`);
    const probes = `
const API = 'https://linswmnnkjxvweumprav.supabase.co';
const H = { 'content-type': 'application/json', apikey: 'proof-not-a-key', authorization: 'Bearer proof-not-a-key' };
test('PROBE writes and third parties are denied and the test passes', async ({ page }) => {
  await page.goto(BASE);
  const out = await page.evaluate(async ([api, h]) => {
    const r = [];
    for (const [m, u] of [['POST', api + '/rest/v1/rpc/track_visit'], ['POST', api + '/rest/v1/rpc/ingest_event'], ['POST', api + '/rest/v1/rpc/link_identity'], ['POST', api + '/rest/v1/page_views'],
      ['POST', api + '/functions/v1/meta-capi'], ['POST', 'https://www.google-analytics.com/g/collect'], ['GET', 'https://unknown.example/api/ping']]) {
      r.push(await fetch(u, { method: m, headers: h, body: m === 'GET' ? undefined : '{}' }).then((x) => x.status, () => 'rejected'));
    }
    await new Promise((resolve) => { const i = new Image(); i.onload = i.onerror = resolve; i.src = 'https://pixel.unknown.example/p.gif'; });
    return r;
  }, [API, H]);
  expect(out.every((s) => s === 403)).toBe(true);
  await page.waitForTimeout(300);
});
test('PROBE bypass: a page-level continue() must make afterEach fail the test', async ({ page }) => {
  await page.route('**/*', (route) => route.continue());
  await page.goto(BASE);
  await page.evaluate(() => fetch('http://escape-demo.test/simple', { method: 'POST', body: 'x', mode: 'no-cors' }).then(() => 1, () => 0));
  await page.waitForTimeout(300);
});
test('PROBE abort: ERR_ABORTED without proof must make afterEach fail the test', async ({ page }) => {
  await page.route('**/abort-demo.test/**', (route) => route.abort('aborted'));
  await page.goto(BASE);
  await page.evaluate(() => fetch('https://abort-demo.test/collect', { method: 'POST', body: 'x' }).then(() => 1, () => 0));
  await page.waitForTimeout(300);
});
`;
    fs.writeFileSync(path.join(tmp, "probe.spec.cjs"), hooks + probes);
    fs.writeFileSync(path.join(tmp, "playwright.config.cjs"), `module.exports = { testDir: __dirname, testMatch: /probe\\.spec\\.cjs$/, workers: 1, retries: 0, reporter: 'line', timeout: 60000,
  outputDir: ${JSON.stringify(path.join(tmp, "out"))}, use: { launchOptions: { proxy: { server: 'http://127.0.0.1:${proxyPort}' }, args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] } } };\n`);

    // The proxy and the page server live in THIS process, so the runner must be spawned asynchronously (a synchronous spawn would freeze them).
    const run = (grep) => new Promise((resolve) => {
      const child = spawn(process.execPath, [cli, "test", "--config", path.join(tmp, "playwright.config.cjs"), "--grep", grep], {
        cwd: tmp,
        env: { ...process.env, NODE_PATH: [path.join(root, "node_modules"), process.env.NODE_PATH].filter(Boolean).join(path.delimiter), CI: "1" },
      });
      let output = "";
      child.stdout.on("data", (d) => { output += d; });
      child.stderr.on("data", (d) => { output += d; });
      const timer = setTimeout(() => child.kill("SIGKILL"), 240000);
      child.on("close", (status) => { clearTimeout(timer); resolve({ status, output }); });
    });

    // A: denied writes + third parties -> the test passes
    tripwire.length = 0;
    const a = await run("PROBE writes");
    assert.equal(a.status, 0, `the denied-writes probe must PASS under the real runner:\n${a.output}`);
    assert.match(a.output, /\[release-visual egress\] reads=\d+ denied=\d+ websockets=\d+ leaks=0/, "the afterEach hook must have run the guard's finish() and logged its line");
    assert.deepEqual(pageLeaks(), [], `nothing the probe sent may reach the network: ${JSON.stringify(pageLeaks())}`);
    const receipt = fs.readFileSync(path.join(tmp, "test-results", "release-visual", "egress-receipt.ndjson"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(receipt.length, 1);
    assert.deepEqual(receipt[0].leaks, []);
    assert.ok(receipt[0].provenDenied >= 8, `the receipt must record the denied requests (got ${receipt[0].provenDenied})`);
    console.log(`PASS  A denied writes + third parties: test passed under Playwright ${playwrightVersion}; receipt: ${receipt[0].provenDenied} proven denied, 0 leaks; tripwire: 0 battery-host hits`);

    // B: a page-level continue() -> the hook fails the test
    const b = await run("PROBE bypass");
    assert.notEqual(b.status, 0, `the bypass probe must FAIL under the real runner:\n${b.output}`);
    assert.match(b.output, /release_visual_egress_leak/);
    assert.ok(pageLeaks().some((t) => t.includes("escape-demo.test")), "the bypassed write must be visible at the tripwire (so the failure is real, not a mock)");
    console.log("PASS  B page-level continue(): the real afterEach hook failed the test with release_visual_egress_leak, and the tripwire saw the bypassed write");

    // C: ERR_ABORTED with no proof of denial -> the hook fails the test
    const c = await run("PROBE abort");
    assert.notEqual(c.status, 0, `the unproven-abort probe must FAIL under the real runner:\n${c.output}`);
    assert.match(c.output, /release_visual_egress_leak/);
    assert.match(c.output, /ERR_ABORTED/);
    assert.match(c.output, /not_denied_by_this_guard/);
    console.log("PASS  C ERR_ABORTED without proof: the real afterEach hook failed the test (not_denied_by_this_guard, net::ERR_ABORTED)");
  } catch (error) {
    failed = true;
    console.error("FAIL", error && error.stack ? error.stack : error);
  } finally {
    proxy.close(); pageServer.close(); proxy.closeAllConnections?.(); pageServer.closeAllConnections?.();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(failed ? "\nRESULT: FAIL" : "\nRESULT: PASS (3 checks)");
  process.exit(failed ? 1 : 0);
})();
