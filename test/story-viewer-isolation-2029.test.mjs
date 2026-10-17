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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
test.after(() => { if (built) fs.rmSync(built.dir, { recursive: true, force: true }); });

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
const MIME = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html; charset=utf-8", ".json": "application/json", ".ttf": "font/ttf", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
function serve(dir, entry = fs.existsSync(path.join(dir, "2029.html")) ? "2029.html" : "index.html") {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(dir, pathname);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, entry);
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port })));
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
  const control = { mode: "ok", delay: 0, requests: [] };
  await context.route(chunk, async (route) => {
    control.requests.push(Date.now());
    if (control.mode === "fail") return route.abort();
    if (control.delay) await new Promise((resolve) => setTimeout(resolve, control.delay));
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}${route}`);
  await page.waitForSelector(".sod29-root", { timeout: 30000 });
  await page.waitForTimeout(800);
  return { context, page, control, errors };
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
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
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
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
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

test("browser · story viewer: a failed load keeps the app, offers retry and close, and retry opens the story", { skip, timeout: 120000 }, async () => {
  const { d2029 } = builds();
  const { server, port } = await serve(d2029);
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
  try {
    const { context, page, control } = await openApp(browser, port, { chunk: /\/assets\/StoryViewer-[^/]+\.js/ });
    control.mode = "fail";
    const shortcut = await expandedShortcut(page);
    await shortcut.click();
    await page.locator('[data-story-viewer-status="error"]').waitFor({ state: "visible", timeout: 10000 });
    assert.equal(await page.locator(".sod29-root").count(), 1, "the app is not unmounted by the failure");
    // close keeps working; a new open fails the same way and can still be closed
    await page.getByRole("button", { name: "סגירה" }).click();
    await page.locator("[data-story-viewer-status]").waitFor({ state: "detached" });
    await (await expandedShortcut(page, { again: true })).click();
    await page.locator('[data-story-viewer-status="error"]').waitFor({ state: "visible", timeout: 10000 });
    // the code becomes reachable: retry asks again and opens the story
    const before = control.requests.length;
    control.mode = "ok";
    await page.getByRole("button", { name: "נסו שוב" }).click();
    await page.locator('[role="dialog"] img[alt]').first().waitFor({ state: "visible", timeout: 10000 });
    assert.ok(control.requests.length > before, "retry requested the code again");
    assert.equal(await page.locator("[data-story-viewer-status]").count(), 0);
    await context.close();
  } finally { await browser.close(); server.close(); }
});

async function openIssueForm(page) {
  await page.locator('button[aria-label="דווח על בעיה"]').first().click();
}

test("browser · report form: first open, slow load and failed load (retry and close) keep the frame", { skip, timeout: 180000 }, async () => {
  const { d2029 } = builds();
  const { server, port } = await serve(d2029);
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
  try {
    const { context, page, control, errors } = await openApp(browser, port, { chunk: /\/assets\/ContactGateway-[^/]+\.js/ });
    const panel = page.locator('aside[role="dialog"]');
    // first open: nothing requested before the action
    assert.equal(control.requests.length, 0);
    await openIssueForm(page);
    await panel.locator("textarea").first().waitFor({ state: "visible", timeout: 10000 });
    assert.equal(control.requests.length, 1);
    await panel.getByRole("button", { name: "סגור" }).click();
    await panel.waitFor({ state: "detached" });

    // slow: the panel shows its loading state and can be closed; the form does not appear afterwards
    const fresh = await openApp(browser, port, { chunk: /\/assets\/ContactGateway-[^/]+\.js/ });
    fresh.control.delay = 2500;
    await openIssueForm(fresh.page);
    const freshPanel = fresh.page.locator('aside[role="dialog"]');
    await freshPanel.waitFor({ state: "visible", timeout: 5000 });
    assert.match(await freshPanel.innerText(), /פותח את הדיווח/);
    await freshPanel.getByRole("button", { name: "סגור" }).click();
    await freshPanel.waitFor({ state: "detached" });
    await fresh.page.waitForTimeout(3200);
    assert.equal(await fresh.page.locator('aside[role="dialog"]').count(), 0, "a closed panel does not reopen when the code arrives");
    await fresh.context.close();

    // failed: message with retry, the frame stays, close works, retry opens the form
    const failing = await openApp(browser, port, { chunk: /\/assets\/ContactGateway-[^/]+\.js/ });
    failing.control.mode = "fail";
    await openIssueForm(failing.page);
    const failPanel = failing.page.locator('aside[role="dialog"]');
    await failPanel.getByRole("button", { name: "נסו שוב" }).waitFor({ state: "visible", timeout: 10000 });
    assert.equal(await failing.page.locator(".sod29-root").count(), 1, "the frame is not unmounted by the failure");
    await failPanel.getByRole("button", { name: "סגור" }).click();
    await failPanel.waitFor({ state: "detached" });
    await openIssueForm(failing.page);
    await failPanel.getByRole("button", { name: "נסו שוב" }).waitFor({ state: "visible", timeout: 10000 });
    const before = failing.control.requests.length;
    failing.control.mode = "ok";
    await failPanel.getByRole("button", { name: "נסו שוב" }).click();
    await failPanel.locator("textarea").first().waitFor({ state: "visible", timeout: 10000 });
    assert.ok(failing.control.requests.length > before, "retry requested the code again");
    assert.deepEqual([...errors, ...fresh.errors, ...failing.errors.filter((e) => !/Failed to fetch dynamically imported module/.test(e))], []);
    await failing.context.close();
    await context.close();
  } finally { await browser.close(); server.close(); }
});

test("browser · Legacy build with the 2029 shell: the story opens from the registered static viewer, with no viewer request", { skip, timeout: 120000 }, async () => {
  const { dlegacy } = builds();
  const { server, port } = await serve(dlegacy, "index.html");
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
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
    const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"] });
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
