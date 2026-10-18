import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:https";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, resolve, sep } from "node:path";
import {
  NUMBER_REVIEW_PREVIEW_BRANCH_2029,
  isNumberReviewPreviewBuild2029,
  isNumberReviewPreviewRuntime2029,
  projectNumberReviewFlag2029,
} from "../src/lib/numberReviewPreview2029.js";
import {
  previewReceiptIdentity,
  verifyPreviewArtifactInventory,
} from "../scripts/preview-artifact-inventory.mjs";
import { PREVIEW_READ_RPC_ALLOWLIST } from "../scripts/preview-readonly-worker.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const dist = resolve(process.env.NUMBER_REVIEW_DIST || resolve(root, "preview-deploy/dist"));
const chromiumPath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const require = createRequire(import.meta.url);
let chromium = null;
try { ({ chromium } = require("/opt/codex/cua_node/lib/node_modules/playwright")); } catch { /* evidence host only */ }
const runnable = Boolean(chromium && existsSync(chromiumPath) && existsSync(resolve(dist, "2029.html")));
let tls = null;
let tlsDir = null;
const browserDiagnostics = new WeakMap();

function captureBrowserDiagnostics(page) {
  const diagnostics = { requestFailures: [], badResponses: [], consoleErrors: [], pageErrors: [] };
  browserDiagnostics.set(page, diagnostics);
  page.on("requestfailed", (request) => diagnostics.requestFailures.push({
    url: request.url(),
    method: request.method(),
    error: request.failure()?.errorText || "request failed",
  }));
  page.on("response", (response) => {
    if (response.status() >= 400) diagnostics.badResponses.push({ url: response.url(), status: response.status() });
  });
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.pageErrors.push(String(error?.stack || error)));
}

async function localTls(host) {
  if (tls) return tls;
  tlsDir = await mkdtemp(resolve(tmpdir(), "sod1820-preview-number-"));
  const keyPath = resolve(tlsDir, "key.pem");
  const certPath = resolve(tlsDir, "cert.pem");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", keyPath, "-out", certPath, "-days", "1",
    "-subj", `/CN=${host}`, "-addext", `subjectAltName=DNS:${host}`,
  ], { stdio: "ignore" });
  tls = { key: await readFile(keyPath), cert: await readFile(certPath) };
  return tls;
}

after(async () => {
  if (tlsDir) await rm(tlsDir, { recursive: true, force: true });
});

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
async function waitUntil(predicate, timeout = 5000) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeout) throw new Error("condition timeout");
    await sleep(20);
  }
}

const contentType = (file) => ({
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2",
})[extname(file)] || "application/octet-stream";

const requiredFlags = [
  { key: "lock_number", enabled: true, mode: "all", message: "synthetic canonical lock" },
  { key: "lock_world", enabled: false, mode: "all", message: "" },
  { key: "lock_heichal", enabled: true, mode: "all", message: "" },
  { key: "lock_books", enabled: true, mode: "all", message: "" },
  { key: "lock_life_journey", enabled: true, mode: "all", message: "" },
  { key: "lock_raziel_site", enabled: true, mode: "all", message: "" },
  { key: "fx_number_lookup_page", enabled: false, mode: "all", message: "" },
  { key: "fx_now_feed", enabled: false, mode: "all", message: "" },
  { key: "fx_analytics", enabled: false, mode: "all", message: "" },
];
const withoutNumber = requiredFlags.filter((row) => row.key !== "lock_number");
const requiredNumber = requiredFlags.find((row) => row.key === "lock_number");

