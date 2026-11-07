import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

// Local functional acceptance of the entry module preload, not a performance sample, deployment or canonical data read.
// The built document hints the entry while the inline bootstrap waits for the worker; the entry must still be requested
// exactly once per load (cold with the worker installing mid-load, and with the worker already controlling), the preload
// must be consumed (no "preloaded but not used" console message) and the application must open. The HTTP cache is disabled
// so a second fetch of the immutable entry could never hide behind a cache hit. Every non-local request is aborted.
const root = fileURLToPath(new URL("..", import.meta.url));
const dist = resolve(root, "public-reading-deploy/dist");
const chromePath = [process.env.CHROMIUM_PATH, chromium.executablePath(), "/usr/bin/chromium"].find(path => path && existsSync(path)) || "";
const canRun = existsSync(resolve(dist, "public-reading-artifact.json")) && existsSync(resolve(root, "public-reading-deploy/.generated/2029.html")) && Boolean(chromePath);

test("built 2029 document: the preloaded entry is requested once per load and consumed by the bootstrap import", { timeout: 90000, skip: !canRun && "needs the built public-reading artifact and Chromium (CHROMIUM_PATH)" }, async () => {
  const template = await readFile(resolve(root, "public-reading-deploy/.generated/2029.html"), "utf8");
  const entry = /"entry":"([^"]+)"/.exec(template)[1];
  assert.ok(template.includes(`<link rel="modulepreload" crossorigin href="${entry}">`), "the document carries the entry preload");
  const served = [];
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      res.setHeader("Cache-Control", "no-store");
      if (url.pathname === "/") { res.setHeader("Content-Type", "text/html; charset=utf-8"); return res.end(template); }
      if (url.pathname === "/sw.js") { res.setHeader("Content-Type", "application/javascript"); res.setHeader("Service-Worker-Allowed", "/"); return res.end(await readFile(resolve(dist, "sw.js"))); }
      const file = resolve(dist, "." + url.pathname);
      if (!file.startsWith(dist + "/") || !existsSync(file)) { res.statusCode = 404; return res.end("not found"); }
      if (url.pathname.startsWith("/assets/")) { served.push(url.pathname); res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); }
      const types = { ".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf", ".webp": "image/webp", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml" };
      res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
      return res.end(await readFile(file));
    } catch { res.statusCode = 500; res.end("fixture unavailable"); }
  });
  await new Promise(done => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: chromePath, headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-background-networking", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost"] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: "allow" });
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue()
      : new URL(route.request().url()).hostname.endsWith("supabase.co") ? route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }, body: "[]" })
      : route.abort("blockedbyclient"));
    const page = await context.newPage(), consoleLines = [], errors = [];
    page.on("console", message => consoleLines.push(message.type() + ": " + message.text()));
    page.on("pageerror", error => errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    let requested = [];
    cdp.on("Network.requestWillBeSent", event => requested.push(new URL(event.request.url).pathname));
    const opened = () => page.waitForFunction(() => { const app = document.getElementById("root"); return !!app && app.children.length > 0 && !app.querySelector(".sod29-opening"); }, null, { timeout: 30000 });
    for (const phase of ["cold (worker installs during the load)", "reload (worker already controlling)"]) {
      served.length = 0; requested = [];
      if (phase.startsWith("cold")) await page.goto(origin + "/", { waitUntil: "commit" }); else await page.reload({ waitUntil: "commit" });
      await opened();
      await page.waitForTimeout(3500); // past the window in which Chromium reports an unused preload
      assert.equal(requested.filter(path => path === entry).length, 1, phase + ": one browser request for the entry");
      assert.equal(served.filter(path => path === entry).length, 1, phase + ": one request reaches the server for the entry");
      assert.ok(await page.evaluate(() => !!navigator.serviceWorker.controller), phase + ": the worker admitted the application");
    }
    assert.deepEqual(consoleLines.filter(line => /preload/i.test(line)), [], "no unused-preload message");
    assert.deepEqual(errors, []);
    await context.close();
  } finally { await browser.close(); await new Promise(done => server.close(done)); }
});
