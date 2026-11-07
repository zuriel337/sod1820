// Stale-deployment lazy-chunk recovery - real-browser acceptance on the BUILT public-reading artifact (LB-1).
// Not wired into CI: it needs a local build of the artifact and a Chromium binary.
//
//   node scripts/build-public-reading-production.mjs          (dormant local artifact: dist/ + .generated/2029.html)
//   node test/stale-chunk-recovery-2029.browser.mjs
//
//   DIST=<artifact dist dir>           default public-reading-deploy/dist
//   TEMPLATE=<built 2029.html>         default public-reading-deploy/.generated/2029.html
//   MODE=after|before                  after (default): asserts the recovery contract.
//                                      before: asserts the documented defect on an artifact built WITHOUT the fix
//                                      (the whole React tree unmounts, no recovery) so the reproduction is proven.
//   VPS=m390,d1440   CHROMIUM=<path>   EVIDENCE_DIR=<screenshots>
//
// Faithful to production where it matters: the bootstrap + the real public-reading service worker run; a removed
// hashed asset answers 404 text/html (the document shell), exactly as the catch-all rewrite does on Vercel. Zero
// live network: Chromium resolves nothing outside 127.0.0.1 and every other request is fulfilled by a local stub.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve, extname, sep, join } from "node:path";
import { createRequire } from "node:module";

// Lets the real worker's own fetches pass through the same stub (Playwright 1.55).
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ??= "1";
const { chromium } = createRequire(import.meta.url)("playwright");

const MODE = process.env.MODE === "before" ? "before" : "after";
const DIST = resolve(process.env.DIST || "public-reading-deploy/dist");
const TEMPLATE = resolve(process.env.TEMPLATE || "public-reading-deploy/.generated/2029.html");
const CHROMIUM = process.env.CHROMIUM || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const VPS = (process.env.VPS || "m390,d1440").split(",");
const EVIDENCE = process.env.EVIDENCE_DIR || "";
if (EVIDENCE) await mkdir(EVIDENCE, { recursive: true });

const VIEWPORTS = { m390: { width: 390, height: 800, mobile: true }, d1440: { width: 1440, height: 900, mobile: false } };
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8" };
const PNG1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*" };
const TARGET = process.env.TARGET || "/world";
const SIGNATURE = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css/i;

assert.ok(existsSync(join(DIST, "assets")) && existsSync(TEMPLATE), `built public-reading artifact not found (DIST=${DIST}, TEMPLATE=${TEMPLATE})`);
const template = readFileSync(TEMPLATE);
const ENTRY = /"entry":"([^"]+)"/.exec(template.toString())?.[1];
assert.ok(ENTRY, "the built document carries the bootstrap entry");
const assetsOf = ext => readdirSync(join(DIST, "assets")).filter(name => name.endsWith(ext)).map(name => "/assets/" + name);
const ALL_JS = assetsOf(".js");
const ALL_CSS = assetsOf(".css");

// ---- production-shaped static server -------------------------------------------------------------------------------
async function serve() {
  const state = { gone: new Set(), documents: 0, onDocument: null, log: [] };
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    let pathname = url.pathname;
    try { pathname = decodeURIComponent(pathname); } catch { /* keep raw */ }
    const file = resolve(DIST, "." + pathname);
    const exists = file.startsWith(DIST + sep) && existsSync(file) && statSync(file).isFile() && !state.gone.has(pathname);
    // A navigation reaches the server as sec-fetch-mode=navigate on a cold load, but as a same-origin fetch once the
    // service worker answers it: the document is recognised by what it asks for (HTML), not by the fetch mode.
    const navigation = /text\/html/.test(String(req.headers.accept || ""));
    let status = 200;
    if (exists) {
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      createReadStream(file).pipe(res);
    } else if (pathname.startsWith("/assets/") || pathname.startsWith("/api/")) {
      // A removed hashed asset falls through the catch-all rewrite: 404 + the document shell (not JavaScript).
      status = 404;
      res.writeHead(404, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(template);
    } else {
      if (navigation) { state.documents += 1; state.onDocument?.(state.documents); }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(template);
    }
    state.log.push({ path: pathname, status, navigation });
  });
  await new Promise(done => server.listen(0, "127.0.0.1", done));
  return { state, base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(done => { server.close(done); server.closeAllConnections?.(); }) };
}

