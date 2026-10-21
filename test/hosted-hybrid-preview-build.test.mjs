import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:https";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHybridRouteResolver, loadHybridRoutePolicy } from "../scripts/hybrid-preview-routing.mjs";
import { verifyPreviewArtifactInventory } from "../scripts/preview-artifact-inventory.mjs";
import { PREVIEW_READ_RPC_ALLOWLIST } from "../scripts/preview-readonly-worker.mjs";
import {
  approvedHybridPreviewHost,
  HOSTED_HYBRID_BRANCH,
  isExactHostedShallowCheckout,
} from "../scripts/hybrid-preview-source-boundary.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = resolve(root, "hybrid-preview-dist");
const REQUIRED_BRANCH = HOSTED_HYBRID_BRANCH;
const built = existsSync(resolve(dist, "preview-build.json"));
const temporary = [];
let browser;
let server;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

after(async () => {
  await browser?.close();
  if (server) await new Promise((done) => server.close(done));
  await Promise.all(temporary.map((path) => rm(path, { recursive: true, force: true })));
});

async function miniRepository() {
  const directory = await mkdtemp(resolve(tmpdir(), "sod-hosted-hybrid-gate-"));
  temporary.push(directory);
  await mkdir(resolve(directory, "scripts"), { recursive: true });
  for (const name of ["build-hosted-hybrid-preview.mjs", "hybrid-preview-source-boundary.mjs"]) {
    await copyFile(resolve(root, `scripts/${name}`), resolve(directory, `scripts/${name}`));
  }
  await writeFile(resolve(directory, ".gitignore"), "hybrid-preview-dist/\nnode_modules/\n");
  execFileSync("git", ["init", "-q"], { cwd: directory });
  execFileSync("git", ["add", "."], { cwd: directory });
  execFileSync("git", ["-c", "user.name=Hybrid Gate", "-c", "user.email=hybrid@example.invalid", "commit", "-qm", "fixture"], { cwd: directory });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: directory, encoding: "utf8" }).trim();
  return { directory, commit };
}

function exactEnv(commit) {
  return {
    ...process.env,
    SOD_BUILD_TARGET: "hybrid",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: REQUIRED_BRANCH,
    VERCEL_GIT_COMMIT_SHA: commit,
    VERCEL_URL: "sod1820-hybrid-gate-sod1820-s-projects.vercel.app",
  };
}

function runBuilder(directory, env) {
  return spawnSync(process.execPath, ["scripts/build-hosted-hybrid-preview.mjs"], {
    cwd: directory,
    env,
    encoding: "utf8",
  });
}

