import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(root, "test/fixtures/analytics-emitter-boundary-2029");
let chromium = null;
for (const base of [import.meta.url, `file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`]) {
  try { chromium = createRequire(base)("playwright").chromium; break; } catch { /* optional outside evidence environment */ }
}
const executablePath = process.env.PERF_CHROME
  || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/usr/bin/chromium"].find(fs.existsSync)
  || chromium?.executablePath?.();
const skip = !chromium || !executablePath ? "Chromium is unavailable" : false;

async function bundle() {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "analytics-boundary-browser-"));
  const aliases = new Map([
    ["@boundary", path.join(root, "src/lib/analyticsEmitterBoundary2029.js")],
    ["@policy", path.join(root, "src/lib/analyticsPolicy2029.js")],
    ["@errors", path.join(root, "src/lib/runtimeErrorCollector2029.js")],
    ["@collectors", path.join(root, "src/lib/analyticsCollectorBoundary2029.js")],
  ]);
  await build({
    configFile: false,
    logLevel: "silent",
    root: fixture,
    plugins: [{
      name: "analytics-boundary-harness-aliases",
      enforce: "pre",
      resolveId(source) { return aliases.get(source) || null; },
    }],
    build: { outDir, emptyOutDir: true },
  });
  return outDir;
}

function serveStatic(rootDir) {
  const server = http.createServer((req, res) => {
    const urlPath = new URL(req.url, "http://127.0.0.1").pathname;
    const relative = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
    const target = path.resolve(rootDir, relative);
    if (!target.startsWith(`${path.resolve(rootDir)}${path.sep}`) || !fs.existsSync(target)) {
      res.writeHead(404); res.end("missing"); return;
    }
    const type = target.endsWith(".js") ? "text/javascript" : target.endsWith(".html") ? "text/html" : "application/octet-stream";
    res.writeHead(200, { "content-type": `${type}; charset=utf-8` });
    res.end(fs.readFileSync(target));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

test("browser loopback: early memory, OFF/Preview silence, one ON chunk and ordered envelopes", { skip, timeout: 120000 }, async () => {
  const outDir = await bundle();
  const server = await serveStatic(outDir);
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const pages = [];
  const openHarness = async () => {
    const page = await browser.newPage();
    const emitterRequests = [];
    pages.push(page);
    page.on("request", (request) => {
      if (/\/assets\/emitter-[^/]+\.js$/.test(new URL(request.url()).pathname)) emitterRequests.push(request.url());
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    return { page, emitterRequests };
  };
  const captureEarlyError = (page) => page.evaluate(() => window.dispatchEvent(new ErrorEvent("error", {
    message: "early boundary boom",
    filename: "https://sod1820.co.il/entry.js?secret=1",
    lineno: 9,
    colno: 3,
    error: new Error("early boundary boom"),
  })));
  try {
    const off = await openHarness();
    await captureEarlyError(off.page);
    assert.deepEqual(await off.page.evaluate(() => ({
      state: window.__analyticsBoundary.state(),
      writes: window.__analyticsBoundary.writes,
    })), {
      state: { prepared: true, collecting: true, pending: 1, authorized: false },
      writes: [],
    });
    assert.equal(await off.page.evaluate(() => window.__analyticsBoundary.apply({ on: false })), false);
    await off.page.waitForTimeout(40);
    assert.deepEqual(await off.page.evaluate(() => window.__analyticsBoundary.state()), {
      prepared: true, collecting: false, pending: 0, authorized: false,
    });
    assert.equal(off.emitterRequests.length, 0, "OFF must request no emitter chunk");
    assert.deepEqual(await off.page.evaluate(() => window.__analyticsBoundary.writes), []);

    const preview = await openHarness();
    await captureEarlyError(preview.page);
    assert.equal(await preview.page.evaluate(() => window.__analyticsBoundary.apply({ on: true, hostedPreview: true })), false);
    await preview.page.waitForTimeout(40);
    assert.equal(preview.emitterRequests.length, 0, "Preview must request no emitter chunk");
    assert.deepEqual(await preview.page.evaluate(() => window.__analyticsBoundary.writes), []);
    assert.equal((await preview.page.evaluate(() => window.__analyticsBoundary.state())).pending, 0);

    // Missing/failed flag reads resolve to the existing default ON; the harness
    // passes that resolved state here and exercises the real boundary/chunk.
    const on = await openHarness();
    await captureEarlyError(on.page);
    assert.equal(await on.page.evaluate(() => window.__analyticsBoundary.apply({ on: true })), true);
    await on.page.waitForFunction(() => window.__analyticsBoundary.writes.length === 6);
    assert.equal(on.emitterRequests.length, 1, "owner and route share one dynamic emitter request");
    assert.equal(await on.page.evaluate(() => window.__analyticsBoundary.moduleLoads), 1);
    const writes = await on.page.evaluate(() => window.__analyticsBoundary.writes);
    assert.deepEqual(writes.map((row) => row.kind), [
      "emitter_start",
      "runtime_error",
      "track_visit",
      "engagement_start",
      "ga_page_view",
      "marketing_page_view",
    ]);
    assert.deepEqual(writes[1], {
      kind: "runtime_error",
      section: "runtime_error",
      slug: "/",
      event_type: "window_error",
      meta: { message: "early boundary boom", name: "Error", source: "/entry.js", line: 9, col: 3 },
    });
    assert.ok(writes.slice(2).every((row) => row.path === "/world"));
  } finally {
    for (const page of pages) await page.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(outDir, { recursive: true, force: true });
  }
});
