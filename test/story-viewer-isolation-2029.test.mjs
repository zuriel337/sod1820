// The story viewer and the report form load on demand for 2029 consumers; Legacy consumers keep the static viewer.
// Contract tests read source; build tests run the real 2029 and Legacy builds into a temp dir; browser tests drive the built 2029 app in Chromium
// (synthetic channel rows; every other host aborted) through first open, a slow load and a failed load, with close and retry.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { createOnDemandLoader, failedModuleUrl } from "../src/components/experience2029/onDemandLoader2029.js";
import isolation from "../scripts/ci-isolation/policy.cjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Under scripts/ci-isolation/run.mjs (the central run) every loopback server this file starts is registered with the existing policy
// (permitLocalServer), the browser takes the policy's own arguments, and the audit must be empty at the end. Without it the file runs as before.
const isolated = process.env.SOD_CI_ISOLATION === "1";
const auditStart = isolated ? isolation.auditCheckpoint() : 0;
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const VIEWER_MARK = "שתפו קישור לצפייה";
const FORM_MARK = "אפשרויות דיווח ופנייה";

test("contract: the shared implementation never imports the viewer; Legacy binds it statically, 2029 on demand", () => {
  const core = read("src/components/OrGeulaStoryColumnCore.jsx");
  assert.doesNotMatch(core, /from\s+["']\.\/StoryViewer\.jsx["']|import\(\s*["']\.\/StoryViewer/);
  assert.match(core, /export function MergedStoriesRail\([^)]*Viewer\s*\}/);
  assert.match(core, /export function LandingDiscoveryStories\([^)]*Viewer\s*\}/);
  assert.match(core, /export default function OrGeulaStoryColumn\([^)]*Viewer\s*\}/);

  const facade = read("src/components/OrGeulaStoryColumn.jsx");
  assert.match(facade, /^import StoryViewer from "\.\/StoryViewer\.jsx";/m);
  assert.match(facade, /export const MergedStoriesRail = \(props\) => <CoreMergedStoriesRail \{\.\.\.props\} Viewer=\{StoryViewer\} \/>/);
  assert.match(facade, /export const LandingDiscoveryStories = \(props\) => <CoreLandingDiscoveryStories \{\.\.\.props\} Viewer=\{StoryViewer\} \/>/);
  assert.match(facade, /export default function OrGeulaStoryColumn[\s\S]*Viewer=\{StoryViewer\}/);
  assert.match(facade, /export \{ BRAND_OR_GEULA, BRAND_TZOFON \}/);
  assert.doesNotMatch(facade, /lazy|import\(/);
  assert.match(facade, /registerStaticStoryViewer\(StoryViewer\);/);
  assert.match(read("src/components/experience2029/StoryViewerOnDemand2029.jsx"), /if \(IS_2029_BUILD\) return import\("\.\.\/StoryViewer\.jsx"\);/);

  // Legacy's own import line is unchanged and still resolves to the Legacy-facing file.
  assert.match(read("src/legacy/legacy.jsx"), /import \{ MergedStoriesRail, LandingDiscoveryStories \} from "\.\.\/components\/OrGeulaStoryColumn\.jsx";/);

  const shortcut = read("src/components/experience2029/OrGeulaSourceShortcut2029.jsx");
  assert.match(shortcut, /OrGeulaStoryColumnCore\.jsx/);
  assert.match(shortcut, /Viewer=\{StoryViewerOnDemand2029\}/);
  assert.match(read("src/components/experience2029/CompanionPanel2029.jsx"), /import OrGeulaStoryColumn from "\.\/OrGeulaSourceShortcut2029\.jsx";/);

  // No 2029 module reaches the viewer, the Legacy-facing rail or the form statically.
  for (const file of fs.readdirSync(path.join(root, "src/components/experience2029")).filter((name) => /\.jsx?$/.test(name))) {
    const source = read(`src/components/experience2029/${file}`);
    assert.doesNotMatch(source, /^import[^\n]*(StoryViewer\.jsx|ContactGateway\.jsx|\.\.\/OrGeulaStoryColumn\.jsx)["']/m, file);
  }
});

test("loader: one request shared by every caller, a failure is forgotten, the retry URL comes only from a same-origin script", async () => {
  let calls = 0;
  const load = createOnDemandLoader(async () => { calls += 1; return { default: "viewer" }; });
  assert.deepEqual(await Promise.all([load(), load()]), [{ default: "viewer" }, { default: "viewer" }]);
  assert.equal(calls, 1);
  assert.equal(await load(), await load());

  let attempts = 0;
  const flaky = createOnDemandLoader(async () => { attempts += 1; throw new Error("Failed to fetch dynamically imported module: no url"); });
  await assert.rejects(flaky());
  await assert.rejects(flaky());
  assert.equal(attempts, 2, "a failed request is not remembered as the answer (no URL in the message: the same importer asks again)");

  const origin = "https://sod.example";
  assert.equal(failedModuleUrl(new Error(`Failed to fetch dynamically imported module: ${origin}/assets/StoryViewer-abc.js`), origin), `${origin}/assets/StoryViewer-abc.js`);
  assert.equal(failedModuleUrl(new Error(`error loading dynamically imported module: ${origin}/assets/x.js?retry=2`), origin), `${origin}/assets/x.js`, "an earlier retry's query is dropped");
  assert.equal(failedModuleUrl(new Error("Failed to fetch dynamically imported module: https://evil.example/assets/x.js"), origin), null, "another origin is never imported");
  assert.equal(failedModuleUrl(new Error("Importing a module script failed."), origin), null);
  assert.equal(failedModuleUrl(new Error(`Failed: ${origin}/assets/data.json`), origin), null, "only scripts");
  assert.equal(failedModuleUrl(null, origin), null);
});

function buildTo(target, outDir) {
  execFileSync(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "build", "--outDir", outDir, "--emptyOutDir"], { cwd: root, env: { ...process.env, SOD_BUILD_TARGET: target }, stdio: "pipe" });
}
const chunksWith = (dir, mark) => fs.readdirSync(path.join(dir, "assets")).filter((name) => name.endsWith(".js") && fs.readFileSync(path.join(dir, "assets", name), "utf8").includes(mark));
// Files the document loads before any user action: its scripts and preloads, and everything those import statically.
function startupGraph(dir, html) {
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file) || !file.endsWith(".js")) return;
    seen.add(file);
    for (const m of fs.readFileSync(path.join(dir, file), "utf8").matchAll(/(?:^|[;}\s])(?:import|export)\s*(?:[^"'`;]*?from\s*)?["']\.\/([^"']+\.js)["']/g)) walk(`assets/${m[1]}`);
  };
  fs.readFileSync(path.join(dir, html), "utf8").matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g);
  for (const m of fs.readFileSync(path.join(dir, html), "utf8").matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)) walk(m[1]);
  return seen;
}