async function loadBuild() {
  const metadata = JSON.parse(await readFile(resolve(dist, "preview-build.json"), "utf8"));
  const html = await readFile(resolve(dist, "2029.html"), "utf8");
  const manifest = JSON.parse(await readFile(resolve(dist, ".vite/manifest.json"), "utf8"));
  const entryPath = html.match(/await import\('([^']+)'\)/)?.[1] || html.match(/await import\("([^"]+)"\)/)?.[1];
  const homePath = Object.values(manifest).find((entry) => entry.src === "src/pages/Home2029Page.jsx")?.file;
  assert.ok(entryPath, "Preview bootstrap entry must be discoverable");
  assert.ok(homePath, "Home route chunk must exist");
  return { metadata, html, manifest, entryPath: entryPath.replace(/^\//, ""), homePath };
}

async function localServer(build, {
  delayWorker = 0,
  delayEntry = 0,
  delayHome = 0,
  startUnsafeExpected = false,
  entryWriteProbe = false,
} = {}) {
  const htmlPath = resolve(dist, "2029.html");
  const state = {
    postRequests: 0,
    workerRespondedAt: 0,
    expectedWorkerRespondedAt: 0,
    workerRequests: [],
    entryRequestedAt: 0,
    homeRequestedAt: 0,
    workerSource: startUnsafeExpected ? "unsafe" : "safe",
  };
  const oldWorker = "self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));";
  const server = createServer(await localTls(build.metadata.host), async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      if (request.method !== "GET" && request.method !== "HEAD") {
        state.postRequests += 1;
        response.writeHead(201, { "content-type": "application/json" });
        response.end("{}");
        return;
      }
      if (url.pathname === "/old-controller.html") {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        response.end("<!doctype html><title>old controller</title><body>old controller</body>");
        return;
      }
      if (url.pathname === "/old-sw.js") {
        response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" });
        response.end(oldWorker);
        return;
      }
      const requested = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      if (requested === "preview-readonly-sw.js") {
        const unsafe = state.workerSource === "unsafe";
        state.workerRequests.push({ url: `${url.pathname}${url.search}`, unsafe, at: Date.now() });
        if (!unsafe && delayWorker) await sleep(delayWorker);
        if (unsafe) {
          response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "public,max-age=31536000,immutable" });
          response.end(oldWorker);
        } else {
          const body = await readFile(resolve(dist, requested));
          response.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" });
          response.end(body);
          state.workerRespondedAt = Date.now();
          if (`${url.pathname}${url.search}` === build.metadata.workerScript) state.expectedWorkerRespondedAt = state.workerRespondedAt;
        }
        return;
      }
      if (requested === build.entryPath) {
        state.entryRequestedAt = Date.now();
        if (delayEntry) await sleep(delayEntry);
      }
      if (requested === build.homePath) {
        state.homeRequestedAt = Date.now();
        if (delayHome) await sleep(delayHome);
      }
      let file = requested && extname(requested) ? resolve(dist, requested) : htmlPath;
      if (!file.startsWith(`${dist}${sep}`) && file !== htmlPath) file = htmlPath;
      let body = await readFile(file);
      if (requested === build.entryPath && entryWriteProbe) {
        body = Buffer.concat([
          Buffer.from("globalThis.__sodAppWriteProbe=fetch('/app-write-probe',{method:'POST',body:'synthetic'}).then(r=>({status:r.status,blocked:r.headers.get('X-Preview-Write-Blocked')}));\n"),
          body,
        ]);
      }
      response.writeHead(200, { "content-type": contentType(file), "cache-control": "no-store" });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("not found");
    }
  });
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  const port = server.address().port;
  return {
    state,
    origin: `https://${build.metadata.host}:${port}`,
    close: () => new Promise((done, reject) => server.close((error) => error ? reject(error) : done())),
  };
}

