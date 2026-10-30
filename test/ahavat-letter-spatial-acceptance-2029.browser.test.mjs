import { AHAVAT_PDF_BYTES, AHAVAT_PDF_URL, assertAhavatSourcePage, ahavatSourceHref } from "./fixtures/ahavat-controlled-source-2029.mjs";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { ahavatLetterUnitId, ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
let playwright, vite, react;
try { playwright = require("playwright"); vite = await import(pathToFileURL(require.resolve("vite")).href); react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")).href)).default; } catch { /* Optional in lightweight checkout. */ }
const available = Boolean(playwright && vite && react && existsSync("/usr/bin/chromium"));
const sourcePath = "/tmp/books-wide-ahavat-source-20261028.pdf";

async function fixture() {
  process.env.SOD_BUILD_TARGET = "2029"; process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true"; process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await vite.createServer({ root, configFile: false, cacheDir: `/tmp/ahavat-source-vite-${process.pid}`, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--use-angle=swiftshader"] });
  return { origin, browser, server };
}

async function routes(context, origin, pdf) {
  await context.route("**/*", async route => {
      if (route.request().url() === AHAVAT_PDF_URL) return route.fulfill({ contentType: "application/pdf", body: AHAVAT_PDF_BYTES });
    const url = new URL(route.request().url());
    if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
      const response = await context.request.get(`${origin}/2029.html`);
      return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
    }
    if (url.pathname.endsWith(".pdf")) return pdf ? route.fulfill({ status: 200, contentType: "application/pdf", body: pdf, headers: { "content-disposition": "inline", "access-control-allow-origin": "*" } }) : route.abort();
    if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
    if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
    return route.continue();
  });
}

