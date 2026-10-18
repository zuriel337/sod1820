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

const root = resolve(new URL("..", import.meta.url).pathname);
const dist = resolve(process.env.NUMBER_REVIEW_DIST || resolve(root, "preview-deploy/dist"));
const chromiumPath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const require = createRequire(import.meta.url);
let chromium = null;
try { ({ chromium } = require("/opt/codex/cua_node/lib/node_modules/playwright")); } catch { /* evidence host only */ }
const runnable = Boolean(chromium && existsSync(chromiumPath) && existsSync(resolve(dist, "2029.html")));
let tls = null;
let tlsDir = null;

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
  { key: "fx_analytics", enabled: false, mode: "all", message: "" },
];
const withoutNumber = requiredFlags.filter((row) => row.key !== "lock_number");

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

async function localServer(build, { delayWorker = 0, delayEntry = 0, delayHome = 0 } = {}) {
  const htmlPath = resolve(dist, "2029.html");
  const state = {
    postRequests: 0,
    workerRespondedAt: 0,
    entryRequestedAt: 0,
    homeRequestedAt: 0,
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
      if (requested === "preview-readonly-sw.js" && delayWorker) await sleep(delayWorker);
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
      const body = await readFile(file);
      response.writeHead(200, { "content-type": contentType(file), "cache-control": "no-store" });
      response.end(body);
      if (requested === "preview-readonly-sw.js") state.workerRespondedAt = Date.now();
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

async function installBoundary(context, origin, flagResponses = [requiredFlags]) {
  await context.addInitScript(({ responses }) => {
    const nativeFetch = window.fetch.bind(window);
    Object.defineProperty(window, "__sodNativeFetch", { value: nativeFetch });
    window.__sodFlagReads = 0;
    window.__sodUnsafeRequests = [];
    window.fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url, location.href);
      if (url.hostname === "linswmnnkjxvweumprav.supabase.co") {
        if (url.pathname === "/rest/v1/site_flags" && request.method === "GET") {
          const index = window.__sodFlagReads++;
          const rows = responses[Math.min(index, responses.length - 1)] || [];
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
  }, { responses: flagResponses });

  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.hostname === "linswmnnkjxvweumprav.supabase.co") {
      return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/rest/v1/rpc/") ? "null" : "[]" });
    }
    return route.abort("blockedbyclient");
  });
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
      `--host-resolver-rules=MAP ${build.metadata.host} 127.0.0.1`,
    ],
  });
  const context = await browser.newContext({ serviceWorkers: "allow", ignoreHTTPSErrors: true });
  await installBoundary(context, server.origin, options.flagResponses);
  return { server, browser, context };
}

async function exactController(page, build, origin) {
  const expected = new URL(build.metadata.workerScript, origin).href;
  await page.waitForFunction((script) => navigator.serviceWorker.controller?.scriptURL === script, expected, { timeout: 15_000 });
  assert.equal(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL), expected);
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
    throw new Error(`Number did not mount: ${JSON.stringify(state)}`, { cause: error });
  }
  assert.equal(await page.locator(".mlock").count(), 0);
}