async function installBoundary(context, origin, {
  flagResponses = [requiredFlags],
  targetedFlagResponses = [[requiredNumber]],
  targetedFlagDelays = [],
} = {}) {
  await context.addInitScript(({ responses, targetedResponses, targetedDelays }) => {
    const nativeFetch = window.fetch.bind(window);
    Object.defineProperty(window, "__sodNativeFetch", { value: nativeFetch });
    window.__sodFlagReads = { full: 0, targeted: 0 };
    window.__sodUnsafeRequests = [];
    window.__sodSupabaseRequests = [];
    window.fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url, location.href);
      if (url.hostname === "linswmnnkjxvweumprav.supabase.co") {
        window.__sodSupabaseRequests.push(`${request.method} ${url.pathname}${url.search}`);
        if (url.pathname === "/rest/v1/site_flags" && request.method === "GET") {
          const targeted = url.searchParams.get("key") === "eq.lock_number";
          const kind = targeted ? "targeted" : "full";
          const index = window.__sodFlagReads[kind]++;
          if (targeted && targetedDelays[index]) await new Promise((resolve) => setTimeout(resolve, targetedDelays[index]));
          const sequence = targeted ? targetedResponses : responses;
          const rows = sequence[Math.min(index, sequence.length - 1)] || [];
          return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
        }
        if (request.method === "OPTIONS") return new Response("", { status: 204 });
        if (url.pathname.startsWith("/auth/v1/")) {
          return new Response(JSON.stringify({ user: null }), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (!["GET", "HEAD"].includes(request.method) && !url.pathname.startsWith("/rest/v1/rpc/")) {
          window.__sodUnsafeRequests.push(`${request.method} ${url.pathname}`);
          return new Response(JSON.stringify({ error: "test_write_blocked" }), { status: 403, headers: { "content-type": "application/json" } });
        }
        return new Response(url.pathname.startsWith("/rest/v1/rpc/") ? "null" : "[]", { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.origin === location.origin) return nativeFetch(input, init);
      return new Response("", { status: 204 });
    };
  }, { responses: flagResponses, targetedResponses: targetedFlagResponses, targetedDelays: targetedFlagDelays });

}

async function launchHarness(build, options = {}) {
  const server = await localServer(build, options);
  const browser = await chromium.launch({
    executablePath: chromiumPath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-proxy-server",
      "--ignore-certificate-errors",
      `--host-resolver-rules=MAP ${build.metadata.host} 127.0.0.1, MAP fonts.googleapis.com ~NOTFOUND, MAP fonts.gstatic.com ~NOTFOUND, MAP linswmnnkjxvweumprav.supabase.co ~NOTFOUND`,
    ],
  });
  const context = await browser.newContext({ serviceWorkers: "allow", ignoreHTTPSErrors: true });
  context.on("page", captureBrowserDiagnostics);
  await installBoundary(context, server.origin, options);
  return { server, browser, context };
}

async function exactController(page, build, origin) {
  const expected = new URL(build.metadata.workerScript, origin).href;
  await page.waitForFunction(({ script, guard }) => navigator.serviceWorker.controller?.scriptURL === script
    && document.documentElement.dataset.sodPreviewGuard === guard,
  { script: expected, guard: build.metadata.guardIdentitySha256 }, { timeout: 15_000 });
  assert.equal(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL), expected);
  const attestation = await page.evaluate(async () => {
    const worker = navigator.serviceWorker.controller;
    const channel = new MessageChannel();
    const nonce = "browser-verification";
    const response = new Promise((resolve) => { channel.port1.onmessage = (event) => resolve(event.data); });
    worker.postMessage({ type: "SOD_PREVIEW_GUARD_CHALLENGE", nonce }, [channel.port2]);
    return response;
  });
  assert.equal(attestation.type, "SOD_PREVIEW_GUARD_ATTESTATION");
  assert.equal(attestation.nonce, "browser-verification");
  assert.deepEqual(attestation.identity, {
    protocol: build.metadata.guardProtocol,
    commit: build.metadata.commit,
    branch: build.metadata.branch,
    host: build.metadata.host,
    buildTarget: build.metadata.buildTarget,
    vercelEnv: build.metadata.vercelEnv,
    readRpcAllowlist: [...PREVIEW_READ_RPC_ALLOWLIST],
    guardIdentitySha256: build.metadata.guardIdentitySha256,
    workerContentSha256: build.metadata.workerContentSha256,
  });
  return expected;
}

async function waitForNumber(page) {
  try {
    await page.waitForSelector(".sod29-number-page", { timeout: 20_000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      guard: document.documentElement.dataset.sodPreviewGuard || null,
      controller: navigator.serviceWorker.controller?.scriptURL || null,
      body: document.body?.innerText?.slice(0, 1200) || "",
    })).catch(() => ({ guard: null, controller: null, body: "document unavailable" }));
    throw new Error(`Number did not mount: ${JSON.stringify({ ...state, diagnostics: browserDiagnostics.get(page) || null })}`, { cause: error });
  }
  assert.equal(await page.locator(".mlock").count(), 0);
}