test("letter selection, source return, scale, scene switching and context loss work in nine display combinations", { skip: !available, timeout: 480_000 }, async () => {
  const { origin, browser, server } = await fixture();
  const id = ahavatLetterUnitId("ד", "vayikra", "צו");
  try {
    for (const width of [320, 390, 1440]) for (const theme of ["light", "parchment", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.addInitScript(value => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", value); }, theme);
      await routes(context, origin);
      const page = await context.newPage();
      await page.goto(`${origin}${ahavatReaderUnitHref(id, "/2029/control?letterQuery=109")}`, { waitUntil: "domcontentloaded" });
      const reader = page.locator("#ahavat29-letters"), source = page.locator("#ahavat29-source");
      const row = reader.locator(`[data-reader-unit="${id}"]`); await row.waitFor();
      const search = reader.getByRole("searchbox", { name: "חיפוש בפרשות האות" });
      assert.equal(await search.inputValue(), "109");
      assert.equal(await reader.locator("tbody tr").count(), 1);
      assert.match(await ahavatSourceHref(source), /#page=36&view=FitH$/);
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0, "a deep link must not start a GPU scene");
      await row.getByRole("button", { name: "PDF 36", exact: true }).click();
      await source.getByRole("button", { name: "לעמוד הבא", exact: true }).click();
      await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click();
      assert.match(await ahavatSourceHref(source), /#page=36&view=FitH$/);
      assert.equal(new URL(page.url()).searchParams.get("readerUnit"), id);
      assert.equal(await search.inputValue(), "109");
      await page.reload({ waitUntil: "domcontentloaded" }); await row.waitFor();
      assert.equal(await search.inputValue(), "109");
      const toggle = reader.getByRole("button", { name: "פתח מבנה האות בתלת־ממד", exact: true });
      await toggle.click(); await reader.locator("canvas:not([data-book-pdf-canvas])").waitFor();
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 1);
      assert.match(await reader.locator(".ahavat29-letter-scene").textContent(), /קנה המידה משתנה/);
      assert.equal(await reader.locator(".ahavat29-spatial-canvas").getAttribute("data-reduced-motion"), "true");
      await reader.locator('canvas[data-ahavat-context-guard="ready"]').waitFor();
      await reader.locator("canvas:not([data-book-pdf-canvas])").evaluate(canvas => { window.__letterContext = canvas.getContext("webgl2") || canvas.getContext("webgl"); });
      const bar = reader.locator(".ahavat29-letter-bars").getByRole("button", { name: "צו 109", exact: true });
      assert.equal(await bar.getAttribute("aria-pressed"), "true");
      await bar.focus(); await page.keyboard.press("Enter");
      assert.equal(new URL(page.url()).searchParams.get("readerUnit"), id);
      await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click();
      assert.equal(await search.inputValue(), "109");
      await page.waitForFunction(unit => document.activeElement?.closest("[data-reader-unit]")?.getAttribute("data-reader-unit") === unit, id);
      const close = reader.getByRole("button", { name: "סגור מבנה האות בתלת־ממד", exact: true });
      await close.focus(); await page.keyboard.press("Enter");
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 0);
      await toggle.waitFor();
      assert.equal(await toggle.evaluate(element => document.activeElement === element), true, "closing the model must retain keyboard focus on its toggle");
      await page.waitForFunction(() => window.__letterContext?.isContextLost(), null, { timeout: 10_000 });
      await toggle.click(); await reader.locator("canvas:not([data-book-pdf-canvas])").waitFor();
      await page.getByRole("button", { name: "פתח מצפה תלת־ממדי", exact: true }).click();
      await page.locator(".ahavat29-spatial-stage canvas").waitFor();
      assert.equal(await reader.locator("canvas:not([data-book-pdf-canvas])").count(), 0);
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(), 1, "only the newly selected model remains active");
      await page.getByRole("button", { name: "סגור מצפה תלת־ממדי", exact: true }).click();
      await toggle.click(); await reader.locator("canvas:not([data-book-pdf-canvas])").waitFor();
      await reader.locator('canvas[data-ahavat-context-guard="ready"]').waitFor();
      await reader.locator("canvas:not([data-book-pdf-canvas])").evaluate(canvas => canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })));
      await reader.getByRole("status").filter({ hasText: "לא ניתן לפתוח את המבנה במכשיר הזה" }).waitFor();
      assert.equal(await reader.locator("canvas:not([data-book-pdf-canvas])").count(), 0);
      assert.equal(await reader.locator("tbody tr").count(), 1);
      assert.match(await ahavatSourceHref(source), /#page=36&view=FitH$/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1), true);
      await context.close(); console.log(`letter spatial ${width}/${theme}: passed`);
    }
  } finally { await browser.close(); await server.close(); }
});

test("motion preference changes are observed while the scene is open", { skip: !available, timeout: 90_000 }, async () => {
  const { origin, browser, server } = await fixture();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 1000 }, reducedMotion: "reduce" });
    await routes(context, origin);
    const page = await context.newPage();
    await page.goto(`${origin}${ahavatReaderUnitHref(ahavatLetterUnitId("ד", "vayikra", "צו"))}`, { waitUntil: "domcontentloaded" });
    const reader = page.locator("#ahavat29-letters");
    await reader.getByRole("button", { name: "פתח מבנה האות בתלת־ממד", exact: true }).click();
    const scene = reader.locator(".ahavat29-spatial-canvas");
    await reader.locator('canvas[data-ahavat-context-guard="ready"]').waitFor();
    // The frame owns this flag and commits OS changes through React state.
    // Finish that owner transition before simulating an independent frame choice;
    // otherwise its pending true→false commit can overwrite the manual true below.
    await page.waitForFunction(() => document.querySelector(".sod29-root")?.dataset.frameReducedMotion === "true");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction(() => document.querySelector(".sod29-root")?.dataset.frameReducedMotion === "false");
    await page.locator(".sod29-root").evaluate(root => root.setAttribute("data-frame-reduced-motion", "false"));
    await page.waitForFunction(() => document.querySelector("#ahavat29-letters .ahavat29-spatial-canvas")?.dataset.reducedMotion === "false");
    await page.locator(".sod29-root").evaluate(root => root.setAttribute("data-frame-reduced-motion", "true"));
    await page.waitForFunction(() => document.querySelector("#ahavat29-letters .ahavat29-spatial-canvas")?.dataset.reducedMotion === "true");
    await page.locator(".sod29-root").evaluate(root => root.setAttribute("data-frame-reduced-motion", "false"));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => document.querySelector("#ahavat29-letters .ahavat29-spatial-canvas")?.dataset.reducedMotion === "true");
    assert.equal(await scene.locator("canvas:not([data-book-pdf-canvas])").count(), 1);
    await context.close();
  } finally { await browser.close(); await server.close(); }
});