// ---- browser context: no live network ------------------------------------------------------------------------------
async function open(browser, vp, { storageBroken = false } = {}) {
  const server = await serve();
  const view = VIEWPORTS[vp];
  const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height }, isMobile: view.mobile, hasTouch: view.mobile, locale: "he-IL", timezoneId: "Asia/Jerusalem", serviceWorkers: "allow" });
  const rec = { pageErrors: [], consoleErrors: [], external: [] };
  await ctx.route("**/*", route => {
    const request = route.request();
    let host = "";
    try { host = new URL(request.url()).hostname; } catch { return route.abort(); }
    if (host === "127.0.0.1") return route.continue();
    rec.external.push(host);
    const type = request.resourceType();
    if (/(^|\.)supabase\.co$/.test(host)) {
      const accept = String(request.headers().accept || "");
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (accept.includes("vnd.pgrst.object")) return route.fulfill({ status: 406, contentType: "application/json", headers: CORS, body: JSON.stringify({ code: "PGRST116", message: "no rows" }) });
      return route.fulfill({ status: 200, contentType: "application/json", headers: { ...CORS, "content-range": "*/0" }, body: /\/rpc\//.test(request.url()) ? "false" : "[]" });
    }
    if (type === "stylesheet") return route.fulfill({ status: 200, contentType: "text/css", body: "" });
    if (type === "script") return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
    if (type === "image") return route.fulfill({ status: 200, contentType: "image/png", body: PNG1 });
    return route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: "{}" });
  });
  if (storageBroken) await ctx.addInitScript(() => {
    // Storage that cannot persist: setItem throws (private mode / quota / blocked), as on some Safari builds.
    Storage.prototype.setItem = function () { throw new DOMException("blocked", "QuotaExceededError"); };
  });
  const page = await ctx.newPage();
  page.on("pageerror", error => rec.pageErrors.push(String(error.message).slice(0, 300)));
  page.on("console", message => { if (message.type() === "error") rec.consoleErrors.push(message.text().slice(0, 300)); });
  return { server, ctx, page, rec, vp };
}

const READY = () => {
  const root = document.getElementById("root");
  return Boolean(root) && root.children.length > 0 && !root.querySelector(".sod29-opening") && !document.body.textContent.includes("העמוד לא נפתח");
};
const sleep = ms => new Promise(done => setTimeout(done, ms));

async function boot(env, path = "/") {
  await env.page.goto(env.server.base + path, { waitUntil: "commit" });
  await env.page.waitForFunction(READY, null, { timeout: 25000, polling: 100 });
  await env.page.evaluate(() => { window.__marker = "alive"; });
  await sleep(1200);
  assert.equal(env.server.state.documents, 1, "exactly one document request for the first load");
}

// The deployment that replaces the user's build: every chunk the tab has not fetched yet disappears.
function newDeploymentRemoves(env, { css = false } = {}) {
  const fetched = new Set(env.server.state.log.map(entry => entry.path));
  for (const asset of css ? ALL_CSS : ALL_JS) if (!fetched.has(asset)) env.server.state.gone.add(asset);
  return env.server.state.gone.size;
}

async function navigate(env, target) {
  return env.page.evaluate(path => {
    window.__marker = "alive";
    const link = [...document.querySelectorAll("a[href]")].find(a => { try { return new URL(a.href).pathname === path; } catch { return false; } });
    if (link) { link.click(); return "anchor"; }
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
    return "history";
  }, target);
}

async function probe(page) {
  try {
    return await page.evaluate(() => {
      const root = document.getElementById("root");
      const boundary = document.querySelector("[data-sod-boundary]");
      return {
        path: location.pathname, marker: window.__marker || null, rootChildren: root ? root.children.length : -1,
        bodyText: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 160), boundary: boundary ? boundary.getAttribute("data-sod-boundary") : null,
        opening: Boolean(document.querySelector(".sod29-opening")), guard: (() => { try { return sessionStorage.getItem("sod2029_chunk_reload_v1"); } catch { return "unreadable"; } })(),
      };
    });
  } catch { return null; } // execution context destroyed while a reload is committing
}