test("Preview receipt binds the clean source, exact guard and complete deployed inventory", { skip: !runnable }, async () => {
  const build = await loadBuild();
  const { metadata, html } = build;
  assert.equal(metadata.branch, NUMBER_REVIEW_PREVIEW_BRANCH_2029);
  assert.equal(metadata.buildTarget, "2029");
  assert.equal(metadata.vercelEnv, "preview");
  assert.equal(metadata.sourceClean, true);
  assert.equal(metadata.numberReviewPreviewOpen, true);
  assert.deepEqual(metadata.previewOverrides, ["lock_number"]);
  assert.match(metadata.commit, /^[a-f0-9]{40}$/);
  assert.match(metadata.host, /^sod1820-[a-z0-9-]+-sod1820-s-projects\.vercel\.app$/);
  assert.equal(metadata.workerScript, `/preview-readonly-sw.js?content=${metadata.workerContentSha256}`);
  assert.match(metadata.workerContentSha256, /^[a-f0-9]{64}$/);
  assert.match(metadata.guardIdentitySha256, /^[a-f0-9]{64}$/);
  assert.ok(metadata.guardDeadlineMs < 20_000);
  assert.equal(metadata.manifestSha256, sha256(await readFile(resolve(dist, ".vite/manifest.json"))));
  assert.equal(metadata.htmlSha256, sha256(await readFile(resolve(dist, "2029.html"))));
  assert.equal(metadata.indexHtmlSha256, sha256(await readFile(resolve(dist, "index.html"))));
  assert.equal(metadata.workerSha256, sha256(await readFile(resolve(dist, "preview-readonly-sw.js"))));
  assert.equal(metadata.fallbackWorkerSha256, sha256(await readFile(resolve(dist, "sw.js"))));
  assert.equal(metadata.workerContentSha256, metadata.workerSha256);
  assert.equal(metadata.identitySha256, sha256(JSON.stringify(previewReceiptIdentity(metadata))));
  const verified = await verifyPreviewArtifactInventory(dist);
  assert.equal(verified.inventory.artifacts.length, metadata.artifactCount);
  assert.match(html, new RegExp(metadata.commit));
  assert.match(html, new RegExp(metadata.host.replaceAll(".", "\\.")));
  assert.match(html, new RegExp(metadata.guardIdentitySha256));
});

test("Production, another branch, a regular build, another host and malformed gates stay closed", () => {
  const exact = {
    SOD_BUILD_TARGET: "2029",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: NUMBER_REVIEW_PREVIEW_BRANCH_2029,
  };
  assert.equal(isNumberReviewPreviewBuild2029(exact), true);
  assert.equal(isNumberReviewPreviewBuild2029({ ...exact, VERCEL_ENV: "production" }), false);
  assert.equal(isNumberReviewPreviewBuild2029({ ...exact, VERCEL_GIT_COMMIT_REF: "main" }), false);
  assert.equal(isNumberReviewPreviewBuild2029({ ...exact, VERCEL_GIT_COMMIT_REF: "gpt/other" }), false);
  assert.equal(isNumberReviewPreviewBuild2029({ ...exact, SOD_BUILD_TARGET: "legacy" }), false);
  assert.equal(isNumberReviewPreviewBuild2029({}), false);
  assert.equal(isNumberReviewPreviewRuntime2029({ previewOpen: true, approvedHost: "approved.example", hostname: "other.example" }), false);
  for (const malformed of [
    null,
    { key: "lock_number", enabled: "true", mode: "all" },
    { key: "lock_number", enabled: true, mode: "everyone" },
    { key: "other", enabled: true, mode: "all" },
  ]) assert.equal(projectNumberReviewFlag2029("lock_number", malformed, true), null);
});