let built = null;
function builds() {
  if (built) return built;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sod-story-viewer-"));
  buildTo("2029", path.join(dir, "d2029"));
  buildTo("legacy", path.join(dir, "dlegacy"));
  return (built = { dir, d2029: path.join(dir, "d2029"), dlegacy: path.join(dir, "dlegacy") });
}
test.after(() => {
  if (built) fs.rmSync(built.dir, { recursive: true, force: true });
  if (isolated) isolation.assertClean(auditStart);
});

test("2029 build: the viewer and the report form are chunks of their own, outside the shell and outside the startup graph", { timeout: 240000 }, () => {
  const { d2029 } = builds();
  const startup = startupGraph(d2029, "2029.html");
  for (const mark of [VIEWER_MARK, FORM_MARK]) {
    const files = chunksWith(d2029, mark);
    assert.equal(files.length, 1, `${mark}: exactly one chunk`);
    assert.doesNotMatch(files[0], /Sod2029Shell/);
    assert.ok(!startup.has(`assets/${files[0]}`), `${files[0]} is not part of the startup graph`);
  }
  const shell = chunksWith(d2029, "sod29-companion-source-quick");
  assert.ok(shell.length >= 1, "the shell carries the companion shortcut itself");
  const shellSource = fs.readFileSync(path.join(d2029, "assets", chunksWith(d2029, "data-story-viewer-status").concat(shell)[0]), "utf8");
  assert.ok(shellSource.includes("data-story-viewer-status"), "the load status/retry UI ships with the shell (small), the viewer does not");
});