test("non-exact target, environment, branch, commit and host fail before Hybrid output", async () => {
  const { directory, commit } = await miniRepository();
  const sentinel = resolve(directory, "hybrid-preview-dist/sentinel.txt");
  await mkdir(dirname(sentinel), { recursive: true });
  await writeFile(sentinel, "sealed\n");
  const cases = [
    ["target", { SOD_BUILD_TARGET: "2029" }, /SOD_BUILD_TARGET=hybrid/],
    ["environment", { VERCEL_ENV: "production" }, /VERCEL_ENV=preview/],
    ["branch", { VERCEL_GIT_COMMIT_REF: "gpt/other" }, new RegExp(`branch=${REQUIRED_BRANCH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)],
    ["commit", { VERCEL_GIT_COMMIT_SHA: "0".repeat(40) }, /must match the checked-out/],
    ["host", { VERCEL_URL: "sod1820.vercel.app" }, /Approved exact VERCEL_URL/],
  ];
  for (const [label, override, expected] of cases) {
    const result = runBuilder(directory, { ...exactEnv(commit), ...override });
    assert.notEqual(result.status, 0, label);
    assert.match(result.stderr, expected, label);
    assert.doesNotMatch(result.stderr, /build-hybrid-preview|ERR_MODULE_NOT_FOUND/i, label);
    assert.equal(await readFile(sentinel, "utf8"), "sealed\n", label);
  }
});

test("only an exact Vercel Preview identity may compensate for unavailable shallow ancestry", () => {
  const head = "a".repeat(40);
  const env = {
    VERCEL: "1",
    SOD_HYBRID_HOSTED_SHALLOW: "1",
    SOD_BUILD_TARGET: "hybrid",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: REQUIRED_BRANCH,
    VERCEL_GIT_COMMIT_SHA: head,
    VERCEL_URL: "sod1820-shallow-gate-sod1820-s-projects.vercel.app",
  };
  assert.equal(approvedHybridPreviewHost(env.VERCEL_URL), env.VERCEL_URL);
  assert.equal(isExactHostedShallowCheckout({ env, head, isShallow: true }), true);
  for (const [label, change] of [
    ["full checkout", { isShallow: false }],
    ["not Vercel", { env: { ...env, VERCEL: "0" } }],
    ["missing handoff", { env: { ...env, SOD_HYBRID_HOSTED_SHALLOW: "0" } }],
    ["production", { env: { ...env, VERCEL_ENV: "production" } }],
    ["other branch", { env: { ...env, VERCEL_GIT_COMMIT_REF: "main" } }],
    ["other commit", { env: { ...env, VERCEL_GIT_COMMIT_SHA: "b".repeat(40) } }],
    ["unapproved host", { env: { ...env, VERCEL_URL: "sod1820.vercel.app" } }],
  ]) {
    assert.equal(isExactHostedShallowCheckout({ env: change.env || env, head, isShallow: change.isShallow ?? true }), false, label);
  }
});

test("Vercel enables only the exact Hybrid integration branch and mirrors the route contract", async () => {
  const [vercel, policy] = await Promise.all([
    readFile(resolve(root, "vercel.json"), "utf8").then(JSON.parse),
    loadHybridRoutePolicy(),
  ]);
  assert.equal(vercel.buildCommand, "git checkout -- vercel.json && SOD_BUILD_TARGET=hybrid node scripts/build-hosted-hybrid-preview.mjs");
  assert.equal(vercel.outputDirectory, "hybrid-preview-dist");
  assert.equal(vercel.git.deploymentEnabled[REQUIRED_BRANCH], true);
  assert.equal(vercel.git.deploymentEnabled["gpt/*"], false);
  assert.equal(vercel.git.deploymentEnabled["claude/*"], false);
  assert.equal(vercel.git.deploymentEnabled["codex/*"], false);
  const documentRewrites = vercel.rewrites.filter((rule) => !rule.has && ["/2029.html", "/index.html", "/legacy.html"].includes(rule.destination));
  assert.deepEqual(new Set(documentRewrites.filter((rule) => rule.destination === "/2029.html").map((rule) => rule.source)), new Set(policy.candidate2029Routes));
  assert.deepEqual(new Set(documentRewrites.filter((rule) => rule.destination === "/legacy.html" && rule.source !== "/(.*)").map((rule) => rule.source)), new Set(policy.explicitLegacyRoutes));
  assert.deepEqual(documentRewrites.at(-1), { source: "/(.*)", destination: "/legacy.html" });
});

test("hosted artifact seals both runtimes, exact guard identity and complete inventory", { skip: !built }, async () => {
  const [receipt, hybrid, worker, legacy, index, candidate, verified] = await Promise.all([
    readFile(resolve(dist, "preview-build.json"), "utf8").then(JSON.parse),
    readFile(resolve(dist, "hybrid-preview-build.json"), "utf8").then(JSON.parse),
    readFile(resolve(dist, "preview-readonly-sw.js")),
    readFile(resolve(dist, "legacy.html"), "utf8"),
    readFile(resolve(dist, "index.html"), "utf8"),
    readFile(resolve(dist, "2029.html"), "utf8"),
    verifyPreviewArtifactInventory(dist),
  ]);
  assert.equal(receipt.branch, REQUIRED_BRANCH);
  assert.equal(receipt.buildTarget, "hybrid");
  assert.equal(receipt.vercelEnv, "preview");
  assert.equal(receipt.sourceClean, true);
  assert.equal(receipt.readOnly, true);
  assert.equal(receipt.workerContentSha256, sha256(worker));
  assert.equal(receipt.workerSha256, sha256(worker));
  assert.equal(hybrid.hostedPreviewReady, true);
  assert.equal(hybrid.hostedPreviewBlocker, null);
  assert.equal(hybrid.guardIdentitySha256, receipt.guardIdentitySha256);
  assert.equal(hybrid.routePolicySha256, receipt.routePolicySha256);
  assert.equal(receipt.artifactCount, verified.inventory.artifacts.length);
  assert.equal(index, candidate, "the hosted physical root document must be the exact 2029 entry");
  for (const [html, runtime] of [[legacy, "legacy"], [index, "2029"], [candidate, "2029"]]) {
    assert.match(html, /name="robots" content="noindex,nofollow,noarchive"/);
    assert.match(html, new RegExp(`name="sod-hybrid-runtime" content="${runtime}"`));
    assert.match(html, /id="sod-preview-readonly-bootstrap"/);
    assert.match(html, new RegExp(receipt.guardIdentitySha256));
    assert.doesNotMatch(html, /sod-hybrid-local-readonly/);
  }
});

const mime = (path) => ({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
})[extname(path)] || "application/octet-stream";

async function tlsFor(host) {
  const directory = await mkdtemp(resolve(tmpdir(), "sod-hosted-hybrid-tls-"));
  temporary.push(directory);
  const key = resolve(directory, "key.pem");
  const cert = resolve(directory, "cert.pem");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", key, "-out", cert, "-days", "1",
    "-subj", `/CN=${host}`, "-addext", `subjectAltName=DNS:${host}`,
  ], { stdio: "ignore" });
  return { key: await readFile(key), cert: await readFile(cert) };
}

test("Chromium attests before Legacy and 2029, while their writes never reach the server", {
  skip: !built || !existsSync("/usr/bin/chromium") ? "built artifact and Chromium are required" : false,
  timeout: 90_000,
}, async () => {
  const receipt = JSON.parse(await readFile(resolve(dist, "preview-build.json"), "utf8"));
  const policy = await loadHybridRoutePolicy();
  const route = createHybridRouteResolver(policy);
  const runtimeDocuments = new Set(["legacy.html", "index.html", "2029.html"]);
  const runtimeEntries = new Set();
  for (const name of runtimeDocuments) {
    const html = await readFile(resolve(dist, name), "utf8");
    const entry = html.match(/await import\((['"])(\/assets\/[^'"]+\.js)\1\)/)?.[2];
    assert.ok(entry, `${name} exact hosted entry is discoverable`);
    runtimeEntries.add(entry.replace(/^\/+/, ""));
  }
  const state = { writes: 0, entries: [] };
  server = createServer(await tlsFor(receipt.host), async (request, response) => {
    try {
      const url = new URL(request.url || "/", "https://local.invalid");
      if (!['GET', 'HEAD'].includes(request.method || "GET")) {
        state.writes += 1;
        response.writeHead(201).end();
        return;
      }
      let requested = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      if (!requested || !extname(requested)) requested = route(url.pathname).document;
      let file = resolve(dist, requested);
      if (!file.startsWith(`${dist}${sep}`)) throw new Error("unsafe path");
      let bytes = await readFile(file);
      // The artifact is validated byte-for-byte above. The browser harness removes
      // HTTP/1.1 preload contention and substitutes only the final product entry,
      // so it measures guard ordering rather than the full runtime's network cost.
      if (runtimeDocuments.has(requested)) {
        bytes = Buffer.from(bytes.toString("utf8").replace(/<link\b[^>]*>/g, ""));
      } else if (runtimeEntries.has(requested)) {
        state.entries.push(requested);
        bytes = Buffer.from("document.documentElement.dataset.sodHybridEntry='loaded';\n");
      }
      response.writeHead(200, { "content-type": mime(file), "cache-control": "no-store" });
      response.end(bytes);
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
  const origin = `https://${receipt.host}:${port}`;
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require("/opt/codex/cua_node/lib/node_modules/playwright")); }
  catch { ({ chromium } = require("playwright")); }
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-proxy-server", "--ignore-certificate-errors", `--host-resolver-rules=MAP ${receipt.host} 127.0.0.1`],
  });
  const context = await browser.newContext({ serviceWorkers: "allow", ignoreHTTPSErrors: true });
  await context.route("https://linswmnnkjxvweumprav.supabase.co/**", (requestRoute) => {
    const request = requestRoute.request();
    requestRoute.fulfill({
      status: 200,
      contentType: "application/json",
      body: request.url().includes("/rpc/") ? "null" : "[]",
    });
  });
  const page = await context.newPage();
  for (const [path, runtime] of [["/unmapped-legacy-surface", "legacy"], ["/world", "2029"]]) {
    await page.goto(`${origin}${path}`, { waitUntil: "commit" });
    try {
      await page.waitForFunction((identity) => document.documentElement.dataset.sodPreviewGuard === identity,
        receipt.guardIdentitySha256, { timeout: 20_000 });
    } catch (error) {
      const state = await page.evaluate(async () => ({
        guard: document.documentElement.dataset.sodPreviewGuard || null,
        body: document.body?.innerText?.slice(0, 600) || "",
        controller: navigator.serviceWorker.controller?.scriptURL || null,
        registrations: (await navigator.serviceWorker.getRegistrations()).map((registration) => ({
          active: registration.active?.scriptURL || null,
          installing: registration.installing?.scriptURL || null,
          waiting: registration.waiting?.scriptURL || null,
        })),
      })).catch(() => ({ state: "unavailable" }));
      throw new Error(`Hybrid guard did not attest for ${runtime}: ${JSON.stringify(state)}`, { cause: error });
    }
    assert.equal(await page.locator('meta[name="sod-hybrid-runtime"]').getAttribute("content"), runtime);
    const attestation = await page.evaluate(async () => {
      const channel = new MessageChannel();
      const reply = new Promise((resolveReply) => { channel.port1.onmessage = (event) => resolveReply(event.data); });
      navigator.serviceWorker.controller.postMessage({ type: "SOD_PREVIEW_GUARD_CHALLENGE", nonce: "hybrid-browser" }, [channel.port2]);
      return reply;
    });
    assert.equal(attestation.identity.buildTarget, "hybrid");
    assert.equal(attestation.identity.guardIdentitySha256, receipt.guardIdentitySha256);
    assert.deepEqual(attestation.identity.readRpcAllowlist, [...PREVIEW_READ_RPC_ALLOWLIST]);
    await page.waitForFunction(() => document.documentElement.dataset.sodHybridEntry === "loaded");
    const blocked = await page.evaluate(async () => {
      const fetchResponse = await fetch("/hybrid-write", { method: "POST", body: "synthetic" });
      const xhr = await new Promise((resolveXhr) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/hybrid-xhr-write");
        request.onload = () => resolveXhr({ status: request.status, blocked: request.getResponseHeader("X-Preview-Write-Blocked") });
        request.onerror = () => resolveXhr({ status: request.status, blocked: null });
        request.send("synthetic");
      });
      const beaconAccepted = navigator.sendBeacon("/hybrid-beacon-write", "synthetic");
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
      return {
        fetch: { status: fetchResponse.status, blocked: fetchResponse.headers.get("X-Preview-Write-Blocked") },
        xhr,
        beaconAccepted,
      };
    });
    assert.deepEqual(blocked.fetch, { status: 403, blocked: "true" });
    assert.deepEqual(blocked.xhr, { status: 403, blocked: "true" });
    assert.equal(state.writes, 0, `${runtime} write reached the origin`);
  }
  assert.deepEqual(new Set(state.entries), runtimeEntries);
  await context.close();
});