test("first install, reload, internal navigation, back-forward and a fresh context all require attestation", { skip: !runnable, timeout: 90_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, { flagResponses: [requiredFlags] });
  try {
    const page = await harness.context.newPage();
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "domcontentloaded" });
    await waitForNumber(page);
    await exactController(page, build, harness.server.origin);
    assert.deepEqual(await page.evaluate(() => window.__sodFlagReads), { full: 1, targeted: 0 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForNumber(page);
    await exactController(page, build, harness.server.origin);

    await page.goto(`${harness.server.origin}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".sod29-root.surface-home", { timeout: 20_000 });
    await page.locator('a[href="/number/1820"]').first().click();
    await waitForNumber(page);
    await exactController(page, build, harness.server.origin);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".sod29-root.surface-home", { timeout: 20_000 });
    await exactController(page, build, harness.server.origin);
    await page.goForward({ waitUntil: "domcontentloaded" });
    await waitForNumber(page);
    await exactController(page, build, harness.server.origin);
    assert.deepEqual(await page.evaluate(() => window.__sodUnsafeRequests), []);

    const fresh = await harness.browser.newContext({ serviceWorkers: "allow", ignoreHTTPSErrors: true });
    fresh.on("page", captureBrowserDiagnostics);
    await installBoundary(fresh, harness.server.origin, { flagResponses: [requiredFlags] });
    const second = await fresh.newPage();
    await second.goto(`${harness.server.origin}/number/1820`, { waitUntil: "domcontentloaded" });
    await waitForNumber(second);
    await exactController(second, build, harness.server.origin);
    await fresh.close();
  } finally {
    await harness.context.close();
    await harness.browser.close();
    await harness.server.close();
  }
});

test("an unsafe same-URL controller cannot authorize app import or writes while the corrected worker installs", { skip: !runnable, timeout: 60_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, {
    flagResponses: [requiredFlags],
    delayWorker: 1_200,
    startUnsafeExpected: true,
    entryWriteProbe: true,
  });
  try {
    const page = await harness.context.newPage();
    await page.goto(`${harness.server.origin}/old-controller.html`, { waitUntil: "domcontentloaded" });
    await page.evaluate(async (workerScript) => {
      await navigator.serviceWorker.register(workerScript, { scope: "/", updateViaCache: "all" });
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
      }
    }, build.metadata.workerScript);
    assert.equal(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL), new URL(build.metadata.workerScript, harness.server.origin).href);
    harness.server.state.workerSource = "safe";
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "commit" });
    await page.waitForFunction(() => document.documentElement.dataset.sodPreviewGuard === "checking");
    assert.equal(harness.server.state.entryRequestedAt, 0, "same scriptURL without an attestation must not import the app");
    const probes = await page.evaluate(async () => {
      const fetchResponse = await fetch("/race-fetch-write", { method: "POST", body: "synthetic" });
      let xhrBlocked = false;
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/race-xhr-write");
        xhr.send("synthetic");
      } catch (error) { xhrBlocked = error?.name === "SecurityError"; }
      const beaconBlocked = navigator.sendBeacon("/race-beacon-write", "synthetic") === false;
      return {
        fetch: { status: fetchResponse.status, blocked: fetchResponse.headers.get("X-Preview-Write-Blocked") },
        xhrBlocked,
        beaconBlocked,
      };
    });
    assert.deepEqual(probes, {
      fetch: { status: 403, blocked: "true" },
      xhrBlocked: true,
      beaconBlocked: true,
    });
    assert.equal(harness.server.state.postRequests, 0);
    await waitForNumber(page);
    await exactController(page, build, harness.server.origin);
    assert.ok(harness.server.state.expectedWorkerRespondedAt > 0);
    assert.ok(harness.server.state.entryRequestedAt >= harness.server.state.expectedWorkerRespondedAt,
      `entry ${harness.server.state.entryRequestedAt} must follow corrected worker ${harness.server.state.expectedWorkerRespondedAt}`);
    assert.deepEqual(await page.evaluate(() => window.__sodAppWriteProbe), { status: 403, blocked: "true" });
    assert.equal(harness.server.state.postRequests, 0, "neither pending bootstrap nor imported app reached the write endpoint");
  } finally {
    await harness.context.close();
    await harness.browser.close();
    await harness.server.close();
  }
});

test("a controller whose query differs cannot satisfy the active-worker gate", { skip: !runnable, timeout: 60_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, { flagResponses: [requiredFlags], delayWorker: 900 });
  try {
    const page = await harness.context.newPage();
    const mismatch = `${build.metadata.workerScript}&stale=1`;
    await page.goto(`${harness.server.origin}/old-controller.html`, { waitUntil: "domcontentloaded" });
    await page.evaluate(async (workerScript) => {
      await navigator.serviceWorker.register(workerScript, { scope: "/", updateViaCache: "none" });
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
      }
    }, mismatch);
    assert.equal(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL), new URL(mismatch, harness.server.origin).href);
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "commit" });
    await page.waitForFunction(() => document.documentElement.dataset.sodPreviewGuard === "checking");
    assert.equal(harness.server.state.entryRequestedAt, 0);
    await waitForNumber(page);
    await exactController(page, build, harness.server.origin);
  } finally {
    await harness.context.close();
    await harness.browser.close();
    await harness.server.close();
  }
});

test("a 20 second worker stall shows the Hebrew fail-closed state inside the one total deadline", { skip: !runnable, timeout: 35_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, { flagResponses: [requiredFlags], delayWorker: 20_000 });
  try {
    const page = await harness.context.newPage();
    const started = Date.now();
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "commit" });
    await page.waitForFunction(() => document.documentElement.dataset.sodPreviewGuard === "blocked"
      && document.body?.innerText.includes("לא ניתן לאמת את מצב הקריאה בלבד"), null,
    { timeout: build.metadata.guardDeadlineMs + 3_000 });
    const elapsed = Date.now() - started;
    assert.ok(elapsed <= build.metadata.guardDeadlineMs + 2_000, `visible failure took ${elapsed}ms`);
    assert.ok(elapsed < 20_000, "failure must appear before the stalled response");
    assert.equal(harness.server.state.entryRequestedAt, 0);
    assert.match(await page.locator("body").innerText(), /לא ניתן לאמת את מצב הקריאה בלבד/);
    const blocked = await page.evaluate(async () => {
      const response = await fetch("/deadline-write", { method: "POST", body: "synthetic" });
      return { status: response.status, header: response.headers.get("X-Preview-Write-Blocked") };
    });
    assert.deepEqual(blocked, { status: 403, header: "true" });
    assert.equal(harness.server.state.postRequests, 0);
  } finally {
    await harness.context.close();
    await harness.browser.close();
    await harness.server.close();
  }
});

test("the active guard allows only the exact Number reader and blocks adjacent RPCs and every write", { skip: !runnable, timeout: 60_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, { flagResponses: [requiredFlags], delayEntry: 900 });
  try {
    const page = await harness.context.newPage();
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "commit" });
    await exactController(page, build, harness.server.origin);
    assert.equal(await page.locator(".sod29-number-page").count(), 0);
    await waitForNumber(page);
    await harness.context.route("https://linswmnnkjxvweumprav.supabase.co/**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "null",
    }));
    const result = await page.evaluate(async () => {
      const request = async (url, init) => {
        const response = await window.__sodNativeFetch(url, init);
        return { status: response.status, blocked: response.headers.get("X-Preview-Write-Blocked") };
      };
      return {
        sameOriginWrite: await request("/write-probe", { method: "POST", body: "synthetic" }),
        exactReader: await request("https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/fn_number_opening_projection_2029", { method: "POST", body: "{}" }),
        adjacentReader: await request("https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/fn_number_opening_projection_depth_2029", { method: "POST", body: "{}" }),
        tableWrite: await request("https://linswmnnkjxvweumprav.supabase.co/rest/v1/posts?id=eq.1", { method: "PATCH", body: "{}" }),
      };
    });
    assert.deepEqual(result, {
      sameOriginWrite: { status: 403, blocked: "true" },
      exactReader: { status: 200, blocked: null },
      adjacentReader: { status: 403, blocked: "true" },
      tableWrite: { status: 403, blocked: "true" },
    });
    assert.equal(harness.server.state.postRequests, 0);
  } finally {
    await harness.context.close();
    await harness.browser.close();
    await harness.server.close();
  }
});

test("one automatic fresh read recovers a transient missing Number gate", { skip: !runnable, timeout: 45_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, {
    flagResponses: [withoutNumber],
    targetedFlagResponses: [[requiredNumber]],
  });
  try {
    const page = await harness.context.newPage();
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "domcontentloaded" });
    await waitForNumber(page);
    assert.deepEqual(await page.evaluate(() => window.__sodFlagReads), { full: 1, targeted: 1 });
  } finally {
    await harness.context.close();
    await harness.browser.close();
    await harness.server.close();
  }
});

test("two missing reads fail closed and expose a bounded manual retry", { skip: !runnable, timeout: 45_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, {
    flagResponses: [withoutNumber],
    targetedFlagResponses: [[], [requiredNumber]],
  });
  try {
    const page = await harness.context.newPage();
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".mlock button.mlock-retry", { timeout: 20_000 });
    assert.equal(await page.locator(".sod29-number-page").count(), 0);
    assert.deepEqual(await page.evaluate(() => window.__sodFlagReads), { full: 1, targeted: 1 });
    await page.locator(".mlock button.mlock-retry").click();
    await waitForNumber(page);
    assert.deepEqual(await page.evaluate(() => window.__sodFlagReads), { full: 1, targeted: 2 });
  } finally {
    await harness.context.close();
    await harness.browser.close();
    await harness.server.close();
  }
});

test("manual Number retry issues one targeted request without shared callbacks or switch restarts", { skip: !runnable, timeout: 45_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, {
    flagResponses: [withoutNumber],
    targetedFlagResponses: [[], []],
    targetedFlagDelays: [0, 500],
  });
  try {
    const page = await harness.context.newPage();
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "domcontentloaded" });
    const button = page.locator(".mlock button.mlock-retry");
    await button.waitFor({ timeout: 20_000 });
    await sleep(250);
    const before = await page.evaluate(() => ({
      reads: { ...window.__sodFlagReads },
      nonTarget: window.__sodSupabaseRequests.filter((value) => !value.includes("key=eq.lock_number")).length,
    }));
    assert.deepEqual(before.reads, { full: 1, targeted: 1 });
    await button.click();
    await page.waitForFunction(() => window.__sodFlagReads.targeted === 2);
    assert.equal(await button.isDisabled(), true, "manual control is disabled while its one request is pending");
    await page.waitForFunction(() => {
      const retry = document.querySelector(".mlock button.mlock-retry");
      return retry && !retry.disabled;
    });
    await sleep(100);
    const afterRetry = await page.evaluate(() => ({
      reads: { ...window.__sodFlagReads },
      nonTarget: window.__sodSupabaseRequests.filter((value) => !value.includes("key=eq.lock_number")).length,
    }));
    assert.deepEqual(afterRetry.reads, { full: 1, targeted: 2 });
    assert.equal(afterRetry.nonTarget, before.nonTarget,
      "the targeted retry must not invalidate site_flags or restart fx_now_feed/fx_analytics/other consumers");
    assert.equal(await page.locator(".sod29-number-page").count(), 0);
  } finally {
    await harness.context.close();
    await harness.browser.close();
    await harness.server.close();
  }
});

test("malformed enabled or mode values stay closed after the single retry", { skip: !runnable, timeout: 60_000 }, async () => {
  const build = await loadBuild();
  for (const malformed of [
    requiredFlags.map((row) => row.key === "lock_number" ? { ...row, enabled: "true" } : row),
    requiredFlags.map((row) => row.key === "lock_number" ? { ...row, mode: "everyone" } : row),
  ]) {
    const malformedNumber = malformed.find((row) => row.key === "lock_number");
    const harness = await launchHarness(build, {
      flagResponses: [malformed],
      targetedFlagResponses: [[malformedNumber]],
    });
    try {
      const page = await harness.context.newPage();
      await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".mlock button.mlock-retry", { timeout: 20_000 });
      assert.equal(await page.locator(".sod29-number-page").count(), 0);
      assert.deepEqual(await page.evaluate(() => window.__sodFlagReads), { full: 1, targeted: 1 });
    } finally {
      await harness.context.close();
      await harness.browser.close();
      await harness.server.close();
    }
  }
});

test("initial Home route fallback remains visually quiet while its chunk is delayed", { skip: !runnable, timeout: 45_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, { flagResponses: [requiredFlags], delayHome: 800 });
  try {
    const page = await harness.context.newPage();
    await page.goto(`${harness.server.origin}/`, { waitUntil: "commit" });
    await exactController(page, build, harness.server.origin);
    await waitUntil(() => harness.server.state.homeRequestedAt > 0);
    assert.equal((await page.locator("body").innerText()).includes("טוען את התוכן…"), false);
    assert.equal(await page.locator('[role="status"]').count(), 0);
    await page.waitForSelector(".sod29-root.surface-home", { timeout: 20_000 });
  } finally {
    await harness.context.close();
    await harness.browser.close();
    await harness.server.close();
  }
});