test("Preview receipt binds the exact build, host, HTML, manifest and SHA-versioned worker", { skip: !runnable }, async () => {
  const build = await loadBuild();
  const { metadata, html } = build;
  assert.equal(metadata.branch, NUMBER_REVIEW_PREVIEW_BRANCH_2029);
  assert.equal(metadata.buildTarget, "2029");
  assert.equal(metadata.vercelEnv, "preview");
  assert.equal(metadata.numberReviewPreviewOpen, true);
  assert.deepEqual(metadata.previewOverrides, ["lock_number"]);
  assert.match(metadata.commit, /^[a-f0-9]{40}$/);
  assert.match(metadata.host, /^sod1820-[a-z0-9-]+-sod1820-s-projects\.vercel\.app$/);
  assert.equal(metadata.workerScript, `/preview-readonly-sw.js?build=${metadata.commit}`);
  assert.equal(metadata.manifestSha256, sha256(await readFile(resolve(dist, ".vite/manifest.json"))));
  assert.equal(metadata.htmlSha256, sha256(await readFile(resolve(dist, "2029.html"))));
  assert.equal(metadata.workerSha256, sha256(await readFile(resolve(dist, "preview-readonly-sw.js"))));
  const identity = {
    commit: metadata.commit, branch: metadata.branch, host: metadata.host,
    buildTarget: metadata.buildTarget, vercelEnv: metadata.vercelEnv,
    workerScript: metadata.workerScript, manifestSha256: metadata.manifestSha256,
    htmlSha256: metadata.htmlSha256, workerSha256: metadata.workerSha256,
  };
  assert.equal(metadata.identitySha256, sha256(JSON.stringify(identity)));
  assert.match(html, new RegExp(metadata.commit));
  assert.match(html, new RegExp(metadata.host.replaceAll(".", "\\.")));
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

test("direct first install, reload, internal navigation and a fresh context all open Number under the exact controller", { skip: !runnable, timeout: 90_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, { flagResponses: [requiredFlags] });
  try {
    const page = await harness.context.newPage();
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "domcontentloaded" });
    await waitForNumber(page);
    await exactController(page, build, harness.server.origin);
    assert.equal(await page.evaluate(() => window.__sodFlagReads), 1);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForNumber(page);
    await exactController(page, build, harness.server.origin);

    await page.goto(`${harness.server.origin}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".sod29-root.surface-home", { timeout: 20_000 });
    await page.locator('a[href="/number/1820"]').first().click();
    await waitForNumber(page);
    await exactController(page, build, harness.server.origin);
    assert.deepEqual(await page.evaluate(() => window.__sodUnsafeRequests), []);

    const fresh = await harness.browser.newContext({ serviceWorkers: "allow", ignoreHTTPSErrors: true });
    await installBoundary(fresh, harness.server.origin, [requiredFlags]);
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

test("an old controller is replaced before the application entry is requested", { skip: !runnable, timeout: 60_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, { flagResponses: [requiredFlags], delayWorker: 700 });
  try {
    const page = await harness.context.newPage();
    await page.goto(`${harness.server.origin}/old-controller.html`, { waitUntil: "domcontentloaded" });
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/old-sw.js", { scope: "/" });
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
      }
    });
    assert.match(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL || ""), /\/old-sw\.js$/);
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "domcontentloaded" });
    await waitForNumber(page);
    await exactController(page, build, harness.server.origin);
    assert.ok(harness.server.state.workerRespondedAt > 0);
    assert.ok(harness.server.state.entryRequestedAt >= harness.server.state.workerRespondedAt,
      `entry ${harness.server.state.entryRequestedAt} must follow worker ${harness.server.state.workerRespondedAt}`);
  } finally {
    await harness.context.close();
    await harness.browser.close();
    await harness.server.close();
  }
});

test("the write guard returns 403 before the delayed application starts", { skip: !runnable, timeout: 60_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, { flagResponses: [requiredFlags], delayEntry: 900 });
  try {
    const page = await harness.context.newPage();
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "commit" });
    await exactController(page, build, harness.server.origin);
    assert.equal(await page.locator(".sod29-number-page").count(), 0);
    const result = await page.evaluate(async () => {
      const response = await window.__sodNativeFetch("/write-probe", { method: "POST", body: "synthetic" });
      return { status: response.status, blocked: response.headers.get("X-Preview-Write-Blocked") };
    });
    assert.deepEqual(result, { status: 403, blocked: "true" });
    assert.equal(harness.server.state.postRequests, 0);
    await waitForNumber(page);
  } finally {
    await harness.context.close();
    await harness.browser.close();
    await harness.server.close();
  }
});

test("one automatic fresh read recovers a transient missing Number gate", { skip: !runnable, timeout: 45_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, { flagResponses: [withoutNumber, requiredFlags] });
  try {
    const page = await harness.context.newPage();
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "domcontentloaded" });
    await waitForNumber(page);
    assert.equal(await page.evaluate(() => window.__sodFlagReads), 2);
  } finally {
    await harness.context.close();
    await harness.browser.close();
    await harness.server.close();
  }
});

test("two missing reads fail closed and expose a bounded manual retry", { skip: !runnable, timeout: 45_000 }, async () => {
  const build = await loadBuild();
  const harness = await launchHarness(build, { flagResponses: [withoutNumber, withoutNumber, requiredFlags] });
  try {
    const page = await harness.context.newPage();
    await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".mlock button.mlock-retry", { timeout: 20_000 });
    assert.equal(await page.locator(".sod29-number-page").count(), 0);
    assert.equal(await page.evaluate(() => window.__sodFlagReads), 2);
    await page.locator(".mlock button.mlock-retry").click();
    await waitForNumber(page);
    assert.equal(await page.evaluate(() => window.__sodFlagReads), 3);
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
    const harness = await launchHarness(build, { flagResponses: [malformed, malformed] });
    try {
      const page = await harness.context.newPage();
      await page.goto(`${harness.server.origin}/number/1820`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".mlock button.mlock-retry", { timeout: 20_000 });
      assert.equal(await page.locator(".sod29-number-page").count(), 0);
      assert.equal(await page.evaluate(() => window.__sodFlagReads), 2);
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