// Polls until `until(snapshot)` holds; records whether the page was ever observed blank (empty #root).
async function waitFor(env, until, { timeout = 12000, label = "state" } = {}) {
  const t0 = Date.now(); let sawBlank = false, last = null;
  while (Date.now() - t0 < timeout) {
    const snap = await probe(env.page);
    if (snap) {
      last = snap;
      if (snap.rootChildren === 0) sawBlank = true;
      if (until(snap)) return { snap, sawBlank };
    }
    await sleep(60);
  }
  throw new assert.AssertionError({ message: `timeout waiting for ${label}; last=${JSON.stringify(last)} documents=${env.server.state.documents}` });
}

async function shot(env, name) { if (EVIDENCE) await env.page.screenshot({ path: join(EVIDENCE, `${MODE}-${name}-${env.vp}.png`) }).catch(() => {}); }
const isReloaded = snap => snap.marker !== "alive";
const recovered = snap => isReloaded(snap) && snap.rootChildren > 0 && !snap.opening && !snap.boundary;
const noUnexpectedErrors = env => {
  const unexpected = env.rec.pageErrors.filter(message => !SIGNATURE.test(message) && !/unrelated-boom/.test(message));
  assert.deepEqual(unexpected, [], "no page errors other than the stale-chunk signatures this scenario provokes");
};

const results = [];
const record = (name, vp, detail) => { results.push({ name, vp, ...detail }); console.log(`  ok  ${MODE} ${vp} ${name} ${JSON.stringify(detail)}`); };

// ---- BEFORE: the defect (LB-1) -------------------------------------------------------------------------------------
async function defectBlank(browser, vp, { css }) {
  const env = await open(browser, vp);
  try {
    await boot(env, "/");
    const removed = newDeploymentRemoves(env, { css });
    assert.ok(removed > 0, "the new deployment removed chunks this tab has not fetched");
    const how = await navigate(env, TARGET);
    const { snap } = await waitFor(env, s => s.rootChildren === 0, { timeout: 10000, label: "the unmounted (blank) app" });
    await sleep(2500);
    const settled = await probe(env.page);
    assert.equal(settled.rootChildren, 0, "the whole React tree stays unmounted");
    assert.equal(settled.bodyText, "", "no text at all on screen");
    assert.equal(settled.marker, "alive", "no automatic reload happened");
    assert.equal(env.server.state.documents, 1, "no automatic recovery: still the single first document request");
    assert.ok(env.rec.pageErrors.some(message => SIGNATURE.test(message)), `chunk-load error is uncaught: ${env.rec.pageErrors[0] || "(none)"}`);
    await shot(env, css ? "css-blank" : "js-blank");
    record(css ? "defect: CSS preload failure blanks the app" : "defect: lazy route chunk 404 blanks the app", vp, { how, removed, blankAfter: snap.rootChildren === 0, documents: env.server.state.documents });
  } finally { await env.ctx.close(); await env.server.close(); }
}