test("a device without WebGL keeps the same letter table and exact source usable", { skip: !available, timeout: 90_000 }, async () => {
  const { origin, browser, server } = await fixture();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 1000 }, reducedMotion: "reduce" });
    await context.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /^webgl/.test(type) ? null : original.call(this, type, ...args); }; });
    await routes(context, origin);
    const page = await context.newPage(); const id = ahavatLetterUnitId("ד", "vayikra", "צו");
    await page.goto(`${origin}${ahavatReaderUnitHref(id)}`, { waitUntil: "domcontentloaded" });
    const reader = page.locator("#ahavat29-letters"), source = page.locator("#ahavat29-source");
    await reader.locator(`[data-reader-unit="${id}"]`).waitFor();
    await reader.getByRole("button", { name: "פתח מבנה האות בתלת־ממד", exact: true }).click();
    await reader.getByRole("status").filter({ hasText: "לא ניתן לפתוח את המבנה במכשיר הזה" }).waitFor();
    assert.ok(await reader.locator("tbody tr").count() > 0);
    await reader.locator(`[data-reader-unit="${id}"]`).getByRole("button", { name: "PDF 36", exact: true }).click();
    assert.match(await ahavatSourceHref(source), /#page=36&view=FitH$/);
    await context.close();
  } finally { await browser.close(); await server.close(); }
});

test("the original 99-page PDF stays usable with the letter model and fullscreen", { skip: !available || !existsSync(sourcePath), timeout: 90_000 }, async () => {
  const bytes = readFileSync(sourcePath);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  const { origin, browser, server } = await fixture();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await routes(context, origin, bytes);
    const page = await context.newPage(), id = ahavatLetterUnitId("ד", "vayikra", "צו");
    await page.goto(`${origin}${ahavatReaderUnitHref(id)}`, { waitUntil: "domcontentloaded" });
    const reader = page.locator("#ahavat29-letters"), source = page.locator("#ahavat29-source");
    await reader.locator(`[data-reader-unit="${id}"]`).waitFor();
    await reader.getByRole("button", { name: "פתח מבנה האות בתלת־ממד", exact: true }).click(); await reader.locator("canvas:not([data-book-pdf-canvas])").waitFor();
    await source.getByRole("button", { name: "מסך מלא", exact: true }).click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    let total = null;
    for (let i = 0; i < 100 && total !== 99; i++) {
      for (const frame of page.frames()) { try { total = await frame.evaluate(() => document.querySelector("pdf-viewer")?.documentDimensions?.pageDimensions?.length || null) || total; } catch { /* Native cross-origin frame. */ } }
      if (total !== 99) await page.waitForTimeout(250);
    }
    assert.equal(total, 99);
    await source.getByRole("button", { name: "יציאה ממסך מלא", exact: true }).click();
    await page.waitForFunction(() => !document.fullscreenElement);
    assert.match(await ahavatSourceHref(source), /#page=36&view=FitH$/);
    await source.getByRole("link", { name: "חזור ליחידת הקריאה", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.get("readerUnit"), id);
    await context.close();
  } finally { await browser.close(); await server.close(); }
});
