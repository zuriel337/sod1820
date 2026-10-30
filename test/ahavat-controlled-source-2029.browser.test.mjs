import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { AHAVAT_PDF_BYTES, AHAVAT_PDF_URL, assertAhavatSourcePage, sourcePageCanvas } from "./fixtures/ahavat-controlled-source-2029.mjs";
import { ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url), { chromium } = require("playwright");
const { createServer } = await import(pathToFileURL(require.resolve("vite")));
const react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")))).default;
const out = "/workspace/artifacts/ahavat-native-source-fix-20261030-i85M6O";
const themes = ["light", "parchment", "dark"];
async function setup(width, theme, corrupt = false) {
  process.env.SOD_BUILD_TARGET = "2029"; process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true"; process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await createServer({ root, configFile: false, cacheDir: `/tmp/ahavat-source-vite-${process.pid}`, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } }); await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
  await context.addInitScript(theme => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", theme); }, theme);
  let sourceRequests = 0;
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin === origin && url.pathname === "/2029/control" && route.request().isNavigationRequest()) { const response = await context.request.get(`${origin}/2029.html`); return route.fulfill({ contentType: "text/html", body: await response.body() }); }
    if (url.href === AHAVAT_PDF_URL) { sourceRequests++; return route.fulfill({ contentType: "application/pdf", body: corrupt ? Buffer.alloc(AHAVAT_PDF_BYTES.length) : AHAVAT_PDF_BYTES }); }
    if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
    if (/googleapis|gstatic/.test(url.hostname)) return route.abort();
    return route.continue();
  });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  return { page, context, origin, errors, sourceRequests: () => sourceRequests, close: async () => { await browser.close(); await server.close(); } };
}
async function click(locator) { await locator.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" })); await locator.click(); }
async function go(page, physical) {
  const source = page.locator("#ahavat29-source");
  await source.getByLabel("עמוד PDF", { exact: true }).fill(String(physical));
  await click(source.getByRole("button", { name: "עבור", exact: true }));
  return assertAhavatSourcePage(source, physical);
}
async function signature(canvas) {
  return canvas.evaluate(element => {
    const sample = document.createElement("canvas"); sample.width = 96; sample.height = 128;
    const context = sample.getContext("2d"); context.imageSmoothingQuality = "high"; context.drawImage(element, 0, 0, 96, 128);
    const rgba = context.getImageData(0, 0, 96, 128).data, gray = [];
    for (let i = 0; i < rgba.length; i += 4) gray.push(Math.round((rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3));
    return gray;
  });
}
function distance(first, second) { let sum = 0; for (let i = 0; i < first.length; i++) sum += Math.abs(first[i] - second[i]); return sum / (first.length * 255); }

test("source page is actual rendered PDF, survives fast selection, reload, full-screen and return in nine contexts", { timeout: 480_000 }, async () => {
  const results = [];
  for (const width of [320, 390, 1440]) for (const theme of themes) {
    const fixture = await setup(width, theme), { page, origin } = fixture;
    try {
      await page.goto(`${origin}${ahavatReaderUnitHref("ahavat-tables-p036-01")}`, { waitUntil: "domcontentloaded" });
      await assertAhavatSourcePage(page, 36);
      assert.equal(await sourcePageCanvas(page, 36).evaluate(element => Boolean(element.getContext("webgl") || element.getContext("webgl2"))), false, "the source canvas is 2D, not an automatically opened spatial renderer");
      const initialRequests = fixture.sourceRequests();
      assert.ok(initialRequests >= 1 && initialRequests <= 2, "development StrictMode may abort its first setup; only one document stays active");
      const source = page.locator("#ahavat29-source");
      for (const physical of [35, 36, 46, 93, 99, 45, 36]) await go(page, physical);
      assert.equal(fixture.sourceRequests(), initialRequests, "no witness re-fetch when paging after initial setup");
      // Rapid selections are intentionally not awaited; only the newest page may commit.
      for (const physical of [93, 35, 99, 46]) {
        await source.getByLabel("עמוד PDF", { exact: true }).fill(String(physical));
        await source.getByRole("button", { name: "עבור", exact: true }).evaluate(element => element.click());
      }
      await assertAhavatSourcePage(page, 46);
      await click(source.getByRole("button", { name: "מסך מלא", exact: true }));
      await page.waitForFunction(() => !!document.fullscreenElement); await assertAhavatSourcePage(page, 46);
      await click(source.getByRole("button", { name: "יציאה ממסך מלא", exact: true }));
      await page.waitForFunction(() => !document.fullscreenElement); await assertAhavatSourcePage(page, 46);
      await click(source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }));
      await page.waitForFunction(() => document.activeElement?.closest("[data-reader-unit]")?.dataset.readerUnit === "ahavat-tables-p036-01");
      await assertAhavatSourcePage(page, 36);
      await page.reload({ waitUntil: "domcontentloaded" }); await assertAhavatSourcePage(page, 36);
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(fixture.errors, []);
      if (theme === "parchment") { await source.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${out}/controlled-source-${width}-${theme}.png` }); }
      results.push({ width, theme, status: "PASS", startupRequests: initialRequests, extraSourceRequestsWhilePaging: 0, actualPages: [35, 36, 46, 93, 99, 45], latestSelectionWins: true, fullscreen: true, exactReturn: true, reload: true, servicesMocked: true, originalPdfBytes: true, physicalDevice: false });
      writeFileSync(`${out}/controlled-reader-results.json`, JSON.stringify(results, null, 2) + "\n");
      console.log(`Controlled source ${width}/${theme}: PASS`);
    } finally { await fixture.close(); }
  }
});

test("all 99 displayed pages match an independent raster of their original physical page", { timeout: 360_000 }, async () => {
  mkdirSync(`${out}/independent-raster`, { recursive: true });
  execFileSync("pdftoppm", ["-png", "-scale-to", "768", process.env.AHAVAT_SOURCE_PDF || "/workspace/artifacts/ahavat-book-completion-20261029/source-witness/original.pdf", `${out}/independent-raster/page`], { stdio: "pipe" });
  const pngs = readdirSync(`${out}/independent-raster`).filter(name => /^page-\d+\.png$/.test(name)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  assert.equal(pngs.length, 99);
  const fixture = await setup(1440, "light"), { page, origin } = fixture;
  try {
    await page.goto(`${origin}/2029/control?surface=ahavat-torah-system&page=1`, { waitUntil: "domcontentloaded" }); await assertAhavatSourcePage(page, 1);
    const initialRequests = fixture.sourceRequests();
    const references = await page.evaluate(async images => {
      const result = [], canvas = document.createElement("canvas"); canvas.width = 96; canvas.height = 128;
      const context = canvas.getContext("2d"); context.imageSmoothingQuality = "high";
      for (const bytes of images) {
        const image = new Image(); image.src = `data:image/png;base64,${bytes}`; await image.decode();
        context.drawImage(image, 0, 0, 96, 128);
        const rgba = context.getImageData(0, 0, 96, 128).data, gray = [];
        for (let i = 0; i < rgba.length; i += 4) gray.push(Math.round((rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3));
        result.push(gray);
      }
      return result;
    }, pngs.map(name => readFileSync(`${out}/independent-raster/${name}`).toString("base64")));
    const results = [];
    for (let physical = 1; physical <= 99; physical++) {
      await go(page, physical);
      const actual = await signature(sourcePageCanvas(page, physical));
      const scores = references.map((reference, index) => ({ page: index + 1, error: distance(actual, reference) })).sort((a, b) => a.error - b.error);
      const own = scores.find(score => score.page === physical);
      results.push({ physical, nearestPhysicalPage: scores[0].page, error: own.error, nearestError: scores[0].error });
      writeFileSync(`${out}/independent-page-results.json`, JSON.stringify(results, null, 2) + "\n");
      assert.ok(own.error < .08, `physical ${physical}: independent raster differs by ${own.error}`);
      assert.ok(own.error <= scores[0].error + 1e-9, `physical ${physical} looks more like page ${scores[0].page}`);
    }
    assert.equal(fixture.sourceRequests(), initialRequests); assert.deepEqual(fixture.errors, []);
    console.log("Independent original-page raster: 99/99 PASS");
  } finally { await fixture.close(); }
});

test("wrong witness bytes never become a painted source page and original-file access remains", { timeout: 60_000 }, async () => {
  const fixture = await setup(390, "dark", true), { page, origin } = fixture;
  try {
    await page.goto(`${origin}/2029/control?surface=ahavat-torah-system&page=36`, { waitUntil: "domcontentloaded" });
    await page.getByText("לא ניתן להציג כרגע את צילום העמוד.", { exact: true }).waitFor();
    assert.equal(await page.locator('[data-book-pdf-painted="true"]').count(), 0);
    assert.equal(await page.getByRole("link", { name: "פתח את ה־PDF המקורי · עמוד 36", exact: true }).getAttribute("href"), `${AHAVAT_PDF_URL}#page=36&view=FitH`);
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});

test("returning to the painted page while new PDF work is delayed never labels an empty canvas as source", { timeout: 60_000 }, async () => {
  const fixture = await setup(390, "parchment"), { page, origin, context } = fixture;
  await context.addInitScript(() => {
    const post = Worker.prototype.postMessage;
    window.sourceWorkDelayed = false; window.delayedSourceMessages = 0;
    Worker.prototype.postMessage = function(message, ...rest) {
      if (window.sourceWorkDelayed && ["GetPage", "GetOperatorList"].includes(message?.action)) { window.delayedSourceMessages++; return; }
      return post.call(this, message, ...rest);
    };
  });
  try {
    await page.goto(`${origin}/2029/control?surface=ahavat-torah-system&page=36`, { waitUntil: "domcontentloaded" });
    await assertAhavatSourcePage(page, 36);
    const before = await signature(sourcePageCanvas(page, 36)), source = page.locator("#ahavat29-source");
    await page.evaluate(() => { window.sourceWorkDelayed = true; });
    await source.getByLabel("עמוד PDF", { exact: true }).fill("46");
    await click(source.getByRole("button", { name: "עבור", exact: true }));
    await page.waitForFunction(() => document.querySelector('[data-book-requested-page="46"]') && window.delayedSourceMessages > 0);
    assert.equal(await page.locator('[data-book-pdf-painted="true"]').count(), 0, "page 36 cannot stand in for pending page 46");
    await source.getByLabel("עמוד PDF", { exact: true }).fill("36");
    await click(source.getByRole("button", { name: "עבור", exact: true }));
    await assertAhavatSourcePage(page, 36);
    assert.deepEqual(await signature(sourcePageCanvas(page, 36)), before, "return preserves the actual completed original raster, not only its old metadata");
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});

test("physical-page acceptance rejects an empty canvas even when metadata falsely claims a completed source", { timeout: 30_000 }, async () => {
  const fixture = await setup(390, "light"), { page } = fixture;
  try {
    await page.setContent(`<div data-book-pdf-renderer="controlled" data-book-pdf-source="${AHAVAT_PDF_URL}" data-book-source-sha256="895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b" data-book-requested-page="36"><canvas width="320" height="400" data-book-pdf-canvas="true" data-book-pdf-page="36" data-book-pdf-page-count="99" data-book-pdf-painted="true"></canvas></div>`);
    await assert.rejects(assertAhavatSourcePage(page, 36), error => error.name === "AssertionError" && error.actual === 0 && error.expected === 255);
  } finally { await fixture.close(); }
});

test("the source decoder worker closes on component unmount without navigating away", { timeout: 60_000 }, async () => {
  const fixture = await setup(390, "light"), { page, origin } = fixture;
  try {
    await page.goto(`${origin}/test/fixtures/book-source-resource-2029.html`, { waitUntil: "domcontentloaded" });
    await assertAhavatSourcePage(page, 36);
    const workers = page.workers();
    assert.equal(workers.length, 1);
    const closed = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("source worker did not close")), 10_000);
      workers[0].once("close", () => { clearTimeout(timer); resolve(); });
    });
    await page.evaluate(() => window.unmountBookSource());
    await closed;
    assert.equal(page.url(), `${origin}/test/fixtures/book-source-resource-2029.html`);
    assert.equal(await page.locator("[data-book-pdf-renderer]").count(), 0);
    assert.equal(page.workers().length, 0);
    assert.deepEqual(fixture.errors, []);
  } finally { await fixture.close(); }
});