// ---- AFTER: recovery -----------------------------------------------------------------------------------------------
async function recoverOnce(browser, vp, { css }) {
  const env = await open(browser, vp);
  try {
    await boot(env, "/");
    const removed = newDeploymentRemoves(env, { css });
    assert.ok(removed > 0);
    // The new deployment is what the reload fetches: its chunks exist again.
    env.server.state.onDocument = count => { if (count >= 2) env.server.state.gone.clear(); };
    const how = await navigate(env, TARGET);
    const { snap, sawBlank } = await waitFor(env, recovered, { label: "a reloaded, rendered page" });
    await sleep(3000);
    const settled = await probe(env.page);
    assert.equal(env.server.state.documents, 2, "reloaded exactly once, and never looped");
    assert.equal(sawBlank, false, "the screen was never blank on the way");
    assert.equal(settled.path, TARGET, "the user lands on the page they asked for");
    assert.ok(recovered(settled) && settled.bodyText.length > 0, "route content rendered after the reload");
    assert.ok(settled.guard && /\/assets\/2029-[\w-]+\.js$/.test(settled.guard), `once-per-build guard keyed by the entry script: ${settled.guard}`);
    noUnexpectedErrors(env);
    await shot(env, css ? "css-recovered" : "js-recovered");
    record(css ? "CSS preload failure: one reload, route renders" : "lazy route chunk 404: one reload, route renders", vp, { how, removed, documents: env.server.state.documents, guard: settled.guard.replace(/^.*\//, ""), path: settled.path });
  } finally { await env.ctx.close(); await env.server.close(); }
}

async function persistentFailure(browser, vp) {
  const env = await open(browser, vp);
  try {
    await boot(env, "/");
    newDeploymentRemoves(env);
    const how = await navigate(env, TARGET); // the reloaded page asks for the same missing chunks: the new build is broken too
    const { snap, sawBlank } = await waitFor(env, s => isReloaded(s) && s.boundary === "exhausted", { label: "the fallback after one reload" });
    await sleep(3000);
    const settled = await probe(env.page);
    assert.equal(env.server.state.documents, 2, "one reload, then the fallback: no loop");
    assert.equal(sawBlank, false, "the screen was never blank");
    assert.equal(settled.boundary, "exhausted");
    const ui = await env.page.evaluate(() => {
      const box = document.querySelector("[data-sod-boundary]");
      const button = [...box.querySelectorAll("button")].find(b => /רענון/.test(b.textContent));
      const home = [...box.querySelectorAll("a")].find(a => a.getAttribute("href") === "/");
      const rect = element => { const r = element.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
      return { dir: getComputedStyle(box).direction, role: box.querySelector("section")?.getAttribute("role"), heading: box.querySelector("h1")?.textContent || "", button: button ? rect(button) : null, home: home ? rect(home) : null,
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1, boxWidth: Math.round(box.getBoundingClientRect().width), innerWidth: window.innerWidth };
    });
    assert.equal(ui.dir, "rtl"); assert.equal(ui.role, "alert"); assert.ok(ui.heading.length > 0, "visible Hebrew heading");
    assert.ok(ui.button && ui.button.h >= 44, `reload button reachable (>=44px): ${JSON.stringify(ui.button)}`);
    assert.ok(ui.home && ui.home.h >= 44, `home link reachable (>=44px): ${JSON.stringify(ui.home)}`);
    assert.equal(ui.overflowX, false, "no horizontal overflow");
    await shot(env, "fallback");
    // Leaving the broken address resets the boundary: Home's chunks were fetched by this tab's first load.
    // (A fresh load of the same broken build cannot do that, so navigate inside the page that holds them.)
    const reload = env.page.getByRole("button", { name: "רענון הדף" });
    assert.equal(await reload.count(), 1, "one reload button");
    const home = env.page.locator('[data-sod-boundary] a[href="/"]');
    assert.equal(await home.count(), 1, "one link to the home page");
    noUnexpectedErrors(env);
    record("broken new deployment: one reload then Hebrew fallback, no loop", vp, { how, documents: env.server.state.documents, ui: { dir: ui.dir, role: ui.role, button: ui.button, home: ui.home } });
  } finally { await env.ctx.close(); await env.server.close(); }
}

async function resetsOnNavigation(browser, vp) {
  const env = await open(browser, vp);
  try {
    await boot(env, "/");
    newDeploymentRemoves(env);
    await navigate(env, TARGET);
    await waitFor(env, s => isReloaded(s) && s.boundary === "exhausted", { label: "the fallback" });
    // Back to an address whose chunks are available: the boundary resets on pathname change.
    await env.page.evaluate(() => { history.pushState({}, "", "/"); window.dispatchEvent(new PopStateEvent("popstate")); });
    const { snap } = await waitFor(env, s => !s.boundary && s.rootChildren > 0 && !s.opening, { label: "Home rendered after the pathname change" });
    assert.equal(snap.path, "/");
    assert.equal(env.server.state.documents, 2, "recovering by navigation does not reload again");
    record("fallback resets when the address changes", vp, { path: snap.path, documents: env.server.state.documents });
  } finally { await env.ctx.close(); await env.server.close(); }
}

async function unrelatedErrorsIgnored(browser, vp) {
  const env = await open(browser, vp);
  try {
    await boot(env, "/");
    await env.page.evaluate(() => {
      Promise.reject(new Error("unrelated-boom rejection"));
      window.dispatchEvent(new ErrorEvent("error", { message: "unrelated-boom", error: new Error("unrelated-boom") }));
      Promise.reject(new TypeError("Failed to fetch")); // a plain network failure is not a chunk failure
    });
    await sleep(2500);
    const snap = await probe(env.page);
    assert.equal(env.server.state.documents, 1, "unrelated errors never reload");
    assert.equal(snap.marker, "alive"); assert.equal(snap.boundary, null); assert.ok(snap.rootChildren > 0 && !snap.opening);
    assert.equal(snap.guard, null, "the guard is untouched by unrelated errors");
    record("unrelated errors and plain network failures are ignored", vp, { documents: env.server.state.documents });
  } finally { await env.ctx.close(); await env.server.close(); }
}

async function unhandledRejectionOnce(browser, vp) {
  const env = await open(browser, vp);
  try {
    await boot(env, "/");
    const inject = () => env.page.evaluate(() => { Promise.reject(new TypeError("Failed to fetch dynamically imported module: http://127.0.0.1/assets/never-existed-0000.js")); });
    await inject();
    await waitFor(env, s => isReloaded(s) && s.rootChildren > 0 && !s.opening, { label: "the one reload" });
    assert.equal(env.server.state.documents, 2);
    await sleep(1200);
    await env.page.evaluate(() => { window.__marker = "alive"; });
    await inject(); // same build, guard already set: surface the fallback instead of reloading
    const { snap } = await waitFor(env, s => s.boundary === "exhausted", { label: "the surfaced fallback" });
    await sleep(2500);
    assert.equal(env.server.state.documents, 2, "second failure on the same build does not reload");
    assert.equal((await probe(env.page)).marker, "alive");
    noUnexpectedErrors(env);
    record("unhandled chunk rejection: one reload, then the fallback is surfaced", vp, { documents: env.server.state.documents, boundary: snap.boundary });
  } finally { await env.ctx.close(); await env.server.close(); }
}

async function storageUnavailable(browser, vp) {
  const env = await open(browser, vp, { storageBroken: true });
  try {
    await boot(env, "/");
    await env.page.evaluate(() => { Promise.reject(new TypeError("Failed to fetch dynamically imported module: http://127.0.0.1/assets/never-existed-0000.js")); });
    await waitFor(env, s => s.boundary === "exhausted", { label: "the fallback (no guard can be stored)" });
    await sleep(2500);
    assert.equal(env.server.state.documents, 1, "without a persistent guard the page must not reload (a loop is the worse failure)");
    noUnexpectedErrors(env);
    record("storage unavailable: no reload, fallback surfaced", vp, { documents: env.server.state.documents });
  } finally { await env.ctx.close(); await env.server.close(); }
}

// ---- run -----------------------------------------------------------------------------------------------------------
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox", "--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1"] });
let failure = null;
try {
  console.log(`stale-chunk recovery - MODE=${MODE} DIST=${DIST} entry=${ENTRY} target=${TARGET}`);
  for (const vp of VPS) {
    if (MODE === "before") {
      await defectBlank(browser, vp, { css: false });
      await defectBlank(browser, vp, { css: true });
    } else {
      await recoverOnce(browser, vp, { css: false });
      await recoverOnce(browser, vp, { css: true });
      await persistentFailure(browser, vp);
      await resetsOnNavigation(browser, vp);
      await unrelatedErrorsIgnored(browser, vp);
      await unhandledRejectionOnce(browser, vp);
      await storageUnavailable(browser, vp);
    }
  }
} catch (error) { failure = error; } finally { await browser.close(); }
if (failure) { console.error(failure); console.error(`stale-chunk recovery browser test: FAIL (${results.length} scenarios passed first)`); process.exit(1); }
console.log(`stale-chunk recovery browser test: PASS (${MODE}, ${results.length} scenarios)`);
