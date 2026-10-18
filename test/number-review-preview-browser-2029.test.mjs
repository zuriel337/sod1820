import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const dist = resolve(process.env.NUMBER_REVIEW_DIST || resolve(root, "dist"));
const chromiumPath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const require = createRequire(import.meta.url);
let chromium = null;
try { ({ chromium } = require("/opt/codex/cua_node/lib/node_modules/playwright")); } catch { /* evidence host only */ }
const runnable = Boolean(chromium && existsSync(chromiumPath) && existsSync(resolve(dist, "2029.html")));

const contentType = (file) => ({
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2",
})[extname(file)] || "application/octet-stream";

async function localServer() {
  const html = resolve(dist, "2029.html");
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const requested = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      let file = requested && extname(requested) ? resolve(dist, requested) : html;
      if (!file.startsWith(`${dist}${sep}`) && file !== html) file = html;
      const body = await readFile(file);
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
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done, reject) => server.close((error) => error ? reject(error) : done())),
  };
}

const headers = { "access-control-allow-origin": "*", "content-type": "application/json" };
const flags = [
  { key: "lock_number", enabled: true, mode: "all", message: "synthetic closed" },
  { key: "lock_world", enabled: true, mode: "all", message: "synthetic closed" },
  { key: "fx_number_lookup_page", enabled: false, mode: "all", message: "" },
  { key: "fx_analytics", enabled: false, mode: "all", message: "" },
];
const readOnlyRpcs = new Set(["world_group_source_arrivals_v2"]);

async function installBoundary(context, origin) {
  const unsafe = [];
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin) return route.continue();
    if (url.hostname === "linswmnnkjxvweumprav.supabase.co") {
      const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
      const readOnlyRpc = request.method() === "POST" && readOnlyRpcs.has(rpc);
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && !readOnlyRpc) {
        unsafe.push(`${request.method()} ${url.pathname}`);
      }
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers, body: "" });
      if (url.pathname === "/rest/v1/site_flags") {
        return route.fulfill({ status: 200, headers, body: JSON.stringify(flags) });
      }
      if (url.pathname.startsWith("/auth/v1/")) {
        return route.fulfill({ status: 200, headers, body: JSON.stringify({ user: null }) });
      }
      return route.fulfill({ status: 200, headers, body: url.pathname.includes("/rpc/") ? "null" : "[]" });
    }
    return route.abort("blockedbyclient");
  });
  return unsafe;
}

test("exact Preview build opens Number while the live launch flag remains closed", { skip: !runnable, timeout: 30_000 }, async () => {
  const server = await localServer();
  const browser = await chromium.launch({ executablePath: chromiumPath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ serviceWorkers: "block" });
  const unsafe = await installBoundary(context, server.origin);
  try {
    const page = await context.newPage();
    await page.goto(`${server.origin}/number/718`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".surface-number", { timeout: 15_000 });
    assert.equal(await page.locator(".mlock").count(), 0);
    assert.equal(await page.locator(".surface-number").count(), 1);
    assert.deepEqual(unsafe, []);
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
});

test("initial Home suspense is visually quiet", { skip: !runnable, timeout: 30_000 }, async () => {
  const manifest = JSON.parse(await readFile(resolve(dist, ".vite/manifest.json"), "utf8"));
  const home = Object.values(manifest).find((entry) => entry.src === "src/pages/Home2029Page.jsx")?.file;
  assert.ok(home, "Home route chunk must exist");
  const server = await localServer();
  const browser = await chromium.launch({ executablePath: chromiumPath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ serviceWorkers: "block" });
  await installBoundary(context, server.origin);
  await context.route(`${server.origin}/${home}`, async (route) => {
    await new Promise((done) => setTimeout(done, 700));
    await route.continue();
  });
  try {
    const page = await context.newPage();
    const navigation = page.goto(`${server.origin}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);
    assert.equal((await page.locator("body").innerText()).includes("טוען את התוכן…"), false);
    assert.equal(await page.locator('[role="status"]').count(), 0);
    await navigation;
  } finally {
    await context.close();
    await browser.close();
    await server.close();
  }
});
