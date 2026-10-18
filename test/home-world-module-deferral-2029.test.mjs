// Home: the World preview projection (home2029Projection and the readers only it brings) is not part of Home's own code.
// The built Home runs in a real browser over fixture reads (no database, no network). The area's approach is driven through the
// page's own IntersectionObserver callback, so the checks do not depend on layout geometry. Behavior only: nothing here is a measurement of speed.
// Skipped without dist/ from `npm run build:2029`, without Playwright or without Chromium.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

let chromium = null;
for (const base of [import.meta.url, `file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`]) {
  try { chromium = createRequire(base)("playwright").chromium; break; } catch { /* try the next location */ }
}
const executablePath = process.env.PERF_CHROME || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
const dist = join(fileURLToPath(new URL("..", import.meta.url)), "dist");
const skip = !chromium || !executablePath || !existsSync(join(dist, "2029.html")) ? "needs Chromium and dist/ from npm run build:2029" : false;

const MIME = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html; charset=utf-8", ".json": "application/json", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ttf": "font/ttf" };
const WORLD_MODULES = /\/assets\/(home2029Projection|curationProjection2029|worldContributorLens)-[\w-]+\.js$/;
const PROJECTION_MODULE = /\/assets\/home2029Projection-[\w-]+\.js$/;
// The contributor reads (people lane) are started only by the projection on Home; the other World readers also serve Home's own
// separately-triggered strips, so they are not used as a signal here. Temporal reads must never appear on Home.
const WORLD_READS = /\/rest\/v1\/(contributors|research_contributions)\?/;
const TEMPORAL = /fn_method_value|gematria_words|\/nodes|research_contributions\?[^#]*target_type=eq\.number|\/assets\/(timeFlow|dayContext)-/;
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
const post = (index) => ({ id: 9000 + index, slug: `fixture-post-${index}`, title: `פוסט בדיקה ${index}`, image_url: null, thumb_url: null,
  date: `2026-10-${String(10 + index).padStart(2, "0")}T08:00:00Z`, modified: `2026-10-${String(20 - index).padStart(2, "0")}T08:00:00Z`, tags: [], home_hidden: false });
const POSTS = [1, 2, 3, 4, 5, 6].map(post);   // the first is the latest by `modified`
const LATEST_TITLE = POSTS[0].title;

let server = null, origin = "", browser = null;
test.before(async () => {
  if (skip) return;
  server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = join(dist, pathname);
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, "2029.html");
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
});
test.after(async () => { await browser?.close(); await new Promise((resolve) => (server ? server.close(resolve) : resolve())); });

// Every read is answered by a fixture. Nothing leaves the machine, and nothing is written anywhere.
async function open({ noIO = false, failModule = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", locale: "he-IL" });
  const seen = { modules: [], reads: [], temporal: [], pageErrors: [] };
  await context.addInitScript((disable) => {
    // Real observers keep working, except on the World preview trigger: its approach is fired by hand (a fixture page is short, so real geometry would
    // fire it at once). A disconnected observer is never fired again, as in a browser.
    const Real = window.IntersectionObserver;
    window.__observers = [];
    if (disable) { window.IntersectionObserver = undefined; return; }
    window.IntersectionObserver = class extends Real {
      constructor(callback, options) { super(callback, options); this.__callback = callback; this.__targets = new Set(); this.__live = true; window.__observers.push(this); }
      observe(node) { this.__targets.add(node); return node.matches?.(".h29-world-preview-trigger") ? undefined : super.observe(node); }
      disconnect() { this.__live = false; this.__targets.clear(); return super.disconnect(); }
    };
    window.__approach = (selector) => {
      for (const observer of window.__observers) {
        if (!observer.__live) continue;
        for (const node of [...observer.__targets]) if (node.matches?.(selector)) observer.__callback([{ isIntersecting: true, target: node, intersectionRatio: 1 }], observer);
      }
    };
  }, noIO);
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin) {
      if (WORLD_MODULES.test(url.pathname)) {
        seen.modules.push(url.pathname);
        if (failModule && PROJECTION_MODULE.test(url.pathname)) return route.abort("failed");
      }
      if (TEMPORAL.test(url.pathname)) seen.temporal.push(url.pathname);
      return route.continue();
    }
    if (url.hostname !== "linswmnnkjxvweumprav.supabase.co") return route.abort("blockedbyclient");
    const target = url.pathname + url.search;
    if (WORLD_READS.test(target)) seen.reads.push(target);
    if (TEMPORAL.test(target)) seen.temporal.push(target);
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const json = (body) => route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (url.pathname === "/rest/v1/posts") return json(url.searchParams.has("slug") && /^in\./.test(url.searchParams.get("slug") || "") ? [] : POSTS);
    if (url.pathname.startsWith("/rest/v1/rpc/")) return json(null);
    return json([]);
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => seen.pageErrors.push(String(error)));
  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-experience-capability="home-composition"][data-h29-primary="ready"]', { timeout: 30000 });
  return { page, context, seen };
}
const settle = (page, ms = 600) => page.waitForTimeout(ms);
const heroTitle = (page) => page.locator(".h29-hero h1").first().innerText();
const triggerReady = (page) => page.waitForFunction(() => window.__observers.some((observer) => observer.__live && [...observer.__targets].some((node) => node.matches?.(".h29-world-preview-trigger"))), null, { timeout: 15000 });