test("Legacy build: the viewer is still part of the Legacy startup graph (static), not a chunk fetched on first open", { timeout: 240000 }, () => {
  const { dlegacy } = builds();
  const startup = startupGraph(dlegacy, "index.html");
  const viewerChunks = chunksWith(dlegacy, VIEWER_MARK);
  assert.ok(viewerChunks.some((file) => startup.has(`assets/${file}`)), `the viewer code is in the startup graph (${viewerChunks.join(", ")})`);
  assert.equal(fs.readdirSync(path.join(dlegacy, "assets")).filter((name) => /^StoryViewer-/.test(name)).length, 0, "no separate StoryViewer chunk in Legacy");
});

// ---- browser ----
let chromium = null;
for (const base of [import.meta.url, `file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`]) {
  try { chromium = createRequire(base)("playwright").chromium; break; } catch { /* next */ }
}
const executablePath = process.env.PERF_CHROME || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(fs.existsSync);
const skip = !chromium || !executablePath ? "Chromium is not available" : false;
const launchBrowser = () => chromium.launch({ executablePath, args: isolated ? isolation.browserArgs : ["--no-sandbox", "--disable-dev-shm-usage", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
const MIME = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html; charset=utf-8", ".json": "application/json", ".ttf": "font/ttf", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
function serve(dir, entry = fs.existsSync(path.join(dir, "2029.html")) ? "2029.html" : "index.html") {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(dir, pathname);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, entry);
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => {
    if (isolated) isolation.permitLocalServer(server);
    resolve({ server, port: server.address().port });
  }));
}
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const ROWS = [{ id: 1, text: "synthetic story one", image_url: PIXEL, thumb_url: PIXEL, created_at: new Date().toISOString(), priority: 0, credit: null, expires_at: null, link_url: null }];
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };

async function openApp(browser, port, { chunk, route = "/" }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
  // Loopback only. Channel rows are synthetic; every other request is refused.
  await context.route((url) => url.hostname !== "127.0.0.1", (route) => {
    const request = route.request();
    if (/\/rest\/v1\/channel_updates/.test(request.url())) {
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      return route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" }, body: JSON.stringify(ROWS) });
    }
    return route.abort();
  });
  // mode: ok | fail (the request is refused) | throw (the file arrives and fails when it runs, with a message that names no URL)
  const control = { mode: "ok", delay: 0, requests: [], depMode: "ok", depRequests: [], navigations: 0, loaded: new Set() };
  await context.route(chunk, async (route) => {
    control.requests.push(Date.now());
    if (control.mode === "fail") return route.abort();
    if (control.mode === "throw") return route.fulfill({ status: 200, headers: { "content-type": "text/javascript" }, body: 'throw new Error("Importing a module script failed.");' });
    if (control.delay) await new Promise((resolve) => setTimeout(resolve, control.delay));
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("request", (request) => { const pathname = new URL(request.url()).pathname; if (pathname.endsWith(".js")) control.loaded.add(pathname.split("/").pop()); });
  page.on("load", () => { control.navigations += 1; });   // document loads: in-page route changes do not count
  await page.goto(`http://127.0.0.1:${port}${route}`);
  await page.waitForSelector(".sod29-root", { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__documentMarker = "first-document"; });
  return { context, page, control, errors };
}

// Files a built chunk imports statically that the page had not loaded before the person acted: a failure of one of those is a failure of a dependency.
function exclusiveDependencies(dir, chunkName, loaded) {
  const file = fs.readdirSync(path.join(dir, "assets")).find((name) => chunkName.test(name));
  const source = fs.readFileSync(path.join(dir, "assets", file), "utf8");
  return [...source.matchAll(/(?:^|[;}\s])(?:import|export)\s*(?:[^"'`;]*?from\s*)?["']\.\/([^"']+\.js)["']/g)].map((m) => m[1]).filter((name) => !loaded.has(name));
}

// The Companion shows its source shortcut in two places; the one a person uses is in the expanded capsule (hover or focus opens it). Its rows arrive
// from the (synthetic) channel read, and until they do the shortcut would navigate instead of opening a story, so wait for the "new" mark.
async function expandedShortcut(page, { again = false } = {}) {
  // A story that was opened is marked seen, so a later open cannot wait for the "new" mark: it waits a moment for the capsule's own channel read instead.
  await page.locator("aside.sod29-companion").hover();
  const shortcut = page.locator(again ? ".sod29-companion-source-quick.is-expanded .sod29-or-geula-shortcut" : ".sod29-companion-source-quick.is-expanded .sod29-or-geula-shortcut.is-new");
  await shortcut.waitFor({ state: "visible", timeout: 15000 });
  if (again) await page.waitForTimeout(500);
  return shortcut;
}

test("browser · story viewer: first open requests the chunk only on click and shows the story", { skip, timeout: 120000 }, async () => {
  const { d2029 } = builds();
  const { server, port } = await serve(d2029);
  const browser = await launchBrowser();
  try {
    const { context, page, control, errors } = await openApp(browser, port, { chunk: /\/assets\/StoryViewer-[^/]+\.js/ });
    const shortcut = await expandedShortcut(page);
    assert.equal(control.requests.length, 0, "nothing requested before the click");
    await shortcut.click();
    await page.locator('[role="dialog"] img[alt]').first().waitFor({ state: "visible", timeout: 10000 });
    assert.equal(control.requests.length, 1);
    assert.equal(await page.locator("[data-story-viewer-status]").count(), 0, "no status left over");
    await page.getByRole("button", { name: "סגירה" }).click();
    await page.locator('[role="dialog"] img[alt]').first().waitFor({ state: "detached" });
    await (await expandedShortcut(page, { again: true })).click();   // a second open uses the loaded code
    await page.locator('[role="dialog"] img[alt]').first().waitFor({ state: "visible", timeout: 5000 });
    assert.equal(control.requests.length, 1, "no second request");
    assert.deepEqual(errors, []);
    await context.close();
  } finally { await browser.close(); server.close(); }
});

test("browser · story viewer: a slow load shows a status that can be closed, and the viewer does not appear after close", { skip, timeout: 120000 }, async () => {
  const { d2029 } = builds();
  const { server, port } = await serve(d2029);
  const browser = await launchBrowser();
  try {
    const { context, page, control, errors } = await openApp(browser, port, { chunk: /\/assets\/StoryViewer-[^/]+\.js/ });
    control.delay = 2500;
    const shortcut = await expandedShortcut(page);
    await shortcut.click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator("[data-story-viewer-status]").count(), 0, "a fast enough wait shows nothing yet");
    await page.locator('[data-story-viewer-status="loading"]').waitFor({ state: "visible", timeout: 2000 });
    await page.keyboard.press("Escape");
    await page.locator("[data-story-viewer-status]").waitFor({ state: "detached" });
    await page.waitForTimeout(3200);   // the chunk arrives after the person closed
    assert.equal(await page.locator('[role="dialog"] img[alt]').count(), 0, "a closed story does not reopen when the code arrives");
    assert.equal(await page.locator(".sod29-root").count(), 1, "the shell is intact");

    control.delay = 800;   // the next open waits, then shows the story
    await (await expandedShortcut(page, { again: true })).click();
    await page.locator('[role="dialog"] img[alt]').first().waitFor({ state: "visible", timeout: 5000 });
    assert.deepEqual(errors, []);
    await context.close();
  } finally { await browser.close(); server.close(); }
});

async function openIssueForm(page) {
  await page.locator('button[aria-label="דווח על בעיה"]').first().click();
}


// The two on-demand surfaces, behind one description so that the recovery path is checked the same way for both.
const SURFACES = {
  story: {
    label: "story viewer",
    chunk: /\/assets\/StoryViewer-[^/]+\.js/,
    chunkName: /^StoryViewer-/,
    open: async (page) => { await (await expandedShortcut(page)).click(); },
    reopen: async (page) => { await (await expandedShortcut(page, { again: true })).click(); },
    scope: (page) => page.locator('[data-story-viewer-status="error"]'),
    opened: (page) => page.locator('[role="dialog"] img[alt]').first(),
    close: (page) => page.locator('[data-story-viewer-status="error"]').getByRole("button", { name: "סגירה" }),
    gone: (page) => page.locator("[data-story-viewer-status]"),
  },
  form: {
    label: "report form",
    chunk: /\/assets\/ContactGateway-[^/]+\.js/,
    chunkName: /^ContactGateway-/,
    open: (page) => openIssueForm(page),
    reopen: (page) => openIssueForm(page),
    scope: (page) => page.locator('aside[role="dialog"]'),
    opened: (page) => page.locator('aside[role="dialog"] textarea').first(),
    close: (page) => page.locator('aside[role="dialog"]').getByRole("button", { name: "סגור" }),
    gone: (page) => page.locator('aside[role="dialog"]'),
  },
};
const RETRY = { name: "נסו שוב" };
const RELOAD = { name: "רענון הדף" };
const STAY_MS = 1500;   // how long "nothing happens by itself" is watched

async function withSurface(kind, run) {
  const surface = SURFACES[kind];
  const { d2029 } = builds();
  const { server, port } = await serve(d2029);
  const browser = await launchBrowser();
  try { await run({ surface, d2029, browser, port }); } finally { await browser.close(); server.close(); }
}

for (const kind of ["story", "form"]) {
  test(`browser · ${SURFACES[kind].label}: after a failed load, close works and the next open recovers`, { skip, timeout: 120000 }, async () => {
    await withSurface(kind, async ({ surface, browser, port }) => {
      const { context, page, control } = await openApp(browser, port, { chunk: surface.chunk });
      control.mode = "fail";
      await surface.open(page);
      await surface.scope(page).getByRole("button", RETRY).waitFor({ state: "visible", timeout: 10000 });
      assert.equal(await surface.scope(page).getByRole("button", RELOAD).count(), 0, "a retry that can work is the offer, not a reload");
      assert.equal(await page.locator(".sod29-root").count(), 1, "the app is not unmounted by the failure");
      await surface.close(page).click();
      await surface.gone(page).waitFor({ state: "detached" });
      control.mode = "ok";
      await surface.reopen(page);
      await surface.opened(page).waitFor({ state: "visible", timeout: 10000 });
      await context.close();
    });
  });

  test(`browser · ${SURFACES[kind].label}: the retry button asks again and opens it`, { skip, timeout: 120000 }, async () => {
    await withSurface(kind, async ({ surface, browser, port }) => {
      const { context, page, control } = await openApp(browser, port, { chunk: surface.chunk });
      control.mode = "fail";
      await surface.open(page);
      await surface.scope(page).getByRole("button", RETRY).waitFor({ state: "visible", timeout: 10000 });
      const before = control.requests.length;
      control.mode = "ok";
      await surface.scope(page).getByRole("button", RETRY).click();
      await surface.opened(page).waitFor({ state: "visible", timeout: 10000 });
      assert.equal(control.requests.length, before + 1, "exactly one more request");
      await context.close();
    });
  });

  test(`browser · ${SURFACES[kind].label}: a retry that fails offers an explicit page refresh, keeps close, and never loops or reloads by itself`, { skip, timeout: 120000 }, async () => {
    await withSurface(kind, async ({ surface, browser, port }) => {
      const route = "/?utm_source=recovery#top";
      const { context, page, control } = await openApp(browser, port, { chunk: surface.chunk, route });
      const address = `http://127.0.0.1:${port}${route}`;
      control.mode = "fail";
      await surface.open(page);
      await surface.scope(page).getByRole("button", RETRY).waitFor({ state: "visible", timeout: 10000 });
      assert.equal(control.requests.length, 1);
      await surface.scope(page).getByRole("button", RETRY).click();
      await surface.scope(page).getByRole("button", RELOAD).waitFor({ state: "visible", timeout: 10000 });
      assert.equal(await surface.scope(page).getByRole("button", RETRY).count(), 0, "one in-place retry, then only the refresh");
      assert.equal(control.requests.length, 2);
      // nothing happens by itself: no request, no navigation, the same document
      await page.waitForTimeout(STAY_MS);
      assert.equal(control.requests.length, 2, "no retry loop");
      assert.equal(control.navigations, 1, "no automatic reload");
      assert.equal(await page.evaluate(() => window.__documentMarker), "first-document");
      // close stays available, and a later open that fails again offers the refresh, not another retry
      await surface.close(page).click();
      await surface.gone(page).waitFor({ state: "detached" });
      await surface.reopen(page);
      await surface.scope(page).getByRole("button", RELOAD).waitFor({ state: "visible", timeout: 10000 });
      assert.equal(await surface.scope(page).getByRole("button", RETRY).count(), 0);
      assert.equal(control.navigations, 1);
      // the refresh is the person's click: same address with its query and hash, a new document, and the surface opens
      control.mode = "ok";
      await Promise.all([page.waitForEvent("load"), surface.scope(page).getByRole("button", RELOAD).click()]);
      assert.equal(page.url(), address);
      await page.waitForSelector(".sod29-root", { timeout: 30000 });
      assert.equal(await page.evaluate(() => window.__documentMarker), undefined, "a new document");
      await page.waitForTimeout(800);
      await surface.reopen(page);
      await surface.opened(page).waitFor({ state: "visible", timeout: 10000 });
      await context.close();
    });
  });

  // The message below is the shape of Safari's ("Importing a module script failed.", no URL). It is produced by a file that throws when it runs,
  // in Chromium: a simulation of the message, not a test of Safari.
  test(`browser · ${SURFACES[kind].label}: an error that names no URL (simulated message shape) offers the refresh and close, not a retry`, { skip, timeout: 120000 }, async () => {
    await withSurface(kind, async ({ surface, browser, port }) => {
      const route = "/?utm_source=nourl#section";
      const { context, page, control } = await openApp(browser, port, { chunk: surface.chunk, route });
      control.mode = "throw";
      await surface.open(page);
      await surface.scope(page).getByRole("button", RELOAD).waitFor({ state: "visible", timeout: 10000 });
      assert.equal(await surface.scope(page).getByRole("button", RETRY).count(), 0);
      assert.equal(await page.locator(".sod29-root").count(), 1);
      await page.waitForTimeout(STAY_MS);
      assert.equal(control.requests.length, 1, "no retry loop");
      assert.equal(control.navigations, 1, "no automatic reload");
      await surface.close(page).click();
      await surface.gone(page).waitFor({ state: "detached" });
      control.mode = "ok";
      await Promise.all([page.waitForEvent("load"), (async () => { await surface.reopen(page); await surface.scope(page).getByRole("button", RELOAD).click(); })()]);
      assert.equal(page.url(), `http://127.0.0.1:${port}${route}`);
      await page.waitForSelector(".sod29-root", { timeout: 30000 });
      await page.waitForTimeout(800);
      await surface.reopen(page);
      await surface.opened(page).waitFor({ state: "visible", timeout: 10000 });
      await context.close();
    });
  });
}

test("browser · story viewer: it has no dependency that loads only with it, so a dependency failure cannot occur for it in this build", { skip, timeout: 120000 }, async () => {
  await withSurface("story", async ({ surface, d2029, browser, port }) => {
    const { context, control } = await openApp(browser, port, { chunk: surface.chunk });
    assert.deepEqual(exclusiveDependencies(d2029, surface.chunkName, control.loaded), []);
    await context.close();
  });
});

test("browser · report form: a failed dependency file (the form chunk itself arrives) shows the refresh, keeps close and the frame, and does not loop", { skip, timeout: 120000 }, async (t) => {
  await withSurface("form", async ({ surface, d2029, browser, port }) => {
    const route = "/?utm_source=dependency#top";
    const { context, page, control } = await openApp(browser, port, { chunk: surface.chunk, route });
    const dependencies = exclusiveDependencies(d2029, surface.chunkName, control.loaded);
    assert.ok(dependencies.length >= 1, "the form chunk has a dependency that loads only with it (otherwise this case proves nothing)");
    const [dependency] = dependencies;
    await context.route(new RegExp(`/assets/${dependency.replace(/[.]/g, "\\.")}$`), (route) => { control.depRequests.push(Date.now()); return control.depMode === "fail" ? route.abort() : route.continue(); });
    control.depMode = "fail";
    await surface.open(page);
    const box = surface.scope(page);
    await box.getByRole("alert").waitFor({ state: "visible", timeout: 10000 });
    assert.equal(control.requests.length >= 1, true, "the chunk itself was requested and arrived");
    assert.ok(control.depRequests.length >= 1, "the dependency was requested and refused");
    // a retry may be offered once (the error can name the chunk); a dependency that failed stays failed in the document, so it ends in the refresh
    const retryOffered = (await box.getByRole("button", RETRY).count()) > 0;
    t.diagnostic(`dependency ${dependency}: first error offered a retry = ${retryOffered}`);
    if (retryOffered) {
      await box.getByRole("button", RETRY).click();
      await box.getByRole("button", RELOAD).waitFor({ state: "visible", timeout: 10000 });
    }
    assert.equal(await box.getByRole("button", RETRY).count(), 0);
    assert.equal(await box.getByRole("button", RELOAD).count(), 1);
    assert.equal(await page.locator(".sod29-root").count(), 1, "the frame is intact");
    const requests = [control.requests.length, control.depRequests.length];
    await page.waitForTimeout(STAY_MS);
    assert.deepEqual([control.requests.length, control.depRequests.length], requests, "no loop");
    assert.equal(control.navigations, 1);
    await surface.close(page).click();
    await surface.gone(page).waitFor({ state: "detached" });
    // the person refreshes, and the dependency is reachable again
    control.depMode = "ok";
    await Promise.all([page.waitForEvent("load"), (async () => { await surface.reopen(page); await box.getByRole("button", RELOAD).click(); })()]);
    assert.equal(page.url(), `http://127.0.0.1:${port}${route}`);
    await page.waitForSelector(".sod29-root", { timeout: 30000 });
    await page.waitForTimeout(800);
    await surface.reopen(page);
    await surface.opened(page).waitFor({ state: "visible", timeout: 10000 });
    await context.close();
  });
});

test("browser · report form: first open and a slow load show the panel's loading state, closing works, and the form does not appear afterwards", { skip, timeout: 120000 }, async () => {
  await withSurface("form", async ({ surface, browser, port }) => {
    const { context, page, control } = await openApp(browser, port, { chunk: surface.chunk });
    assert.equal(control.requests.length, 0);
    await surface.open(page);
    await surface.opened(page).waitFor({ state: "visible", timeout: 10000 });
    assert.equal(control.requests.length, 1);
    await surface.close(page).click();
    await surface.gone(page).waitFor({ state: "detached" });
    await context.close();

    const slow = await openApp(browser, port, { chunk: surface.chunk });
    slow.control.delay = 2500;
    await surface.open(slow.page);
    const panel = slow.page.locator('aside[role="dialog"]');
    await panel.waitFor({ state: "visible", timeout: 5000 });
    assert.match(await panel.innerText(), /פותח את הדיווח/);
    await surface.close(slow.page).click();
    await panel.waitFor({ state: "detached" });
    await slow.page.waitForTimeout(3200);
    assert.equal(await slow.page.locator('aside[role="dialog"]').count(), 0, "a closed panel does not reopen when the code arrives");
    await slow.context.close();
  });
});

test("browser · Legacy build with the 2029 shell: the story opens from the registered static viewer, with no viewer request", { skip, timeout: 120000 }, async () => {
  const { dlegacy } = builds();
  const { server, port } = await serve(dlegacy, "index.html");
  const browser = await launchBrowser();
  try {
    const { context, page, control, errors } = await openApp(browser, port, { chunk: /\/assets\/StoryViewer-[^/]+\.js/, route: "/world" });
    const shortcut = await expandedShortcut(page);
    await shortcut.click();
    await page.locator('[role="dialog"] img[alt]').first().waitFor({ state: "visible", timeout: 5000 });
    assert.equal(control.requests.length, 0, "the Legacy build has no viewer chunk to request");
    assert.equal(await page.locator("[data-story-viewer-status]").count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  } finally { await browser.close(); server.close(); }
});

test("browser · Legacy-facing rail: the viewer opens at once from the static import, with no request", { skip, timeout: 120000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sod-story-harness-"));
  try {
    const harness = path.join(root, "test/fixtures/story-viewer-harness");
    await build({ configFile: false, logLevel: "silent", root: harness, plugins: [react()], define: { "process.env.NODE_ENV": '"production"', __SOD_2029_BUILD__: "false" }, build: { outDir: dir, emptyOutDir: true, minify: false } });
    const chunks = fs.readdirSync(path.join(dir, "assets")).filter((name) => name.endsWith(".js"));
    assert.equal(chunks.filter((name) => fs.readFileSync(path.join(dir, "assets", name), "utf8").includes(VIEWER_MARK)).length, 1);
    assert.equal(chunks.length, 1, "one script: the viewer is bundled with the rail, not split off");
    const { server, port } = await serve(dir);
    const browser = await launchBrowser();
    try {
      const context = await browser.newContext({ serviceWorkers: "block" });
      await context.route((url) => url.hostname !== "127.0.0.1", (route) => route.abort());
      const page = await context.newPage();
      const after = [];
      await page.goto(`http://127.0.0.1:${port}/`);
      const shortcut = page.locator(".sod29-or-geula-shortcut").first();
      await shortcut.waitFor({ state: "visible", timeout: 10000 });
      page.on("request", (request) => after.push(request.url()));
      await shortcut.click();
      await page.locator('[role="dialog"] img[alt]').first().waitFor({ state: "visible", timeout: 3000 });
      assert.deepEqual(after.filter((url) => url.startsWith("http://127.0.0.1")), [], "no request between the click and the viewer");
      assert.equal(await page.locator("[data-story-viewer-status]").count(), 0);
      await context.close();
    } finally { await browser.close(); server.close(); }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