test("Home opens without the World preview modules, reads or Temporal calls", { skip }, async () => {
  const { page, context, seen } = await open();
  try {
    await settle(page, 1500);
    assert.equal(await heroTitle(page), LATEST_TITLE, "the latest Post stays the Hero");
    assert.deepEqual(seen.modules, [], "the projection and its readers are not fetched while the area is far");
    assert.deepEqual(seen.reads, [], "no World preview read before the area is approached");
    assert.deepEqual(seen.temporal, [], "no Temporal read or calendar chunk on Home");
    assert.doesNotMatch(await page.locator("body").innerText(), /העת עכשיו|מספר העת/);
    assert.deepEqual(seen.pageErrors, []);
  } finally { await context.close(); }
});

test("Home: approaching the World preview area loads the projection once, and returning does not repeat it", { skip }, async () => {
  const { page, context, seen } = await open();
  try {
    await triggerReady(page);
    await page.evaluate(() => window.__approach(".h29-world-preview-trigger"));
    await page.waitForFunction(() => performance.getEntriesByType("resource").some((entry) => /\/home2029Projection-/.test(entry.name)), null, { timeout: 15000 });
    await settle(page, 1500);
    const projection = seen.modules.filter((name) => PROJECTION_MODULE.test(name));
    assert.equal(projection.length, 1, "the projection module is requested once");
    assert.ok(seen.reads.length > 0, "the World preview reads start after the module arrives");
    const reads = [...seen.reads], modules = [...seen.modules];
    // Leaving and coming back, and a second approach signal, change nothing: the observer is spent and the module is cached.
    await page.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); });
    await settle(page, 300);
    await page.evaluate(() => { window.scrollTo(0, 0); window.__approach(".h29-world-preview-trigger"); });
    await page.evaluate(() => { window.scrollTo(0, Math.floor(document.documentElement.scrollHeight * 0.6)); window.__approach(".h29-world-preview-trigger"); });
    await settle(page, 1200);
    assert.deepEqual(seen.modules, modules, "no further module request");
    assert.deepEqual(seen.reads, reads, "no further World preview read");
    assert.deepEqual(seen.temporal, []);
    assert.equal(await heroTitle(page), LATEST_TITLE);
    assert.deepEqual(seen.pageErrors, []);
  } finally { await context.close(); }
});

test("Home without IntersectionObserver still shows its content and starts the projection once", { skip }, async () => {
  const { page, context, seen } = await open({ noIO: true });
  try {
    assert.equal(await heroTitle(page), LATEST_TITLE);
    await page.waitForFunction(() => performance.getEntriesByType("resource").some((entry) => /\/home2029Projection-/.test(entry.name)), null, { timeout: 15000 });
    await settle(page, 1500);
    assert.equal(seen.modules.filter((name) => PROJECTION_MODULE.test(name)).length, 1);
    assert.ok(await page.locator(".h29-card").count() > 0, "the update cards are shown");
    assert.deepEqual(seen.temporal, []);
    assert.deepEqual(seen.pageErrors, []);
  } finally { await context.close(); }
});

test("Home survives a failed projection module load", { skip }, async () => {
  const { page, context, seen } = await open({ failModule: true });
  try {
    await triggerReady(page);
    await page.evaluate(() => window.__approach(".h29-world-preview-trigger"));
    await settle(page, 1500);
    assert.equal(seen.modules.filter((name) => PROJECTION_MODULE.test(name)).length, 1, "one attempt, no retry loop");
    assert.deepEqual(seen.reads, [], "no World preview read without the module");
    assert.equal(await heroTitle(page), LATEST_TITLE);
    assert.ok(await page.locator(".h29-card").count() > 0, "the update cards are still shown");
    assert.equal(await page.locator('[data-experience-capability="home-composition"]').getAttribute("data-h29-primary"), "ready");
    assert.deepEqual(seen.pageErrors, [], "the failed load is handled, not thrown");
  } finally { await context.close(); }
});
